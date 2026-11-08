/**
 * CONFIG.N5E: every rule list the engine reads. Engine code reads keys from here, so changing a
 * number or adding an entry is a data edit. Homebrew adds entries through game.n5e.api.register*().
 */
import * as core from "./core.mjs";
import * as conditions from "./conditions.mjs";
import * as jutsu from "./jutsu.mjs";
import * as combat from "./combat.mjs";
import * as equipment from "./equipment.mjs";
import * as character from "./character.mjs";

export const N5E = {
  ...core,
  ...conditions,
  ...jutsu,
  ...combat,
  ...equipment,
  ...character,
  /** Clan-scoped conditions and keywords registered at runtime: {key: {...def, scope: "clan:<id>"}}. */
  clanConditions: {},
  uniqueKeywords: {}
};

/**
 * Optional rules (KB various). Registered as world settings in settings.mjs.
 * Values are defaults.
 */
// Optional and table rules: one registry, one settings panel (config/rules.mjs).
export { rules as optionalRules, ruleGroups } from "./rules.mjs";
import { rules as _rules, ruleGroups as _groups } from "./rules.mjs";
N5E.rules = _rules;
N5E.ruleGroups = _groups;
N5E.optionalRules = _rules;

export default N5E;
