/**
 * Adversary tables (the Bingo Book, "The Adversary Profile" to "Final Calculation(s)"; NPC1).
 * Data only. The math that reads them is rules/adversary.mjs. Stat lines are the assumed baseline for
 * a class and level; the GM adjusts up or down (King 2026-11-14).
 */

export const adversaryClasses = { minion: "Minion", standard: "Standard", elite: "Elite", solo: "Solo" };
export const adversaryRoles = { none: "No Role", striker: "Striker", defender: "Defender", lurker: "Lurker", controller: "Controller", supporter: "Supporter" };
export const adversaryArmor = { light: "Light", medium: "Medium", heavy: "Heavy" };
export const adversaryBuilds = { adversary: "Adversary (Bingo Book)", character: "Player-style" };
export const hpSources = { formula: "Formula", lazyLow: "Lazy GM: Low", lazyMedium: "Lazy GM: Medium", lazyHigh: "Lazy GM: High" };

/** Base Adversary Statistics by Level: proficiency bonus, index = level - 1. */
export const proficiencyByLevel = [3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12];

/** Ability modifier lines, index = level - 1. Elite/Solo have none at levels 1-2. */
export const statLines = {
  standard: [[2, 1, 0, -1, -2, -3], [2, 1, 0, -1, -2, -3], [3, 2, 0, -1, -2, -3], [3, 2, 1, 0, -1, -2], [3, 2, 1, 0, -1, -2],
    [3, 2, 1, 0, -1, -2], [4, 3, 1, 0, -1, -2], [4, 3, 2, 0, -1, -2], [4, 3, 2, 1, 0, -2], [4, 3, 2, 1, 0, -1], [5, 4, 2, 1, 0, -1],
    [5, 4, 3, 1, 0, -1], [5, 4, 3, 2, 0, -1], [6, 4, 3, 2, 1, -1], [6, 5, 3, 2, 1, -1], [6, 5, 4, 2, 1, 0], [6, 5, 4, 2, 1, 0],
    [7, 5, 4, 3, 1, 0], [7, 6, 4, 3, 1, 0], [7, 6, 4, 3, 2, 0], [8, 6, 5, 3, 2, 0], [8, 6, 5, 3, 2, 1], [8, 7, 5, 4, 2, 1],
    [8, 7, 5, 4, 2, 1], [9, 7, 6, 4, 3, 1], [9, 7, 6, 4, 3, 1], [9, 8, 6, 5, 3, 1], [9, 8, 6, 5, 3, 2], [10, 8, 7, 5, 3, 2],
    [10, 8, 7, 5, 4, 2]],
  elite: [null, null, [3, 3, 2, 2, 1, 1], [3, 3, 3, 2, 2, 1], [4, 3, 3, 2, 2, 1], [4, 4, 3, 3, 2, 1], [5, 4, 3, 3, 2, 1],
    [5, 4, 4, 3, 2, 2], [6, 5, 4, 3, 2, 2], [6, 5, 4, 4, 3, 2], [7, 6, 5, 4, 3, 2], [7, 6, 5, 4, 3, 2], [7, 6, 5, 4, 3, 2],
    [8, 7, 6, 4, 3, 2], [8, 7, 6, 5, 4, 2], [9, 8, 6, 5, 4, 2], [9, 8, 7, 5, 4, 3], [10, 8, 7, 5, 4, 3], [10, 9, 7, 6, 4, 3],
    [11, 9, 7, 6, 4, 3], [11, 9, 8, 6, 5, 3], [11, 10, 8, 6, 5, 3], [12, 10, 8, 7, 5, 3], [12, 11, 9, 7, 5, 3], [13, 11, 9, 7, 5, 3],
    [13, 11, 9, 7, 5, 4], [14, 12, 10, 8, 6, 4], [14, 12, 10, 8, 6, 4], [15, 12, 10, 8, 6, 4], [15, 13, 11, 8, 6, 4]]
};

/** Adversary Rank Modifications: HP and CP per level. The Rank bonus (suggested ability points) equals Rank (King). */
export const rankTable = {
  E: { perLevel: 4, die: "d4", points: 0 }, D: { perLevel: 6, die: "d6", points: 1 }, C: { perLevel: 8, die: "d8", points: 2 },
  B: { perLevel: 10, die: "d10", points: 3 }, A: { perLevel: 12, die: "d12", points: 4 }, S: { perLevel: 20, die: "d20", points: 5 }
};

/** Adversary Armor Class by Level: Light at level 1, +1 every two levels; DR by armor type. */
export const armorTable = { light: { ac: 17, dr: 0 }, medium: { ac: 15, dr: 3 }, heavy: { ac: 13, dr: 6 } };

/** Class templates. hp: multiplier; Solo adds perPlayer for each player. */
export const classModifiers = {
  minion: { ac: -2, initiative: -2, autoFailSaves: true, noChakra: true },
  standard: {},
  elite: { hp: 1.25, ac: 1, save: 1, initiative: 2, minLevel: 3 },
  solo: { hp: 1.5, perPlayer: 0.5, ac: 2, save: 2, initiative: 3, minLevel: 5 }
};

