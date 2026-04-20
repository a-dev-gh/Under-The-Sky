import { TILE } from "../constants.js";
import {
  buildWorld,
  CHUNK_COLS,
  CHUNK_ROWS,
  WORLD_CHUNKS_X,
  WORLD_CHUNKS_Y,
  WORLD_COLS,
  WORLD_ROWS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILES,
} from "../world/World.js";
import { Character, DIR } from "../entities/Character.js";
import { NPC } from "../entities/NPC.js";
import { Animal } from "../entities/Animal.js";
import { Controls } from "../systems/Controls.js";
import { DayNightCycle } from "../systems/DayNightCycle.js";
import { BuildSystem } from "../systems/BuildSystem.js";
import { loadSave, writeSave } from "../systems/Save.js";

const TILE_KEYS = [
  "tile_grass",
  "tile_grass_hill",
  "tile_dirt",
  "tile_sand",
  "tile_water",
  "tile_stone",
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    console.log("[Game] create");
    // Session state from Title/NewGame (or fall back to defaults for direct boot)
    this.groupName = this.registry.get("groupName") || "The Wanderers";
    this.seedStr = this.registry.get("seed") || "forest-42";
    this.mapType = this.registry.get("mapType") || "forest";
    this.resumed = this.registry.get("resumed") || false;
    const saved = this.resumed ? loadSave() : null;
    this.resources = saved?.resources || { wood: 0, stone: 0, food: 0 };
    const savedHouses = saved?.houses || [];

    this.world = buildWorld(this.seedStr);
    // Alias "map" for legacy code paths that reference blocked/spawn/objects.
    this.map = {
      ground: null, // not used directly anymore; chunks own their tiles
      blocked: this.world.blocked,
      spawn: this.world.spawn,
      objects: this.world.chunks.flat().flatMap((c) => c.objects),
    };
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Render each chunk's ground tiles onto a single per-chunk RenderTexture.
    // This turns what would be 43k individual Image objects into 25 composite
    // textures (one per chunk) for massively cheaper rendering.
    for (let cy = 0; cy < WORLD_CHUNKS_Y; cy++) {
      for (let cx = 0; cx < WORLD_CHUNKS_X; cx++) {
        const chunk = this.world.chunks[cy][cx];
        const wx = cx * CHUNK_COLS * TILE;
        const wy = cy * CHUNK_ROWS * TILE;
        const rt = this.add.renderTexture(wx, wy, CHUNK_COLS * TILE, CHUNK_ROWS * TILE);
        rt.setOrigin(0, 0).setDepth(-1000);
        for (let y = 0; y < CHUNK_ROWS; y++) {
          for (let x = 0; x < CHUNK_COLS; x++) {
            const id = chunk.ground[y][x];
            rt.draw(TILE_KEYS[id], x * TILE, y * TILE);
          }
        }
      }
    }

    // Static collider group for env obstacles
    this.solids = this.physics.add.staticGroup();
    const addCollider = (x, y, key, w, h) => {
      const c = this.solids.create(x, y, key);
      c.setVisible(false);
      c.body.setSize(w, h);
      c.body.updateFromGameObject();
      return c;
    };

    // Water tile colliders (only tiles currently rendered as water)
    for (let cy = 0; cy < WORLD_CHUNKS_Y; cy++) {
      for (let cx = 0; cx < WORLD_CHUNKS_X; cx++) {
        const chunk = this.world.chunks[cy][cx];
        for (let y = 0; y < CHUNK_ROWS; y++) {
          for (let x = 0; x < CHUNK_COLS; x++) {
            if (chunk.ground[y][x] === TILES.WATER) {
              const gx = cx * CHUNK_COLS + x;
              const gy = cy * CHUNK_ROWS + y;
              addCollider(
                gx * TILE + TILE / 2,
                gy * TILE + TILE / 2,
                "tile_water",
                TILE,
                TILE
              );
              this.world.blocked.add(`${gx},${gy}`);
            }
          }
        }
      }
    }

    // Place objects across ALL chunks.
    for (const obj of this.map.objects) {
      const { x, y, kind } = obj;
      if (kind === "tree") {
        this.add.image(x, y - 6, "obj_tree").setDepth(y + 8);
        addCollider(x, y + 8, "obj_tree", 18, 12);
      } else if (kind === "rock") {
        this.add.image(x, y, "obj_rock").setDepth(y + 4);
        addCollider(x, y + 4, "obj_rock", 22, 14);
      } else if (kind === "wood") {
        this.add.image(x, y, "res_wood").setDepth(y + 4);
        addCollider(x, y + 4, "res_wood", 24, 18);
      } else if (kind === "stone_pile") {
        this.add.image(x, y, "res_stone").setDepth(y + 4);
        addCollider(x, y + 4, "res_stone", 24, 14);
      } else if (kind === "berry") {
        this.add.image(x, y, "obj_berry_bush").setDepth(y + 4);
        addCollider(x, y + 4, "obj_berry_bush", 20, 14);
      }
    }

    // Spawn player at the world's spawn hint (inside the center chunk)
    const cx = this.world.spawn.x;
    const cy = this.world.spawn.y;
    this.player = new Character(this, cx, cy, "char_player");
    this.player.setName("You");
    this.player.sprite.setCollideWorldBounds(true);
    this.physics.add.collider(this.player.sprite, this.solids);

    this.npcs = [];
    const npcKeys = ["char_npc_a", "char_npc_b", "char_npc_c", "char_npc_d"];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 80 + (i % 3) * 24;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const npc = new NPC(this, x, y, npcKeys[i % npcKeys.length]);
      npc.sprite.setCollideWorldBounds(true);
      this.physics.add.collider(npc.sprite, this.solids);
      this.physics.add.collider(npc.sprite, this.player.sprite);
      npc.sprite.on("pointerdown", () => this.claimNPC(npc));
      this.npcs.push(npc);
    }
    for (let i = 0; i < this.npcs.length; i++) {
      for (let j = i + 1; j < this.npcs.length; j++) {
        this.physics.add.collider(this.npcs[i].sprite, this.npcs[j].sprite);
      }
    }

    // Spawn ambient animals across the entire world, picking valid tiles
    // per chunk. Each chunk gets its own fair share so no one chunk is
    // flooded.
    this.animals = [];
    const spawnAnimalAnywhere = (key) => {
      for (let tries = 0; tries < 60; tries++) {
        const gx = Math.floor(Math.random() * WORLD_COLS);
        const gy = Math.floor(Math.random() * WORLD_ROWS);
        const chunkX = Math.floor(gx / CHUNK_COLS);
        const chunkY = Math.floor(gy / CHUNK_ROWS);
        const localX = gx % CHUNK_COLS;
        const localY = gy % CHUNK_ROWS;
        const tile = this.world.chunks[chunkY]?.[chunkX]?.ground[localY]?.[localX];
        if (tile === TILES.WATER || tile === TILES.SAND) continue;
        if (this.world.blocked.has(`${gx},${gy}`)) continue;
        const dx = gx * TILE + TILE / 2 - cx;
        const dy = gy * TILE + TILE / 2 - cy;
        if (dx * dx + dy * dy < 120 * 120) continue; // keep clear of spawn town
        const a = new Animal(this, gx * TILE + TILE / 2, gy * TILE + TILE / 2, key);
        this.physics.add.collider(a.sprite, this.solids);
        this.animals.push(a);
        return;
      }
    };
    for (let i = 0; i < 40; i++) spawnAnimalAnywhere("animal_rabbit");
    for (let i = 0; i < 12; i++) spawnAnimalAnywhere("animal_deer");

    // Camera bounds = entire world
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(2);

    this.controls = new Controls(this);
    this.day = new DayNightCycle(this);
    this.build = new BuildSystem(this, {
      occupiedTiles: this.map.blocked,
      solids: this.solids,
      onPlaced: (count, last) => {
        this.registry.set("houses", count);
        this.events.emit("housesChanged", count);
        this.saveGame();
      },
    });
    // Rehydrate saved buildings (wrapped in try so one bad entry doesn't
    // crash the whole scene startup on Continue).
    for (const h of savedHouses) {
      try {
        if (typeof h?.gx === "number" && typeof h?.gy === "number") {
          this.build.placeAt(h.gx, h.gy);
        }
      } catch (err) {
        console.warn("[Game] skipped bad saved house", h, err);
      }
    }

    this.input.keyboard.on("keydown-B", () => this.build.toggle());
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.build.active) this.build.cancel();
    });
    this.input.on("pointerdown", (pointer) => {
      if (!this.build.active) return;
      // Ignore if clicking on an NPC (let NPC handler claim)
      const hits = this.input.manager.hitTest(
        pointer,
        this.npcs.map((n) => n.sprite),
        this.cameras.main
      );
      if (hits.length > 0) return;
      this.build.tryPlace();
    });

    this.events.on("requestBuildToggle", () => this.build.toggle());
    this.events.on("requestBuildConfirm", () => {
      if (this.build.active) this.build.tryPlace();
    });

    // Launch HUD
    this.scene.launch("UI");
    this.scene.bringToTop("UI");

    this.registry.set("houses", this.build.buildings.length);
    this.registry.set("joystick", { x: 0, y: 0 });
    this.registry.set("resources", this.resources);

    this.input.keyboard.on("keydown-M", () => {
      this.saveGame();
      this.scene.stop("UI");
      this.scene.start("Title");
    });

    // Periodic autosave
    this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => this.saveGame(),
    });
  }

  saveGame() {
    writeSave({
      groupName: this.groupName,
      seed: this.seedStr,
      mapType: this.mapType,
      resources: this.resources,
      houses: this.build.buildings.map((b) => ({ gx: b.gx, gy: b.gy })),
      savedAt: Date.now(),
    });
  }

  claimNPC(npc) {
    if (this.build.active) return;
    const name = window.prompt(
      `Name this character to take control\n(leave blank to cancel)`,
      npc.defaultName
    );
    if (!name) return;
    // Turn current player into NPC
    const oldSprite = this.player.sprite;
    const oldTex = oldSprite.texture.key;
    const oldX = oldSprite.x;
    const oldY = oldSprite.y;
    const oldName = this.player.name;
    if (this.player.nameLabel) this.player.nameLabel.destroy();
    oldSprite.destroy();

    const reborn = new NPC(this, oldX, oldY, oldTex);
    reborn.setName(oldName && oldName !== "You" ? oldName : reborn.defaultName);
    reborn.sprite.setCollideWorldBounds(true);
    this.physics.add.collider(reborn.sprite, this.solids);
    reborn.sprite.on("pointerdown", () => this.claimNPC(reborn));
    this.npcs.push(reborn);

    // Promote clicked NPC to player
    const idx = this.npcs.indexOf(npc);
    if (idx >= 0) this.npcs.splice(idx, 1);
    const nx = npc.sprite.x;
    const ny = npc.sprite.y;
    const texKey = npc.sprite.texture.key;
    if (npc.nameLabel) npc.nameLabel.destroy();
    npc.sprite.destroy();

    this.player = new Character(this, nx, ny, texKey);
    this.player.setName(name);
    this.player.sprite.setCollideWorldBounds(true);
    this.physics.add.collider(this.player.sprite, this.solids);
    for (const other of this.npcs) {
      this.physics.add.collider(this.player.sprite, other.sprite);
    }
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
  }

  update(time, delta) {
    const v = this.controls.update();
    const speed = this.player.speed;
    this.player.setVelocity(v.x * speed, v.y * speed);

    for (const npc of this.npcs) {
      npc.update(delta, { width: WORLD_WIDTH, height: WORLD_HEIGHT });
    }

    for (const a of this.animals) {
      a.update(delta, this.player);
    }

    this.day.update(delta);

    if (this.build.active) {
      this.build.update(this.input.activePointer);
    }
  }
}
