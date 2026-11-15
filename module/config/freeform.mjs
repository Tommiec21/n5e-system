/**
 * Freeform tables (the Bingo Book, "Adversary Combat"; NPC3). Data only; the math is rules/freeform.mjs.
 * The damage tables were read from the book's text by a script, not retyped. Index = level - 1.
 */

/** Freeform Strike Table: [formula per attack, attacks] by column (Low Minion, Medium Standard, High Elite/Solo). */
export const strikeTable = {
  low: [["1d4", 1], ["1d4+1", 1], ["1d4+2", 1], ["1d6+1", 1], ["1d6+2", 1], ["1d8+2", 1], ["2d4+4", 1], ["2d6+3", 1], ["2d6+4", 1], ["3d4+3", 1], ["2d6+6", 1], ["2d6+6", 1], ["2d8+4", 1], ["2d8+5", 1], ["2d10+4", 1], ["2d10+5", 1], ["2d12+4", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1], ["2d12+5", 1]],
  medium: [["1d6", 1], ["1d8", 1], ["1d10+1", 1], ["1d12+1", 1], ["2d6+2", 1], ["1d6+2", 2], ["1d8+2", 2], ["1d10+2", 2], ["1d12+2", 2], ["2d6+2", 2], ["1d6+3", 3], ["1d8+3", 3], ["1d10+3", 3], ["1d12+3", 3], ["2d6+3", 3], ["1d8+6", 3], ["2d10", 3], ["1d12+5", 3], ["2d6+5", 3], ["1d8+8", 3], ["2d10+2", 3], ["1d12+7", 3], ["2d6+7", 3], ["1d8+10", 3], ["2d10+4", 3], ["1d12+9", 3], ["2d6+9", 3], ["1d8+12", 3], ["2d10+6", 3], ["1d12+11", 3]],
  high: [null, null, ["1d8+3", 2], ["1d10+3", 2], ["1d12+4", 2], ["1d8+5", 3], ["1d8+7", 3], ["1d10+5", 3], ["1d10+6", 3], ["1d12+6", 3], ["2d6+2", 4], ["2d8+1", 4], ["1d10+5", 4], ["1d12+5", 4], ["2d6+5", 4], ["2d8+4", 4], ["2d10+3", 4], ["2d12+2", 4], ["3d8+3", 4], ["2d10+5", 4], ["2d10+6", 4], ["2d12+5", 4], ["3d6+8", 4], ["2d8+10", 4], ["2d10+9", 4], ["2d12+8", 4], ["4d6+8", 4], ["4d8+5", 4], ["3d10+7", 4], ["3d12+5", 4]]
};

/** Which Strike column a class reads. */
export const strikeColumn = { minion: "low", standard: "medium", elite: "high", solo: "high" };

