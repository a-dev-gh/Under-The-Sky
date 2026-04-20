import { hasSave, loadSave } from "../systems/Save.js";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1020");
    this.drawStarfield();
    this.layout();
    this.scale.on("resize", () => this.layout());
  }

  drawStarfield() {
    const g = this.add.graphics();
    g.setDepth(-1);
    g.setScrollFactor(0);
    // simple star pattern using seeded rng
    let s = 1337;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return (s & 0xffffff) / 0x1000000;
    };
    const W = this.scale.width;
    const H = this.scale.height;
    for (let i = 0; i < 200; i++) {
      const x = rand() * W;
      const y = rand() * H * 0.7;
      const bright = rand();
      const c = bright > 0.9 ? 0xfff7c8 : bright > 0.7 ? 0xa8c0e0 : 0x4a5a70;
      g.fillStyle(c, 0.9);
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    // horizon silhouette
    g.fillStyle(0x1a2438, 1);
    g.fillRect(0, H * 0.7, W, H * 0.3);
    this.starfield = g;
  }

  layout() {
    if (this.group) this.group.destroy();
    const W = this.scale.width;
    const H = this.scale.height;
    this.group = this.add.container(0, 0);

    const title = this.add
      .text(W / 2, H * 0.22, "Under the Sky", {
        fontSize: "56px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#f0e3c8",
        stroke: "#1b1028",
        strokeThickness: 6,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(W / 2, H * 0.3, "A town built one brick at a time", {
        fontSize: "16px",
        fontFamily: "system-ui, sans-serif",
        color: "#a8b0c8",
      })
      .setOrigin(0.5);
    this.group.add([title, subtitle]);

    const makeBtn = (y, label, onClick, disabled = false) => {
      const bg = this.add
        .rectangle(W / 2, y, 260, 54, disabled ? 0x2a3454 : 0x2e5ba8, 0.95)
        .setStrokeStyle(2, 0x6f90c8);
      const txt = this.add
        .text(W / 2, y, label, {
          fontSize: "20px",
          fontFamily: "system-ui, sans-serif",
          color: disabled ? "#6a7290" : "#fff7c8",
        })
        .setOrigin(0.5);
      if (!disabled) {
        bg.setInteractive({ useHandCursor: true });
        bg.on("pointerover", () => bg.setFillStyle(0x4070c0, 0.95));
        bg.on("pointerout", () => bg.setFillStyle(0x2e5ba8, 0.95));
        bg.on("pointerdown", onClick);
      }
      this.group.add([bg, txt]);
      return bg;
    };

    const save = loadSave();
    const hasExistingSave = hasSave();

    let y = H * 0.45;
    makeBtn(y, "New Game", () => this.scene.start("NewGame"));
    y += 70;
    makeBtn(
      y,
      hasExistingSave && save ? `Continue (${save.groupName})` : "Continue",
      () => {
        if (!save) return;
        this.registry.set("groupName", save.groupName);
        this.registry.set("seed", save.seed);
        this.registry.set("mapType", save.mapType || "forest");
        this.registry.set("resumed", true);
        this.scene.start("Game");
      },
      !hasExistingSave,
    );
    y += 70;
    makeBtn(y, "Credits", () => this.scene.start("Credits"));

    const version = this.add
      .text(W - 12, H - 10, "v0.2 · by you & Claude", {
        fontSize: "11px",
        color: "#4a5a70",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(1, 1);
    this.group.add(version);
  }
}
