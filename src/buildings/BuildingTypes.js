// Central registry of buildable building types. Other systems read from here
// so adding a new building only touches this file + BootScene (for art).

export const BUILDING_TYPES = {
  town_point: {
    key: "town_point",
    name: "Town Point",
    texture: "build_town_point",
    tileW: 3,
    tileH: 3,
    capacity: 6,
    unique: true, // only one for now; raised by later upgrades
    tier: 1,
    description:
      "The heart of your settlement. Assigns jobs and stores resources.",
    cost: { wood: 0, stone: 0 },
    buildable: false, // auto-placed on New Game; can't be built manually (yet)
  },
  house: {
    key: "house",
    name: "House",
    texture: "build_house",
    tileW: 3,
    tileH: 3,
    capacity: 4,
    description: "Where townsfolk sleep at night.",
    cost: { wood: 0, stone: 0 },
    buildable: true,
  },
  cart_shop: {
    key: "cart_shop",
    name: "Cart Shop",
    texture: "build_cart_shop",
    tileW: 3,
    tileH: 3,
    capacity: 2,
    description:
      "Builds and assigns carts. Carts fulfill delivery routes for other businesses.",
    cost: { wood: 0, stone: 0 },
    buildable: true,
  },
  general_store: {
    key: "general_store",
    name: "General Store",
    texture: "build_general_store",
    tileW: 3,
    tileH: 3,
    capacity: 3,
    description: "Central trading post for food, tools, and goods.",
    cost: { wood: 0, stone: 0 },
    buildable: true,
  },
};

// Ordered list for the build menu UI. Town Point is left out because it is
// not manually placed right now.
export const BUILDABLE_KEYS = Object.values(BUILDING_TYPES)
  .filter((t) => t.buildable)
  .map((t) => t.key);