/** Freeform Jutsu Damage Tables: formula by rank column (Very Low = D ... Very High = S). */
export const jutsuDamageTable = {
  elite: { D: ["2d4+1", "2d4+3", "2d4+5", "4d4+2", "4d4+4", "4d6+2", "6d4+3", "6d4+5", "6d4+7", "6d6+3", "6d6+5", "6d6+7", "8d4+10", "6d6+11", "8d6+6", "8d6+8", "12d4+8", "8d6+12", "8d6+14", "10d6+9", "14d4+11", "10d6+13", "10d6+15", "12d6+10", "16d4+14", "12d6+14", "12d6+16", "12d6+18", "18d4+17", "14d6+15"], C: ["2d4+5", "3d4+6", "4d4+6", "6d4+5", "6d4+8", "6d6+5", "8d4+9", "10d4+7", "10d4+11", "8d6+11", "8d6+14", "10d6+10", "14d4+13", "12d6+10", "12d6+13", "12d6+16", "18d4+16", "10d8+19", "12d8+14", "12d8+17", "20d4+24", "12d8+23", "14d8+17", "14d8+21", "20d4+37", "14d8+27", "16d8+21", "16d8+24", "20d4+50", "18d8+22"], B: ["3d6+2", "4d4+6", "4d6+6", "6d6+3", "6d6+7", "6d8+5", "8d6+8", "8d6+12", "10d6+9", "8d8+12", "8d8+16", "10d8+11", "12d6+18", "10d8+19", "12d8+14", "12d8+18", "16d6+20", "10d10+25", "12d10+18", "12d10+22", "20d6+22", "14d10+19", "14d10+23", "14d10+27", "20d6+38", "16d10+24", "16d10+28", "16d10+32", "20d6+54", "18d10+29"], A: ["4d6", "3d8+6", "4d8+6", "4d8+11", "6d8+7", "6d10+6", "8d8+8", "8d8+12", "8d8+17", "8d10+14", "8d10+19", "10d10+13", "12d8+18", "10d10+22", "12d10+16", "12d10+21", "16d8+20", "12d12+18", "12d12+23", "12d12+28", "18d8+30", "14d12+25", "14d12+29", "14d12+34", "20d8+40", "16d12+31", "16d12+36", "16d12+40", "20d8+59", "18d12+37"], S: ["2d12+5", "3d12+5", "4d10+8", "4d10+14", "6d10+9", "6d12+9", "8d10+10", "8d10+16", "8d10+22", "8d12+20", "8d12+26", "10d12+19", "12d10+24", "12d12+18", "12d12+24", "12d12+30", "16d10+26", "14d12+29", "14d12+35", "16d12+28", "18d10+39", "16d12+40", "18d12+33", "18d12+39", "20d10+52", "20d12+38", "20d12+44", "20d12+50", "20d10+76", "20d12+62"] },
  standard: { D: ["1d4+2", "2d4+1", "2d4+2", "2d4+3", "3d4+2", "3d4+2", "3d4+4", "4d4+2", "4d4+3", "4d4+4", "4d4+5", "5d4+4", "5d4+4", "5d4+6", "6d4+4", "6d4+5", "6d4+6", "7d4+4", "7d4+6", "7d4+6", "7d4+8", "8d4+6", "8d4+7", "8d4+8", "9d4+6", "9d4+8", "9d4+8", "10d4+7", "10d4+8", "10d4+9"], C: ["2d6+1", "2d6+3", "3d6+2", "3d6+2", "3d6+4", "3d6+6", "4d6+4", "4d6+6", "4d6+7", "5d6+6", "5d6+6", "6d6+5", "6d6+7", "6d6+8", "7d6+6", "7d6+8", "7d6+10", "8d6+8", "8d6+9", "8d6+11", "9d6+8", "9d6+10", "9d6+12", "10d6+10", "10d6+12", "10d6+13", "11d6+12", "11d6+14", "11d6+14", "12d6+13"], B: ["2d8+1", "2d8+3", "2d8+5", "3d8+2", "3d8+4", "3d8+6", "4d8+4", "4d8+6", "4d8+8", "5d8+6", "5d8+8", "5d8+10", "6d8+7", "6d8+9", "6d8+11", "7d8+8", "7d8+10", "7d8+12", "8d8+10", "8d8+12", "8d8+14", "9d8+12", "9d8+14", "9d8+16", "10d8+13", "10d8+15", "10d8+17", "11d8+14", "11d8+16", "11d8+18"], A: ["2d10+1", "2d10+4", "2d10+6", "3d10+4", "3d10+6", "3d10+8", "4d10+5", "4d10+7", "4d10+10", "5d10+6", "5d10+8", "5d10+12", "6d10+8", "6d10+11", "6d10+13", "7d10+10", "7d10+12", "7d10+14", "8d10+12", "8d10+14", "8d10+16", "9d10+14", "9d10+16", "9d10+18", "10d10+15", "10d10+17", "10d10+20", "10d10+22", "11d10+20", "11d10+22"], S: ["2d12+2", "2d12+5", "2d12+8", "3d12+4", "3d12+8", "3d12+10", "4d12+7", "4d12+10", "4d12+13", "5d12+10", "5d12+12", "6d12+9", "6d12+12", "6d12+15", "7d12+12", "7d12+14", "7d12+18", "8d12+14", "8d12+17", "8d12+20", "9d12+16", "9d12+20", "9d12+22", "10d12+19", "10d12+22", "10d12+25", "11d12+22", "11d12+24", "11d12+28", "12d12+24"] }
};

