/**
 * Read a rule setting. Works outside Foundry (tests) by falling back to the registry default.
 *
 * Every optional rule is declared once in module/config/rules.mjs and registered as a world setting
 * (module/settings.mjs). Code anywhere asks rule("key") instead of game.settings.get, so:
 *   - pure rules modules stay testable (no game object in Node: the default is used, and tests
 *     can stub globalThis.game.settings.get to try other values);
 *   - a setting that isn't registered yet (early in init) still returns its default.
 */
import { rules } from "./config/rules.mjs";

export function rule(key) {
  try {
    const v = globalThis.game?.settings?.get?.("n5e", key);
    return v === undefined ? rules[key]?.default : v;
  } catch {
    // game.settings.get throws for settings not registered yet.
    return rules[key]?.default;
  }
}
