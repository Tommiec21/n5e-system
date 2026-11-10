import { resolveEffectFormula, validateServiceConfig, effectFormulaData } from "./effect-services.mjs";
/** Effect authoring contracts. No document writes, evaluated scripts or independent effect engine. */
import { changeKeyCatalog, parseN5eChanges } from "./change-keys.mjs";
import { getPath } from "./formula.mjs";

export function effectFieldCatalog(config) {
  return changeKeyCatalog(config).map(field => {
    let type = "number", example = "2", choices = null;
    if ( field.key.startsWith("n5e.mastery.") ) { type = "text"; example = "Class feature"; }
    else if ( field.key.startsWith("n5e.disciplineAbility.") ) { type = "ability"; choices = ["str", "dex", "con", "int", "wis", "cha"]; example = "wis"; }
    else if ( field.key === "n5e.unarmed.dice" ) { type = "dice"; example = "1d8"; }
    else if ( /^n5e\.(cost|upkeep)\./.test(field.key) ) { type = "adjustment"; example = "-2, *0.5 or /2"; }
    const custom = field.key.startsWith("n5e.");
    return { ...field, type, example, choices, modes: custom ? [0, 2] : [1, 2, 3, 4, 5],
      behavior: custom ? "N5e combines this field using its own rules. Add/Custom are accepted; core priority does not change that calculation." : "Foundry applies this field using the selected mode and priority." };
  });
}

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function validateEffectChanges(changes, original, catalog) {
  const errors = [], warnings = [], fields = new Map(catalog.map(f => [f.key, f]));
  if ( !Array.isArray(changes) || changes.length > 100 ) return { errors: ["Use at most 100 effect changes."], warnings };
  changes.forEach((change, index) => {
    if ( !change || typeof change !== "object" || Array.isArray(change) ) { errors.push(`Change ${index + 1}: invalid change row.`); return; }
    const prefix = `Change ${index + 1}: `, field = fields.get(change.key), value = String(change.value ?? "").trim();
    let problem;
    if ( typeof change.key !== "string" || !change.key.trim() ) problem = "choose a field.";
    else if ( /(?:^|\.)(?:__proto__|constructor|prototype)(?:\.|$)/.test(change.key) ) problem = "unsafe property path.";
    else if ( !field ) problem = `unsupported field ${change.key}. Existing unchanged legacy rows are preserved.`;
    else if ( !field.modes.includes(Number(change.mode)) ) problem = "this mode is not supported for the field.";
    else if ( change.priority != null && change.priority !== "" && !Number.isFinite(Number(change.priority)) ) problem = "priority must be a finite number.";
    else if ( field.type === "number" && (!value || !Number.isFinite(Number(value))) ) { try { resolveEffectFormula(value, {}, { syntaxOnly: true }); } catch (error) { problem = error.message; } }
    else if ( field.type === "ability" && !field.choices.includes(value) ) problem = "choose str, dex, con, int, wis or cha.";
    else if ( field.type === "dice" && !/^([1-9]\d*)?d[1-9]\d*$/.test(value) ) problem = "use a simple dice term, such as 1d8.";
    else if ( field.type === "adjustment" && (!/^([*/])?[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)
      || !Number.isFinite(Number(value.replace(/^[*/]/, ""))) || (/^[*/]/.test(value) && Number(value.slice(1)) <= 0)) ) { try { if ( /^[*/]/.test(value) ) throw new Error("Use a positive multiplier/divisor."); resolveEffectFormula(value, {}, { syntaxOnly: true }); } catch (error) { problem = error.message; } }
    else if ( field.type === "text" && !value ) problem = "enter the source label.";
    if ( value.length > 1000 ) problem = "value is too long.";
    if ( problem ) {
      const legacy = original.some(row => row.key === change.key && String(row.value ?? "") === String(change.value ?? "")
        && Number(row.mode) === Number(change.mode) && (row.priority ?? null) === (change.priority ?? null));
      (legacy && !/unsafe/.test(problem) ? warnings : errors).push(prefix + problem);
    }
  });
  return { errors, warnings };
}

