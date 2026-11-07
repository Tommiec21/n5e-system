/**
 * Jutsu registries: keywords, stimuli, components, nature releases, sections, upcast presets.
 * Source: KB 04, 10, 11.
 *
 * Keyword entry:
 *   scope       "universal" | "limited" | "unique" (unique = explicit grant, usually clan-scoped)
 *   discipline  keyword that doubles as a discipline classification
 *   requires    "affinity" (Releases, Medical) or "master" (Kinjutsu downtime) for learning checks
 *   removed     true for keywords kept only so old text still parses (Combination, removed in 4.0)
 */
export const keywords = {
  // Universal: classifications
  ninjutsu: { label: "Ninjutsu", scope: "universal", discipline: "nin" },
  genjutsu: { label: "Genjutsu", scope: "universal", discipline: "gen" },
  taijutsu: { label: "Taijutsu", scope: "universal", discipline: "tai" },
  bukijutsu: { label: "Bukijutsu", scope: "universal", discipline: "buki" },
  // Universal: mechanics
  combo: { label: "Combo", scope: "universal", disciplines: ["tai"] },
  finisher: { label: "Finisher", scope: "universal", disciplines: ["tai"] },
  chain: { label: "Chain", scope: "universal", disciplines: ["buki"] },
  fuinjutsu: { label: "Fuinjutsu", scope: "universal", requiresComponent: "cs" },
  sensory: { label: "Sensory", scope: "universal" },
  clash: { label: "Clash", scope: "universal" },
  barrier: { label: "Barrier", scope: "universal" },
  stable: { label: "Stable", scope: "universal", concentrationOnly: true },
  efficient: { label: "Efficient", scope: "universal", concentrationOnly: true },
  interrupt: { label: "Interrupt", scope: "universal", reactionOnly: true },
  clone: { label: "Clone", scope: "universal", disciplines: ["nin"] },
  construct: { label: "Construct", scope: "universal" },
  combination: { label: "Combination", scope: "universal", removed: true },
  // Limited
  hijutsu: { label: "Hijutsu", scope: "limited", requires: "clan" },
  kinjutsu: { label: "Kinjutsu", scope: "limited", requires: "master" },
  medical: { label: "Medical", scope: "limited", requires: "affinity", affinity: "medical" },
  earthRelease: { label: "Earth Release", scope: "limited", requires: "affinity", affinity: "earth" },
  windRelease: { label: "Wind Release", scope: "limited", requires: "affinity", affinity: "wind" },
  fireRelease: { label: "Fire Release", scope: "limited", requires: "affinity", affinity: "fire" },
  waterRelease: { label: "Water Release", scope: "limited", requires: "affinity", affinity: "water" },
  lightningRelease: { label: "Lightning Release", scope: "limited", requires: "affinity", affinity: "lightning" },
  amp: { label: "Amp", scope: "limited" }
};

/** Feature tags that aren't jutsu keywords but rules reference (Staggered/Blinded vs Dojutsu). */
export const featureTags = {
  dojutsu: { label: "Dojutsu" }
};

/** KB 10: Genjutsu Stimuli. Unaware is a separate flag, not a Stimulus. */
export const stimuli = {
  visual: { label: "Visual", immuneVia: ["condition:blinded", "sense:trueSight"] },
  auditory: { label: "Auditory", immuneVia: ["condition:deafened"] },
  inhaled: { label: "Inhaled", immuneVia: ["conditionImmune:envenomed"] },
  tactile: { label: "Tactile", immuneVia: ["damageImmune:psychic"], enablesDamage: true }
};

/** KB 04: components and what blocks them (validation runs in Phase 3). */
export const components = {
  hs: { label: "Hand Seals", abbr: "HS", requires: "freeHand", blockedBy: ["grappled", "restrained", "confused"] },
  cm: { label: "Chakra Molding", abbr: "CM", requires: "moldChakra", blockedBy: ["incapacitated"] },
  cs: { label: "Chakra Seals", abbr: "CS", requires: "freeHand" },
  m: { label: "Mobility", abbr: "M", requires: "speed", blockedBy: ["restrained"] },
  w: { label: "Weapons", abbr: "W", requires: "weapon" },
  nt: { label: "Ninja Tools", abbr: "NT", requires: "tool", spendsCharge: true }
};

