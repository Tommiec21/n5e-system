/**
 * Optional-rule lookup for the shared core (SHARED1). The core never reads world settings itself:
 * each host (the N5e System, the dnd5e Module) registers a provider with setRuleProvider(), and
 * rule(key) falls back to the rule's default from config/rules.mjs when there is no provider, the
 * provider has no value, or it throws (a setting not registered yet).
 */
import { rules } from "../config/rules.mjs";

let provider = null;

/** Register the host's rule reader: key => value (undefined = use the default). */
export function setRuleProvider(fn) {
  provider = typeof fn === "function" ? fn : null;
}

/** Current value of an optional rule (key from config/rules.mjs). */
export function rule(key) {
  let value;
  try { value = provider?.(key); } catch { value = undefined; }
  return value === undefined ? rules[key]?.default : value;
}
