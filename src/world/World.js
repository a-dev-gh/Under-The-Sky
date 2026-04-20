// Seamless 5x5 chunked world with biome variety.
//
// Each chunk is CHUNK_COLS x CHUNK_ROWS tiles. A biome map assigns one of
// five biomes to each chunk; each biome has its own generator that writes
// ground tiles (0..5) and placeable objects (trees, rocks, etc.) for its
// chunk.
//
// Constraints the world must satisfy:
//   - The center chunk is always a safe "forest" biome (player spawn).
//   - At least 2 lake chunks (guaranteed water source).
//   - At least 2 mountain chunks (guaranteed stone source).
//   - Remaining chunks are a mix of forest / plains / swamp.

import { TILE } from "../constants.js";
import { mulberry32, hashSeed } from "../systems/Seed.js";

export const CHUNK_COLS = 48;
export const CHUNK_ROWS = 36;
export const WORLD_CHUNKS_X = 5;
export const WORLD_CHUNKS_Y = 5;

export const WORLD_COLS = CHUNK_COLS * WORLD_CHUNKS_X;
export const WORLD_ROWS = CHUNK_ROWS * WORLD_CHUNKS_Y;
export const WORLD_WIDTH = WORLD_COLS * TILE;
export const WORLD_HEIGHT = WORLD_ROWS * TILE;

export const BIOMES = {
  forest: "forest",
  lake: "lake",
  mountain: "mountain",
  plains: "plains",
  swamp: "swamp",
};

// Ground tile ids (matching BootScene texture keys list in GameScene):
//   0 grass, 1 grass_hill, 2 dirt, 3 sand, 4 water, 5 stone
export const TILES = {
  GRASS: 0,
  GRASS_HILL: 1,
  DIRT: 2,
  SAND: 3,
  WATER: 4,
  STONE: 5,
};

export function buildWorld(worldSeed) {
  const rng = mulberry32(worldSeed);
  const biomeMap = assignBiomes(rng);

  const chunks = [];
  for (let cy = 0; cy < WORLD_CHUNKS_Y; cy++) {
    chunks[cy] = [];
    for (let cx = 0; cx < WORLD_CHUNKS_X; cx++) {
      const biome = biomeMap[cy][cx];
      const chunkSeed = hashSeed(`${worldSeed}:${cx}:${cy}`);
      chunks[cy][cx] = generateChunk(biome, chunkSeed, cx, cy);
    }
  }

  // Combine per-chunk blocked sets into one global set keyed by world gx,gy.
  const blocked = new Set();
  for (let cy = 0; cy < WORLD_CHUNKS_Y; cy++) {
    for (let cx = 0; cx < WORLD_CHUNKS_X; cx++) {
      for (const k of chunks[cy][cx].blocked) blocked.add(k);
    }
  }

  // Spawn near the center of the center chunk, on a dirt patch created by
  // the forest generator.
  const spawnCx = Math.floor(WORLD_CHUNKS_X / 2);
  const spawnCy = Math.floor(WORLD_CHUNKS_Y / 2);
  const spawn = chunks[spawnCy][spawnCx].spawnHint || {
    x: (spawnCx * CHUNK_COLS + CHUNK_COLS / 2) * TILE,
    y: (spawnCy * CHUNK_ROWS + CHUNK_ROWS / 2) * TILE,
  };

  return {
    seed: worldSeed,
    biomeMap,
    chunks,
    blocked,
    spawn,
    cols: WORLD_COLS,
    rows: WORLD_ROWS,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  };
}

