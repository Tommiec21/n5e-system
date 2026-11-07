/**
 * Core chassis registries: abilities, skills, toolkits, progression, ranks, disciplines, DC tables.
 * Source: KB 01 (character chassis), 04 (jutsu casting), 08 (toolkits), 09 (character options).
 * Plain data only: no Foundry imports, so rules/ and tests/ can use it directly.
 */

/** KB 01: six abilities, Physical/Mental categories. */
export const abilities = {
  str: { label: "Strength", abbr: "Str", category: "physical" },
  dex: { label: "Dexterity", abbr: "Dex", category: "physical" },
  con: { label: "Constitution", abbr: "Con", category: "physical" },
  int: { label: "Intelligence", abbr: "Int", category: "mental" },
  wis: { label: "Wisdom", abbr: "Wis", category: "mental" },
  cha: { label: "Charisma", abbr: "Cha", category: "mental" }
};

/**
 * KB 01: 20 skills. Keys are the V3.1 keys so worlds migrate in place; Crafting (cra) is removed.
 * Note `cha` here is Chakra Control (skill), not Charisma (ability): separate namespaces.
 */
export const skills = {
  acr: { label: "Acrobatics", ability: "dex" },
  ani: { label: "Animal Handling", ability: "wis" },
  ath: { label: "Athletics", ability: "str" },
  cha: { label: "Chakra Control", ability: "con", concentration: true },
  dec: { label: "Deception", ability: "cha" },
  his: { label: "History", ability: "int" },
  ill: { label: "Illusions", ability: "wis", clash: "gen" },
  ins: { label: "Insight", ability: "wis" },
  itm: { label: "Intimidation", ability: "cha" },
  inv: { label: "Investigation", ability: "int" },
  mar: { label: "Martial Arts", ability: "str", altAbilities: ["int", "dex"], clash: "tai" },
  med: { label: "Medicine", ability: "wis" },
  nat: { label: "Nature", ability: "int" },
  nin: { label: "Ninshou", ability: "int", clash: "nin" },
  prc: { label: "Perception", ability: "wis" },
  prf: { label: "Performance", ability: "cha" },
  per: { label: "Persuasion", ability: "cha" },
  slt: { label: "Sleight of Hand", ability: "dex" },
  ste: { label: "Stealth", ability: "dex" },
  sur: { label: "Survival", ability: "wis" }
};

/** Skill keys retired in 4.0 (migration drops them). */
export const retiredSkills = ["cra"];

/** KB 08: 12 toolkits. Charges by kit rank, no recovery (King ruling). */
export const toolkits = {
  alchemist: { label: "Alchemist's Kit" },
  cooking: { label: "Cooking Kit" },
  disguise: { label: "Disguise Kit" },
  forensics: { label: "Forensics Kit" },
  forgery: { label: "Forgery Kit" },
  hackers: { label: "Hacker's Kit" },
  medicine: { label: "Medicine Kit" },
  poison: { label: "Poison Kit" },
  sealing: { label: "Fuinjutsu Kit" },
  security: { label: "Security Kit" },
  smiths: { label: "Smith's Kit" },
  trappers: { label: "Trapper's Kit" }
};

export const toolkitRules = {
  chargesByRank: { D: 5, C: 6, B: 7, A: 8 },
  costByRank: { D: 200, C: 400, B: 800, A: 1200 },
  bulk: 2,
  chargesRecover: false
};

/** KB 01 + 09: level tables. */
export const progression = {
  maxLevel: 20,
  /** XP needed to reach each level (XP resets to 0 on level up, leftover carries). */
  xpToLevel: { 2: 100, 3: 200, 4: 300, 5: 500, 6: 650, 7: 800, 8: 950, 9: 1100, 10: 1250, 11: 1500,
    12: 1750, 13: 2000, 14: 2250, 15: 2500, 16: 3250, 17: 4000, 18: 4750, 19: 5500, 20: 6500 },
  /** [minLevel, bonus] bands. */
  proficiency: [[1, 3], [4, 4], [7, 5], [10, 6], [13, 7], [16, 8], [19, 9]],
  /** ASI + feat + one Mastery rank (universal rule, King 2026-11-06). */
  asiLevels: [4, 8, 12, 16, 19],
  clanFeatureLevels: [1, 3, 7, 11, 15],
  /** Mastery: max sources counted, level caps, bonus per rank. */
  mastery: {
    maxRank: 3,
    capByLevel: [[1, 1], [7, 2], [12, 3]],
    bonusByRank: { 0: 0, 1: 2, 2: 4, 3: 6 }
  },
  /** First-level HP/CP base (10 + die max + Con), then die max + Con per level (King ruling). */
  firstLevelPoolBase: 10
};

