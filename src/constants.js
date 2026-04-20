// Small constants module imported by everyone. Keeping these out of main.js
// breaks the circular-import cycle main.js -> scenes -> world -> main.js
// that triggers TDZ errors when a module reads TILE at top-level.

export const TILE = 32;
