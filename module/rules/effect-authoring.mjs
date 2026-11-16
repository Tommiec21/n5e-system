import { resolveEffectFormula, validateServiceConfig, effectFormulaData } from "./effect-services.mjs";
/** Effect authoring contracts. No document writes, evaluated scripts or independent effect engine. */
import { changeKeyCatalog, parseN5eChanges } from "./change-keys.mjs";
import { getPath } from "./formula.mjs";
import { fieldInfo, FIELD_CATEGORIES } from "../config/effect-fields.mjs";
import { ELEMENT_KEYS, ELEMENT_DIRECTIONS, ELEMENT_SCOPES, ELEMENT_TARGETS, ELEMENT_EVENTS } from "./elements.mjs";

/**
 * Every field an effect can change, with its plain-language entry (UX1a; config/effect-fields.mjs):
 * name, category, what, enter, example, stacks, words. Sorted by category, then name.
 */
export function effectFieldCatalog(config) {
  return changeKeyCatalog(config).map(field => {
    let type = "number", example = "2", choices = null;
    if ( field.key.startsWith("n5e.mastery.") ) { type = "text"; example = "Class feature"; }
    else if ( /^n5e\.(discipline|keyword)Ability\./.test(field.key) ) { type = "ability"; choices = ["str", "dex", "con", "int", "wis", "cha"]; example = "wis"; }
    else if ( ["n5e.unarmed.dice", "n5e.unarmed.die"].includes(field.key) ) { type = "dice"; example = field.key.endsWith("die") ? "1d12" : "1d8"; }
    else if ( /^n5e\.(cost|upkeep)\./.test(field.key) ) { type = "adjustment"; example = "-2, *0.5 or /2"; }
    else if ( ["n5e.resist", "n5e.immune"].includes(field.key) ) { type = "damageType"; choices = Object.keys(config?.damageTypes ?? {}); example = "fire"; }
    else if ( field.key.startsWith("n5e.rankCost.") ) { type = "text"; example = "D:3,C:5,B:9,A:14,S:20"; }
    const custom = field.key.startsWith("n5e.");
    const info = fieldInfo(field.key, config) ?? { name: field.label, category: "Other", what: field.label, enter: "", example, stacks: "", words: "" };
    return { ...field, type, example: info.example ?? example, choices, modes: custom ? [0, 2] : [1, 2, 3, 4, 5], custom,
      name: info.name, category: info.category, what: info.what, enter: info.enter, stacks: info.stacks, words: info.words ?? "",
      behavior: custom ? "N5e combines this field using its own rules. Add/Custom are accepted; core priority does not change that calculation." : "Foundry applies this field using the selected mode and priority." };
  }).sort((a, b) => FIELD_CATEGORIES.indexOf(a.category) - FIELD_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));
}

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function validateEffectChanges(changes, original, catalog) {
  const errors = [], warnings = [], rows = {}, fields = new Map(catalog.map(f => [f.key, f]));
  if ( !Array.isArray(changes) || changes.length > 100 ) return { errors: ["Use at most 100 effect changes."], warnings, rows: {} };
  changes.forEach((change, index) => {
    if ( !change || typeof change !== "object" || Array.isArray(change) ) { errors.push(`Change ${index + 1}: invalid change row.`); return; }
    const prefix = `Change ${index + 1}: `, field = fields.get(change.key), value = String(change.value ?? "").trim();
    let problem;
    if ( typeof change.key !== "string" || !change.key.trim() ) problem = "choose a field from the list.";
    else if ( /(?:^|\.)(?:__proto__|constructor|prototype)(?:\.|$)/.test(change.key) ) problem = "unsafe property path.";
    else if ( !field ) problem = `"${change.key}" isn't a field N5e knows. It is kept only if you leave it unchanged.`;
    else if ( !field.modes.includes(Number(change.mode)) ) problem = field.custom ? "this field always adds; set Mode to Add under Advanced." : "pick a mode under Advanced.";
    else if ( change.priority != null && change.priority !== "" && !Number.isFinite(Number(change.priority)) ) problem = "priority must be a number.";
    else if ( field.type === "number" && (!value || !Number.isFinite(Number(value))) ) { try { resolveEffectFormula(value, {}, { syntaxOnly: true }); } catch (error) { problem = error.message; } }
    else if ( field.type === "ability" && !field.choices.includes(value) ) problem = "pick an ability.";
    else if ( field.type === "dice" && !/^([1-9]\d*)?d[1-9]\d*$/.test(value) ) problem = "enter dice, like 1d8.";
    else if ( field.type === "adjustment" && (!/^([*/])?[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)
      || !Number.isFinite(Number(value.replace(/^[*/]/, ""))) || (/^[*/]/.test(value) && Number(value.slice(1)) <= 0)) ) { try { if ( /^[*/]/.test(value) ) throw new Error("Use a positive multiplier/divisor."); resolveEffectFormula(value, {}, { syntaxOnly: true }); } catch (error) { problem = error.message; } }
    else if ( field.type === "damageType" && !field.choices.includes(value) ) problem = "pick a damage type.";
    else if ( field.type === "text" && !value ) problem = field.key.startsWith("n5e.mastery.") ? "enter where it comes from, like the Amp's name." : "enter a value.";
    if ( value.length > 1000 ) problem = "value is too long.";
    if ( problem ) {
      const legacy = original.some(row => row.key === change.key && String(row.value ?? "") === String(change.value ?? "")
        && Number(row.mode) === Number(change.mode) && (row.priority ?? null) === (change.priority ?? null));
      (legacy && !/unsafe/.test(problem) ? warnings : errors).push(prefix + problem);
      rows[index] = { problem: problem[0].toUpperCase() + problem.slice(1), blocking: !(legacy && !/unsafe/.test(problem)) };
    }
  });
  return { errors, warnings, rows };
}

