// Thin localStorage wrapper for per-slot game state. Stores only what's
// needed to reconstruct a session: group name, seed, map type, placed
// buildings, resource counts, day count. Sprites / NPC positions are
// regenerated from seed on load.

const KEY = "uts_save_v1";
const SETTINGS_KEY = "uts_settings_v1";

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { volume: 1, lastGroup: null };
  } catch {
    return { volume: 1, lastGroup: null };
  }
}

export function writeSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}