function assignBiomes(rng) {
  const map = Array.from({ length: WORLD_CHUNKS_Y }, () =>
    new Array(WORLD_CHUNKS_X).fill(BIOMES.forest),
  );
  const spawnCx = Math.floor(WORLD_CHUNKS_X / 2);
  const spawnCy = Math.floor(WORLD_CHUNKS_Y / 2);

  // Collect all chunk coords except the spawn chunk, shuffled.
  const coords = [];
  for (let y = 0; y < WORLD_CHUNKS_Y; y++) {
    for (let x = 0; x < WORLD_CHUNKS_X; x++) {
      if (x === spawnCx && y === spawnCy) continue;
      coords.push({ x, y });
    }
  }
  for (let i = coords.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [coords[i], coords[j]] = [coords[j], coords[i]];
  }

  let idx = 0;
  const assign = (biome, n) => {
    for (let i = 0; i < n && idx < coords.length; i++, idx++) {
      const { x, y } = coords[idx];
      map[y][x] = biome;
    }
  };
  assign(BIOMES.lake, 2);
  assign(BIOMES.mountain, 2);
  assign(BIOMES.swamp, 2);
  assign(BIOMES.plains, 4);
  // Remaining stay forest.
  return map;
}

function generateChunk(biome, chunkSeed, cx, cy) {
  switch (biome) {
    case BIOMES.lake:
      return genLake(chunkSeed, cx, cy);
    case BIOMES.mountain:
      return genMountain(chunkSeed, cx, cy);
    case BIOMES.plains:
      return genPlains(chunkSeed, cx, cy);
    case BIOMES.swamp:
      return genSwamp(chunkSeed, cx, cy);
    case BIOMES.forest:
    default:
      return genForest(chunkSeed, cx, cy);
  }
}

// -------- helpers --------

function newChunk() {
  const ground = Array.from({ length: CHUNK_ROWS }, () =>
    new Array(CHUNK_COLS).fill(TILES.GRASS),
  );
  return { ground, objects: [], blocked: new Set() };
}

// Add an object in WORLD coords; records blocked global tile too.
function placeObject(chunk, cx, cy, localGx, localGy, kind) {
  const gx = cx * CHUNK_COLS + localGx;
  const gy = cy * CHUNK_ROWS + localGy;
  chunk.objects.push({
    kind,
    gx,
    gy,
    x: gx * TILE + TILE / 2,
    y: gy * TILE + TILE / 2,
  });
  chunk.blocked.add(`${gx},${gy}`);
}

function scatter(chunk, cx, cy, rng, kind, count, opts = {}) {
  let placed = 0;
  let tries = 0;
  while (placed < count && tries < count * 25) {
    tries++;
    const gx = Math.floor(rng() * CHUNK_COLS);
    const gy = Math.floor(rng() * CHUNK_ROWS);
    if (gx < 1 || gy < 1 || gx > CHUNK_COLS - 2 || gy > CHUNK_ROWS - 2) continue;
    const tile = chunk.ground[gy][gx];
    if (tile === TILES.WATER || tile === TILES.SAND) continue;
    if (opts.avoidCenter) {
      const dx = gx - CHUNK_COLS / 2;
      const dy = gy - CHUNK_ROWS / 2;
      if (dx * dx + dy * dy < 16) continue;
    }
    const worldKey = `${cx * CHUNK_COLS + gx},${cy * CHUNK_ROWS + gy}`;
    if (chunk.blocked.has(worldKey)) continue;
    placeObject(chunk, cx, cy, gx, gy, kind);
    placed++;
  }
}

function scatterHills(chunk, rng, patches, radMin, radMax) {
  for (let i = 0; i < patches; i++) {
    const cxp = 4 + Math.floor(rng() * (CHUNK_COLS - 8));
    const cyp = 4 + Math.floor(rng() * (CHUNK_ROWS - 8));
    const rad = radMin + Math.floor(rng() * (radMax - radMin + 1));
    for (let y = -rad; y <= rad; y++) {
      for (let x = -rad; x <= rad; x++) {
        if (x * x + y * y <= rad * rad && rng() > 0.25) {
          const gx = cxp + x;
          const gy = cyp + y;
          if (gx > 0 && gx < CHUNK_COLS - 1 && gy > 0 && gy < CHUNK_ROWS - 1) {
            if (chunk.ground[gy][gx] !== TILES.WATER) {
              chunk.ground[gy][gx] = TILES.GRASS_HILL;
            }
          }
        }
      }
    }
  }
}

