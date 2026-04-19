import { TILE, MAP_COLS, MAP_ROWS } from "../main.js";

// Simple procedural forest map: grass base, scattered hills, a small pond,
// trees, rocks and resource nodes. Returns a data object the GameScene renders.

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildForestMap(seed = 42) {
  const r = mulberry32(seed);
  const cols = MAP_COLS;
  const rows = MAP_ROWS;

  // ground: 0=grass, 1=grass_hill, 2=dirt, 3=sand, 4=water, 5=stone
  const ground = Array.from({ length: rows }, () => new Array(cols).fill(0));

  // Scatter a few hill patches
  for (let i = 0; i < 6; i++) {
    const cx = 4 + Math.floor(r() * (cols - 8));
    const cy = 4 + Math.floor(r() * (rows - 8));
    const rad = 2 + Math.floor(r() * 3);
    for (let y = -rad; y <= rad; y++) {
      for (let x = -rad; x <= rad; x++) {
        if (x * x + y * y <= rad * rad && r() > 0.2) {
          const gx = cx + x;
          const gy = cy + y;
          if (gx > 0 && gx < cols - 1 && gy > 0 && gy < rows - 1) {
            ground[gy][gx] = 1;
          }
        }
      }
    }
  }

  // Small pond
  const pcx = Math.floor(cols * 0.7);
  const pcy = Math.floor(rows * 0.3);
  for (let y = -3; y <= 3; y++) {
    for (let x = -4; x <= 4; x++) {
      const d = (x * x) / 16 + (y * y) / 9;
      const gx = pcx + x;
      const gy = pcy + y;
      if (gx <= 0 || gy <= 0 || gx >= cols - 1 || gy >= rows - 1) continue;
      if (d <= 1) ground[gy][gx] = 4;
      else if (d <= 1.3 && r() > 0.3) ground[gy][gx] = 3;
    }
  }

  // Dirt patch for town center
  const tcx = Math.floor(cols * 0.3);
  const tcy = Math.floor(rows * 0.6);
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      if (r() > 0.3) ground[tcy + y][tcx + x] = 2;
    }
  }

  // Collidable entities placed in world pixel coords.
  // kind: "tree" | "rock" | "wood" | "stone_pile" | "berry"
  const objects = [];
  const blocked = new Set();
  const key = (x, y) => `${x},${y}`;

  const place = (kind, count, opts = {}) => {
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 20) {
      tries++;
      const gx = Math.floor(r() * cols);
      const gy = Math.floor(r() * rows);
      if (gx < 1 || gy < 1 || gx > cols - 2 || gy > rows - 2) continue;
      if (ground[gy][gx] === 4 || ground[gy][gx] === 3) continue;
      if (opts.avoidCenter) {
        const dx = gx - tcx;
        const dy = gy - tcy;
        if (dx * dx + dy * dy < 9) continue;
      }
      if (blocked.has(key(gx, gy))) continue;
      blocked.add(key(gx, gy));
      objects.push({
        kind,
        gx,
        gy,
        x: gx * TILE + TILE / 2,
        y: gy * TILE + TILE / 2,
      });
      placed++;
    }
  };

  place("tree", 80, { avoidCenter: true });
  place("rock", 14);
  place("wood", 10);
  place("stone_pile", 8);
  place("berry", 12);

  return {
    cols,
    rows,
    ground,
    objects,
    spawn: { x: tcx * TILE, y: tcy * TILE },
    blocked,
  };
}
