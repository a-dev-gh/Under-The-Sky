import { TILE, MAP_COLS, MAP_ROWS } from "../main.js";

// HUD overlay: top bar, resource counters, minimap, touch joystick, build button.
// Runs on top of GameScene; its camera is transparent so the world renders
// through.

const MINIMAP_W = 160;
const MINIMAP_H = 120;

// tile id → minimap pixel color
const TILE_COLORS = [
  0x5aa63a, // grass
  0x4f9030, // grass_hill
  0x7a4f2a, // dirt
  0xe0c98a, // sand
  0x3471a8, // water
  0x7a7f85, // stone
];

export class UIScene extends Phaser.Scene {
  constructor() {
    super("UI");
  }

  create() {
    const game = this.scene.get("Game");
    this.game = game;
    this.cameras.main.transparent = true;
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    // --- Top bar ---
    this.topBar = this.add
      .rectangle(0, 0, 10, 40, 0x0a0f20, 0.7)
      .setOrigin(0, 0);
    this.groupText = this.add
      .text(12, 6, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#f0e3c8",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.clockText = this.add
      .text(12, 22, "Day · 0%", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#a8b0c8",
      })
      .setOrigin(0, 0);

    // --- Resource counters (top-center) ---
    this.resText = this.add
      .text(0, 12, "🪵 0   🪨 0   🍎 0   🏠 0", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#f0e3c8",
      })
      .setOrigin(0.5, 0);

