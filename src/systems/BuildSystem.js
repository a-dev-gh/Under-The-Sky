import { TILE } from "../constants.js";
import { BUILDING_TYPES } from "../buildings/BuildingTypes.js";

// Generic building placement. Select a building type via start(typeKey),
// move the ghost via update(pointer), and commit with tryPlace(). Placed
// buildings live in this.buildings and are also clickable — clicking one
// emits a "buildingClicked" scene event so the HUD can open an info panel.

export class BuildSystem {
  constructor(scene, { occupiedTiles, solids, onPlaced, onCountChange }) {
    this.scene = scene;
    this.occupied = occupiedTiles; // Set of "gx,gy"
    this.solids = solids;
    this.onPlaced = onPlaced;
    this.onCountChange = onCountChange;
    this.active = false;
    this.currentType = null;
    this.ghost = null;
    this.ghostBad = null;
    this.buildings = [];
    this._nextId = 1;
  }

  typeDef(key) {
    return BUILDING_TYPES[key];
  }

  start(typeKey) {
    if (!BUILDING_TYPES[typeKey]) return;
    if (this.active) this.cancel();
    this.currentType = typeKey;
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
    this.scene.events.emit("buildMode", true, typeKey);
  }

  toggle(typeKey = "house") {
    if (this.active) this.cancel();
    else this.start(typeKey);
  }

  cancel() {
    this.active = false;
    this.currentType = null;
    if (this.ghost) this.ghost.destroy();
    if (this.ghostBad) this.ghostBad.destroy();
    this.ghost = null;
    this.ghostBad = null;
    this.scene.events.emit("buildMode", false, null);
  }

  update(pointer) {
    if (!this.active) return;
    const type = this.typeDef(this.currentType);
    if (!type) return;
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const gx = Math.floor(world.x / TILE) - Math.floor(type.tileW / 2);
    const gy = Math.floor(world.y / TILE) - Math.floor(type.tileH / 2);
    const x = (gx + type.tileW / 2) * TILE;
    const y = (gy + type.tileH / 2) * TILE;
    const ok = this.isClear(gx, gy, type);
    this.ghost.setPosition(x, y).setVisible(ok);
    this.ghostBad.setPosition(x, y).setVisible(!ok);
    this._hoverGx = gx;
    this._hoverGy = gy;
    this._hoverOk = ok;
  }

  isClear(gx, gy, type) {
    // unique check
    if (type.unique && this.buildings.some((b) => b.type === type.key)) {
      return false;
    }
    for (let y = 0; y < type.tileH; y++) {
      for (let x = 0; x < type.tileW; x++) {
        const k = `${gx + x},${gy + y}`;
        if (this.occupied.has(k)) return false;
      }
    }
    // Player-in-footprint: don't let the player box themselves in
    const player = this.scene.player?.sprite;
    if (player) {
      const pgx = Math.floor(player.x / TILE);
      const pgy = Math.floor(player.y / TILE);
      if (
        pgx >= gx &&
        pgx < gx + type.tileW &&
        pgy >= gy &&
        pgy < gy + type.tileH
      ) {
        return false;
      }
    }
    return true;
  }

  tryPlace() {
    if (!this.active || !this._hoverOk) return null;
    return this.placeAt(this._hoverGx, this._hoverGy, this.currentType);
  }

  placeAt(gx, gy, typeKey) {
    const type = this.typeDef(typeKey);
    if (!type) return null;
    // Don't re-validate on rehydration (saved placements should stay put even
    // if the player happens to be standing there on load).
    const manual = this.active;
    if (manual && !this.isClear(gx, gy, type)) return null;
    const wx = (gx + type.tileW / 2) * TILE;
    const wy = (gy + type.tileH / 2) * TILE;
    const img = this.scene.add
      .image(wx, wy, type.texture)
      .setDepth(wy + (type.tileH * TILE) / 2 - 4)
      .setInteractive({ useHandCursor: true });
    const body = this.solids.create(wx, wy + 20, type.texture);
    body.setVisible(false);
    body.body.setSize(type.tileW * TILE - 6, type.tileH * TILE * 0.55);
    body.body.updateFromGameObject();
    const record = {
      id: this._nextId++,
      type: typeKey,
      typeData: type,
      image: img,
      body,
      gx,
      gy,
      occupants: [],
      capacity: type.capacity,
    };
    img.on("pointerdown", (pointer, _x, _y, event) => {
      if (this.active) return;
      if (event && typeof event.stopPropagation === "function") {
        event.stopPropagation();
      }
      this.scene.events.emit("buildingClicked", record);
    });
    this.buildings.push(record);
    for (let y = 0; y < type.tileH; y++) {
      for (let x = 0; x < type.tileW; x++) {
        this.occupied.add(`${gx + x},${gy + y}`);
      }
    }
    if (this.onPlaced) this.onPlaced(this.buildings.length, record);
    if (this.onCountChange) this.onCountChange(this.buildings);
    return record;
  }

  countOf(typeKey) {
    return this.buildings.filter((b) => b.type === typeKey).length;
  }
}
