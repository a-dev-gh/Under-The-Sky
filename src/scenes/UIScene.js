// HUD overlay: clock, house counter, touch joystick, build button.

export class UIScene extends Phaser.Scene {
  constructor() {
    super("UI");
  }

  create() {
    const game = this.scene.get("Game");
    this.game = game;
    this.cameras.main.transparent = true;
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    // Top bar: clock + phase + houses
    this.topBar = this.add.rectangle(0, 0, 10, 32, 0x0a0f20, 0.55).setOrigin(0, 0);
    this.clockText = this.add
      .text(12, 8, "Day 1 · Morning", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#f0e3c8",
      })
      .setOrigin(0, 0);
    this.houseText = this.add
      .text(0, 8, "Houses: 0", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#f0e3c8",
      })
      .setOrigin(0, 0);

    // Build button
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

    // Confirm place button (shown only in build mode on touch)
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

    // Virtual joystick (bottom-left). Active on touch, hidden on desktop until a touch.
    this.joyBase = this.add.circle(0, 0, 52, 0x000000, 0.35).setVisible(false);
    this.joyKnob = this.add.circle(0, 0, 26, 0xf0e3c8, 0.7).setVisible(false);
    this.joyActivePointer = null;
    this.joyCenter = { x: 0, y: 0 };

    this.input.on("pointerdown", (pointer) => {
      // only left half of screen triggers the joystick
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

    // Hints overlay (fades after 6s)
    this.hint = this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 70,
        "WASD / touch-drag to move · Tap an NPC to name + control them · B to build",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#e6e6e6",
          stroke: "#1b1028",
          strokeThickness: 3,
          align: "center",
        }
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
    game.events.on("housesChanged", (n) => {
      this.houseText.setText(`Houses: ${n}`);
    });

    this.dayNum = 1;
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
    this.topBar.setSize(w, 32);
    this.houseText.setPosition(w - 12, 8).setOrigin(1, 0);
    this.buildBtn.setPosition(w - 12, h - 12);
    this.buildBtnLabel.setPosition(w - 12 - 12, h - 12 - 12);
    this.confirmBtn.setPosition(w - 12 - 106, h - 12);
    this.confirmLabel.setPosition(w - 12 - 106 - 30, h - 12 - 12);
    if (this.hint) this.hint.setPosition(w / 2, h - 64);
  }

  update() {
    const tod = this.registry.get("timeOfDay");
    if (!tod) return;
    // derive day counter from cycle wrap
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
}
