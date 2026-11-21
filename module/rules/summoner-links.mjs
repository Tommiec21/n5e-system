/**
 * Summoner-linked statistics (King 2026-11-21: the Bunshin and the Void Soul). An Allied NPC template
 * names, in flags.n5e.fromSummoner, the numbers it takes from whoever summons it:
 *   { "attributes.ac.flat": "@dc.nin", "details.level": "@level", "traits.speed.walk": "@speed" }
 * Keys are paths under the summon's `system`; values are formulas over the summoner's numbers
 * (summonerData). A formula that is a single reference keeps that value as it is (a save's
 * proficiency stays true or false); anything else is arithmetic (max, min, floor, ceil allowed).
 * workflow/allied.mjs writes the results into the token's actor delta when it is summoned.
 * Pure: plain data in, plain data out.
 */

const MATH = ["max", "min", "floor", "ceil", "abs", "round"];

/** The summoner numbers a link can name (from a prepared actor's system data). */
export function summonerData(system = {}, { rank = "" } = {}) {
  const abilities = Object.fromEntries(Object.entries(system.abilities ?? {}).map(([k, a]) => [k, Number(a?.mod) || 0]));
  const disc = system.disciplines ?? {};
  const pick = field => Object.fromEntries(Object.entries(disc).map(([k, d]) => [k, Number(d?.[field]) || 0]));
  return {
    ...abilities,
    abilities: Object.fromEntries(Object.entries(abilities).map(([k, mod]) => [k, { mod }])),
    prof: Number(system.prof) || 0,
    level: Number(system.level) || 0,
    dc: pick("dc"),
    attack: pick("attack"),
    hp: { max: Number(system.hp?.max) || 0 },
    cp: { max: Number(system.cp?.max) || 0 },
    speed: Number(system.speed?.walk ?? system.traits?.speed?.walk) || 0,
    // Every speed and the size (King Q-D27: the Duplicity flies only if you can, and is your size).
    speeds: Object.fromEntries(["walk", "climb", "swim", "fly", "burrow"].map(k => [k, Number(system.speed?.[k] ?? system.traits?.speed?.[k]) || 0])),
    size: system.traits?.size ?? "medium",
    // STD6e: the rank the summoning jutsu was cast at (D 1 ... S 5; 0 outside a cast), for stat blocks
    // that grow by rank ("10 + 10 for every rank above C-Rank": "10 + 10 * max(0, @rankValue - 2)").
    rankValue: ({ E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 })[String(rank).toUpperCase()] ?? 0,
    saves: Object.fromEntries(Object.entries(system.saves ?? {}).map(([k, s]) => [k, { proficient: !!s?.proficient }])),
    skills: Object.fromEntries(Object.entries(system.skills ?? {}).map(([k, s]) => [k, { total: Number(s?.total) || 0, passive: Number(s?.passive) || 0 }])),
    senses: Object.fromEntries(Object.entries(system.traits?.senses ?? {}).map(([k, v]) => [k, Number(v) || 0])),
    bonuses: { attack: Object.fromEntries(Object.entries(system.bonuses?.attack ?? {}).map(([k, v]) => [k, Number(v) || 0])) }
  };
}

const lookup = (data, ref) => ref.split(".").reduce((o, k) => (o == null ? undefined : o[k]), data);

/** One link's value, or undefined when it can't be worked out (the template's value stays). */
export function linkValue(formula, data) {
  const f = String(formula ?? "").trim();
  const single = f.match(/^@([\w.]+)$/);
  if ( single ) return lookup(data, single[1]);
  let bad = false;
  const expr = f.replace(/@([\w.]+)/g, (m, ref) => {
    const v = Number(lookup(data, ref));
    if ( !Number.isFinite(v) ) bad = true;
    return `(${Number.isFinite(v) ? v : 0})`;
  });
  if ( bad || !/^(?:[-+*/\d\s().,]|max|min|floor|ceil|abs|round)+$/.test(expr) ) return undefined;
  try {
    const v = Function(...MATH, `"use strict"; return (${expr});`)(...MATH.map(k => Math[k]));
    return Number.isFinite(v) ? v : undefined;
  } catch { return undefined; }
}

/**
 * The system values a summon takes from its summoner, as a nested object for the token's actor
 * delta (merge it into delta.system).
 */
export function summonerDelta(links, data) {
  const out = {};
  for ( const [path, formula] of Object.entries(links ?? {}) ) {
    const v = linkValue(formula, data);
    if ( v === undefined ) continue;
    const keys = path.split(".");
    let o = out;
    for ( const k of keys.slice(0, -1) ) o = (o[k] ??= {});
    o[keys.at(-1)] = v;
  }
  return out;
}

/** Deep-merge plain objects (b wins). */
export function mergeDeep(a = {}, b = {}) {
  const out = { ...a };
  for ( const [k, v] of Object.entries(b) ) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" ? mergeDeep(out[k], v) : v;
  }
  return out;
}
