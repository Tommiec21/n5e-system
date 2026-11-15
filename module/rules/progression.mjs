/**
 * Level-based rules: proficiency, Mastery, ranks, HP/CP, inventory. Pure functions.
 * Source: KB 01, 04, 08. Tables come from config/core.mjs so homebrew edits flow through.
 * To change a progression number (proficiency bands, Mastery caps, ASI levels, rank minimum
 * levels), edit the table in config/core.mjs; these functions read it.
 */
import { progression, ranks, rankOrder, levelToRank, abilities } from "../config/core.mjs";
import { inventory as inventoryRules } from "../config/equipment.mjs";

/** Look up a [[minLevel, value], ...] band table. */
export function band(table, level) {
  let value = table[0][1];
  for ( const [min, v] of table ) if ( level >= min ) value = v;
  return value;
}

export const abilityMod = score => Math.floor((Number(score ?? 10) - 10) / 2);

/** Proficiency bonus at a character level (config/core.mjs progression.proficiency bands). */
export function proficiencyForLevel(level) {
  return band(progression.proficiency, Math.max(1, level || 1));
}

/**
 * PRESTD1 A16 (optional rule flatProficiency): the proficiency bonus by mode. "book" is the bands
 * above; "fixed" a set number; "slow" +2 at 1, +3 at 5, +4 at 11, +5 at 17.
 */
export const SLOW_PROFICIENCY = Object.freeze([[1, 2], [5, 3], [11, 4], [17, 5]]);
export function proficiencyFor(level, mode = "book", value = 3) {
  if ( mode === "fixed" ) return Math.max(0, Math.floor(Number(value) || 0));
  if ( mode === "slow" ) return band(SLOW_PROFICIENCY, Math.max(1, level || 1));
  return proficiencyForLevel(level);
}

/** PRESTD1 A15 (free feat track): how many of the listed levels a character has reached. */
export function freeFeatCount(levels, level) {
  const list = String(levels ?? "").split(/[,\s]+/).map(Number).filter(n => Number.isInteger(n) && n > 0);
  return [...new Set(list)].filter(l => (Number(level) || 0) >= l).length;
}

/** Highest Mastery rank allowed at a level: 1-6 -> 1, 7-11 -> 2, 12+ -> 3. */
export function masteryCap(level) {
  return Math.min(progression.mastery.maxRank, band(progression.mastery.capByLevel, Math.max(1, level || 1)));
}

/**
 * Mastery rank for one target: one rank per source, max 3, capped by level.
 * @param {number} sources  number of distinct sources
 * @param {number} level
 */
export function masteryRank(sources, level) {
  return Math.max(0, Math.min(sources, progression.mastery.maxRank, masteryCap(level)));
}
export const masteryBonus = rank => progression.mastery.bonusByRank[rank] ?? 0;

/**
 * What the Ability Score Improvement step gives at a level, or null (PRESTD1 A14; King Q-P12, Q-P14).
 * Book: +1 ability, a feat and one Mastery rank together at 4, 8, 12, 16, 19. Gradual: the +1 ability
 * alone at 2, 6, 10, 14, 18; the feat and the Mastery rank at 4, 8, 12, 16, 19.
 */
export function asiParts(level, gradual = false) {
  if ( gradual && (progression.gradualAbilityLevels ?? []).includes(level) ) return { ability: true, feat: false, mastery: false };
  if ( progression.asiLevels.includes(level) ) return { ability: !gradual, feat: true, mastery: true };
  return null;
}

/** Number of ASI levels reached (each grants +1 ability, a feat, and one Mastery rank). */
export function asiCount(level) {
  return progression.asiLevels.filter(l => level >= l).length;
}

/** Rank value used in formulas (E 0, D 1 ... S 5). */
export const rankValue = rank => ranks[rank]?.value ?? 0;

/** Step a rank up/down; clamps to E..S. */
export function stepRank(rank, steps = 1) {
  const i = rankOrder.indexOf(rank);
  if ( i < 0 ) return rank;
  return rankOrder[Math.max(0, Math.min(rankOrder.length - 1, i + steps))];
}

/** Unranked effects use level -> rank (KB 04). */
export function rankForLevel(level) {
  return band(levelToRank, Math.max(1, level || 1));
}

/** Highest rank castable by level (all 7 classes: D 1, C 5, B 9, A 13, S 17). */
export function maxRankForLevel(level) {
  let best = "D";
  for ( const r of rankOrder ) if ( ranks[r].minLevel <= level && rankValue(r) >= rankValue(best) ) best = r;
  return best;
}

/** Ranks a jutsu can be upcast to: above its base rank, up to the caster's highest rank. */
export function upcastRanks(baseRank, castMaxRank) {
  const lo = rankOrder.indexOf(baseRank);
  const hi = rankOrder.indexOf(castMaxRank);
  if ( lo < 0 || hi <= lo ) return [];
  return rankOrder.slice(lo + 1, hi + 1);
}

/**
 * HP or CP max (King ruling): 10 + die max + Con at 1st, then die max + Con per later level.
 * Simplifies to 10 + level x (die max + Con mod). Con changes are retroactive.
 */
export function poolMax({ level, dieMax, conMod, bonus = 0, perLevelBonus = 0 }) {
  if ( !level || level < 1 ) return Math.max(0, bonus);
  return progression.firstLevelPoolBase + level * (dieMax + conMod + perLevelBonus) + bonus;
}

/** Inventory Slots = 10 + 2 x Str mod (+ storage bonuses). */
export function inventorySlots(strMod, bonus = 0) {
  return Math.max(0, inventoryRules.base + inventoryRules.perStrMod * strMod + bonus);
}

/** Ability requirement to learn/cast a ranked jutsu (B 16, A 18, S 20); null when none. */
export function abilityRequirement(rank) {
  return ranks[rank]?.abilityRequirement ?? null;
}

/** Is a key an ability key? */
export const isAbility = key => key in abilities;
