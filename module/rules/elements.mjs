/**
 * Contextual rule elements. Authored JSON lives on items/effects at flags.n5e.rules.
 * No evaluated code or arbitrary property paths: predicates test explicit roll options only.
 * Bonuses stack additively, matching N5e; sources remain separate for the chat breakdown.
 */
const list = value => value ? Array.from(value) : [];

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
export function contextualModifiers(actor, spec, target = null) {
  const options = rollOptions(actor, spec, target);
  const parts = [];
  let shift = spec.kind === "save" ? Number(actor?.system?.saveTierShift) || 0 : 0;
  for ( const source of ruleSources(actor) ) {
    if ( source.flags?.n5e?.ruleToggle?.enabled === false ) continue;
    const sourceOptions = new Set(options);
    if ( source.system?.equipped ) sourceOptions.add("item:equipped");
    if ( source.type ) sourceOptions.add(`item:type:${source.type}`);
    const rules = source.flags?.n5e?.rules;
    for ( const element of Array.isArray(rules) ? rules : [] ) {
      if ( !element || typeof element !== "object" ) continue;
      if ( !["modifier", "degreeShift"].includes(element.key) ) continue;
      const selectors = Array.isArray(element.selector) ? element.selector : [element.selector];
      if ( !selectors.some(s => typeof s === "string" && s.length && ["all", spec.kind, spec.type, `${spec.type}:${spec.key}`, spec.scope && `${spec.kind}:${spec.scope}`].includes(s)) ) continue;
      if ( !testPredicate(element.predicate, sourceOptions) ) continue;
      const value = Number(element.value);
      if ( !Number.isFinite(value) ) continue;
      if ( element.key === "degreeShift" ) {
        if ( spec.kind === "save" ) shift += Math.trunc(value);
      } else if ( value ) parts.push({ label: element.label || source.name, value });
    }
  }
  return { parts, bonus: parts.reduce((sum, p) => sum + p.value, 0), shift };
}

/** Copy a spec; never mutate prepared actor data or count a contextual modifier twice. */
export function contextualSpec(actor, spec, target = null) {
  const modifiers = contextualModifiers(actor, spec, target);
  const parts = spec.breakdown?.parts?.map(p => ({ ...p })) ?? [{ label: "Base", value: spec.bonus ?? 0, base: true }];
  parts.push(...modifiers.parts);
  const bonus = (spec.bonus ?? 0) + modifiers.bonus;
  return { ...spec, bonus, degreeShift: modifiers.shift,
    breakdown: { label: spec.label, total: bonus, parts } };
}
