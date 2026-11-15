/**
 * Conditions and states as data (STD3; docs/STD3_SPEC.md). What a condition or state does to rolls,
 * damage and casting lives on its entry in config/conditions.mjs (`rules`, `cast`); this reads it.
 * No condition or state is named here. Pure: plain facts in, the same shape advantage.mjs returned.
 *
 * Facts: { statuses: Set, senses: {key: range}, encumbered?: boolean }
 */
import { conditions, states, derivedEffects } from "../config/conditions.mjs";
import { testPredicate } from "./elements.mjs";

const ENTRIES = { ...conditions, ...states };
const COMPONENT_NAMES = { hs: "Hand Seals", cs: "Chakra Seals", m: "Mobility", cm: "Chakra Molding", w: "Weapon" };
const list = v => (v ? Array.from(v) : []);

/** The active entries for a creature: [{key, label, rules, cast}]. */
export function activeEntries(facts = {}) {
  const out = [];
  for ( const key of list(facts.statuses) ) {
    const e = ENTRIES[key];
    if ( e ) out.push({ key, label: e.label, rules: e.rules ?? [], cast: e.cast ?? null });
  }
  if ( facts.encumbered ) out.push({ key: "encumbered", label: derivedEffects.encumbered.label, rules: derivedEffects.encumbered.rules ?? [], cast: null });
  return out;
}

/** The roll options the entries' predicates read (rules/elements.mjs uses the same names). */
export function factOptions(me, other, { ability = null, ranged = false } = {}) {
  const o = new Set(["self"]);
  const add = (who, prefix) => {
    for ( const s of list(who?.statuses) ) o.add(`${prefix}:status:${s}`);
    for ( const [k, v] of Object.entries(who?.senses ?? {}) ) if ( (Number(v) || 0) > 0 ) o.add(`${prefix}:sense:${k}`);
  };
  add(me, "self");
  if ( other ) { o.add("target"); add(other, "target"); }
  if ( ability ) o.add(`ability:${ability}`);
  o.add(ranged ? "range:ranged" : "range:melee");
  return o;
}

const selects = (e, kind) => [].concat(e.selector ?? []).some(s => s === kind || s === "all");

/**
 * Advantage, disadvantage, automatic failure and what ends on use, from the conditions and states of
 * the roller (its own elements) and of its target ("against" elements).
 * @returns {{advantage: string[], disadvantage: string[], autoFail: string|null, consume: string[]}}
 */
export function conditionRoll({ roller, target = null, kind, ability = null, ranged = false }) {
  const adv = [], dis = [], consume = [];
  let autoFail = null, noAdvantage = false;
  const mine = factOptions(roller, target, { ability, ranged });
  for ( const entry of activeEntries(roller) ) {
    for ( const e of entry.rules ) {
      if ( (e.direction ?? "self") !== "self" || !selects(e, kind) || !testPredicate(e.predicate, mine) ) continue;
      const label = e.label || entry.label;
      if ( e.key === "advantage" ) adv.push(label);
      else if ( e.key === "disadvantage" ) dis.push(label);
      else if ( e.key === "autoFail" ) autoFail ??= label;
      else if ( e.key === "noAdvantage" ) noAdvantage = true;
      else continue;
      if ( e.endsOnUse && !consume.includes(entry.key) ) consume.push(entry.key);
    }
  }
  if ( target ) {
    const theirs = factOptions(target, roller, { ability, ranged });
    for ( const entry of activeEntries(target) ) {
      for ( const e of entry.rules ) {
        if ( e.direction !== "against" || !selects(e, kind) || !testPredicate(e.predicate, theirs) ) continue;
        if ( e.key === "advantage" ) adv.push(e.label || `Target ${entry.label}`);
        else if ( e.key === "disadvantage" ) dis.push(e.label || `Target ${entry.label}`);
      }
    }
  }
  // "Can't gain advantage" removes the sources rather than cancelling them.
  if ( noAdvantage ) adv.length = 0;
  return { advantage: [...new Set(adv)], disadvantage: [...new Set(dis)], autoFail, consume };
}

/** Damage handling a creature's conditions put on damage it takes (Petrified: resistance to all). */
export function conditionDamageHandling(facts = {}) {
  const out = { resistAll: false, sources: [] };
  for ( const entry of activeEntries(facts) ) {
    for ( const e of entry.rules ) {
      if ( e.key === "damageHandling" && e.direction === "against" && e.resistAll ) { out.resistAll = true; out.sources.push(e.label || entry.label); }
    }
  }
  return out;
}

/** Casting limits from conditions and states: problems for a jutsu with these components. */
export function conditionCastProblems(facts = {}, components = []) {
  const problems = [];
  for ( const { cast } of activeEntries(facts) ) {
    if ( !cast ) continue;
    if ( cast.blocked ) problems.push(cast.blocked);
    const blocked = (cast.components ?? []).filter(c => components.includes(c));
    if ( blocked.length ) problems.push(String(cast.reason ?? "").replace("{components}", blocked.map(c => COMPONENT_NAMES[c] ?? c).join(", ")));
    if ( Number.isFinite(cast.maxComponents) && components.length > cast.maxComponents ) {
      problems.push(`${cast.reason}: can't cast a jutsu with more than ${cast.maxComponents} components (this one has ${components.length})`);
    }
  }
  return [...new Set(problems)];
}
