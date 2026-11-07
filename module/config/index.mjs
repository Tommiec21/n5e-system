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
export const optionalRules = {
  rations: { label: "Resource-based rests (Ration Pool)", default: false },
  stamina: { label: "Stamina pool for limited-use feats", default: false },
  ampLimit: { label: "Amp limit", default: "none", choices: combat.ampLimits },
  freeOutOfCombatUpkeep: { label: "Out of combat: charge only the initial concentration cost", default: false },
  willOfFireVariants: { label: "Will of Fire variants (Kage Guide)", default: false },
  multiclassing: { label: "Legacy multiclassing", default: false },
  hijutsuFlexibilityPick: { label: "Players may pick their Hijutsu Flexibility ability", default: true }
};
N5E.optionalRules = optionalRules;

export default N5E;
