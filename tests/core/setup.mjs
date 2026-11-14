/**
 * Setup for the shared-core tests (SHARED1), used by `npm run test:core` and by the Module's CI.
 * Registers a rule provider that reads a stubbed globalThis.game.settings (tests stub it to try
 * other rule values); without a stub every rule uses its default. No System code is loaded.
 */
import { setRuleProvider } from "../../module/rules/settings.mjs";

setRuleProvider(key => globalThis.game?.settings?.get?.("n5e", key));
