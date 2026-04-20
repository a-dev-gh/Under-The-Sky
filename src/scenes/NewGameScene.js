import { randomGroupName, randomSeedString } from "../systems/Seed.js";

export class NewGameScene extends Phaser.Scene {
  constructor() {
    super("NewGame");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1020");
    this.groupName = randomGroupName();
    this.seed = randomSeedString();
    this.mapType = "forest";
    this.layout();
    this.scale.on("resize", () => {
      this.destroyChildren();
      this.layout();
    });
  }

  destroyChildren() {
    if (this.group) this.group.destroy(true);
    this.group = null;
  }

  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.group = this.add.container(0, 0);

    const title = this.add
      .text(W / 2, H * 0.1, "New Game", {
        fontSize: "36px",
        fontFamily: "system-ui, sans-serif",
        color: "#f0e3c8",
        stroke: "#1b1028",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.group.add(title);

    const labelStyle = {
      fontSize: "14px",
      fontFamily: "system-ui, sans-serif",
      color: "#a8b0c8",
    };
    const valueStyle = {
      fontSize: "20px",
      fontFamily: "system-ui, sans-serif",
      color: "#fff7c8",
      backgroundColor: "#1a2540",
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
    };

    const labelX = W * 0.5 - 220;
    const valueX = W * 0.5 - 100;

    // Group name
    let y = H * 0.28;
    const gLabel = this.add.text(labelX, y, "Group name", labelStyle).setOrigin(0, 0.5);
    this.groupLabel = this.add.text(valueX, y, this.groupName, valueStyle).setOrigin(0, 0.5);
    this.group.add([gLabel, this.groupLabel]);
    this.pairBtn(W * 0.5 + 200, y, "Random", () => {
      this.groupName = randomGroupName();
      this.groupLabel.setText(this.groupName);
    });
    this.pairBtn(W * 0.5 + 280, y, "Edit", () => {
      const n = window.prompt("Enter a group name:", this.groupName);
      if (n && n.trim()) {
        this.groupName = n.trim().slice(0, 40);
        this.groupLabel.setText(this.groupName);
      }
    });

    // Seed
    y = H * 0.4;
    const sLabel = this.add.text(labelX, y, "World seed", labelStyle).setOrigin(0, 0.5);
    this.seedLabel = this.add.text(valueX, y, this.seed, valueStyle).setOrigin(0, 0.5);
    this.group.add([sLabel, this.seedLabel]);
    this.pairBtn(W * 0.5 + 200, y, "Random", () => {
      this.seed = randomSeedString();
      this.seedLabel.setText(this.seed);
    });
    this.pairBtn(W * 0.5 + 280, y, "Edit", () => {
      const n = window.prompt("Enter a seed (any text):", this.seed);
      if (n && n.trim()) {
        this.seed = n.trim().slice(0, 40);
        this.seedLabel.setText(this.seed);
      }
    });

    // Map type
    y = H * 0.54;
    const mLabel = this.add.text(labelX, y, "Map", labelStyle).setOrigin(0, 0.5);
    this.group.add(mLabel);
    const maps = [
      { id: "forest", label: "Forest", enabled: true },
      { id: "river", label: "River (soon)", enabled: false },
      { id: "mountain", label: "Mountain (soon)", enabled: false },
    ];
    this.mapBtns = [];
    maps.forEach((m, i) => {
      const btn = this.selectBtn(
        valueX + i * 130,
        y,
        m.label,
        m.enabled,
        this.mapType === m.id,
        () => {
          if (!m.enabled) return;
          this.mapType = m.id;
          this.mapBtns.forEach((b) =>
            b.setSelected(b._id === m.id)
          );
        },
      );
      btn._id = m.id;
      this.mapBtns.push(btn);
    });

    // Start + back
    this.startBtn = this.primaryBtn(W / 2, H * 0.75, "Start Adventure", () => {
      this.registry.set("groupName", this.groupName);
      this.registry.set("seed", this.seed);
      this.registry.set("mapType", this.mapType);
      this.registry.set("resumed", false);
      this.scene.start("Game");
    });
    this.backBtn = this.secondaryBtn(W / 2, H * 0.86, "Back", () =>
      this.scene.start("Title")
    );

    // Hint
    const hint = this.add
      .text(
        W / 2,
        H * 0.94,
        "The seed controls where trees, hills, and the pond appear. Same seed = same map.",
        {
          fontSize: "11px",
          color: "#6080a0",
          fontFamily: "system-ui, sans-serif",
        },
      )
      .setOrigin(0.5);
    this.group.add(hint);
  }

  pairBtn(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 70, 32, 0x3a4a6a, 0.95)
      .setStrokeStyle(1, 0x6f90c8)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontSize: "13px",
        color: "#fff7c8",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(0x5a7090, 0.95));
    bg.on("pointerout", () => bg.setFillStyle(0x3a4a6a, 0.95));
    bg.on("pointerdown", onClick);
    this.group.add([bg, txt]);
    return bg;
  }

  selectBtn(x, y, label, enabled, selected, onClick) {
    const fill = enabled ? (selected ? 0x3e9b4a : 0x2e5ba8) : 0x2a3040;
    const bg = this.add
      .rectangle(x, y, 120, 36, fill, 0.95)
      .setStrokeStyle(2, selected ? 0xb0e0b0 : 0x6f90c8);
    const txt = this.add
      .text(x, y, label, {
        fontSize: "13px",
        color: enabled ? "#fff7c8" : "#6a7290",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", onClick);
    }
    this.group.add([bg, txt]);
    return Object.assign(bg, {
      setSelected(sel) {
        bg.setFillStyle(sel ? 0x3e9b4a : 0x2e5ba8, 0.95);
        bg.setStrokeStyle(2, sel ? 0xb0e0b0 : 0x6f90c8);
      },
    });
  }

  primaryBtn(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 300, 54, 0x3e9b4a, 0.95)
      .setStrokeStyle(2, 0xb0e0b0)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontSize: "20px",
        color: "#fff7c8",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(0x4fb85b, 0.95));
    bg.on("pointerout", () => bg.setFillStyle(0x3e9b4a, 0.95));
    bg.on("pointerdown", onClick);
    this.group.add([bg, txt]);
    return bg;
  }

  secondaryBtn(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 140, 36, 0x3a4a6a, 0.95)
      .setStrokeStyle(1, 0x6f90c8)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontSize: "14px",
        color: "#fff7c8",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);
    bg.on("pointerdown", onClick);
    this.group.add([bg, txt]);
    return bg;
  }
}
