export class CreditsScene extends Phaser.Scene {
  constructor() {
    super("Credits");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1020");
    const W = this.scale.width;
    const H = this.scale.height;

    this.add
      .text(W / 2, H * 0.15, "Credits", {
        fontSize: "36px",
        color: "#f0e3c8",
        fontFamily: "system-ui, sans-serif",
        stroke: "#1b1028",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const lines = [
      "A top-down survival town-builder.",
      "",
      "Design & direction — you.",
      "Programming — Claude (Anthropic).",
      "Engine — Phaser 3.",
      "Placeholder pixel art — procedural at boot.",
      "",
      "Swap in real sprites any time in /assets/sprites.",
    ];
    lines.forEach((line, i) => {
      this.add
        .text(W / 2, H * 0.28 + i * 26, line, {
          fontSize: "14px",
          color: "#a8b0c8",
          fontFamily: "system-ui, sans-serif",
        })
        .setOrigin(0.5);
    });

    const bg = this.add
      .rectangle(W / 2, H * 0.85, 140, 40, 0x2e5ba8, 0.95)
      .setStrokeStyle(2, 0x6f90c8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(W / 2, H * 0.85, "Back", {
        fontSize: "16px",
        color: "#fff7c8",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);
    bg.on("pointerdown", () => this.scene.start("Title"));
  }
}
