// Generates all placeholder sprites at boot via pixel-by-pixel canvas drawing.
// Later, drop real PNGs into /assets/sprites and load them here instead.

import { TILE } from "../main.js";

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(scene, key, w, h) {
  const tex = scene.textures.createCanvas(key, w, h);
  return { tex, ctx: tex.getContext() };
}

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

function fill(ctx, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    console.log("[Boot] start");
    try {
      this.makeTiles();
      console.log("[Boot] tiles ok");
      this.makeTrees();
      this.makeRocks();
      this.makeResources();
      this.makeBushes();
      console.log("[Boot] objects ok");
      this.makeCharacters();
      console.log("[Boot] characters ok");
      this.makeAnimals();
      this.makeHouse();
      this.makeGhostTile();
      this.makeIcons();
      console.log("[Boot] done, starting Title");
    } catch (e) {
      console.error("[Boot] crashed:", e);
      throw e;
    }
    this.scene.start("Title");
  }

  makeTiles() {
    this.grassTile("tile_grass", 0x3c6e25, 0x5aa63a, 0x8fd047, 1);
    this.grassTile("tile_grass_hill", 0x2f5a1c, 0x4f9030, 0x78c23a, 2);
    this.dirtTile("tile_dirt", 3);
    this.sandTile("tile_sand", 4);
    this.waterTile("tile_water", 5);
    this.stoneTile("tile_stone", 6);
  }

  grassTile(key, base, mid, hi, seed) {
    const { tex, ctx } = makeCanvas(this, key, TILE, TILE);
    const r = mulberry32(seed);
    fill(ctx, TILE, TILE, "#" + base.toString(16).padStart(6, "0"));
    const midC = "#" + mid.toString(16).padStart(6, "0");
    const hiC = "#" + hi.toString(16).padStart(6, "0");
    for (let i = 0; i < 60; i++) px(ctx, r() * TILE, r() * TILE, midC);
    for (let i = 0; i < 20; i++) px(ctx, r() * TILE, r() * TILE, hiC);
    // tufts
    for (let i = 0; i < 6; i++) {
      const x = (r() * TILE) | 0;
      const y = (r() * TILE) | 0;
      px(ctx, x, y, hiC);
      px(ctx, x, y - 1, hiC);
      px(ctx, x + 1, y, midC);
    }
    tex.refresh();
  }

  dirtTile(key, seed) {
    const { tex, ctx } = makeCanvas(this, key, TILE, TILE);
    const r = mulberry32(seed);
    fill(ctx, TILE, TILE, "#7a4f2a");
    for (let i = 0; i < 40; i++) px(ctx, r() * TILE, r() * TILE, "#5d3a1e");
    for (let i = 0; i < 15; i++) px(ctx, r() * TILE, r() * TILE, "#9c6a3c");
    tex.refresh();
  }

  sandTile(key, seed) {
    const { tex, ctx } = makeCanvas(this, key, TILE, TILE);
    const r = mulberry32(seed);
    fill(ctx, TILE, TILE, "#e0c98a");
    for (let i = 0; i < 30; i++) px(ctx, r() * TILE, r() * TILE, "#c9ad6b");
    for (let i = 0; i < 20; i++) px(ctx, r() * TILE, r() * TILE, "#f0dfa6");
    tex.refresh();
  }

  waterTile(key, seed) {
    const { tex, ctx } = makeCanvas(this, key, TILE, TILE);
    const r = mulberry32(seed);
    fill(ctx, TILE, TILE, "#3471a8");
    for (let i = 0; i < 50; i++) px(ctx, r() * TILE, r() * TILE, "#63a8d9");
    // wavelets
    for (let y = 4; y < TILE; y += 8) {
      const offset = (r() * 4) | 0;
      for (let x = offset; x < TILE; x += 6) rect(ctx, x, y, 2, 1, "#a6d4f0");
    }
    tex.refresh();
  }

  stoneTile(key, seed) {
    const { tex, ctx } = makeCanvas(this, key, TILE, TILE);
    const r = mulberry32(seed);
    fill(ctx, TILE, TILE, "#7a7f85");
    for (let i = 0; i < 40; i++) px(ctx, r() * TILE, r() * TILE, "#5c6066");
    for (let i = 0; i < 20; i++) px(ctx, r() * TILE, r() * TILE, "#9aa0a6");
    tex.refresh();
  }

  makeTrees() {
    const w = 32;
    const h = 48;
    const { tex, ctx } = makeCanvas(this, "obj_tree", w, h);
    // trunk
    rect(ctx, 14, 30, 4, 16, "#4a2a14");
    rect(ctx, 15, 30, 2, 16, "#6b3e21");
    // canopy - layered ellipses via rects
    this.blob(ctx, 16, 18, 13, 10, "#2a5218");
    this.blob(ctx, 16, 16, 11, 9, "#3c6e25");
    this.blob(ctx, 14, 14, 7, 6, "#5aa63a");
    // highlights
    px(ctx, 12, 12, "#8fd047");
    px(ctx, 20, 14, "#8fd047");
    tex.refresh();
  }

  makeRocks() {
    const w = 32;
    const h = 32;
    const { tex, ctx } = makeCanvas(this, "obj_rock", w, h);
    // irregular rounded rock
    this.blob(ctx, 16, 20, 12, 8, "#5c6066");
    this.blob(ctx, 16, 18, 10, 7, "#7a7f85");
    this.blob(ctx, 13, 15, 4, 3, "#9aa0a6");
    // shadow
    rect(ctx, 6, 26, 20, 2, "rgba(0,0,0,0.25)");
    tex.refresh();
  }

  makeResources() {
    // wood stack
    {
      const { tex, ctx } = makeCanvas(this, "res_wood", 32, 32);
      // shadow
      rect(ctx, 4, 26, 24, 3, "rgba(0,0,0,0.25)");
      // logs
      for (let row = 0; row < 3; row++) {
        const y = 8 + row * 6;
        for (let i = 0; i < 2; i++) {
          const x = 6 + i * 10;
          rect(ctx, x, y, 10, 6, "#6b3e21");
          rect(ctx, x + 1, y + 1, 8, 4, "#8a5a2d");
          px(ctx, x + 2, y + 2, "#4a2a14");
          px(ctx, x + 6, y + 3, "#4a2a14");
        }
      }
      tex.refresh();
    }
    // stone pile
    {
      const { tex, ctx } = makeCanvas(this, "res_stone", 32, 32);
      rect(ctx, 4, 26, 24, 3, "rgba(0,0,0,0.25)");
      this.blob(ctx, 12, 22, 7, 5, "#5c6066");
      this.blob(ctx, 20, 22, 7, 5, "#5c6066");
      this.blob(ctx, 16, 16, 8, 6, "#5c6066");
      this.blob(ctx, 12, 22, 5, 3, "#7a7f85");
      this.blob(ctx, 20, 22, 5, 3, "#7a7f85");
      this.blob(ctx, 16, 16, 6, 4, "#7a7f85");
      px(ctx, 10, 20, "#9aa0a6");
      px(ctx, 18, 14, "#9aa0a6");
      tex.refresh();
    }
  }

  makeBushes() {
    const { tex, ctx } = makeCanvas(this, "obj_berry_bush", 32, 32);
    rect(ctx, 6, 26, 20, 2, "rgba(0,0,0,0.25)");
    this.blob(ctx, 16, 20, 11, 8, "#2a5218");
    this.blob(ctx, 16, 18, 9, 7, "#3c6e25");
    this.blob(ctx, 13, 15, 5, 4, "#5aa63a");
    // berries
    px(ctx, 10, 18, "#c83c3c");
    px(ctx, 20, 20, "#c83c3c");
    px(ctx, 16, 22, "#c83c3c");
    px(ctx, 22, 16, "#c83c3c");
    tex.refresh();
  }

  makeCharacters() {
    // Palette variants for player + 4 NPC colors
    const variants = [
      { key: "char_player", shirt: "#e0a93c", pants: "#3a3c6e", hair: "#4a2a14" },
      { key: "char_npc_a", shirt: "#2e5ba8", pants: "#3a3c6e", hair: "#4a2a14" },
      { key: "char_npc_b", shirt: "#6b8f3c", pants: "#4a2a14", hair: "#a8823c" },
      { key: "char_npc_c", shirt: "#a83c3c", pants: "#2a2a2e", hair: "#e0c98a" },
      { key: "char_npc_d", shirt: "#8a5aa8", pants: "#3a3c6e", hair: "#3c3c3c" },
    ];
    // Each sprite is 32x32 with 4 direction frames: 0=down,1=up,2=left,3=right (right flipped from left)
    for (const v of variants) {
      this.character(v.key, v.shirt, v.pants, v.hair);
    }
  }

  character(key, shirt, pants, hair) {
    // sheet of 4 frames side-by-side: down, up, left, right
    const W = 32;
    const H = 32;
    const frames = 4;
    const { tex, ctx } = makeCanvas(this, key, W * frames, H);
    const skin = "#f0c090";
    const skinShade = "#c8905a";
    const outline = "#1b1028";

    const drawBase = (ox, dir) => {
      // shadow
      rect(ctx, ox + 10, 28, 12, 2, "rgba(0,0,0,0.3)");
      // pants 16..24
      rect(ctx, ox + 12, 20, 8, 6, outline);
      rect(ctx, ox + 13, 20, 6, 5, pants);
      // legs split
      px(ctx, ox + 15, 25, outline);
      px(ctx, ox + 16, 25, outline);
      // torso
      rect(ctx, ox + 11, 13, 10, 8, outline);
      rect(ctx, ox + 12, 14, 8, 6, shirt);
      // arms
      rect(ctx, ox + 10, 14, 2, 5, outline);
      rect(ctx, ox + 20, 14, 2, 5, outline);
      rect(ctx, ox + 10, 14, 1, 4, shirt);
      rect(ctx, ox + 21, 14, 1, 4, shirt);
      // head
      rect(ctx, ox + 12, 6, 8, 8, outline);
      rect(ctx, ox + 13, 7, 6, 6, skin);
      // hair based on dir
      if (dir === 0) {
        rect(ctx, ox + 12, 6, 8, 2, hair);
        px(ctx, ox + 12, 8, hair);
        px(ctx, ox + 19, 8, hair);
        // eyes
        px(ctx, ox + 14, 10, outline);
        px(ctx, ox + 17, 10, outline);
        // mouth
        px(ctx, ox + 16, 12, skinShade);
      } else if (dir === 1) {
        rect(ctx, ox + 12, 6, 8, 5, hair);
      } else {
        // side (left); right is drawn same and flipped at runtime
        rect(ctx, ox + 12, 6, 8, 3, hair);
        px(ctx, ox + 12, 9, hair);
        // one eye visible
        px(ctx, ox + 14, 10, outline);
        px(ctx, ox + 16, 12, skinShade);
      }
    };
    drawBase(0, 0);
    drawBase(W, 1);
    drawBase(W * 2, 2);
    drawBase(W * 3, 2); // right uses same pixels; runtime flipX
    tex.refresh();

    // register as spritesheet frames
    this.textures.get(key).add(0, 0, 0, 0, W, H); // down
    this.textures.get(key).add(1, 0, W, 0, W, H); // up
    this.textures.get(key).add(2, 0, W * 2, 0, W, H); // left
    this.textures.get(key).add(3, 0, W * 3, 0, W, H); // right
  }

  makeAnimals() {
    // Rabbit: 16x16, white body, long ears, small shadow.
    {
      const { tex, ctx } = makeCanvas(this, "animal_rabbit", 16, 16);
      rect(ctx, 3, 13, 10, 1, "rgba(0,0,0,0.3)");
      // body
      this.blob(ctx, 8, 10, 4, 3, "#1b1028");
      this.blob(ctx, 8, 10, 3, 2, "#ebe3d0");
      // tail
      px(ctx, 11, 10, "#ffffff");
      // head
      this.blob(ctx, 8, 7, 3, 2, "#1b1028");
      this.blob(ctx, 8, 7, 2, 2, "#f0e8d8");
      // ears
      rect(ctx, 6, 2, 1, 5, "#1b1028");
      rect(ctx, 7, 3, 1, 4, "#f0e8d8");
      rect(ctx, 9, 2, 1, 5, "#1b1028");
      rect(ctx, 10, 3, 1, 4, "#f0e8d8");
      px(ctx, 7, 4, "#f8b0a0");
      px(ctx, 10, 4, "#f8b0a0");
      // eyes + nose
      px(ctx, 7, 7, "#1b1028");
      px(ctx, 9, 7, "#1b1028");
      px(ctx, 8, 8, "#f06080");
      tex.refresh();
    }
    // Deer-ish: slightly larger, tan
    {
      const { tex, ctx } = makeCanvas(this, "animal_deer", 24, 24);
      rect(ctx, 5, 21, 14, 1, "rgba(0,0,0,0.3)");
      // body
      this.blob(ctx, 12, 16, 7, 4, "#1b1028");
      this.blob(ctx, 12, 16, 6, 3, "#a06a3a");
      // spots
      px(ctx, 9, 15, "#e0b070");
      px(ctx, 15, 16, "#e0b070");
      // legs (stumps)
      rect(ctx, 8, 18, 2, 3, "#1b1028");
      rect(ctx, 9, 18, 1, 3, "#6b3e21");
      rect(ctx, 14, 18, 2, 3, "#1b1028");
      rect(ctx, 15, 18, 1, 3, "#6b3e21");
      // neck + head
      rect(ctx, 16, 10, 3, 5, "#1b1028");
      rect(ctx, 17, 11, 1, 4, "#a06a3a");
      this.blob(ctx, 19, 9, 3, 2, "#1b1028");
      this.blob(ctx, 19, 9, 2, 2, "#c8884a");
      // antlers
      rect(ctx, 17, 5, 1, 4, "#4a2a14");
      rect(ctx, 18, 6, 1, 1, "#4a2a14");
      rect(ctx, 19, 4, 1, 4, "#4a2a14");
      rect(ctx, 20, 6, 1, 1, "#4a2a14");
      // eye
      px(ctx, 19, 9, "#1b1028");
      tex.refresh();
    }
  }

  makeHouse() {
    const W = 96;
    const H = 96;
    const { tex, ctx } = makeCanvas(this, "build_house", W, H);
    // shadow
    rect(ctx, 8, 88, 80, 4, "rgba(0,0,0,0.3)");
    // walls
    rect(ctx, 12, 44, 72, 48, "#1b1028");
    rect(ctx, 14, 46, 68, 44, "#c8a672");
    // wood grain
    for (let y = 50; y < 88; y += 6) rect(ctx, 16, y, 64, 1, "#a8865c");
    // roof: triangular, narrow peak at top, widest at the base meeting the walls
    const roofH = 30;
    const peakW = 4;
    const baseW = 80;
    for (let i = 0; i < roofH; i++) {
      const t = i / (roofH - 1);
      const w = Math.round(peakW + (baseW - peakW) * t);
      const x = Math.round((W - w) / 2);
      rect(ctx, x, 14 + i, w, 1, "#a83c3c");
      // dark sloped edges
      rect(ctx, x, 14 + i, 1, 1, "#1b1028");
      rect(ctx, x + w - 1, 14 + i, 1, 1, "#1b1028");
    }
    // roof highlight (thin pink band mid-slope on the left face)
    for (let i = 6; i < roofH - 4; i += 3) {
      const t = i / (roofH - 1);
      const w = Math.round(peakW + (baseW - peakW) * t);
      const x = Math.round((W - w) / 2);
      rect(ctx, x + 2, 14 + i, Math.min(3, w - 4), 1, "#c85050");
    }
    // base shadow under the roof eaves
    rect(ctx, 8, 43, 80, 1, "#1b1028");
    // chimney (sits on the right slope, sticks above)
    rect(ctx, 60, 2, 10, 24, "#1b1028");
    rect(ctx, 62, 4, 6, 22, "#7a7f85");
    // door
    rect(ctx, 42, 64, 12, 26, "#1b1028");
    rect(ctx, 44, 66, 8, 22, "#4a2a14");
    px(ctx, 50, 78, "#e0a93c"); // handle
    // windows
    for (const wx of [22, 64]) {
      rect(ctx, wx, 54, 10, 10, "#1b1028");
      rect(ctx, wx + 2, 56, 6, 6, "#63a8d9");
      rect(ctx, wx + 5, 54, 1, 10, "#1b1028");
      rect(ctx, wx, 58, 10, 1, "#1b1028");
    }
    tex.refresh();
  }

  makeIcons() {
    // Small 16x16 icons for the HUD resource counters.
    {
      // Wood log (icon_wood)
      const { tex, ctx } = makeCanvas(this, "icon_wood", 16, 16);
      rect(ctx, 2, 5, 12, 6, "#1b1028");
      rect(ctx, 3, 6, 10, 4, "#6b3e21");
      rect(ctx, 4, 7, 8, 2, "#8a5a2d");
      // end rings
      px(ctx, 3, 6, "#4a2a14");
      px(ctx, 3, 9, "#4a2a14");
      px(ctx, 12, 6, "#4a2a14");
      px(ctx, 12, 9, "#4a2a14");
      tex.refresh();
    }
    {
      // Stone chunk (icon_stone)
      const { tex, ctx } = makeCanvas(this, "icon_stone", 16, 16);
      this.blob(ctx, 8, 10, 6, 4, "#1b1028");
      this.blob(ctx, 8, 9, 5, 3, "#5c6066");
      this.blob(ctx, 8, 8, 4, 2, "#7a7f85");
      px(ctx, 6, 7, "#9aa0a6");
      px(ctx, 10, 9, "#9aa0a6");
      tex.refresh();
    }
    {
      // Apple / food (icon_food)
      const { tex, ctx } = makeCanvas(this, "icon_food", 16, 16);
      this.blob(ctx, 8, 9, 5, 5, "#1b1028");
      this.blob(ctx, 8, 9, 4, 4, "#c83c3c");
      this.blob(ctx, 6, 7, 2, 2, "#f06060");
      // stem
      rect(ctx, 8, 3, 1, 3, "#4a2a14");
      // leaf
      rect(ctx, 9, 4, 2, 1, "#3c6e25");
      px(ctx, 11, 3, "#3c6e25");
      tex.refresh();
    }
    {
      // Tiny house (icon_house)
      const { tex, ctx } = makeCanvas(this, "icon_house", 16, 16);
      // roof
      for (let i = 0; i < 5; i++) {
        const w = 2 + i * 2;
        const x = Math.round((16 - w) / 2);
        rect(ctx, x, 3 + i, w, 1, "#a83c3c");
        rect(ctx, x, 3 + i, 1, 1, "#1b1028");
        rect(ctx, x + w - 1, 3 + i, 1, 1, "#1b1028");
      }
      // walls
      rect(ctx, 3, 8, 10, 6, "#1b1028");
      rect(ctx, 4, 9, 8, 4, "#c8a672");
      rect(ctx, 7, 11, 2, 3, "#4a2a14"); // door
      tex.refresh();
    }
    {
      // Sword for Invade / combat actions (icon_sword) — for Phase C later
      const { tex, ctx } = makeCanvas(this, "icon_sword", 16, 16);
      rect(ctx, 7, 2, 2, 10, "#1b1028");
      rect(ctx, 8, 3, 1, 9, "#d0d8e0");
      rect(ctx, 5, 11, 6, 1, "#1b1028");
      rect(ctx, 6, 12, 4, 1, "#6b3e21");
      rect(ctx, 7, 13, 2, 2, "#4a2a14");
      tex.refresh();
    }
  }

  makeGhostTile() {
    const { tex, ctx } = makeCanvas(this, "ghost_ok", 96, 96);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#7af08a";
    ctx.fillRect(0, 0, 96, 96);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#7af08a";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 94, 94);
    tex.refresh();

    const bad = this.textures.createCanvas("ghost_bad", 96, 96);
    const bctx = bad.getContext();
    bctx.globalAlpha = 0.5;
    bctx.fillStyle = "#f04a4a";
    bctx.fillRect(0, 0, 96, 96);
    bctx.globalAlpha = 1;
    bctx.strokeStyle = "#f04a4a";
    bctx.lineWidth = 2;
    bctx.strokeRect(1, 1, 94, 94);
    bad.refresh();
  }

  blob(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
          ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
        }
      }
    }
  }
}
