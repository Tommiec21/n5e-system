/**
 * World settings. Every optional/table rule (config/rules.mjs) is a world setting, edited in one
 * "N5e Rules" panel that everyone can open (only the GM can change it). Plus the migration marker.
 */
import { rules } from "./config/rules.mjs";
import { registerMigrationSetting } from "./migration/runner.mjs";
import RulesConfig from "./applications/settings/rules-config.mjs";

export function registerSettings() {
  for ( const [key, r] of Object.entries(rules) ) {
    game.settings.register("n5e", key, {
      name: r.label,
      hint: r.hint ?? "",
      scope: "world",
      config: false,
      type: r.type === "number" ? Number : r.type === "choice" ? String : Boolean,
      choices: r.type === "choice" ? r.choices : undefined,
      default: r.default,
      requiresReload: false,
      onChange: () => Object.values(ui.windows ?? {}).forEach(w => w.actor && w.render?.())
    });
  }
  game.settings.registerMenu("n5e", "rulesConfig", {
    name: "N5e Rules",
    label: "Open N5e Rules",
    hint: "Turn N5e rules and automations on or off, and set rest limits and the Ration Pool. Everyone can view; the GM can change.",
    icon: "fa-solid fa-scroll",
    type: RulesConfig,
    restricted: false
  });
  registerMigrationSetting();
}
