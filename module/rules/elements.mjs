/**
 * Contextual rule elements. Authored JSON lives on items/effects at flags.n5e.rules.
 * No evaluated code or arbitrary property paths: predicates test explicit roll options only.
 * Bonuses stack additively, matching N5e; sources remain separate for the chat breakdown.
 *
 * Rule elements v2 (STD1; docs/STD_SPEC.md):
 *   key        modifier, degreeShift, advantage, disadvantage, autoFail, autoSucceed, reroll,
 *              maximizeDice, minimumDie, critRange, damage, damageHandling, addRanks, inflict,
 *              effect, resource, note
 *   direction  self (my rolls; default), imposed (rolls others make against my action: read from the
 *              action card), against (rolls others make that target me)
 *   scope      always (default), action (only on the action it was chosen for: an action effect's
 *              element never acts from the actor; it is copied onto the card), turn, round
 *   uses       how many matching rolls it applies to (counted on the action card)
 *   targets    all (default), one (the first target that rolls uses it up), chosen
 *   on         a trigger event (STD4): kept and validated now, dispatched later
 * No engine line names content: every source is read from data.
 */
const list = value => value ? Array.from(value) : [];

export const ELEMENT_KEYS = ["modifier", "degreeShift", "advantage", "disadvantage", "autoFail", "autoSucceed", "reroll",
  "maximizeDice", "minimumDie", "critRange", "damage", "damageHandling", "addRanks", "inflict", "effect", "resource", "note"];
export const ELEMENT_DIRECTIONS = ["self", "imposed", "against"];
export const ELEMENT_SCOPES = ["always", "action", "turn", "round"];
export const ELEMENT_TARGETS = ["all", "one", "chosen"];
export const ELEMENT_EVENTS = ["initiative", "turnStart", "turnEnd", "hit", "miss", "failedSave", "succeededSave", "damageDealt", "damageTaken", "zeroHP"];

/** Does this element act from its owner's own sheet? (Not one bound to an action, not a trigger.) */
export const actsFromActor = e => (e.direction ?? "self") === "self" && (e.scope ?? "always") !== "action" && !e.on;

/** The selector names a roll answers to. */
export function selectorNames(spec = {}) {
  return ["all", spec.kind, spec.type, spec.type && spec.key && `${spec.type}:${spec.key}`, spec.scope && `${spec.kind}:${spec.scope}`,
    spec.damageType && `${spec.kind}:${spec.damageType}`].filter(Boolean);
}

const selects = (element, names) => {
  const selectors = Array.isArray(element.selector) ? element.selector : [element.selector];
  return selectors.some(s => typeof s === "string" && s.length && names.includes(s));
};

const elementsOf = source => (Array.isArray(source.flags?.n5e?.rules) ? source.flags.n5e.rules : []).filter(e => e && typeof e === "object");

function sourceOptions(base, source) {
  const o = new Set(base);
  if ( source.system?.equipped ) o.add("item:equipped");
  if ( source.type ) o.add(`item:type:${source.type}`);
  return o;
}

/**
 * Every element that applies to this roll, with the label to show:
 *   - self: the roller's own sources (elements bound to an action or a trigger excluded);
 *   - against: the target's sources with direction "against" (predicates read from the target's side);
 *   - extra: elements already chosen for this roll from its action card ({element, label}).
 * @returns {{element: object, label: string}[]}
 */
export function gatherElements(actor, spec = {}, target = null, extra = []) {
  const names = selectorNames(spec);
  const out = [];
  const mine = rollOptions(actor, spec, target);
  for ( const source of ruleSources(actor) ) {
    if ( source.flags?.n5e?.ruleToggle?.enabled === false ) continue;
    const opts = sourceOptions(mine, source);
    for ( const element of elementsOf(source) ) {
      if ( !actsFromActor(element) || !selects(element, names) || !testPredicate(element.predicate, opts) ) continue;
      out.push({ element, label: element.label || source.name });
    }
  }
  if ( target ) {
    const theirs = rollOptions(target, spec, actor);
    for ( const source of ruleSources(target) ) {
      if ( source.flags?.n5e?.ruleToggle?.enabled === false ) continue;
      const opts = sourceOptions(theirs, source);
      for ( const element of elementsOf(source) ) {
        if ( element.direction !== "against" || element.on || !selects(element, names) || !testPredicate(element.predicate, opts) ) continue;
        out.push({ element, label: element.label || source.name });
      }
    }
  }
  for ( const x of extra ?? [] ) {
    if ( x?.element && selects(x.element, names) && testPredicate(x.element.predicate, mine) ) out.push({ element: x.element, label: x.label || x.element.label || "Action effect" });
  }
  return out;
}

