// Day/night cycle: 120s day, 60s night. Applies a tinted overlay scaled to
// the camera viewport. Emits "dayStart" / "nightStart" events via scene events.

export class DayNightCycle {
  constructor(scene, { dayMs = 120000, nightMs = 60000 } = {}) {
    this.scene = scene;
    this.dayMs = dayMs;
    this.nightMs = nightMs;
    this.elapsed = 0;
    this.phase = "day"; // day | dusk | night | dawn
    this.overlay = scene.add
      .rectangle(0, 0, 10, 10, 0x0a122d, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9999);
    this.resize();
    scene.scale.on("resize", () => this.resize());
  }

  resize() {
    const cam = this.scene.cameras.main;
    this.overlay.setSize(cam.width, cam.height);
  }

  update(dt) {
    const full = this.dayMs + this.nightMs;
    this.elapsed = (this.elapsed + dt) % full;
    const t = this.elapsed;

    // compute darkness 0..1
    const transition = 8000;
    let darkness = 0;
    let phase = "day";
    if (t < this.dayMs - transition) {
      darkness = 0;
      phase = "day";
    } else if (t < this.dayMs) {
      darkness = (t - (this.dayMs - transition)) / transition;
      phase = "dusk";
    } else if (t < this.dayMs + this.nightMs - transition) {
      darkness = 1;
      phase = "night";
    } else {
      darkness = 1 - (t - (this.dayMs + this.nightMs - transition)) / transition;
      phase = "dawn";
    }

    if (phase !== this.phase) {
      this.phase = phase;
      this.scene.events.emit("dayPhase", phase);
    }
    // up to ~70% dark at peak night so map stays readable
    this.overlay.fillAlpha = darkness * 0.7;
    this.overlay.setSize(
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    );
    this.scene.registry.set("timeOfDay", {
      phase,
      t: t / full,
      darkness,
    });
  }
}