function validatePredicate(value, depth = 0) {
  if ( depth > 12 ) throw new Error("Conditional predicate is too deeply nested.");
  if ( typeof value === "string" ) { if ( value.length > 200 ) throw new Error("Predicate option is too long."); return; }
  if ( Array.isArray(value) ) { if ( value.length > 50 ) throw new Error("Too many predicate options."); value.forEach(v => validatePredicate(v, depth + 1)); return; }
  if ( !value || typeof value !== "object" || Object.keys(value).some(k => !["all", "any", "not"].includes(k)) ) throw new Error("Use only all, any and not predicates.");
  for ( const v of Object.values(value) ) { if ( !Array.isArray(v) ) throw new Error("Predicate groups must be arrays."); validatePredicate(v, depth + 1); }
}

/**
 * Rule elements v2 (STD1). Every key and field is checked; anything unknown is refused.
 * Numeric keys need a number; the others carry their own fields.
 */
const NUMERIC = new Set(["modifier", "degreeShift", "critRange", "maximizeDice", "minimumDie", "addRanks", "costReduction", "rerollBelow", "critAbilityMod", "maximizeAfter"]);
const FIELDS = {
  common: ["key", "selector", "label", "predicate", "direction", "scope", "uses", "targets", "on", "endsOnUse", "oncePerTurn"],
  attacks: ["value", "implementsOnly", "text"], initiativeOptions: ["skills", "text"],
  modifier: ["value"], degreeShift: ["value"], critRange: ["value"], maximizeDice: ["value"], minimumDie: ["value"], addRanks: ["value"], rerollBelow: ["value"], critAbilityMod: ["value"], maximizeAfter: ["value"],
  advantage: [], disadvantage: [], autoFail: [], autoSucceed: [], noAdvantage: [], costReduction: ["value"],
  reroll: ["mode"], damage: ["formula", "damageType", "who", "unreducible"], heal: ["formula", "pool", "who"], resave: ["ability", "dc"], areaSize: ["value", "shapes"], ignoreComponent: ["component"], damageHandling: ["ignoreResistance", "immunityAsResistance", "drMultiplier", "resistAll"],
  inflict: ["condition", "ranks", "who"], effect: ["effect"], resource: ["pool", "amount"], note: ["text"]
};
export function validateConditionalRules(rules) {
  if ( !Array.isArray(rules) || rules.length > 50 ) throw new Error("Conditional rules must be an array of at most 50 entries.");
  for ( const r of rules ) {
    if ( !r || typeof r !== "object" || !ELEMENT_KEYS.includes(r.key) ) throw new Error(`Rule elements use a known key: ${ELEMENT_KEYS.join(", ")}.`);
    const allowed = new Set([...FIELDS.common, ...(FIELDS[r.key] ?? [])]);
    const extra = Object.keys(r).filter(k => !allowed.has(k));
    if ( extra.length ) throw new Error(`Unsupported property for ${r.key}: ${extra.join(", ")}.`);
    // STD6d: an action effect's value may be the cast rank ("@rankValue", "@rankValue+1", "2*@rankValue").
    const rankValued = typeof r.value === "string" && (/^\s*(?:-?\d+\s*[+*]\s*)?@rankValue(?:\s*[+*]\s*-?\d+)?\s*$/.test(r.value)
      || /^lvl\((\s*\d+\s*:\s*-?\d+\s*,?)+\)$/.test(r.value)
      // STD6d: the highest of some ability modifiers ("mod(int,wis,cha)": Agile).
      || /^mod\((\s*(str|dex|con|int|wis|cha)\s*,?)+\)$/.test(r.value)
      // CCOND1: so much per rank of the condition carrying it ("ranks(-2)").
      || /^ranks\(-?\d+\)$/.test(r.value));
    if ( NUMERIC.has(r.key) && !rankValued ) {
      if ( r.value === null || typeof r.value === "boolean" || String(r.value ?? "").trim() === "" || !Number.isFinite(Number(r.value)) ) throw new Error(`${r.key} needs a numeric value.`);
      if ( r.key !== "modifier" && !Number.isInteger(Number(r.value)) ) throw new Error(`${r.key} needs a whole number.`);
    }
    const noSelector = ["note", "inflict", "effect", "resource", "attacks", "initiativeOptions", "heal", "resave", "areaSize", "ignoreComponent"].includes(r.key) || (r.key === "damage" && r.on);
    const selectors = r.selector === undefined && noSelector ? [] : (Array.isArray(r.selector) ? r.selector : [r.selector]);
    if ( (!noSelector && !selectors.length) || selectors.some(s => typeof s !== "string" || !/^[\w:-]{1,100}$/.test(s)) ) throw new Error("Use named roll selectors, such as attack, damage, damage:fire, healing, save or skill:ste.");
    if ( r.predicate !== undefined ) validatePredicate(r.predicate);
    if ( r.direction !== undefined && !ELEMENT_DIRECTIONS.includes(r.direction) ) throw new Error(`direction is ${ELEMENT_DIRECTIONS.join(", ")}.`);
    if ( r.scope !== undefined && !ELEMENT_SCOPES.includes(r.scope) ) throw new Error(`scope is ${ELEMENT_SCOPES.join(", ")}.`);
    if ( r.targets !== undefined && !ELEMENT_TARGETS.includes(r.targets) ) throw new Error(`targets is ${ELEMENT_TARGETS.join(", ")}.`);
    if ( r.on !== undefined && !ELEMENT_EVENTS.includes(r.on) ) throw new Error(`on is one of ${ELEMENT_EVENTS.join(", ")}.`);
    if ( r.uses !== undefined && (!Number.isInteger(Number(r.uses)) || Number(r.uses) < 1 || Number(r.uses) > 99) ) throw new Error("uses is a whole number from 1 to 99.");
    if ( r.key === "reroll" && !["lower", "higher", "keep"].includes(r.mode) ) throw new Error("reroll mode is lower, higher or keep.");
    if ( r.key === "damage" && !/^[\d\sd+\-*/()@a-zA-Z.]{1,100}$/.test(String(r.formula ?? "")) ) throw new Error("damage needs a dice formula, such as 1d6.");
    if ( r.key === "damageHandling" && r.drMultiplier !== undefined && !(Number(r.drMultiplier) >= 0 && Number(r.drMultiplier) <= 1) ) throw new Error("drMultiplier is between 0 and 1.");
    if ( r.key === "inflict" && (typeof r.condition !== "string" || !/^[\w-]{1,60}$/.test(r.condition)) ) throw new Error("inflict names a condition key.");
    if ( r.key === "note" && (typeof r.text !== "string" || !r.text.trim() || r.text.length > 2000) ) throw new Error("A note needs its text (up to 2000 characters).");
    if ( r.key === "attacks" && !(Number.isInteger(Number(r.value)) && Number(r.value) >= 1 && Number(r.value) <= 10) ) throw new Error("attacks needs a whole number from 1 to 10.");
    if ( r.key === "initiativeOptions" && (!Array.isArray(r.skills) || !r.skills.length || r.skills.some(k => !/^[a-z]{2,12}$/.test(k))) ) throw new Error("initiativeOptions lists skill keys.");
    if ( r.key === "resource" && (typeof r.pool !== "string" || !/^[a-zA-Z][\w-]{0,59}$/.test(r.pool) || !Number.isFinite(Number(r.amount))) ) throw new Error("resource needs a pool and an amount.");
    if ( r.key === "inflict" && r.who !== undefined && !["self", "target"].includes(r.who) ) throw new Error("inflict who is self or target.");
    if ( r.label !== undefined && (typeof r.label !== "string" || r.label.length > 120) ) throw new Error("label is text of at most 120 characters.");
  }
  return rules;
}