function drawRiver(chunk, rng) {
  // Winding river along the east third of the chunk.
  const baseX = Math.floor(CHUNK_COLS * (0.65 + rng() * 0.2));
  const freqA = 0.22 + rng() * 0.08;
  const ampA = 3 + rng() * 3;
  const phaseA = rng() * Math.PI * 2;
  const w = 1 + (rng() > 0.5 ? 1 : 0);
  for (let y = 0; y < CHUNK_ROWS; y++) {
    const wiggle = Math.sin(y * freqA + phaseA) * ampA;
    const x = Math.round(baseX + wiggle);
    for (let dx = 0; dx < w; dx++) {
      const gx = x + dx;
      if (gx > 0 && gx < CHUNK_COLS - 1) chunk.ground[y][gx] = TILES.WATER;
    }
    if (x > 0 && chunk.ground[y][x - 1] !== TILES.WATER) {
      chunk.ground[y][x - 1] = TILES.SAND;
    }
    if (x + w < CHUNK_COLS && chunk.ground[y][x + w] !== TILES.WATER) {
      chunk.ground[y][x + w] = TILES.SAND;
    }
  }
}

function drawLake(chunk, rng, cxHint, cyHint, rxHint, ryHint) {
  const cx = cxHint ?? Math.floor(CHUNK_COLS / 2 + (rng() - 0.5) * 12);
  const cy = cyHint ?? Math.floor(CHUNK_ROWS / 2 + (rng() - 0.5) * 8);
  const rx = rxHint ?? 10 + Math.floor(rng() * 5);
  const ry = ryHint ?? 7 + Math.floor(rng() * 4);
  for (let y = -ry - 1; y <= ry + 1; y++) {
    for (let x = -rx - 1; x <= rx + 1; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      const gx = cx + x;
      const gy = cy + y;
      if (gx <= 0 || gy <= 0 || gx >= CHUNK_COLS - 1 || gy >= CHUNK_ROWS - 1) continue;
      if (d <= 1) chunk.ground[gy][gx] = TILES.WATER;
      else if (d <= 1.18 && rng() > 0.25) chunk.ground[gy][gx] = TILES.SAND;
    }
  }
}

function drawStoneField(chunk, rng) {
  // Patch of stone tiles + hills everywhere, fewer grass pockets.
  for (let y = 1; y < CHUNK_ROWS - 1; y++) {
    for (let x = 1; x < CHUNK_COLS - 1; x++) {
      const n = rng();
      if (n < 0.35) chunk.ground[y][x] = TILES.STONE;
      else if (n < 0.75) chunk.ground[y][x] = TILES.GRASS_HILL;
      else chunk.ground[y][x] = TILES.GRASS;
    }
  }
  // Dusting of dirt paths
  for (let i = 0; i < 6; i++) {
    const sx = 4 + Math.floor(rng() * (CHUNK_COLS - 8));
    const sy = 4 + Math.floor(rng() * (CHUNK_ROWS - 8));
    for (let k = 0; k < 18; k++) {
      const gx = sx + Math.floor(rng() * 4) - 2;
      const gy = sy + Math.floor(rng() * 4) - 2;
      if (gx > 0 && gx < CHUNK_COLS - 1 && gy > 0 && gy < CHUNK_ROWS - 1) {
        if (chunk.ground[gy][gx] === TILES.STONE) chunk.ground[gy][gx] = TILES.DIRT;
      }
    }
  }
}

// -------- biome generators --------

