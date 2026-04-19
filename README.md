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

Any static server works. Examples:

```bash
# Python
python3 -m http.server 8000

# Node (npx)
npx serve .

# Or just open index.html via a Live Server extension in VS Code
```

Then open http://localhost:8000.

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

The placeholders are generated in `src/scenes/BootScene.js`. To replace any of
them with real art:

1. Drop a PNG into `assets/sprites/` (e.g. `tree.png`).
2. In `BootScene.create()`, replace the corresponding `make*()` call with
   `this.load.image("obj_tree", "assets/sprites/tree.png")` inside a `preload()`
   method.
3. Keep texture keys identical (`tile_grass`, `obj_tree`, `char_player`, etc.)
   so the rest of the game works unchanged.

Character spritesheets use 4 frames (down, up, left, right — right is the left
frame flipped at runtime), each 32×32, laid out horizontally.

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
