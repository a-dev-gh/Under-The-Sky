const V = Date.now();
const [{ BootScene }, { GameScene }, { UIScene }] = await Promise.all([
  import(`./scenes/BootScene.js?v=${V}`),
  import(`./scenes/GameScene.js?v=${V}`),
  import(`./scenes/UIScene.js?v=${V}`),
]);

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
  scene: [BootScene, GameScene, UIScene],
};

new Phaser.Game(config);
