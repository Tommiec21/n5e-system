/**
 * System adapter for optional rules (SHARED1). The rules core reads rules through rules/settings.mjs;
 * this registers the System's provider (the "n5e" world settings) as soon as it is loaded, and
 * re-exports rule() for the System code that imports it from here.
 *
 * Every optional rule is declared once in module/config/rules.mjs and registered as a world setting
 * (module/settings.mjs). Outside Foundry (tests) the provider finds no game object and the rule's
 * default is used; tests can stub globalThis.game.settings.get to try other values.
 */
import { setRuleProvider, rule } from "./rules/settings.mjs";

setRuleProvider(key => globalThis.game?.settings?.get?.("n5e", key));

export { rule };