function genForest(seed, cx, cy) {
  const rng = mulberry32(seed);
  const chunk = newChunk();
  scatterHills(chunk, rng, 5, 2, 4);
  if (rng() > 0.3) drawRiver(chunk, rng);
  // Dirt patch for town center only on spawn chunk (cx/cy match center)
  const isSpawn =
    cx === Math.floor(WORLD_CHUNKS_X / 2) && cy === Math.floor(WORLD_CHUNKS_Y / 2);
  if (isSpawn) {
    const tcx = Math.floor(CHUNK_COLS * 0.3);
    const tcy = Math.floor(CHUNK_ROWS * 0.6);
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        if (rng() > 0.3) chunk.ground[tcy + y][tcx + x] = TILES.DIRT;
      }
    }
    chunk.spawnHint = {
      x: (cx * CHUNK_COLS + tcx) * TILE + TILE / 2,
      y: (cy * CHUNK_ROWS + tcy) * TILE + TILE / 2,
    };
  }
  scatter(chunk, cx, cy, rng, "tree", 55, { avoidCenter: isSpawn });
  scatter(chunk, cx, cy, rng, "rock", 8);
  scatter(chunk, cx, cy, rng, "wood", 6);
  scatter(chunk, cx, cy, rng, "stone_pile", 4);
  scatter(chunk, cx, cy, rng, "berry", 8);
  return chunk;
}

function genLake(seed, cx, cy) {
  const rng = mulberry32(seed);
  const chunk = newChunk();
  drawLake(chunk, rng);
  scatterHills(chunk, rng, 2, 2, 3);
  scatter(chunk, cx, cy, rng, "tree", 20);
  scatter(chunk, cx, cy, rng, "rock", 6);
  scatter(chunk, cx, cy, rng, "berry", 14);
  scatter(chunk, cx, cy, rng, "wood", 2);
  return chunk;
}

function genMountain(seed, cx, cy) {
  const rng = mulberry32(seed);
  const chunk = newChunk();
  drawStoneField(chunk, rng);
  scatter(chunk, cx, cy, rng, "rock", 22);
  scatter(chunk, cx, cy, rng, "stone_pile", 14);
  scatter(chunk, cx, cy, rng, "tree", 8);
  return chunk;
}

function genPlains(seed, cx, cy) {
  const rng = mulberry32(seed);
  const chunk = newChunk();
  scatterHills(chunk, rng, 2, 2, 3);
  scatter(chunk, cx, cy, rng, "tree", 12);
  scatter(chunk, cx, cy, rng, "rock", 3);
  scatter(chunk, cx, cy, rng, "berry", 20);
  return chunk;
}

function genSwamp(seed, cx, cy) {
  const rng = mulberry32(seed);
  const chunk = newChunk();
  // Scattered small pools
  for (let i = 0; i < 5; i++) {
    const pcx = 4 + Math.floor(rng() * (CHUNK_COLS - 8));
    const pcy = 4 + Math.floor(rng() * (CHUNK_ROWS - 8));
    const rx = 2 + Math.floor(rng() * 3);
    const ry = 2 + Math.floor(rng() * 2);
    drawLake(chunk, rng, pcx, pcy, rx, ry);
  }
  // Dirt / mossy patches
  for (let y = 1; y < CHUNK_ROWS - 1; y++) {
    for (let x = 1; x < CHUNK_COLS - 1; x++) {
      if (chunk.ground[y][x] === TILES.GRASS && rng() < 0.15) {
        chunk.ground[y][x] = TILES.DIRT;
      }
    }
  }
  scatter(chunk, cx, cy, rng, "tree", 70);
  scatter(chunk, cx, cy, rng, "rock", 5);
  scatter(chunk, cx, cy, rng, "berry", 6);
  return chunk;
}

// Minimap color per biome (matches generator mood at a glance)
export const BIOME_MINIMAP_COLOR = {
  forest: 0x3c6e25,
  lake: 0x3471a8,
  mountain: 0x7a7f85,
  plains: 0x8fd047,
  swamp: 0x2f5a1c,
};
