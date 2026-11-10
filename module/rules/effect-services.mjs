import { evaluateFormula, getPath } from "./formula.mjs";
import { abilityMod } from "./progression.mjs";

export const EFFECT_EVENTS = ["apply", "remove", "enable", "disable", "turnStart", "turnEnd", "combatEnd", "damageTaken", "successfulHit", "rest"];
export function effectFormulaData(actor) {
  const system = structuredClone(actor?._source?.system ?? {});
  const abilities = Object.fromEntries(Object.entries(system.abilities ?? {}).map(([key, value]) => [key, { ...value, mod: abilityMod(value.value ?? 10) }]));
  return { ...system, system, abilities, level: actor?.system?.level ?? system.level ?? 0, prof: actor?.system?.prof ?? system.prof ?? 0 };
}
export function resolveEffectFormula(value, data, { syntaxOnly = false } = {}) {
  let expression = String(value).trim().replace(/^=/, "");
  if ( !expression || expression.length > 1000 ) throw new Error("Effect formula is empty or too long.");
  for ( const match of expression.matchAll(/@([a-zA-Z_][\w.]*)/g) ) {
    if ( /(?:^|\.)(?:__proto__|constructor|prototype)(?:\.|$)/.test(match[1]) ) throw new Error("Unsafe formula reference.");
    if ( !syntaxOnly && !Number.isFinite(Number(getPath(data, match[1]))) ) throw new Error(`Unavailable formula reference: @${match[1]}`);
  }
  if ( syntaxOnly ) expression = expression.replace(/@[\w.]+/g, "1");
  const result = evaluateFormula(expression, data, NaN);
  if ( !Number.isFinite(result) ) throw new Error("Invalid effect formula or division by zero.");
  return result;
}
export function validateServiceConfig(config = {}) {
  if ( !config || typeof config !== "object" || Array.isArray(config) || Object.keys(config).some(k => !["expiration", "macros", "appearance"].includes(k)) ) throw new Error("Unsupported effect service configuration.");
  const expiration = config.expiration ?? [], macros = config.macros ?? [], appearance = config.appearance ?? [];
  if ( !Array.isArray(expiration) || expiration.length > 10 || !Array.isArray(macros) || macros.length > 10 || !Array.isArray(appearance) || appearance.length > 10 ) throw new Error("Use at most ten entries per effect service.");
  for ( const rule of expiration ) if ( !EFFECT_EVENTS.includes(rule.event) || ["apply", "remove", "enable", "disable"].includes(rule.event)
    || !Number.isSafeInteger(rule.count ?? 1) || (rule.count ?? 1) < 1 || (rule.count ?? 1) > 1000 ) throw new Error("Invalid expiration event/count.");
  for ( const binding of macros ) if ( !EFFECT_EVENTS.includes(binding.event) || !/^Macro\.[A-Za-z0-9]+$/.test(binding.uuid) ) throw new Error("Macro bindings require a supported event and a world Macro UUID.");
  for ( const binding of appearance ) if ( !/^[a-z][a-z0-9-]{0,59}$/.test(binding.provider) || !binding.options || typeof binding.options !== "object" || Array.isArray(binding.options) ) throw new Error("Invalid appearance provider/options.");
  return { expiration, macros, appearance };
}
export function expirationStep(config, state, event, id) {
  const next = { ...state }, rules = validateServiceConfig(config).expiration;
  let expired = false;
  rules.forEach((rule, index) => {
    if ( rule.event !== event ) return;
    const previous = next[index] ?? { count: 0, last: null };
    if ( previous.last === id ) return;
    next[index] = { count: previous.count + 1, last: id };
    if ( next[index].count >= (rule.count ?? 1) ) expired = true;
  });
  return { state: next, expired };
}
