/**
 * Trigger elements (STD4; docs/STD4_SPEC.md). A rule element with `on: <event>` fires when the event
 * happens to its owner instead of changing a roll. Pure: which elements fire, and what they ask for.
 *
 * Events: initiative, turnStart, turnEnd, hit, miss, failedSave, succeededSave, damageDealt,
 * damageTaken, zeroHP. Outcomes (the element's key):
 *   resource  {pool, amount}           change a pool ("fury" is the Fury tracker)
 *   note      {text}                   a reminder to the owner
 *   inflict   {condition, ranks, who}  apply a condition to "self" or "target"
 * `oncePerTurn: true` limits it to once per combat turn.
 */
import { ruleSources, rollOptions, testPredicate, selectorNames } from "./elements.mjs";

const elementsOf = s => (Array.isArray(s.flags?.n5e?.rules) ? s.flags.n5e.rules : []).filter(e => e && typeof e === "object");

/** The elements on this event: [{element, label, key: "<sourceId>#i"}]. */
export function triggersFor(actor, event, { spec = {}, target = null, firedThisTurn = [] } = {}) {
  const names = selectorNames(spec);
  const options = rollOptions(actor, spec, target);
  const out = [];
  for ( const source of ruleSources(actor) ) {
    if ( source.flags?.n5e?.ruleToggle?.enabled === false ) continue;
    elementsOf(source).forEach((e, i) => {
      if ( e.on !== event ) return;
      if ( e.selector !== undefined && ![].concat(e.selector).some(s => names.includes(s)) ) return;
      if ( !testPredicate(e.predicate, options) ) return;
      const key = `${source.id ?? source._id ?? source.name}#${i}`;
      if ( e.oncePerTurn && firedThisTurn.includes(key) ) return;
      out.push({ element: e, label: e.label || source.name, key });
    });
  }
  return out;
}

/** What firing asks for: resource changes, notes, conditions. */
export function triggerOutcomes(fired) {
  const out = { resources: [], notes: [], inflict: [], onceKeys: [] };
  for ( const { element: e, label, key } of fired ) {
    if ( e.oncePerTurn ) out.onceKeys.push(key);
    if ( e.key === "resource" && e.pool ) out.resources.push({ pool: e.pool, amount: Math.trunc(Number(e.amount) || 0), label });
    else if ( e.key === "note" ) out.notes.push(`${label}: ${e.text ?? ""}`);
    else if ( e.key === "inflict" && e.condition ) out.inflict.push({ condition: e.condition, ranks: Math.max(1, Number(e.ranks) || 1), who: e.who === "target" ? "target" : "self", label });
  }
  return out;
}