function validatePredicate(value, depth = 0) {
  if ( depth > 12 ) throw new Error("Conditional predicate is too deeply nested.");
  if ( typeof value === "string" ) { if ( value.length > 200 ) throw new Error("Predicate option is too long."); return; }
  if ( Array.isArray(value) ) { if ( value.length > 50 ) throw new Error("Too many predicate options."); value.forEach(v => validatePredicate(v, depth + 1)); return; }
  if ( !value || typeof value !== "object" || Object.keys(value).some(k => !["all", "any", "not"].includes(k)) ) throw new Error("Use only all, any and not predicates.");
  for ( const v of Object.values(value) ) { if ( !Array.isArray(v) ) throw new Error("Predicate groups must be arrays."); validatePredicate(v, depth + 1); }
}

export function validateConditionalRules(rules) {
  if ( !Array.isArray(rules) || rules.length > 50 ) throw new Error("Conditional rules must be an array of at most 50 entries.");
  for ( const r of rules ) {
    if ( !r || !["modifier", "degreeShift"].includes(r.key) || r.value === null || typeof r.value === "boolean" || String(r.value ?? "").trim() === "" || !Number.isFinite(Number(r.value))
      || (r.key === "degreeShift" && !Number.isInteger(Number(r.value))) ) throw new Error("Conditional rules need modifier/degreeShift and a numeric value.");
    const selectors = Array.isArray(r.selector) ? r.selector : [r.selector];
    if ( !selectors.length || selectors.some(s => typeof s !== "string" || !/^[\w:-]{1,100}$/.test(s)) ) throw new Error("Use named roll selectors, such as attack, damage, save or skill:ste.");
    if ( r.predicate !== undefined ) validatePredicate(r.predicate);
    if ( Object.keys(r).some(k => !["key", "selector", "label", "value", "predicate"].includes(k)) ) throw new Error("Unsupported conditional rule property.");
  }
  return rules;
}

export function editorFlags(input, original = {}) {
  const patch = {};
  const min = Number(input.min || 0), max = Number(input.max || 0);
  if ( !Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < 0 || (max && min > max) ) throw new Error("Check the minimum and maximum effect levels.");
  if ( min !== (original.levels?.min ?? 0) || max !== (original.levels?.max ?? 0) ) patch.levels = { ...original.levels, min, max };
  for ( const [key, value] of [["requiresStance", input.stance ?? ""], ["exclusive", input.exclusive ?? ""], ["state", input.state ?? ""]] ) {
    if ( typeof value !== "string" || value.length > 120 ) throw new Error("Effect flag text is too long.");
    if ( value !== (original[key] ?? "") ) patch[key] = value;
  }
  const rules = JSON.parse(input.rules || "[]");
  // Unchanged legacy rules are retained even when authored by an older/foreign extension.
  if ( !equal(rules, original.rules ?? []) ) patch.rules = validateConditionalRules(rules);
  const at = input.expires ?? "";
  if ( !["", "turnStart", "turnEnd", "nextTurnEnd"].includes(at) ) throw new Error("Unsupported expiration event.");
  const sourceUuid = input.sourceUuid ?? "";
  if ( at !== (original.expires?.at ?? "") || sourceUuid !== (original.expires?.sourceUuid ?? "") ) {
    if ( at && !/^(Actor\.[A-Za-z0-9]+|Scene\.[A-Za-z0-9]+\.Token\.[A-Za-z0-9]+\.Actor\.[A-Za-z0-9]+)$/.test(sourceUuid) ) throw new Error("Source-turn expiration needs the source actor UUID.");
    patch.expires = at ? { ...original.expires, at, sourceUuid } : null;
  }
  if ( input.services !== undefined ) {
    const services = JSON.parse(input.services || "{}");
    if ( !equal(services, original.services ?? {}) ) patch.services = validateServiceConfig(services);
  }
  return patch;
}