/** Adversary Role Modifications. skills: by skill key. damageLevel is read by the Freeform tables (NPC3). */
export const roleModifiers = {
  none: {},
  striker: { initiative: 2, damageLevel: 1 },
  defender: { ac: 1, dr: 2 },
  lurker: { speed: 20, skills: { ste: 2 } },
  controller: { dc: 1, skills: { cha: 2 } },
  supporter: { save: 1, skills: { prc: 2 } }
};

/** Optional classifications. Both together: HP x2.5; the other modifiers add. */
export const classifications = {
  iconic: { hp: 1.5, ac: 1, attack: 1, dc: 1, points: 2, initiative: 1 },
  epic: { hp: 2, ac: 2, attack: 1, dc: 1, points: 4, initiative: 2 },
  bothHp: 2.5
};

/** Fully proficient saves by level (King Q-N15); the rest are half proficient. */
export const fullSavesByLevel = [[1, 2], [8, 3], [17, 4]];

/** Lazy GM HP/CP: per level, before the class multiplier; the printed tables round up and assume 4 players for a Solo. */
export const lazyPerLevel = { lazyLow: 7, lazyMedium: 9, lazyHigh: 11 };
export const lazySoloPlayers = 4;

/** Suggested counts (shown, never enforced). Each list is [from level, value]. */
export const suggested = {
  traitsByClass: { minion: 0, standard: 1, elite: 2, solo: 3 },
  traitsByLevel: [[1, 1], [6, 2], [12, 3], [18, 4]],
  jutsuByLevel: [[1, 4], [7, 6], [14, 8], [21, 10]],
  freeformSlots: {
    minion: [[1, 1], [5, 2], [6, 3]], standard: [[1, 2], [5, 3], [10, 4], [15, 5]],
    elite: [[3, 3], [7, 4], [11, 5], [15, 6]], solo: [[5, 3], [7, 4], [11, 5], [15, 6], [19, 7]]
  },
  multiattack: { minion: [[1, 1]], standard: [[1, 1], [6, 2], [11, 3]], elite: [[1, 2], [6, 3], [11, 4]], solo: [[1, 2], [6, 3], [11, 4]] }
};

/** Discipline abilities for adversaries; the Weapon/Freeform line uses any ability the GM picks. */
export const adversaryDisciplineAbility = { nin: "int", gen: "wis", tai: "str" };

/* NPC2: what the Adversary Builder shows (the Bingo Book's own words, shortened). */

/** Suggested jutsu ranks by adversary rank ("Non-Freeform Jutsu"); E-Rank: E and D (King Q-N27). */
export const suggestedJutsuRanks = { E: ["E", "D"], D: ["D", "C"], C: ["D", "C", "B"], B: ["C", "B", "A"], A: ["B", "A", "S"], S: ["A", "S"] };

/** The three concept examples from Step 1. */
export const conceptExamples = [
  "A fanatical cultist who charges into melee and burns anyone who strikes them down.",
  "A calculating illusionist who turns every condition their allies apply into something worse.",
  "A lone predator who picks one target at the start of combat and refuses to let them breathe until one of them hits the ground."
];

export const classDescriptions = {
  minion: "Grunts and cannon fodder that fill out the ranks. 4 to 6 Minions challenge one player. HP 10 + level, no Chakra, saves fail automatically.",
  standard: "A capable shinobi who can take a hit and throw one back. One Standard is a moderate challenge for one player of its level; two are a hard one.",
  elite: "A commander or champion who acts more than once a round and draws on Tenacity. One Elite challenges two players. Not before level 3.",
  solo: "The capstone of a mission: it handles the whole table at once and can change the battlefield. Not before level 5."
};

export const roleDescriptions = {
  none: "No Role. Solos take no Role and may use every Role's traits.",
  striker: "Offense above all else: hits hard, hits often. +1 level on damage tables, +2 initiative.",
  defender: "Durability and protection: absorbs punishment and shields allies. +1 AC, +2 DR.",
  lurker: "Patience and ambush: positioning, concealment, gone before the players respond. +20 speed, +2 Stealth.",
  controller: "Disruption and denial: conditions, lockdown, everything costs more. +1 jutsu save DCs, +2 Chakra Control.",
  supporter: "Amplification and sustain: makes everything around it more dangerous. +1 saving throws, +2 Perception."
};

export const rankDescriptions = { E: "Inconsequential threats", D: "Low level threats", C: "Mid-level threats", B: "High level threats", A: "Extreme level threats", S: "Village level threats" };

/** Clan and species groups with Adversary Traits in the book (suggestions for Step 6). */
export const adversaryClanGroups = ["Aberration", "Aburame", "Akimichi", "Bakuton", "Beast", "Construct", "Demon", "Fuma", "Futton", "Hatake",
  "Hebi", "Hoshigaki", "Hyuga", "Inuzuka", "Jinchūriki", "Jiton", "Kaguya", "Kurama", "Kuru", "Monstrosity", "Mutant", "Namikaze", "Nara",
  "Non-Clan", "Plant", "Ranton", "Ryu", "Sage Creature", "Sarutobi", "Senju", "Shakuton", "Shikigami", "Shoton", "Tsuchigumo", "Uchiha",
  "Undead", "Uzumaki", "Yamanaka", "Yoton", "Yuki", "Ōtsutsuki"];
