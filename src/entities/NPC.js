import { Character } from "./Character.js";

// Wandering NPC: picks a random target nearby, walks to it, idles, repeats.
// Tap to "claim" one as the player-controlled character.

const NPC_NAMES = [
  "Arin", "Bryn", "Cael", "Dara", "Elin", "Finn", "Gale", "Halda",
  "Iver", "Jona", "Kai", "Lior", "Mira", "Nell", "Orin", "Pax",
  "Quin", "Ran", "Sela", "Tove", "Ulla", "Vara", "Wen", "Yara",
];

export class NPC extends Character {
  constructor(scene, x, y, textureKey) {
    super(scene, x, y, textureKey);
    this.speed = 42;
    this.mode = "idle";
    this.timer = 0;
    this.target = null;
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.owner = this;
    this.defaultName = Phaser.Utils.Array.GetRandom(NPC_NAMES);
    this.setName(this.defaultName);
  }

  update(dt, worldBounds) {
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.mode === "idle") {
        // pick a nearby target within 120 px
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 100;
        let tx = this.sprite.x + Math.cos(angle) * dist;
        let ty = this.sprite.y + Math.sin(angle) * dist;
        tx = Phaser.Math.Clamp(tx, 32, worldBounds.width - 32);
        ty = Phaser.Math.Clamp(ty, 32, worldBounds.height - 32);
        this.target = { x: tx, y: ty };
        this.mode = "walk";
        this.timer = 3000 + Math.random() * 2000;
      } else {
        this.setVelocity(0, 0);
        this.mode = "idle";
        this.timer = 1200 + Math.random() * 2800;
      }
    }

    if (this.mode === "walk" && this.target) {
      const dx = this.target.x - this.sprite.x;
      const dy = this.target.y - this.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) {
        this.setVelocity(0, 0);
        this.mode = "idle";
        this.timer = 1000 + Math.random() * 2500;
      } else {
        this.setVelocity((dx / d) * this.speed, (dy / d) * this.speed);
      }
    } else {
      this.setVelocity(0, 0);
    }
  }
}
