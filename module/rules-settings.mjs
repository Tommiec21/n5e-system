/**
 * Read a rule setting. Works outside Foundry (tests) by falling back to the registry default.
 */
import { rules } from "./config/rules.mjs";

export function rule(key) {
  try {
    const v = globalThis.game?.settings?.get?.("n5e", key);
    return v === undefined ? rules[key]?.default : v;
  } catch {
    return rules[key]?.default;
  }
}