export const EFFECT_PRESETS = [
  { id: "dr", label: "+2 damage reduction", changes: [{ key: "n5e.dr", mode: 2, value: "2", priority: 20 }] },
  { id: "ac", label: "+1 armor class", changes: [{ key: "system.bonuses.ac", mode: 2, value: "1", priority: 20 }] },
  { id: "speed", label: "+10 speed", changes: [{ key: "system.bonuses.speed", mode: 2, value: "10", priority: 20 }] }
];

export function effectPreview(original, draft, actor) {
  const unresolved = [], data = effectFormulaData(actor);
  const resolve = rows => rows.flatMap(c => {
    if ( Number.isFinite(Number(c.value)) || /^(n5e\.(mastery|disciplineAbility|unarmed)\.)/.test(c.key)
      || (/^n5e\.(cost|upkeep)\./.test(c.key) && /^[*/]/.test(c.value)) ) return [c];
    try { return [{ ...c, value: String(resolveEffectFormula(c.value, { ...data, target: data, base: getPath(data, c.key) ?? 0 })) }]; }
    catch (error) { unresolved.push({ key: c.key, reason: error.message }); return []; }
  });
  const beforeRows = resolve(original.changes ?? []), afterRows = resolve(draft.changes ?? []);
  const core = afterRows.filter(c => c.key?.startsWith("system.")).map(c => {
    const before = getPath(actor?._source ?? {}, c.key), amount = Number(c.value), mode = Number(c.mode);
    let after = null;
    if ( Number.isFinite(Number(before)) && Number.isFinite(amount) ) {
      after = ({ 1: () => Number(before) * amount, 2: () => Number(before) + amount, 3: () => Math.min(Number(before), amount),
        4: () => Math.max(Number(before), amount), 5: () => amount })[mode]?.() ?? null;
    }
    return { key: c.key, before: before ?? "Unavailable", after: after ?? "Not estimated" };
  });
  return { core, modifiersBefore: parseN5eChanges(beforeRows), modifiersAfter: parseN5eChanges(afterRows), unresolved };
}

/** Portable data never imports executable foreign flags or IDs; existing document flags are untouched. */
export function portableEffect(source) {
  const out = Object.fromEntries(["name", "img", "type", "system", "changes", "duration", "statuses", "transfer", "disabled", "description"].filter(k => k in source).map(k => [k, structuredClone(source[k])]));
  const flags = source.flags?.n5e ?? {};
  out.flags = { n5e: Object.fromEntries(["levels", "requiresStance", "exclusive", "state", "rules", "ruleToggle"].filter(k => k in flags).map(k => [k, structuredClone(flags[k])])) };
  if ( flags.services ) { const services = validateServiceConfig(flags.services); out.flags.n5e.services = { ...services, macros: [] }; }
  return { format: "n5e-effect", version: 1, effect: out };
}

export function importEffect(text, catalog) {
  if ( typeof text !== "string" || text.length > 100000 ) throw new Error("Effect import is too large.");
  const packet = JSON.parse(text);
  const safe = (value, depth = 0) => {
    if ( depth > 25 ) throw new Error("Effect import is too deeply nested.");
    if ( value && typeof value === "object" ) for ( const [key, child] of Object.entries(value) ) {
      if ( ["__proto__", "prototype", "constructor"].includes(key) ) throw new Error("Unsafe import property.");
      safe(child, depth + 1);
    }
  };
  safe(packet);
  if ( packet.format !== "n5e-effect" || packet.version !== 1 || !packet.effect || typeof packet.effect.name !== "string" ) throw new Error("Use an N5e effect export (version 1).");
  const effect = portableEffect(packet.effect).effect;
  const report = validateEffectChanges(effect.changes ?? [], [], catalog);
  if ( report.errors.length ) throw new Error(report.errors.join(" "));
  if ( effect.flags.n5e.rules ) validateConditionalRules(effect.flags.n5e.rules);
  effect.disabled = true; // Import never silently activates a new effect.
  return effect;
}
