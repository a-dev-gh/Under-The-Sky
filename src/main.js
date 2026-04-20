import { BootScene } from "./scenes/BootScene.js";
import { TitleScene } from "./scenes/TitleScene.js";
import { NewGameScene } from "./scenes/NewGameScene.js";
import { CreditsScene } from "./scenes/CreditsScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { UIScene } from "./scenes/UIScene.js";

export const TILE = 32;
export const MAP_COLS = 48;
export const MAP_ROWS = 36;

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b1020",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, NewGameScene, CreditsScene, GameScene, UIScene],
};

new Phaser.Game(config);
