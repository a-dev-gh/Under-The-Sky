// Per-file sprite override.
//
// Drop a PNG named <key>.png into assets/sprites/ and it replaces the
// procedural placeholder for that key at boot. Variants work via
// <key>_1.png, <key>_2.png, ... (first file under <key>.png is the base).
//
// This path is friendlier than the tileset manifest for AI-generated art
// (Gemini / Midjourney): each prompt output is one file, one filename, one
// replacement. Individual PNGs win over tileset-manifest mappings.

import { variantCounts } from "./TilesetLoader.js";

// Canonical keys we'll try to load a PNG for. Adding a new key is just
// extending this array (or the variant counts it produces).
const KEYS = [
  // tiles (1..4 variants each)
  "tile_grass",
  "tile_grass_hill",
  "tile_dirt",
  "tile_sand",
  "tile_water",
  "tile_stone",
  // cliffs (no variants)
  "cliff_south_1",
  "cliff_south_2",
  "cliff_east_1",
  "cliff_east_2",
  // objects
  "obj_tree",
  "obj_rock",
  "obj_berry_bush",
  "res_wood",
  "res_stone",
  // animals
  "animal_rabbit",
  "animal_deer",
  // characters (framesheet: 4 frames wide)
  "char_player",
  "char_npc_a",
  "char_npc_b",
  "char_npc_c",
  "char_npc_d",
  // buildings
  "build_house",
  "build_town_point",
  "build_cart_shop",
  "build_general_store",
  // icons
  "icon_wood",
  "icon_stone",
  "icon_food",
  "icon_house",
  "icon_sword",
  // build ghosts
  "ghost_ok",
  "ghost_bad",
];

const VARIANT_LIMIT = 6; // check for up to _1.._5 alongside base file
const CHAR_FRAMES = 4; // characters are a 4-frame horizontal sheet

function expectedFrames(key) {
  return key.startsWith("char_") ? CHAR_FRAMES : 1;
}

export function preloadIndividualPngs(scene) {
  for (const key of KEYS) {
    const loadKey = `__ovr_${key}`;
    scene.load.image(loadKey, `assets/sprites/${key}.png`);
    for (let v = 1; v < VARIANT_LIMIT; v++) {
      scene.load.image(`${loadKey}__${v}`, `assets/sprites/${key}_${v}.png`);
    }
  }
  // Silently swallow 404s — most keys won't have a matching file.
  scene.load.on("loaderror", (file) => {
    if (file.key?.startsWith?.("__ovr_")) return; // expected for missing files
  });
}

export function applyIndividualPngOverrides(scene) {
  let overridden = 0;
  for (const key of KEYS) {
    const loadKey = `__ovr_${key}`;
    const variants = [];
    if (scene.textures.exists(loadKey)) variants.push(loadKey);
    for (let v = 1; v < VARIANT_LIMIT; v++) {
      const vk = `${loadKey}__${v}`;
      if (scene.textures.exists(vk)) variants.push(vk);
    }
    if (variants.length === 0) continue;

    // Replace each variant under the canonical key (variant 0 = base key,
    // variant 1 = key__1, etc).
    variants.forEach((srcKey, i) => {
      const destKey = i === 0 ? key : `${key}__${i}`;
      if (scene.textures.exists(destKey)) scene.textures.remove(destKey);
      const src = scene.textures.get(srcKey).getSourceImage();
      const w = src.width;
      const h = src.height;
      const tex = scene.textures.createCanvas(destKey, w, h);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0);
      tex.refresh();
      // Character framesheets: register named frames 0..3.
      const fcount = expectedFrames(destKey);
      if (i === 0 && fcount > 1) {
        const frameW = w / fcount;
        for (let f = 0; f < fcount; f++) {
          scene.textures.get(destKey).add(f, 0, f * frameW, 0, frameW, h);
        }
      }
    });
    variantCounts.set(key, variants.length);
    overridden++;
  }
  if (overridden) {
    console.log(
      `[PNG override] replaced ${overridden} sprite(s) with files from assets/sprites/`,
    );
  }
  return overridden > 0;
}
