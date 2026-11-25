/**
 * Starting ability scores (King 2026-11-25; KB 01). Pure.
 * The GM's setup (world setting abilityGenerationConfig; CREATE1 Q-C1) toggles the methods players get:
 *   Point Buy (on by default; the points, 30 by default; each score 8–15 before clan and background;
 *   cost 8=0 9=1 10=2 11=3 12=4 13=5 14=7 15=9), Standard Array (on by default: 15/14/13/12/11/10; the GM
 *   can add arrays for higher or lower power games, and only one array is on at a time) and Roll
 *   (4d6, drop the lowest, six times; off unless the GM turns it on). The player picks among those on.
 */
import { abilityGeneration } from "../config/core.mjs";

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export const BOOK_ARRAY = [...abilityGeneration.standardArray];

/** The default setup: Point Buy (30) and the book's Standard Array on, Roll off. */
export const DEFAULT_CONFIG = Object.freeze({ pointBuy: { on: true, points: abilityGeneration.pointBuy.points },
  arrays: [{ values: BOOK_ARRAY, on: true }], roll: { on: false } });

/** Parse "15, 14, 13, 12, 11, 10" (or an array) into six scores 3–20, or null. */
export function parseArray(v) {
  const nums = (Array.isArray(v) ? v : String(v ?? "").split(/[^0-9]+/)).filter(x => x !== "").map(Number);
  return nums.length === 6 && nums.every(n => Number.isInteger(n) && n >= 3 && n <= 20) ? nums : null;
}

/** A clean setup from stored data: at most one Standard Array on (the first one marked on). */
export function cleanConfig(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const points = Number.isInteger(Number(r.pointBuy?.points)) && Number(r.pointBuy.points) > 0 ? Number(r.pointBuy.points) : DEFAULT_CONFIG.pointBuy.points;
  let arrays = (Array.isArray(r.arrays) ? r.arrays : DEFAULT_CONFIG.arrays).map(a => ({ values: parseArray(a?.values), on: !!a?.on })).filter(a => a.values);
  if ( !arrays.length ) arrays = [{ values: [...BOOK_ARRAY], on: false }];
  let seen = false;
  arrays = arrays.map(a => { const on = a.on && !seen; if ( on ) seen = true; return { ...a, on }; });
  return { pointBuy: { on: r.pointBuy ? !!r.pointBuy.on : true, points }, arrays, roll: { on: !!r.roll?.on } };
}

/** Add a Standard Array: it is turned on, every other array off. */
export function addArray(config, values) {
  const v = parseArray(values);
  if ( !v ) return config;
  return { ...config, arrays: [...config.arrays.map(a => ({ ...a, on: false })), { values: v, on: true }] };
}

/** Turn one array on (the others off) or off. */
export function toggleArray(config, index, on) {
  return { ...config, arrays: config.arrays.map((a, i) => ({ ...a, on: i === index ? on : (on ? false : a.on) })) };
}

/** The methods a player gets: [{key, label, points?, values?}]. Nothing on: Point Buy. */
export function methodsFrom(config) {
  const c = cleanConfig(config);
  const out = [];
  if ( c.pointBuy.on ) out.push({ key: "pointBuy", label: `Point Buy (${c.pointBuy.points} points)`, points: c.pointBuy.points });
  const arr = c.arrays.find(a => a.on);
  if ( arr ) out.push({ key: "standard", label: `Standard Array (${arr.values.join(", ")})`, values: arr.values });
  if ( c.roll.on ) out.push({ key: "roll", label: "Roll (4d6, drop the lowest)" });
  return out.length ? out : [{ key: "pointBuy", label: `Point Buy (${DEFAULT_CONFIG.pointBuy.points} points)`, points: DEFAULT_CONFIG.pointBuy.points }];
}

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

/** Each pool value used once (a Standard Array or the six rolls). */
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
 * @param {object} [o]
 * @param {number[]} [o.pool]   the array's values (standard) or the six rolls (roll)
 * @param {number} [o.points]   Point Buy points
 */
export function scoreProblems(method, scores, { pool = BOOK_ARRAY, points = abilityGeneration.pointBuy.points } = {}) {
  if ( method === "standard" ) return usesPool(scores, pool) ? [] : [`Use each Standard Array score (${pool.join(", ")}) once.`];
  if ( method === "pointBuy" ) {
    const spent = pointBuyCost(scores);
    if ( spent === null ) return ["Point Buy scores are 8 to 15 (before clan and background)."];
    return spent > points ? [`${spent} points spent; the limit is ${points}.`] : [];
  }
  if ( method === "roll" ) {
    if ( pool.length !== 6 ) return ["Roll the six scores first."];
    return usesPool(scores, pool) ? [] : ["Use each rolled score once."];
  }
  return ["Pick a method."];
}

/**
 * The ability values after setting new starting scores, keeping every increase gained so far.
 * Set before: the difference from the old starting score is kept (clan, ASI, feats, anything by hand).
 * Never set: the recorded increases are kept (clan increases applied at setup, level-up ASIs).
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

/** CREATE1 C3: the clan's increases on the current scores, per ability: {key, current, plus, result}. */
export function clanIncreasePreview(current, increments = {}) {
  return ABILITY_KEYS.map(k => ({ key: k, current: Number(current?.[k]) || 0, plus: Number(increments[k]) || 0,
    result: (Number(current?.[k]) || 0) + (Number(increments[k]) || 0) }));
}
