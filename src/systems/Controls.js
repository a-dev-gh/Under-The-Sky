// Unified input: WASD/Arrow keys on desktop, virtual joystick on touch.
// Produces a normalized {x,y} vector in [-1,1] each frame.

export class Controls {
  constructor(scene) {
    this.scene = scene;
    this.vec = { x: 0, y: 0 };

    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    // Joystick state lives in UIScene; this reads it from registry each frame
    this.registry = scene.registry;
  }

  update() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.left.isDown || k.leftArrow.isDown) x -= 1;
    if (k.right.isDown || k.rightArrow.isDown) x += 1;
    if (k.up.isDown || k.upArrow.isDown) y -= 1;
    if (k.down.isDown || k.downArrow.isDown) y += 1;

    const joy = this.registry.get("joystick");
    if (joy && (joy.x !== 0 || joy.y !== 0)) {
      x = joy.x;
      y = joy.y;
    }

    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    this.vec.x = x;
    this.vec.y = y;
    return this.vec;
  }
}