    // --- Menu button (top-right) ---
    this.menuBtn = this.add
      .rectangle(0, 0, 72, 28, 0x3a4a6a, 0.9)
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.menuBtnLabel = this.add
      .text(0, 0, "Menu (M)", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#fff7c8",
      })
      .setOrigin(1, 0);
    this.menuBtn.on("pointerdown", () => {
      game.saveGame?.();
      this.scene.stop("Game");
      this.scene.stop("UI");
      this.scene.start("Title");
    });

    // --- Minimap (top-right, below top bar) ---
    this.makeMinimap();

    // --- Bottom-right build buttons ---
    this.buildBtn = this.add
      .rectangle(0, 0, 96, 40, 0x2e5ba8, 0.9)
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true });
    this.buildBtnLabel = this.add
      .text(0, 0, "Build (B)", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#fff7c8",
      })
      .setOrigin(1, 1);
    this.buildBtn.on("pointerdown", () => {
      game.events.emit("requestBuildToggle");
    });

    this.confirmBtn = this.add
      .rectangle(0, 0, 96, 40, 0x3e9b4a, 0.9)
      .setOrigin(1, 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.confirmLabel = this.add
      .text(0, 0, "Place", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#fff7c8",
      })
      .setOrigin(1, 1)
      .setVisible(false);
    this.confirmBtn.on("pointerdown", () => {
      game.events.emit("requestBuildConfirm");
    });

    // --- Virtual joystick (touch, bottom-left half of screen) ---
    this.joyBase = this.add.circle(0, 0, 52, 0x000000, 0.35).setVisible(false);
    this.joyKnob = this.add.circle(0, 0, 26, 0xf0e3c8, 0.7).setVisible(false);
    this.joyActivePointer = null;
    this.joyCenter = { x: 0, y: 0 };

    this.input.on("pointerdown", (pointer) => {
      if (this.hitMinimap(pointer)) {
        this.handleMinimapClick(pointer);
        return;
      }
      if (pointer.x < this.scale.width * 0.45 && !this.joyActivePointer) {
        this.joyActivePointer = pointer;
        this.joyCenter = { x: pointer.x, y: pointer.y };
        this.joyBase.setPosition(pointer.x, pointer.y).setVisible(true);
        this.joyKnob.setPosition(pointer.x, pointer.y).setVisible(true);
      }
    });
    this.input.on("pointermove", (pointer) => {
      if (this.joyActivePointer && pointer.id === this.joyActivePointer.id) {
        this.updateJoystick(pointer);
      }
    });
    this.input.on("pointerup", (pointer) => {
      if (this.joyActivePointer && pointer.id === this.joyActivePointer.id) {
        this.joyActivePointer = null;
        this.joyBase.setVisible(false);
        this.joyKnob.setVisible(false);
        this.registry.set("joystick", { x: 0, y: 0 });
      }
    });

    // --- Hint (fades) ---
    this.hint = this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 70,
        "WASD / touch-drag to move · Tap an NPC to claim · B to build · M for menu",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#e6e6e6",
          stroke: "#1b1028",
          strokeThickness: 3,
          align: "center",
        },
      )
      .setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: this.hint,
      alpha: 0,
      delay: 7000,
      duration: 1200,
    });

    this.layout();
    this.scale.on("resize", () => this.layout());

    game.events.on("buildMode", (on) => {
      this.confirmBtn.setVisible(on);
      this.confirmLabel.setVisible(on);
      this.buildBtnLabel.setText(on ? "Cancel" : "Build (B)");
    });
    game.events.on("housesChanged", () => this.refreshResources());

    this.refreshResources();
    this.groupText.setText(game.groupName || "Your Group");
  }

  refreshResources() {
    const g = this.game;
    const r = g.resources || { wood: 0, stone: 0, food: 0 };
    const houses = g.build?.buildings.length || 0;
    this.resText.setText(
      `🪵 ${r.wood}   🪨 ${r.stone}   🍎 ${r.food}   🏠 ${houses}`,
    );
  }

  // ---------- Minimap ----------
  makeMinimap() {
    this.minimap = this.add.container(0, 0).setDepth(500);
    const bg = this.add
      .rectangle(0, 0, MINIMAP_W + 4, MINIMAP_H + 4, 0x0a0f20, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4a6a);
    this.minimap.add(bg);

    // Static tile layer (drawn once from the GameScene map).
    this.minimapTiles = this.add.graphics();
    this.minimap.add(this.minimapTiles);
    const map = this.game.map;
    const sx = MINIMAP_W / MAP_COLS;
    const sy = MINIMAP_H / MAP_ROWS;
    this.minimapTiles.fillStyle(0x0a0f20, 1).fillRect(2, 2, MINIMAP_W, MINIMAP_H);
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const id = map.ground[y][x];
        this.minimapTiles.fillStyle(TILE_COLORS[id], 1);
        this.minimapTiles.fillRect(
          2 + Math.floor(x * sx),
          2 + Math.floor(y * sy),
          Math.ceil(sx),
          Math.ceil(sy),
        );
      }
    }
    // Draw static objects (trees / rocks) as tiny dots so minimap reads right.
    for (const obj of map.objects) {
      if (obj.kind === "tree") this.minimapTiles.fillStyle(0x2a5218, 1);
      else if (obj.kind === "rock") this.minimapTiles.fillStyle(0x5c6066, 1);
      else if (obj.kind === "wood") this.minimapTiles.fillStyle(0x8a5a2d, 1);
      else if (obj.kind === "stone_pile") this.minimapTiles.fillStyle(0x9aa0a6, 1);
      else if (obj.kind === "berry") this.minimapTiles.fillStyle(0xc83c3c, 1);
      this.minimapTiles.fillRect(
        2 + Math.floor(obj.gx * sx),
        2 + Math.floor(obj.gy * sy),
        Math.max(1, Math.floor(sx)),
        Math.max(1, Math.floor(sy)),
      );
    }

    // Dynamic overlay (player, NPCs, houses, viewport box).
    this.minimapDyn = this.add.graphics();
    this.minimap.add(this.minimapDyn);
  }

  updateMinimap() {
    if (!this.minimapDyn) return;
    const g = this.minimapDyn;
    g.clear();
    const map = this.game.map;
    const sx = MINIMAP_W / MAP_COLS;
    const sy = MINIMAP_H / MAP_ROWS;
    const toMx = (wx) => 2 + Math.floor((wx / TILE) * sx);
    const toMy = (wy) => 2 + Math.floor((wy / TILE) * sy);

    // Houses
    g.fillStyle(0xa83c3c, 1);
    for (const b of this.game.build.buildings) {
      g.fillRect(toMx(b.gx * TILE), toMy(b.gy * TILE), Math.ceil(sx * 3), Math.ceil(sy * 3));
    }
    // NPCs
    g.fillStyle(0xf0e3c8, 1);
    for (const npc of this.game.npcs) {
      g.fillRect(toMx(npc.sprite.x), toMy(npc.sprite.y), 2, 2);
    }
    // Player
    const p = this.game.player.sprite;
    g.fillStyle(0x3e9b4a, 1);
    g.fillRect(toMx(p.x) - 1, toMy(p.y) - 1, 3, 3);
    g.lineStyle(1, 0xffffff, 1);
    g.strokeRect(toMx(p.x) - 2, toMy(p.y) - 2, 5, 5);

    // Camera viewport rect
    const cam = this.game.cameras.main;
    const vx = cam.worldView.x;
    const vy = cam.worldView.y;
    const vw = cam.worldView.width;
    const vh = cam.worldView.height;
    g.lineStyle(1, 0xfff7c8, 0.9);
    g.strokeRect(
      toMx(vx),
      toMy(vy),
      Math.max(2, Math.floor((vw / TILE) * sx)),
      Math.max(2, Math.floor((vh / TILE) * sy)),
    );
  }

  hitMinimap(pointer) {
    if (!this.minimap) return false;
    const pos = this.minimap;
    return (
      pointer.x >= pos.x &&
      pointer.x <= pos.x + MINIMAP_W + 4 &&
      pointer.y >= pos.y &&
      pointer.y <= pos.y + MINIMAP_H + 4
    );
  }

  handleMinimapClick(pointer) {
    const lx = pointer.x - this.minimap.x - 2;
    const ly = pointer.y - this.minimap.y - 2;
    const wx = (lx / MINIMAP_W) * MAP_COLS * TILE;
    const wy = (ly / MINIMAP_H) * MAP_ROWS * TILE;
    this.game.cameras.main.pan(wx, wy, 400, "Sine.easeInOut");
  }

  updateJoystick(pointer) {
    const dx = pointer.x - this.joyCenter.x;
    const dy = pointer.y - this.joyCenter.y;
    const max = 52;
    const dist = Math.min(max, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    const kx = this.joyCenter.x + Math.cos(ang) * dist;
    const ky = this.joyCenter.y + Math.sin(ang) * dist;
    this.joyKnob.setPosition(kx, ky);
    const nx = (dist / max) * Math.cos(ang);
    const ny = (dist / max) * Math.sin(ang);
    const dead = 0.18;
    this.registry.set("joystick", {
      x: Math.abs(nx) < dead ? 0 : nx,
      y: Math.abs(ny) < dead ? 0 : ny,
    });
  }

  layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.topBar.setSize(w, 40);
    this.menuBtn.setPosition(w - 12, 6);
    this.menuBtnLabel.setPosition(w - 12 - 12, 14);
    this.resText.setPosition(w / 2, 12);
    if (this.minimap) this.minimap.setPosition(w - MINIMAP_W - 16, 48);
    this.buildBtn.setPosition(w - 12, h - 12);
    this.buildBtnLabel.setPosition(w - 12 - 12, h - 12 - 12);
    this.confirmBtn.setPosition(w - 12 - 106, h - 12);
    this.confirmLabel.setPosition(w - 12 - 106 - 30, h - 12 - 12);
    if (this.hint) this.hint.setPosition(w / 2, h - 64);
  }

  update() {
    const tod = this.registry.get("timeOfDay");
    if (tod) {
      const label =
        tod.phase === "day"
          ? "Day"
          : tod.phase === "dusk"
            ? "Dusk"
            : tod.phase === "night"
              ? "Night"
              : "Dawn";
      this.clockText.setText(`${label} · ${Math.floor(tod.t * 100)}%`);
    }
    this.updateMinimap();
  }
}
