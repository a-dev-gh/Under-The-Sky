// String-or-number seed → deterministic PRNG.
// Same seed always produces the same map.

export function hashSeed(input) {
  const s = String(input);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let state = (typeof seed === "string" ? hashSeed(seed) : seed | 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJECTIVES = [
  "Sunny", "Misty", "Iron", "Oak", "River", "Stone", "Silver", "Gold",
  "Red", "Dawn", "Dusk", "Pine", "Moss", "Clover", "Hollow", "Fern",
  "Ash", "Wolf", "Raven", "Eagle", "Swift", "Quiet", "Brave",
];
const NOUNS = [
  "grove", "dale", "hollow", "ridge", "ford", "hearth", "watch", "gate",
  "stead", "brook", "hill", "vale", "keep", "cross", "mark", "wold",
];

export function randomSeedString(rng = Math.random) {
  const a = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
  const b = NOUNS[Math.floor(rng() * NOUNS.length)];
  const n = Math.floor(rng() * 99);
  return `${a.toLowerCase()}-${b}-${n}`;
}

const GROUP_FIRSTS = [
  "The", "Clan of the", "House", "Order of", "Kin of the", "Tribe of",
];
const GROUP_LASTS = [
  "Wolves", "Falcons", "Embers", "Stars", "Oaks", "Ravens", "Stones",
  "Brooks", "Thorns", "Wardens", "Wanderers", "Daybreak", "Sparrows",
];

export function randomGroupName(rng = Math.random) {
  const a = GROUP_FIRSTS[Math.floor(rng() * GROUP_FIRSTS.length)];
  const b = GROUP_LASTS[Math.floor(rng() * GROUP_LASTS.length)];
  return `${a} ${b}`;
}