/** KB 03 + 10: elemental cycle. Each Release beats the next one. */
export const natureReleases = {
  fire: { label: "Fire Release", keyword: "fireRelease", beats: "wind", damageType: "fire" },
  wind: { label: "Wind Release", keyword: "windRelease", beats: "lightning", damageType: "wind" },
  lightning: { label: "Lightning Release", keyword: "lightningRelease", beats: "earth", damageType: "lightning" },
  earth: { label: "Earth Release", keyword: "earthRelease", beats: "water", damageType: "earth" },
  water: { label: "Water Release", keyword: "waterRelease", beats: "fire", damageType: null }
};
/** Affinities an actor can hold: the five Releases plus Medical (no elemental cycle). */
export const affinities = {
  fire: "Fire", wind: "Wind", lightning: "Lightning", earth: "Earth", water: "Water", medical: "Medical"
};

/** KB 11: compendium sections, grouped by discipline. */
export const jutsuSections = {
  nonElemental: { label: "Non-Elemental", discipline: "nin" },
  medical: { label: "Medical", discipline: "nin" },
  earth: { label: "Earth Release", discipline: "nin" },
  wind: { label: "Wind Release", discipline: "nin" },
  fire: { label: "Fire Release", discipline: "nin" },
  water: { label: "Water Release", discipline: "nin" },
  lightning: { label: "Lightning Release", discipline: "nin" },
  phantasm: { label: "Phantasm", discipline: "gen" },
  trickery: { label: "Trickery", discipline: "gen" },
  psionic: { label: "Psionic", discipline: "gen" },
  hallucinogenic: { label: "Hallucinogenic", discipline: "gen" },
  taijutsu: { label: "Taijutsu", discipline: "tai" },
  shinobiBasics: { label: "Shinobi Basics", discipline: "buki" },
  blade: { label: "Blade", discipline: "buki" },
  flail: { label: "Flail", discipline: "buki" },
  polearm: { label: "Polearm", discipline: "buki" },
  power: { label: "Power", discipline: "buki" },
  ammunition: { label: "Ammunition", discipline: "buki" },
  hijutsu: { label: "Hijutsu (Clan)", discipline: null }
};

/** KB 11: 536 of 585 upcastable jutsu use exactly "+3 cost per rank". */
export const upcastPresets = {
  standard3: { label: "+3 cost per rank", costPerRank: 3 },
  none: { label: "Cannot upcast", costPerRank: 0, disabled: true },
  custom: { label: "Custom (see text)", costPerRank: null }
};

/** Cost modes on a jutsu. */
export const costModes = {
  chakra: "Chakra",
  none: "None",
  special: "Special"
};

/** Reaction trigger vocabulary (KB 11) so reaction prompts can fire automatically later. */
export const reactionTriggers = {
  takeDamage: "When you would take damage",
  targeted: "When you are targeted",
  attacked: "When you are attacked",
  saveFail: "When you fail a saving throw",
  save: "When you make a saving throw",
  enemyCast: "When a creature casts a jutsu",
  custom: "Other (see text)"
};

/** Rider conditions: when a conditional line on a jutsu applies (KB 13 engine note). */
export const riderTriggers = {
  chainRank: "Chain rank equals",
  finisher: "Cast as a Finisher",
  overcharge: "Overcharged",
  targetHasCondition: "Target has condition",
  nearWater: "Sufficient source of water",
  rankAtLeast: "Cast at rank or higher",
  swirl: "Swirl (failed save)",
  custom: "Other (see text)"
};

/** KB 10: Clone stat block constants (definitive over Ch9 text). */
export const cloneTemplate = {
  hp: 1, dr: 6, jutsuSlots: 2, speed: 30, maxDistance: 60, acFrom: "nin.dc",
  fractionalDamage: { D: "2d6", C: "3d6", B: "4d6", A: "5d6" },
  castMaxRank: "B"
};

/** KB 10: summon jutsu slots cost = rank value; summon rank -> level/cost. */
export const summonRanks = {
  D: { level: 2, cost: 10 }, C: { level: 5, cost: 15 }, B: { level: 9, cost: 20 },
  A: { level: 13, cost: 30 }, S: { level: 17, cost: 40 }
};
