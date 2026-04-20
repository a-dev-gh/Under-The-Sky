import { TILE } from "../main.js";

// Place-a-house system. Press B to enter build mode, move ghost with mouse or
// touch, click/tap to place if footprint is clear. House is 3x3 tiles.

const HOUSE_TILE_W = 3;
const HOUSE_TILE_H = 3;

export class BuildSystem {
  constructor(scene, { occupiedTiles, solids, onPlaced }) {
    this.scene = scene;
    this.occupied = occupiedTiles; // Set of "gx,gy"
    this.solids = solids;
    this.onPlaced = onPlaced;
    this.active = false;
    this.ghost = null;
    this.ghostBad = null;
    this.buildings = [];
  }

  toggle() {
    if (this.active) this.cancel();
    else this.start();
  }

  start() {
    this.active = true;
    this.ghost = this.scene.add
      .image(0, 0, "ghost_ok")
      .setDepth(100000)
      .setAlpha(0.9);
    this.ghostBad = this.scene.add
      .image(0, 0, "ghost_bad")
      .setDepth(100000)
      .setAlpha(0.9)
      .setVisible(false);
    this.scene.events.emit("buildMode", true);
  }

  cancel() {
    this.active = false;
    if (this.ghost) this.ghost.destroy();
    if (this.ghostBad) this.ghostBad.destroy();
    this.ghost = null;
    this.ghostBad = null;
    this.scene.events.emit("buildMode", false);
  }

  update(pointer) {
    if (!this.active) return;
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const gx = Math.floor(world.x / TILE) - 1;
    const gy = Math.floor(world.y / TILE) - 1;
    const x = (gx + HOUSE_TILE_W / 2) * TILE;
    const y = (gy + HOUSE_TILE_H / 2) * TILE;
    const ok = this.isClear(gx, gy);
    this.ghost.setPosition(x, y).setVisible(ok);
    this.ghostBad.setPosition(x, y).setVisible(!ok);
    this._hoverGx = gx;
    this._hoverGy = gy;
    this._hoverOk = ok;
  }

  isClear(gx, gy) {
    for (let y = 0; y < HOUSE_TILE_H; y++) {
      for (let x = 0; x < HOUSE_TILE_W; x++) {
        const k = `${gx + x},${gy + y}`;
        if (this.occupied.has(k)) return false;
      }
    }
    return true;
  }

  tryPlace() {
    if (!this.active || !this._hoverOk) return false;
    const placed = this.placeAt(this._hoverGx, this._hoverGy);
    return !!placed;
  }

  // Direct placement (used both by tryPlace and by save-load rehydration).
  placeAt(gx, gy) {
    if (!this.isClear(gx, gy)) return null;
    const wx = (gx + HOUSE_TILE_W / 2) * TILE;
    const wy = (gy + HOUSE_TILE_H / 2) * TILE;
    const house = this.scene.add
      .image(wx, wy, "build_house")
      .setDepth(wy + HOUSE_TILE_H * TILE * 0.5 - 4);
    const body = this.solids.create(wx, wy + 20, "build_house");
    body.setVisible(false);
    body.body.setSize(HOUSE_TILE_W * TILE - 6, HOUSE_TILE_H * TILE * 0.55);
    body.body.updateFromGameObject();
    const record = { house, body, gx, gy };
    this.buildings.push(record);
    for (let y = 0; y < HOUSE_TILE_H; y++) {
      for (let x = 0; x < HOUSE_TILE_W; x++) {
        this.occupied.add(`${gx + x},${gy + y}`);
      }
    }
    if (this.onPlaced) this.onPlaced(this.buildings.length, record);
    return record;
  }
}