/** Average damage per cell, as printed (for the windows' read-outs). */
export const jutsuDamageAverage = {
  elite: { D: [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64], C: [10, 13, 16, 20, 23, 26, 29, 32, 36, 39, 42, 45, 48, 52, 55, 58, 61, 64, 68, 71, 74, 77, 80, 84, 87, 90, 93, 96, 100, 103], B: [12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 124, 128], A: [14, 19, 24, 29, 34, 39, 44, 48, 53, 58, 63, 68, 72, 77, 82, 87, 92, 96, 101, 106, 111, 116, 120, 125, 130, 135, 140, 144, 149, 154], S: [18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120, 126, 132, 138, 144, 150, 156, 162, 168, 174, 180, 186, 192] },
  standard: { D: [5, 6, 7, 8, 10, 10, 12, 12, 13, 14, 15, 17, 17, 19, 19, 20, 21, 22, 24, 24, 26, 26, 27, 28, 29, 31, 31, 32, 33, 34], C: [8, 10, 13, 13, 15, 17, 18, 20, 21, 24, 24, 26, 28, 29, 31, 33, 35, 36, 37, 39, 40, 42, 44, 45, 47, 48, 51, 53, 53, 55], B: [10, 12, 14, 16, 18, 20, 22, 24, 26, 29, 31, 33, 34, 36, 38, 40, 42, 44, 46, 48, 50, 53, 55, 57, 58, 60, 62, 64, 66, 68], A: [12, 15, 17, 21, 23, 25, 27, 29, 32, 34, 36, 40, 41, 44, 46, 49, 51, 53, 56, 58, 60, 64, 66, 68, 70, 72, 75, 77, 81, 83], S: [15, 18, 21, 24, 28, 30, 33, 36, 39, 43, 45, 48, 51, 54, 58, 60, 64, 66, 69, 72, 75, 79, 81, 84, 87, 90, 94, 96, 100, 102] }
};

/** Which jutsu table a class reads. */
export const jutsuTableFor = { minion: "standard", standard: "standard", elite: "elite", solo: "elite" };

export const rankColumnLabel = { D: "Very Low", C: "Low", B: "Medium", A: "High", S: "Very High" };

/** Freeform Damage Penalty Table: level penalty or bonus. */
export const damagePenalties = {
  area: { label: "Area of effect", value: -2 },
  noDamageOnSave: { label: "No damage on save", value: 1 },
  lowestAttack: { label: "Uses the lowest attack bonus", value: 1 },
  preestablished1: { label: "Preestablished effect: Tier 1", value: 1 },
  preestablished2: { label: "Preestablished effect: Tier 2", value: 2 }
};
/** A Tier 1 extra effect is -1 level, Tier 2 is -2 (jutsu). A Strike rider reads 2 or 3 levels lower. */
export const effectTierPenalty = { 1: -1, 2: -2 };
export const strikeRiderPenalty = { 1: -2, 2: -3 };

/**
 * Effect & Conditions Table. kind: condition (applied on a failed save), effect (an Active Effect:
 * changes or a rule element), note (on the card for the GM; King Q-N36).
 */
export const freeformEffects = {
  bruised: { tier: 1, label: "Bruised", kind: "condition" }, bleed: { tier: 1, label: "Bleed", kind: "condition" },
  shaken: { tier: 1, label: "Shaken", kind: "condition" }, weakened: { tier: 1, label: "Weakened", kind: "condition" },
  burned: { tier: 1, label: "Burned", kind: "condition" }, chilled: { tier: 1, label: "Chilled", kind: "condition" },
  corroded: { tier: 1, label: "Corroded", kind: "condition" }, shocked: { tier: 1, label: "Shocked", kind: "condition" },
  envenomed: { tier: 1, label: "Envenomed", kind: "condition" }, concussed: { tier: 1, label: "Concussed", kind: "condition" },
  demoralized: { tier: 1, label: "Demoralized", kind: "condition" }, sealed: { tier: 1, label: "Sealed", kind: "condition" },
  dazzled: { tier: 1, label: "Dazzled", kind: "condition" }, deafened: { tier: 1, label: "Deafened", kind: "condition" },
  grappled: { tier: 1, label: "Grappled", kind: "condition" }, prone: { tier: 1, label: "Prone", kind: "condition" },
  acPenalty: { tier: 1, label: "AC penalty", kind: "effect", key: "system.bonuses.ac", value: -2 },
  drPenalty: { tier: 1, label: "DR penalty", kind: "effect", key: "n5e.dr", value: -2 },
  speedPenalty: { tier: 1, label: "Speed penalty", kind: "effect", key: "system.bonuses.speed", value: -10 },
  attackPenalty: { tier: 1, label: "Penalty on attacks", kind: "effect", key: "n5e.attack.all", value: -2 },
  savePenalty: { tier: 1, label: "Penalty on saves", kind: "effect", key: "system.bonuses.save", value: -2 },
  checkPenalty: { tier: 1, label: "Penalty on checks", kind: "effect", key: "system.bonuses.check", value: -2 },
  dcPenalty: { tier: 1, label: "Penalty on save DCs", kind: "effect", key: "n5e.saveDC.all", value: -2 },
  forcedMovement: { tier: 1, label: "Forced movement (push or pull)", kind: "note" },
  dispel: { tier: 2, label: "Dispel or interrupt effects", kind: "note" },
  attackDisadvantage: { tier: 2, label: "Disadvantage on attacks", kind: "rule", selector: "attack" },
  saveDisadvantage: { tier: 2, label: "Disadvantage on saves", kind: "rule", selector: "save" },
  checkDisadvantage: { tier: 2, label: "Disadvantage on checks", kind: "rule", selector: "check" },
  berserk: { tier: 2, label: "Berserk", kind: "condition" }, charmed: { tier: 2, label: "Charmed", kind: "condition" },
  confused: { tier: 2, label: "Confused", kind: "condition" }, blinded: { tier: 2, label: "Blinded", kind: "condition" },
  slowed: { tier: 2, label: "Slowed", kind: "condition" }, stunned: { tier: 2, label: "Stunned", kind: "condition" },
  exhaustion: { tier: 2, label: "Exhaustion", kind: "condition" }, dazed: { tier: 2, label: "Dazed", kind: "condition" },
  staggered: { tier: 2, label: "Staggered", kind: "condition" }, restrained: { tier: 2, label: "Restrained", kind: "condition" },
  actionDenial: { tier: 2, label: "Action, bonus action or reaction denial", kind: "note" },
  custom: { tier: 1, label: "Make your own", kind: "note" }
};