/** KB 04: jutsu ranks. */
export const ranks = {
  E: { label: "E-Rank", value: 0, minLevel: 1, upcastLevel: null, abilityRequirement: null },
  D: { label: "D-Rank", value: 1, minLevel: 1, upcastLevel: null, abilityRequirement: null },
  C: { label: "C-Rank", value: 2, minLevel: 5, upcastLevel: 5, abilityRequirement: null },
  B: { label: "B-Rank", value: 3, minLevel: 9, upcastLevel: 9, abilityRequirement: 16 },
  A: { label: "A-Rank", value: 4, minLevel: 13, upcastLevel: 13, abilityRequirement: 18 },
  S: { label: "S-Rank", value: 5, minLevel: 17, upcastLevel: 17, abilityRequirement: 20 }
};
export const rankOrder = ["E", "D", "C", "B", "A", "S"];

/** KB 04: level -> rank for unranked effects (<=5 D, <=9 C, <=13 B, <=17 A, 18+ S). */
export const levelToRank = [[1, "D"], [6, "C"], [10, "B"], [14, "A"], [18, "S"]];

/** KB 08: purchase gate by rank (same thresholds as rank minLevel). */
export const purchaseLevelByRank = { E: 1, D: 1, C: 5, B: 9, A: 13, S: 17 };

/**
 * KB 04 + 10: disciplines. Base abilities are system-wide (King ruling): Tai Str, Nin Int, Gen Wis.
 * Bukijutsu uses the Taijutsu attack bonus and save DC.
 */
export const disciplines = {
  nin: { label: "Ninjutsu", ability: "int", keyword: "ninjutsu" },
  tai: { label: "Taijutsu", ability: "str", keyword: "taijutsu" },
  gen: { label: "Genjutsu", ability: "wis", keyword: "genjutsu" },
  buki: { label: "Bukijutsu", ability: "str", keyword: "bukijutsu", uses: "tai" }
};
/** Disciplines that hold their own attack/DC on the actor. */
export const castingDisciplines = ["nin", "tai", "gen"];

/** KB 01, 04, 08: DC tables. */
export const dcTables = {
  standard: { veryEasy: 5, easy: 10, medium: 15, hard: 20, veryHard: 25, nearlyImpossible: 30 },
  byRank: {
    D: { veryEasy: 11, easy: 14, medium: 18, hard: 22, veryHard: 26 },
    C: { veryEasy: 12, easy: 15, medium: 19, hard: 23, veryHard: 27 },
    B: { veryEasy: 13, easy: 16, medium: 20, hard: 24, veryHard: 28 },
    A: { veryEasy: 15, easy: 18, medium: 22, hard: 26, veryHard: 30 },
    S: { veryEasy: 16, easy: 19, medium: 23, hard: 27, veryHard: 31 }
  },
  toolkitByRank: { D: 13, C: 17, B: 21, A: 25, S: 30 },
  /** Standard Jutsu Ability Check: 13 + rank value of the opposing effect. */
  standardJutsuCheckBase: 13,
  /** Jutsu save DC = 8 + ability mod + proficiency. */
  jutsuSaveBase: 8,
  concentration: { base: 15, severeEnvironment: 20 },
  deathSave: 10,
  jutsuScroll: {
    E: { identify: 9, save: 12, attack: 4 },
    D: { identify: 12, save: 14, attack: 6 },
    C: { identify: 15, save: 16, attack: 8 },
    B: { identify: 18, save: 18, attack: 10 },
    A: { identify: 21, save: 20, attack: 12 },
    S: { identify: 24, save: 22, attack: 14 }
  },
  skillChallenge: { D: 3, C: 5, B: 7, A: 9, S: 11, failureLimit: 3 }
};

/** KB 01: point buy. */
export const abilityGeneration = {
  standardArray: [15, 14, 13, 12, 11, 10],
  pointBuy: { points: 30, min: 8, max: 15, cost: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } },
  pcMax: 20,
  adversaryMax: 30
};
