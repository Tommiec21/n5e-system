/**
 * Equipment registries. Source: KB 08 (Ch5).
 */

export const currency = { ryo: { label: "Ryo", abbr: "Ryo" } };

export const weaponCategories = { simple: "Simple", martial: "Martial", exotic: "Exotic" };
export const weaponGroups = {
  blade: "Blade", flail: "Flail", polearm: "Polearm", power: "Power", ammunition: "Ammunition", thrown: "Thrown"
};
export const weaponRangeTypes = { melee: "Melee", ranged: "Ranged" };

/**
 * KB 08: weapon properties. ranked = takes a value (Blocking 2, Deadly 1...), capped at maxRank.
 * Ranked properties go up to 3 ranks unless stated.
 */
export const weaponProperties = {
  ammunition: { label: "Ammunition" },
  blocking: { label: "Blocking", ranked: true, maxRank: 3 },
  critical: { label: "Critical", ranked: true, maxRank: 3 },
  deadly: { label: "Deadly", ranked: true, maxRank: 3 },
  disarm: { label: "Disarm" },
  evocation: { label: "Evocation" },
  finesse: { label: "Finesse" },
  heavy: { label: "Heavy", strRequirement: 16 },
  hidden: { label: "Hidden" },
  light: { label: "Light" },
  multiattack: { label: "Multiattack" },
  range: { label: "Range" },
  reach: { label: "Reach", ranked: true, maxRank: 3, feetPerRank: 5 },
  returning: { label: "Returning" },
  thrown: { label: "Thrown" },
  trip: { label: "Trip" },
  twoHanded: { label: "Two-Handed" },
  versatile: { label: "Versatile" },
  unarmed: { label: "Unarmed" },
  volatile: { label: "Volatile", ranked: true, maxRank: 20 },
  special: { label: "Special" }
};

export const armorCategories = {
  light: { label: "Light", dexCap: 5, don: 1, doff: 1 },
  medium: { label: "Medium", dexCap: 3, don: 5, doff: 1 },
  heavy: { label: "Heavy", dexCap: 0, don: 10, doff: 5 }
};

/** KB 08: armor properties. */
export const armorProperties = {
  bulky: { label: "Bulky" },
  bulwark: { label: "Bulwark" },
  camouflage: { label: "Camouflage" },
  fashionable: { label: "Fashionable" },
  fortified: { label: "Fortified", ranked: true },
  heavyweight: { label: "Heavyweight", ranked: true },
  highQuality: { label: "High Quality" },
  reinforced: { label: "Reinforced", ranked: true },
  threatening: { label: "Threatening" }
};

/** Items have 3 inherent seal slots; High Quality adds 1 (KB 08 Smith's Kit). */
export const sealSlots = { base: 3, highQualityBonus: 1 };

export const consumableTypes = {
  pill: "Pill", tag: "Tag", bomb: "Bomb", poison: "Poison", cure: "Cure / Antidote", scroll: "Scroll",
  elixir: "Elixir", meal: "Meal", trap: "Trap", gear: "Gear", ammo: "Ammunition"
};

/** KB 08: storage tools (one of each type). */
export const containerTypes = {
  backpack: { label: "Shinobi Backpack", slots: 10 },
  waistBag: { label: "Waist Bag", slots: 5 },
  beltPouch: { label: "Belt Pouch", slots: 3 },
  legPouch: { label: "Leg Pouch", slots: 2 },
  toolScroll: { label: "Ninja Tool Scroll", slots: 0, sealsBulk: 5 },
  supplies: { label: "Basic Supplies", slots: 0 }
};

/** KB 08: Inventory Slots = 10 + 2 x Str mod (King ruling). */
export const inventory = { base: 10, perStrMod: 2 };

/** KB 08: ammunition die ladder; 1-2 on the roll steps it down. */
export const ammoDie = { steps: [8, 6, 4, 1, 0], stepDownOn: [1, 2], thrownDefault: 4 };
