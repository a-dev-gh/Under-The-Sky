// Per-slot save/load via localStorage. Schema versioned so older payloads
// can be migrated or rejected cleanly.

const KEY = "uts_save_v1"; // storage key kept for backwards compat
const SETTINGS_KEY = "uts_settings_v1";

const CURRENT_SAVE_VERSION = 2;

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
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrateSave(parsed);
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const payload = { v: CURRENT_SAVE_VERSION, ...state };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
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
  } catch {
    /* noop */
  }
}

// ------- migrations -------

function migrateSave(raw) {
  if (!raw || typeof raw !== "object") return null;
  const v = raw.v || 1;
  if (v === CURRENT_SAVE_VERSION) return raw;
  if (v === 1) return migrateV1toV2(raw);
  // Unknown future version — treat as no save.
  return null;
}

// v1: { groupName, seed, mapType, resources, houses: [{gx,gy}] }
// v2: adds `buildings: [{type, gx, gy}]`. Also v1 was generated against the
// old 48x36 single-map coordinate system; those gx/gy don't mean anything in
// the 5x5 world so we drop them rather than planting houses in wrong spots.
function migrateV1toV2(raw) {
  return {
    v: 2,
    groupName: raw.groupName,
    seed: raw.seed,
    mapType: raw.mapType || "forest",
    resources: raw.resources || { wood: 0, stone: 0, food: 0 },
    buildings: [], // legacy house coords are invalid in the new world
    savedAt: raw.savedAt,
    migrated: true,
  };
}
