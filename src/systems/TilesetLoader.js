// Tileset override loader.
//
// If `assets/sprites/tileset.png` + `assets/sprites/tileset.json` exist at
// boot time, we slice the PNG into individual textures per the manifest and
// register them under the canonical in-game texture keys (tile_grass,
// obj_tree, build_house, etc.). BootScene calls applyTilesetOverrides()
// AFTER procedural generation, so any key the manifest covers wins over the
// placeholder.
//
// Manifest shape (see assets/sprites/tileset.json):
//   {
//     "cellSize": 32,
//     "mapping": {
//       "tile_grass":   { "x": 3, "y": 1 },
//       "tile_water":   { "variants": [[8, 0], [9, 0], [10, 0]] },
//       "obj_tree":     { "x": 0, "y": 6, "w": 1, "h": 2 },
//       "build_house":  { "x": 5, "y": 0, "w": 3, "h": 3 },
//       "char_player":  { "x": 0, "y": 10, "w": 4, "h": 1, "frames": 4 }
//     }
//   }
//
// A `variants: [[x, y], ...]` entry registers the FIRST variant under the
// key (`tile_grass`) and the remaining variants as `tile_grass__1`,
// `tile_grass__2`, etc. `variantCounts` (exported) lets the renderer pick
// one deterministically per world tile.

const TILESET_PNG = "assets/sprites/tileset.png";
const TILESET_JSON = "assets/sprites/tileset.json";

// Populated by applyTilesetOverrides. Maps canonical key -> number of
// variants available (>= 1). Keys absent from this map have a single
// variant (or just the procedural placeholder).
export const variantCounts = new Map();

export function preloadTileset(scene) {
  scene.load.image("__tileset", TILESET_PNG);
  scene.load.json("__tileset_manifest", TILESET_JSON);
  scene.load.on("loaderror", (file) => {
    if (file.src?.endsWith("tileset.png") || file.src?.endsWith("tileset.json")) {
      console.log("[Tileset] no override pack found, using procedural art.");
    }
  });
}

function extractCell(scene, key, src, sx, sy, w, h) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, sx, sy, w, h, 0, 0, w, h);
  tex.refresh();
  return tex;
}

export function applyTilesetOverrides(scene) {
  variantCounts.clear();
  if (!scene.textures.exists("__tileset")) return false;
  const manifest = scene.cache.json.get("__tileset_manifest");
  if (!manifest || !manifest.mapping) return false;

  const cell = manifest.cellSize || 32;
  const src = scene.textures.get("__tileset").getSourceImage();
  if (!src) return false;

  let overridden = 0;
  for (const [key, entry] of Object.entries(manifest.mapping)) {
    try {
      const w = (entry.w || 1) * cell;
      const h = (entry.h || 1) * cell;

      const variantCoords = Array.isArray(entry.variants)
        ? entry.variants
        : [[entry.x, entry.y]];

      if (variantCoords.length === 0) continue;

      variantCoords.forEach((coord, i) => {
        const [vx, vy] = coord;
        const variantKey = i === 0 ? key : `${key}__${i}`;
        extractCell(scene, variantKey, src, vx * cell, vy * cell, w, h);
        if (i === 0 && entry.frames && entry.frames > 1) {
          const frameW = w / entry.frames;
          for (let f = 0; f < entry.frames; f++) {
            scene.textures.get(variantKey).add(f, 0, f * frameW, 0, frameW, h);
          }
        }
      });
      variantCounts.set(key, variantCoords.length);
      overridden++;
    } catch (err) {
      console.warn(`[Tileset] failed to slice "${key}":`, err);
    }
  }
  console.log(
    `[Tileset] overrode ${overridden} texture(s); variants: ${[...variantCounts.entries()]
      .filter(([, n]) => n > 1)
      .map(([k, n]) => `${k}x${n}`)
      .join(", ") || "none"}`,
  );
  return true;
}

// Pick a variant for a world tile. Deterministic: same (gx, gy) always
// returns the same variant. Callers pass the world seed so different seeds
// decorate the same map differently.
export function pickVariantKey(baseKey, gx, gy, worldSeed = 0) {
  const n = variantCounts.get(baseKey) || 1;
  if (n <= 1) return baseKey;
  let h = Math.imul(gx + 0x9e3779b9, 0x85ebca6b) ^ gy;
  h = Math.imul(h, 0xc2b2ae35) ^ worldSeed;
  const v = ((h ^ (h >>> 13)) >>> 0) % n;
  return v === 0 ? baseKey : `${baseKey}__${v}`;
}
