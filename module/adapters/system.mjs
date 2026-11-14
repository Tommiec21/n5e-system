/**
 * The N5e System's adapter for the shared rules core (SHARED1): optional rules come from the "n5e"
 * world settings (rules-settings.mjs registers that provider), and the live registry is CONFIG.N5E.
 * Loaded first by n5e.mjs, and by tests/setup.mjs for the test runner.
 */
import "../rules-settings.mjs";
import { setHost } from "../rules/host.mjs";

setHost({ config: () => globalThis.CONFIG?.N5E });
