/**
 * World settings: optional rules (KB various) and the migration marker.
 */
import { optionalRules } from "./config/index.mjs";
import { registerMigrationSetting } from "./migration/runner.mjs";

export function registerSettings() {
  for ( const [key, rule] of Object.entries(optionalRules) ) {
    const isChoice = !!rule.choices;
    game.settings.register("n5e", key, {
      name: `N5E.Settings.${key}.Name`,
      hint: `N5E.Settings.${key}.Hint`,
      scope: "world",
      config: true,
      type: isChoice ? String : Boolean,
      choices: isChoice ? rule.choices : undefined,
      default: rule.default,
      requiresReload: false
    });
  }
  registerMigrationSetting();
}
