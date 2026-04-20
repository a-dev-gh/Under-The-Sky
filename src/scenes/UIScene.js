import { TILE } from "../constants.js";
import {
  WORLD_COLS,
  WORLD_ROWS,
  CHUNK_COLS,
  CHUNK_ROWS,
  WORLD_CHUNKS_X,
  WORLD_CHUNKS_Y,
} from "../world/World.js";
import { BUILDING_TYPES, BUILDABLE_KEYS } from "../buildings/BuildingTypes.js";

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

    // --- Resource counters (top-center). Real pixel icons + number per slot. ---
    this.resIcons = {};
    this.resGroup = this.add.container(0, 0);
    const addIcon = (key, iconKey) => {
      const icon = this.add.image(0, 20, iconKey).setOrigin(0, 0.5).setScale(1.25);
      const txt = this.add
        .text(0, 20, "0", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#f0e3c8",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);
      this.resGroup.add([icon, txt]);
      this.resIcons[key] = { icon, txt };
    };
    addIcon("wood", "icon_wood");
    addIcon("stone", "icon_stone");
    addIcon("food", "icon_food");
    addIcon("houses", "icon_house");

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

    // --- Bottom-center build menu (one tab per buildable type) ---
    this.makeBuildMenu();

    // Cancel + Place buttons (visible only during active build mode).
    this.cancelBtn = this.add
      .rectangle(0, 0, 96, 40, 0xa83c3c, 0.9)
      .setOrigin(1, 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.cancelLabel = this.add
      .text(0, 0, "Cancel", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#fff7c8",
      })
      .setOrigin(1, 1)
      .setVisible(false);
    this.cancelBtn.on("pointerdown", () => game.events.emit("requestBuildToggle"));

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

    // --- Building info panel (shown when a placed building is clicked) ---
    this.makeInfoPanel();

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
      // Joystick only activates in the left 40% of the screen AND above the
      // bottom bar, so it doesn't conflict with the build menu / action
      // buttons in the bottom strip.
      const w = this.scale.width;
      const h = this.scale.height;
      if (
        pointer.x < w * 0.4 &&
        pointer.y < h - 90 &&
        pointer.y > 40 &&
        !this.joyActivePointer
      ) {
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
        "WASD or drag to move · Tap an NPC to claim · 1/2/3 or bar below to build · Click a building for info · M = menu",
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

    game.events.on("buildMode", (on, typeKey) => {
      this.confirmBtn.setVisible(on);
      this.confirmLabel.setVisible(on);
      this.cancelBtn.setVisible(on);
      this.cancelLabel.setVisible(on);
      this.highlightBuildSelection(on ? typeKey : null);
    });
    game.events.on("buildingsChanged", () => this.refreshResources());
    game.events.on("buildingClicked", (record) => this.showInfoPanel(record));
    game.events.on("closeBuildingPanel", () => this.hideInfoPanel());

    this.refreshResources();
    this.groupText.setText(game.groupName || "Your Group");
  }

  // ---------- Building menu ----------
  makeBuildMenu() {
    this.buildMenuGroup = this.add.container(0, 0);
    this.buildMenuButtons = {};

    const itemW = 92;
    const itemH = 54;

    BUILDABLE_KEYS.forEach((key, i) => {
      const type = BUILDING_TYPES[key];
      const container = this.add.container(0, 0);
      const bg = this.add
        .rectangle(0, 0, itemW, itemH, 0x0a0f20, 0.85)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4a6a)
        .setInteractive({ useHandCursor: true });
      // Mini thumbnail of the building (shrunken texture image).
      const thumb = this.add
        .image(itemW / 2, itemH / 2 - 4, type.texture)
        .setOrigin(0.5, 0.5)
        .setScale(0.32);
      const label = this.add
        .text(itemW / 2, itemH - 8, `${i + 1}. ${type.name}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "10px",
          color: "#fff7c8",
        })
        .setOrigin(0.5, 1);
      bg.on("pointerover", () => bg.setFillStyle(0x2a3454, 0.9));
      bg.on("pointerout", () => {
        if (this._activeBuildKey !== key) bg.setFillStyle(0x0a0f20, 0.85);
      });
      bg.on("pointerdown", () => this.game.events.emit("requestStartBuild", key));
      container.add([bg, thumb, label]);
      this.buildMenuGroup.add(container);
      this.buildMenuButtons[key] = { container, bg, thumb, label };
    });
  }

  highlightBuildSelection(activeKey) {
    this._activeBuildKey = activeKey;
    for (const [key, btn] of Object.entries(this.buildMenuButtons)) {
      if (key === activeKey) {
        btn.bg.setFillStyle(0x3e9b4a, 0.95);
        btn.bg.setStrokeStyle(2, 0xb0e0b0);
      } else {
        btn.bg.setFillStyle(0x0a0f20, 0.85);
        btn.bg.setStrokeStyle(1, 0x3a4a6a);
      }
    }
  }

  // ---------- Building info panel ----------
  makeInfoPanel() {
    this.infoPanel = this.add.container(0, 0).setVisible(false).setDepth(600);
    const panelW = 260;
    const panelH = 190;
    const bg = this.add
      .rectangle(0, 0, panelW, panelH, 0x0a0f20, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x6f90c8);
    const close = this.add
      .text(panelW - 10, 6, "✕", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#a8b0c8",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.hideInfoPanel());

    this.infoThumb = this.add
      .image(48, 56, "build_house")
      .setOrigin(0.5, 0.5)
      .setScale(0.55);

    this.infoTitle = this.add
      .text(92, 16, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#f0e3c8",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.infoCapacity = this.add
      .text(92, 42, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#a8b0c8",
      })
      .setOrigin(0, 0);
    this.infoDesc = this.add
      .text(12, 108, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        color: "#e6e6e6",
        wordWrap: { width: panelW - 24 },
      })
      .setOrigin(0, 0);

    this.upgradeBtn = this.add
      .rectangle(panelW / 2, panelH - 20, 160, 28, 0x2a3454, 0.9)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, 0x3a4a6a);
    this.upgradeLabel = this.add
      .text(panelW / 2, panelH - 20, "Upgrade (coming soon)", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        color: "#6a7290",
      })
      .setOrigin(0.5, 0.5);

    this.infoPanel.add([
      bg,
      close,
      this.infoThumb,
      this.infoTitle,
      this.infoCapacity,
      this.infoDesc,
      this.upgradeBtn,
      this.upgradeLabel,
    ]);
  }

  showInfoPanel(record) {
    const type = record.typeData;
    this.infoThumb.setTexture(type.texture);
    this.infoTitle.setText(type.name);
    this.infoCapacity.setText(
      `Capacity: ${record.occupants.length} / ${record.capacity}${type.tier ? `   ·   Tier ${type.tier}` : ""}`,
    );
    this.infoDesc.setText(type.description || "");
    // Position panel centered-left of the screen, below the top bar.
    this.infoPanel.setPosition(
      Math.max(12, Math.min(this.scale.width - 272, this.scale.width / 2 - 130)),
      54,
    );
    this.infoPanel.setVisible(true);
    this._infoRecord = record;
  }

  hideInfoPanel() {
    this.infoPanel.setVisible(false);
    this._infoRecord = null;
  }

  refreshResources() {
    const g = this.game;
    const r = g.resources || { wood: 0, stone: 0, food: 0 };
    const houses = g.build?.countOf("house") || 0;
    this.resIcons.wood.txt.setText(`${r.wood}`);
    this.resIcons.stone.txt.setText(`${r.stone}`);
    this.resIcons.food.txt.setText(`${r.food}`);
    this.resIcons.houses.txt.setText(`${houses}`);
    if (this._infoRecord) {
      // refresh capacity line if info panel is open
      this.showInfoPanel(this._infoRecord);
    }
  }

  // ---------- Minimap ----------
  makeMinimap() {
    this.minimap = this.add.container(0, 0).setDepth(500);
    const bg = this.add
      .rectangle(0, 0, MINIMAP_W + 4, MINIMAP_H + 4, 0x0a0f20, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4a6a);
    this.minimap.add(bg);

    // Static tile layer (drawn once from the world).
    this.minimapTiles = this.add.graphics();
    this.minimap.add(this.minimapTiles);
    const world = this.game.world;
    const sx = MINIMAP_W / WORLD_COLS;
    const sy = MINIMAP_H / WORLD_ROWS;
    this.minimapTiles.fillStyle(0x0a0f20, 1).fillRect(2, 2, MINIMAP_W, MINIMAP_H);
    for (let cy = 0; cy < WORLD_CHUNKS_Y; cy++) {
      for (let cx = 0; cx < WORLD_CHUNKS_X; cx++) {
        const chunk = world.chunks[cy][cx];
        for (let y = 0; y < CHUNK_ROWS; y++) {
          for (let x = 0; x < CHUNK_COLS; x++) {
            const id = chunk.ground[y][x];
            const gx = cx * CHUNK_COLS + x;
            const gy = cy * CHUNK_ROWS + y;
            this.minimapTiles.fillStyle(TILE_COLORS[id], 1);
            this.minimapTiles.fillRect(
              2 + Math.floor(gx * sx),
              2 + Math.floor(gy * sy),
              Math.max(1, Math.ceil(sx)),
              Math.max(1, Math.ceil(sy)),
            );
          }
        }
      }
    }
    // Chunk borders (faint grid) so player can see the world structure.
    this.minimapTiles.lineStyle(1, 0x000000, 0.35);
    for (let cy = 1; cy < WORLD_CHUNKS_Y; cy++) {
      const y = 2 + Math.floor(cy * CHUNK_ROWS * sy);
      this.minimapTiles.lineBetween(2, y, 2 + MINIMAP_W, y);
    }
    for (let cx = 1; cx < WORLD_CHUNKS_X; cx++) {
      const x = 2 + Math.floor(cx * CHUNK_COLS * sx);
      this.minimapTiles.lineBetween(x, 2, x, 2 + MINIMAP_H);
    }
    // Tree / rock dots across the whole world.
    const objects = this.game.map.objects;
    for (const obj of objects) {
      if (obj.kind === "tree") this.minimapTiles.fillStyle(0x2a5218, 1);
      else if (obj.kind === "rock") this.minimapTiles.fillStyle(0x5c6066, 1);
      else if (obj.kind === "wood") this.minimapTiles.fillStyle(0x8a5a2d, 1);
      else if (obj.kind === "stone_pile") this.minimapTiles.fillStyle(0x9aa0a6, 1);
      else if (obj.kind === "berry") this.minimapTiles.fillStyle(0xc83c3c, 1);
      else continue;
      this.minimapTiles.fillRect(
        2 + Math.floor(obj.gx * sx),
        2 + Math.floor(obj.gy * sy),
        1,
        1,
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
    const sx = MINIMAP_W / WORLD_COLS;
    const sy = MINIMAP_H / WORLD_ROWS;
    const toMx = (wx) => 2 + Math.floor((wx / TILE) * sx);
    const toMy = (wy) => 2 + Math.floor((wy / TILE) * sy);

    // Buildings colored by type
    const BUILDING_COLORS = {
      town_point: 0xe0c98a,
      house: 0xa83c3c,
      cart_shop: 0xd08040,
      general_store: 0x2e5ba8,
    };
    for (const b of this.game.build.buildings) {
      const c = BUILDING_COLORS[b.type] || 0xa83c3c;
      g.fillStyle(c, 1);
      g.fillRect(
        toMx(b.gx * TILE),
        toMy(b.gy * TILE),
        Math.max(2, Math.ceil(sx * 3)),
        Math.max(2, Math.ceil(sy * 3)),
      );
    }
    // NPCs
    g.fillStyle(0xf0e3c8, 1);
    for (const npc of this.game.npcs) {
      g.fillRect(toMx(npc.sprite.x), toMy(npc.sprite.y), 2, 2);
    }
    // Animals (pale pink for rabbits, tan for deer)
    if (this.game.animals) {
      for (const a of this.game.animals) {
        g.fillStyle(a.key === "animal_deer" ? 0xa06a3a : 0xf8b0a0, 1);
        g.fillRect(toMx(a.sprite.x), toMy(a.sprite.y), 1, 1);
      }
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
    const wx = (lx / MINIMAP_W) * WORLD_COLS * TILE;
    const wy = (ly / MINIMAP_H) * WORLD_ROWS * TILE;
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
    const order = ["wood", "stone", "food", "houses"];
    const slotW = 70;
    const totalW = slotW * order.length;
    const startX = w / 2 - totalW / 2;
    order.forEach((key, i) => {
      const { icon, txt } = this.resIcons[key];
      icon.setPosition(startX + i * slotW, 20);
      txt.setPosition(startX + i * slotW + 24, 20);
    });
    if (this.minimap) this.minimap.setPosition(w - MINIMAP_W - 16, 48);

    // Build menu — horizontal row bottom-center, 92 px wide per item.
    const keys = Object.keys(this.buildMenuButtons);
    const itemW = 92;
    const gap = 8;
    const totalMenuW = keys.length * itemW + (keys.length - 1) * gap;
    const menuX = w / 2 - totalMenuW / 2;
    const menuY = h - 70;
    keys.forEach((key, i) => {
      const btn = this.buildMenuButtons[key];
      btn.container.setPosition(menuX + i * (itemW + gap), menuY);
    });

    // Cancel + Place buttons (right side, appear in build mode)
    this.cancelBtn.setPosition(w - 12, h - 12);
    this.cancelLabel.setPosition(w - 12 - 30, h - 12 - 12);
    this.confirmBtn.setPosition(w - 12 - 106, h - 12);
    this.confirmLabel.setPosition(w - 12 - 106 - 30, h - 12 - 12);

    if (this.hint) this.hint.setPosition(w / 2, menuY - 16);
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
