# Under the Sky

Zelda/SNES-style top-down game with tower-defense + survival-town mechanics.
Built with [Phaser 3](https://phaser.io/) via CDN — no build step, just open in
a browser via any static server.

## Status

Playable MVP. Current features:

- 32×32 pixel-art style (all placeholders procedurally drawn at boot — swap for
  real art by dropping PNGs into `assets/sprites/` and loading them in
  `BootScene`).
- Forest map with grass / hills / dirt / sand / water / stone tiles, trees,
  rocks, and resource blocks (wood stacks, stone piles, berry bushes).
- **Autonomous NPCs** wandering the map.
- **Tap/click an NPC** to name them and take control — the character you
  previously controlled becomes an NPC again.
- Day/night cycle (≈2 min day, 1 min night) with dusk/dawn transitions.
- **Build mode** (press `B` or tap the Build button): ghost preview, green if
  placement is valid, red if obstructed. Click/tap to place a house.
- Mobile support: drag the left half of the screen to activate a virtual
  joystick; use the Build / Place buttons on the bottom right.

## Running locally

Use the bundled no-cache dev server (important — `python3 -m http.server`
returns `304 Not Modified` for ES modules, which causes browsers to keep
running stale code after every edit):

```bash
python3 server.py
```

Then open http://localhost:8000. Ctrl+C to stop.

If you prefer not to use the bundled server, `npx http-server -c-1 -p 8000`
works too.

## Controls

| Action               | Desktop                    | Mobile                         |
| -------------------- | -------------------------- | ------------------------------ |
| Move                 | WASD or Arrow keys         | Drag left half of screen       |
| Claim NPC            | Click NPC                  | Tap NPC                        |
| Toggle build mode    | `B`                        | Tap "Build" button             |
| Place building       | Click at ghost position    | Tap "Place" button             |
| Cancel build         | `Esc`                      | Tap "Cancel" button            |

## Project layout

```
index.html                 # entry point (loads Phaser via CDN)
src/
  main.js                  # Phaser config & scene registration
  scenes/
    BootScene.js           # generates placeholder sprites at boot
    GameScene.js           # main gameplay
    UIScene.js             # HUD / joystick / buttons
  entities/
    Character.js           # base humanoid (4-direction facing)
    NPC.js                 # wandering AI
  systems/
    Controls.js            # unified WASD + joystick input
    DayNightCycle.js       # time-of-day overlay
    BuildSystem.js         # ghost-preview placement
  maps/
    ForestMap.js           # procedural forest generator
assets/sprites/            # drop real PNGs here to replace placeholders
```

## Swapping in real pixel art

Every sprite in the game has a canonical **texture key** (`tile_grass`,
`obj_tree`, `build_house`, `char_player`, etc.). A procedural placeholder is
drawn at boot for each key. You can override any of them with real pixel
art without touching code — **two paths, either works, PNGs win over
tileset**.

### Easiest: one PNG per sprite

Drop a file named after the key into `assets/sprites/`:

```
assets/sprites/tile_grass.png
assets/sprites/tile_water.png
assets/sprites/obj_tree.png
assets/sprites/build_house.png
assets/sprites/char_player.png     ← 4-frame horizontal sheet (128x32 by default)
```

Variants: `tile_grass.png`, `tile_grass_1.png`, `tile_grass_2.png`, … up to
`_5`. The world randomly picks one per tile (deterministic from the seed).

Perfect for AI-generated art: each Gemini / Midjourney / Piskel output is
one file, one name, one replacement. No JSON editing.

### Alternative: tileset atlas + JSON manifest

1. Save your tileset image at `assets/sprites/tileset.png`. For Piskel, export
   at **2.0x scale** so each cell is 32×32 (matching the game's tile size).
2. Open `assets/sprites/tileset.json` and fill in cell coordinates for each
   key you want to replace. Example:

   ```jsonc
   {
     "cellSize": 32,
     "mapping": {
       "tile_grass":     { "x": 3, "y": 1 },
       "tile_water":     { "x": 8, "y": 0 },
       "obj_tree":       { "x": 0, "y": 6, "w": 1, "h": 2 },
       "build_house":    { "x": 5, "y": 0, "w": 3, "h": 3 },
       "char_player":    { "x": 0, "y": 10, "w": 4, "h": 1, "frames": 4 }
     }
   }
   ```

   - `x` / `y` are the cell's **top-left** in the tileset (0-indexed).
   - `w` / `h` default to 1 (units = cells).
   - `frames` on a character entry registers a 4-direction framesheet.
   - Any key you don't list keeps its procedural placeholder.

3. Reload. That's it — the loader slices the PNG on boot and replaces the
   procedural textures with the real ones.

### Canonical texture keys

- **Tiles** (32×32): `tile_grass`, `tile_grass_hill`, `tile_dirt`, `tile_sand`,
  `tile_water`, `tile_stone`
- **Cliff overlays** (32×32, transparent top, cliff face along one edge):
  `cliff_south_1`, `cliff_south_2`, `cliff_east_1`, `cliff_east_2`
- **Objects**: `obj_tree` (32×48), `obj_rock` (32×32), `obj_berry_bush`
  (32×32), `res_wood` (32×32), `res_stone` (32×32)
- **Animals**: `animal_rabbit` (16×16), `animal_deer` (24×24)
- **Characters** (4 directions down/up/left/right as horizontal 4-frame sheet,
  each frame 32×32): `char_player`, `char_npc_a`, `char_npc_b`, `char_npc_c`,
  `char_npc_d`
- **Buildings** (96×96): `build_house`, `build_town_point`, `build_cart_shop`,
  `build_general_store`
- **HUD icons** (16×16): `icon_wood`, `icon_stone`, `icon_food`, `icon_house`,
  `icon_sword`
- **Build ghosts** (96×96): `ghost_ok`, `ghost_bad`

## Roadmap

- [ ] Additional maps: river/lake, mountains/hills
- [ ] Resource harvesting (chop trees, mine rocks, collect berries)
- [ ] Enemy waves at night (first invasion after N houses built)
- [ ] More buildings: market, food shop, wall, watchtower
- [ ] Castle + Magic Tower (end-game buildings)
- [ ] Game modes: Survival (X invasions), Build-to-Win (castle + tower),
      Open-ended sandbox
- [ ] NPC jobs/needs (food, sleep, happiness)
- [ ] Save / load
