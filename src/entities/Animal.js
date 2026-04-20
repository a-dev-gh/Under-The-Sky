import { TILE } from "../main.js";
import { WORLD_COLS, WORLD_ROWS } from "../world/World.js";

// Passive ambient animals: wander, flee when player gets close.
// Interface mirrors NPC so GameScene.update can iterate uniformly.

export class Animal {
  constructor(scene, x, y, key, options = {}) {
    this.scene = scene;
    this.key = key;
    this.sprite = scene.physics.add.sprite(x, y, key);
    this.sprite.setDepth(y);
    const isDeer = key === "animal_deer";
    this.sprite.setSize(isDeer ? 12 : 8, isDeer ? 6 : 4);
    this.sprite.setOffset(isDeer ? 6 : 4, isDeer ? 15 : 10);
    this.sprite.setCollideWorldBounds(true);
    this.wanderSpeed = options.wanderSpeed ?? (isDeer ? 40 : 55);
    this.fleeSpeed = options.fleeSpeed ?? (isDeer ? 110 : 150);
    this.fleeRange = options.fleeRange ?? (isDeer ? 120 : 80);
    this.mode = "idle";
    this.timer = 0;
    this.target = null;
    this.walkPhase = Math.random() * 1000;
  }

  update(dt, player) {
    const ps = player.sprite;
    const dx = this.sprite.x - ps.x;
    const dy = this.sprite.y - ps.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.fleeRange && dist > 0.1) {
      // Flee directly away from the player, capped at fleeSpeed.
      const nx = dx / dist;
      const ny = dy / dist;
      this.sprite.setVelocity(nx * this.fleeSpeed, ny * this.fleeSpeed);
      this.mode = "flee";
      this.timer = 500;
      this.bob(dt, true);
      this.sprite.setDepth(this.sprite.y);
      if (nx > 0.2) this.sprite.setFlipX(false);
      else if (nx < -0.2) this.sprite.setFlipX(true);
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.mode === "idle" || this.mode === "flee") {
        // pick a new wander target within ~100 px
        const angle = Math.random() * Math.PI * 2;
        const d = 32 + Math.random() * 80;
        let tx = this.sprite.x + Math.cos(angle) * d;
        let ty = this.sprite.y + Math.sin(angle) * d;
        const worldW = WORLD_COLS * TILE;
        const worldH = WORLD_ROWS * TILE;
        tx = Math.min(worldW - 16, Math.max(16, tx));
        ty = Math.min(worldH - 16, Math.max(16, ty));
        this.target = { x: tx, y: ty };
        this.mode = "walk";
        this.timer = 2500 + Math.random() * 1800;
      } else {
        this.sprite.setVelocity(0, 0);
        this.mode = "idle";
        this.timer = 2000 + Math.random() * 3500;
      }
    }

    if (this.mode === "walk" && this.target) {
      const tx = this.target.x - this.sprite.x;
      const ty = this.target.y - this.sprite.y;
      const d = Math.hypot(tx, ty);
      if (d < 3) {
        this.sprite.setVelocity(0, 0);
        this.mode = "idle";
        this.timer = 2000 + Math.random() * 3000;
      } else {
        this.sprite.setVelocity((tx / d) * this.wanderSpeed, (ty / d) * this.wanderSpeed);
        if (tx > 0.2) this.sprite.setFlipX(false);
        else if (tx < -0.2) this.sprite.setFlipX(true);
      }
    } else {
      this.sprite.setVelocity(0, 0);
    }
    this.bob(dt, this.mode !== "idle");
    this.sprite.setDepth(this.sprite.y);
  }

  bob(dt, moving) {
    this.walkPhase += dt;
    const bob = moving ? (Math.floor(this.walkPhase / 120) % 2 === 0 ? 0 : -1) : 0;
    const h = this.sprite.height;
    this.sprite.setDisplayOrigin(this.sprite.width / 2, h / 2 + bob);
  }
}