/** Recovering from conditions and effects (the book's three methods). */
export const recoveryMethods = { action: "Take an action", save: "Save at the end of its turn", rounds: "Wait 1-2 rounds" };

/** Freeform Jutsu Shapes. */
export const freeformShapes = {
  line: { label: "Line, 5 ft wide, 60 ft long", shape: "line", size: 60, width: 5 },
  sphere: { label: "Sphere, 20 ft radius", shape: "sphere", size: 20 },
  cone: { label: "Cone, 30 ft", shape: "cone", size: 30 },
  cylinder: { label: "Cylinder, 15 ft wide, 30 ft tall", shape: "cylinder", size: 15, height: 30 },
  cube: { label: "Cube, 30 ft", shape: "cube", size: 30 }
};

export const freeformRanges = { self: { label: "Self", value: 0 }, touch: { label: "Touch (5 ft)", value: 5 }, close: { label: "Close (30 ft)", value: 30 }, long: { label: "Long (60 ft)", value: 60 } };

/** What rank of Freeform Jutsu a class may cast, by level (suggestions). [rank, from level]. */
export const freeformRankLevels = {
  minion: [["D", 1], ["C", 11], ["B", 20]],
  standard: [["D", 1], ["C", 5], ["B", 9], ["A", 13], ["S", 17]],
  elite: [["D", 1], ["C", 3], ["B", 7], ["A", 11], ["S", 15]],
  solo: [["D", 1], ["C", 3], ["B", 7], ["A", 11], ["S", 15]]
};

/** Freeform Jutsu chakra cost by rank (King Q-N33). A Minion's cost nothing (the book). */
export const freeformCost = { D: 5, C: 9, B: 14, A: 20, S: 30 };

/** Freeform DR Table: by class and rank ("-" = not available). */
export const freeformDR = {
  minion: { D: "2", C: "4" },
  standard: { D: "2", C: "4", B: "6", A: "8", S: "10" },
  elite: { D: "1d4+2", C: "1d6+3", B: "1d8+4", A: "1d10+5", S: "1d12+6" },
  solo: { D: "1d6+2", C: "1d8+3", B: "1d10+4", A: "1d12+5", S: "2d6+6" }
};

/** Values the book gives at D, B and S; C and A use the rank below (King Q-N40). */
export const stepValues = {
  defensiveAC: { D: 3, B: 4, S: 5 },
  supportAttack: { D: 1, B: 2, S: 3 },
  supportSave: { D: 1, B: 2, S: 3 },
  supportCheckMastery: { D: 1, B: 2, S: 3 },
  supportResistances: { D: 1, B: 2, S: 3 }
};

export const defensiveFocus = { ac: "AC bonus", dr: "Damage Reduction", resistance: "Resistance", immunity: "Immunity (A-Rank or higher)", tempHp: "Temporary Hit Points (Elite or Solo)" };
export const supportFocus = { attack: "Attack bonus", save: "Save bonus", check: "Check bonus (Mastery)", ac: "AC bonus", damage: "Damage bonus (from C-Rank)",
  speed: "Speed bonus", burst: "Hit Point Burst", regen: "Hit Point Regen", resistance: "Grant resistance" };
