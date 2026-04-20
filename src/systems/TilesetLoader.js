// Tileset override loader.
//
// If `assets/sprites/tileset.png` + `assets/sprites/tileset.json` exist at
// boot time, we slice the PNG into individual textures per the manifest and
// register them under the canonical in-game texture keys (tile_grass,
// obj_tree, build_house, etc.). BootScene calls applyTilesetOverrides() AFTER
// procedural generation, so any key the manifest covers wins over the
// placeholder.
//
// Manifest shape (see assets/sprites/tileset.json):
//   {
//     "cellSize": 32,                  // px per cell in the PNG
//     "mapping": {
//       "tile_grass":   { "x": 3, "y": 1 },               // 1x1 cell
//       "obj_tree":     { "x": 0, "y": 6, "w": 1, "h": 2 },
//       "build_house":  { "x": 5, "y": 0, "w": 3, "h": 3 },
//       "char_player":  { "x": 0, "y": 10, "w": 4, "h": 1 } // 4 framesheet
//     }
//   }
//
// For character sprites that expect a named-frame sheet (down/up/left/right)
// set "frames": 4 in the entry and the extractor will also add frame entries
// 0..3 at even W increments.

const TILESET_PNG = "assets/sprites/tileset.png";
const TILESET_JSON = "assets/sprites/tileset.json";

export function preloadTileset(scene) {
  // Soft-loads the PNG and JSON. If either 404s we swallow the error so the
  // game still boots with procedural art.
  scene.load.image("__tileset", TILESET_PNG);
  scene.load.json("__tileset_manifest", TILESET_JSON);
  scene.load.on("loaderror", (file) => {
    if (file.src?.endsWith("tileset.png") || file.src?.endsWith("tileset.json")) {
      console.log("[Tileset] no override pack found, using procedural art.");
    }
  });
}

export function applyTilesetOverrides(scene) {
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
      const sx = entry.x * cell;
      const sy = entry.y * cell;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, w, h);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, sx, sy, w, h, 0, 0, w, h);
      tex.refresh();
      // If the entry wants a framesheet (characters: 4 directions horizontally)
      if (entry.frames && entry.frames > 1) {
        const frameW = w / entry.frames;
        for (let f = 0; f < entry.frames; f++) {
          scene.textures.get(key).add(f, 0, f * frameW, 0, frameW, h);
        }
      }
      overridden++;
    } catch (err) {
      console.warn(`[Tileset] failed to slice "${key}":`, err);
    }
  }
  console.log(`[Tileset] overrode ${overridden} texture(s) from tileset.png.`);
  return true;
}