/**
 * The non-numeric effects of the elements on a roll (STD1): automatic results, a reroll, the crit
 * range, dice changes, extra damage, damage handling, added condition ranks, notes.
 */
export function contextualRoll(actor, spec = {}, target = null, extra = []) {
  const out = { autoFail: [], autoSucceed: [], reroll: null, critRange: 0, maximizeDice: 0, minimumDie: 0,
    damage: [], handling: null, addRanks: 0, notes: [], sources: [] };
  for ( const { element: e, label } of gatherElements(actor, spec, target, extra) ) {
    switch ( e.key ) {
      case "autoFail": out.autoFail.push(label); break;
      case "autoSucceed": out.autoSucceed.push(label); break;
      case "reroll": out.reroll ??= { mode: ["lower", "higher", "keep"].includes(e.mode) ? e.mode : "keep", label }; break;
      case "critRange": out.critRange += Math.max(0, Math.trunc(Number(e.value) || 0)); break;
      case "maximizeDice": out.maximizeDice += Math.max(0, Math.trunc(Number(e.value) || 0)); break;
      case "minimumDie": out.minimumDie = Math.max(out.minimumDie, Math.trunc(Number(e.value) || 0)); break;
      case "damage": if ( e.formula ) out.damage.push({ formula: String(e.formula), type: e.damageType ?? "", label }); break;
      case "damageHandling": out.handling = mergeHandling(out.handling, e); break;
      case "addRanks": out.addRanks += Math.trunc(Number(e.value) || 0); break;
      case "note": out.notes.push(`${label}: ${e.text ?? ""}`.trim()); break;
      default: continue;
    }
    out.sources.push(label);
  }
  return out;
}

/** Combine damage handling: any element can turn a flag on; the lowest DR multiplier wins. */
export function mergeHandling(into, e) {
  const h = into ?? { ignoreResistance: false, immunityAsResistance: false, drMultiplier: 1 };
  if ( e.ignoreResistance ) h.ignoreResistance = true;
  if ( e.immunityAsResistance ) h.immunityAsResistance = true;
  const m = Number(e.drMultiplier);
  if ( Number.isFinite(m) && m >= 0 ) h.drMultiplier = Math.min(h.drMultiplier, m);
  return h;
}

/** Dice changes on a formula: the first `maximize` dice rolled at their maximum, every die at least `minimum`. */
export function shapeDice(formula, { maximize = 0, minimum = 0 } = {}) {
  let left = Math.max(0, maximize);
  let f = String(formula).replace(/(\d*)d(\d+)/g, (all, n, faces) => {
    const count = Number(n || 1);
    if ( !left ) return all;
    const max = Math.min(left, count);
    left -= max;
    const rest = count - max;
    return `${max * Number(faces)}${rest ? ` + ${rest}d${faces}` : ""}`;
  });
  if ( minimum > 1 ) f = f.replace(/(\d*d\d+)(?![\dm])/g, `$1min${minimum}`);
  return f;
}

/** Build facts for a particular roll; target facts must describe exactly one target. */
export function rollOptions(actor, spec = {}, target = null) {
  const options = new Set(["self", `kind:${spec.kind ?? "check"}`, `type:${spec.type ?? "custom"}`]);
  if ( spec.key ) options.add(`key:${spec.key}`);
  if ( spec.scope ) options.add(`scope:${spec.scope}`);
  const addActor = (a, prefix) => {
    for ( const status of list(a?.statuses) ) options.add(`${prefix}:status:${status}`);
    for ( const effect of list(a?.effects).filter(e => e.active !== false && !e.disabled && !e.isSuppressed) ) {
      const state = effect.flags?.n5e?.state;
      if ( state ) options.add(`${prefix}:state:${state}`);
      const tracker = effect.flags?.n5e?.tracker?.kind;
      if ( tracker ) options.add(`${prefix}:tracker:${tracker}`);
    }
    if ( Number(a?.system?.combat?.fury) > 0 ) options.add(`${prefix}:state:furious`);
  };
  addActor(actor, "self");
  if ( target ) { options.add("target"); addActor(target, "target"); }
  return options;
}

