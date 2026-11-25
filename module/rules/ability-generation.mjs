/**
 * Starting ability scores (King 2026-11-25; KB 01): Standard Array 15/14/13/12/11/10, Point Buy (30
 * points, 8–15 before clan and background; 8=0 9=1 10=2 11=3 12=4 13=5 14=7 15=9) or 4d6 drop the lowest
 * six times. The table picks the method (world rule `abilityGeneration`; "any": the player picks). Pure.
 */
import { abilityGeneration } from "../config/core.mjs";

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export const METHODS = { standard: "Standard Array", pointBuy: "Point Buy", roll: "Roll (4d6, drop the lowest)" };

/** Points a set of scores costs ({str: 15, ...}); null when a score is outside 8–15. */
export function pointBuyCost(scores) {
  const { cost, min, max } = abilityGeneration.pointBuy;
  let total = 0;
  for ( const k of ABILITY_KEYS ) {
    const v = Number(scores?.[k]);
    if ( !Number.isInteger(v) || v < min || v > max ) return null;
    total += cost[v];
  }
  return total;
}

/** Each pool value used once (standard array or the six rolls). */
function usesPool(scores, pool) {
  const left = [...pool].map(Number);
  for ( const k of ABILITY_KEYS ) {
    const i = left.indexOf(Number(scores?.[k]));
    if ( i < 0 ) return false;
    left.splice(i, 1);
  }
  return true;
}

/**
 * Problems with a set of starting scores (empty = valid).
 * @param {"standard"|"pointBuy"|"roll"} method
 * @param {object} scores   {str..cha}
 * @param {number[]} [rolls] the six rolled totals (roll)
 */
export function scoreProblems(method, scores, rolls = []) {
  if ( method === "standard" ) return usesPool(scores, abilityGeneration.standardArray) ? [] : ["Use each Standard Array score (15, 14, 13, 12, 11, 10) once."];
  if ( method === "pointBuy" ) {
    const spent = pointBuyCost(scores);
    if ( spent === null ) return ["Point Buy scores are 8 to 15 (before clan and background)."];
    return spent > abilityGeneration.pointBuy.points ? [`${spent} points spent; the limit is ${abilityGeneration.pointBuy.points}.`] : [];
  }
  if ( method === "roll" ) {
    if ( rolls.length !== 6 ) return ["Roll the six scores first."];
    return usesPool(scores, rolls) ? [] : ["Use each rolled score once."];
  }
  return ["Pick a method."];
}

/** The methods a player may use under the world rule. */
export function allowedMethods(rule) {
  return rule && METHODS[rule] ? [rule] : Object.keys(METHODS);
}

/**
 * The ability values after setting new starting scores, keeping every increase gained so far.
 * Set before: the difference from the old starting score is kept (clan, ASI, feats, anything by hand).
 * Never set: the recorded increases are kept (clan increases applied at setup, level-up ASIs).
 * @param {object} current   {str: value...} the scores now
 * @param {object} next      the new starting scores
 * @param {object|null} oldBase  the earlier starting scores, if any
 * @param {object} recorded  {str: +n...} recorded increases (used when oldBase is null)
 */
export function newAbilityValues(current, next, oldBase, recorded = {}) {
  const out = {};
  for ( const k of ABILITY_KEYS ) {
    const gained = oldBase ? (Number(current?.[k]) || 0) - (Number(oldBase[k]) || 0) : (Number(recorded[k]) || 0);
    out[k] = Number(next[k]) + gained;
  }
  return out;
}

/** Increases the system recorded on a character's items: clan setup and level-up ASIs. */
export function recordedIncreases(items) {
  const out = Object.fromEntries(ABILITY_KEYS.map(k => [k, 0]));
  for ( const i of items ?? [] ) {
    const f = i.flags?.n5e ?? {};
    if ( i.type === "clan" ) for ( const [k, n] of Object.entries(f.clanAbilityIncreases ?? {}) ) if ( k in out ) out[k] += Number(n) || 0;
    if ( i.type === "class" ) for ( const a of Object.values(f.asi ?? {}) ) if ( a?.ability in out ) out[a.ability] += 1;
  }
  return out;
}