export function editorFlags(input, original = {}) {
  const patch = {};
  const min = Number(input.min || 0), max = Number(input.max || 0);
  if ( !Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < 0 || (max && min > max) ) throw new Error("Check the minimum and maximum effect levels.");
  if ( min !== (original.levels?.min ?? 0) || max !== (original.levels?.max ?? 0) ) patch.levels = { ...original.levels, min, max };
  // STD2: an action effect acts only on the action it is chosen for (copied onto its card).
  // The editor's checkbox submits true/false; data may give "action" or "".
  const applyTo = input.applyTo === true ? "action" : input.applyTo === false ? "" : (input.applyTo ?? (original.applyTo ?? ""));
  if ( !["", "action"].includes(applyTo) ) throw new Error("applyTo is blank or action.");
  if ( applyTo !== (original.applyTo ?? "") ) patch.applyTo = applyTo || null;
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
    if ( Number.isFinite(Number(c.value)) || /^(n5e\.(mastery|disciplineAbility|keywordAbility|unarmed)\.)/.test(c.key)
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
  out.flags = { n5e: Object.fromEntries(["levels", "requiresStance", "exclusive", "state", "rules", "ruleToggle", "applyTo"].filter(k => k in flags).map(k => [k, structuredClone(flags[k])])) };
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