/** Empty predicates match; all/any/not support nested predicates. Malformed input fails closed. */
export function testPredicate(predicate, options) {
  if ( typeof predicate === "string" ) return options.has(predicate);
  if ( Array.isArray(predicate) ) return predicate.every(p => testPredicate(p, options));
  if ( !predicate || typeof predicate !== "object" ) return predicate === undefined;
  if ( Object.keys(predicate).some(k => !["all", "any", "not"].includes(k)) ) return false;
  for ( const key of ["all", "any", "not"] ) {
    if ( key in predicate && !Array.isArray(predicate[key]) ) return false;
  }
  return (predicate.all ?? []).every(p => testPredicate(p, options))
    && (!predicate.any || predicate.any.some(p => testPredicate(p, options)))
    && !(predicate.not ?? []).some(p => testPredicate(p, options));
}

/** Applicable sources, including transferred item effects only once through allApplicableEffects. */
export function ruleSources(actor) {
  const items = list(actor?.items).filter(i => i.type !== "stance" || actor.system?.combat?.activeStance === i.id);
  const effects = actor?.allApplicableEffects ? list(actor.allApplicableEffects())
    : [...list(actor?.effects), ...items.flatMap(i => list(i.effects).filter(e => e.transfer))];
  return [...items, ...effects.filter(e => e.active !== false && !e.disabled && !e.isSuppressed)];
}

/** Sheet toggles use item/effect flags, avoiding a separate actor flag map that can become stale. */
export function ruleToggles(actor) {
  return ruleSources(actor).flatMap(source => {
    const toggle = source.flags?.n5e?.ruleToggle;
    return toggle ? [{ uuid: source.uuid, label: toggle.label || source.name, enabled: toggle.enabled !== false }] : [];
  });
}

/** Numeric modifiers and save-tier shifts for this roll, with labels for each source. */
export function contextualModifiers(actor, spec, target = null, extra = []) {
  const parts = [];
  let shift = spec.kind === "save" ? Number(actor?.system?.saveTierShift) || 0 : 0;
  for ( const { element, label } of gatherElements(actor, spec, target, extra) ) {
    if ( !["modifier", "degreeShift"].includes(element.key) ) continue;
    const value = Number(element.value);
    if ( !Number.isFinite(value) ) continue;
    if ( element.key === "degreeShift" ) {
      if ( spec.kind === "save" ) shift += Math.trunc(value);
    } else if ( value ) parts.push({ label, value });
  }
  return { parts, bonus: parts.reduce((sum, p) => sum + p.value, 0), shift };
}

/**
 * Advantage and disadvantage from rule elements ({key: "advantage"|"disadvantage", selector,
 * predicate, label}). Advantage applies to any dice roll (King 2026-11-13): d20s, damage, healing,
 * recovery and other dice. Selectors use the same matching as modifiers, plus "<kind>:<damage type>"
 * for named damage dice ("damage:fire"): only the dice a source names get it. With v2 directions, an
 * element on the target ("against") or on the action card ("imposed", via extra) counts too.
 * @returns {{advantage: string[], disadvantage: string[]}}
 */
export function contextualAdvantage(actor, spec, target = null, extra = []) {
  const out = { advantage: [], disadvantage: [] };
  for ( const { element, label } of gatherElements(actor, spec, target, extra) ) {
    if ( ["advantage", "disadvantage"].includes(element.key) ) out[element.key].push(label);
  }
  return out;
}

/** Keep the higher total with advantage, the lower with disadvantage (King: reroll the whole roll). */
export function keptIndex(totals, mode) {
  if ( totals.length < 2 || mode === "normal" ) return 0;
  return mode === "advantage" ? (totals[1] > totals[0] ? 1 : 0) : (totals[1] < totals[0] ? 1 : 0);
}

/** Copy a spec; never mutate prepared actor data or count a contextual modifier twice. */
export function contextualSpec(actor, spec, target = null, extra = []) {
  const modifiers = contextualModifiers(actor, spec, target, extra);
  const parts = spec.breakdown?.parts?.map(p => ({ ...p })) ?? [{ label: "Base", value: spec.bonus ?? 0, base: true }];
  parts.push(...modifiers.parts);
  const bonus = (spec.bonus ?? 0) + modifiers.bonus;
  return { ...spec, bonus, degreeShift: modifiers.shift,
    breakdown: { label: spec.label, total: bonus, parts } };
}
