// Base humanoid sprite wrapping a Phaser Arcade physics sprite.
// Handles 4-direction facing (down/up/left/right) using the spritesheet frames
// created in BootScene.

export const DIR = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };

export class Character {
  constructor(scene, x, y, textureKey) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, textureKey, 0);
    this.sprite.setDepth(y);
    this.sprite.setSize(10, 8);
    this.sprite.setOffset(11, 20);
    this.sprite.owner = this;
    this.dir = DIR.DOWN;
    this.speed = 96;
    this.name = null;
    this.nameLabel = null;
  }

  setVelocity(vx, vy) {
    this.sprite.setVelocity(vx, vy);
    if (Math.abs(vx) > Math.abs(vy)) {
      if (vx > 0) this.face(DIR.RIGHT);
      else if (vx < 0) this.face(DIR.LEFT);
    } else if (vy !== 0) {
      if (vy > 0) this.face(DIR.DOWN);
      else this.face(DIR.UP);
    }
    this.sprite.setDepth(this.sprite.y);
    if (this.nameLabel) {
      this.nameLabel.x = this.sprite.x;
      this.nameLabel.y = this.sprite.y - 26;
      this.nameLabel.setDepth(this.sprite.y + 1);
    }
  }

  face(dir) {
    if (dir === this.dir) return;
    this.dir = dir;
    if (dir === DIR.RIGHT) {
      this.sprite.setFrame(2);
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
      this.sprite.setFrame(dir);
    }
  }

  setName(name) {
    this.name = name;
    if (this.nameLabel) this.nameLabel.destroy();
    this.nameLabel = this.scene.add
      .text(this.sprite.x, this.sprite.y - 26, name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
        color: "#fff7c8",
        stroke: "#1b1028",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5);
  }
}
