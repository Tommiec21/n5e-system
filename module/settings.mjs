/**
 * World settings. Every optional/table rule (config/rules.mjs) is a world setting, edited in one
 * "N5e Rules" panel that everyone can open (only the GM can change it). Plus the migration marker.
 *
 * To add a rule toggle: add an entry to `rules` in module/config/rules.mjs (group, type, default,
 * label, hint). It is registered here automatically, appears in the panel, and code reads it with
 * rule("key") from module/rules-settings.mjs. No other wiring is needed.
 */
import { rules } from "./config/rules.mjs";
import { registerMigrationSetting } from "./migration/runner.mjs";
import RulesConfig from "./applications/settings/rules-config.mjs";

/**
 * Called at init: one hidden world setting per rule in config/rules.mjs (edited through the N5e Rules
 * panel, registered here as a settings menu), plus the migration version setting.
 */
export function registerSettings() {
  for ( const [key, r] of Object.entries(rules) ) {
    game.settings.register("n5e", key, {
      name: r.label,
      hint: r.hint ?? "",
      scope: "world",
      // Hidden from Foundry's default settings list: the N5e Rules panel shows them grouped instead.
      config: false,
      type: r.type === "number" ? Number : r.type === "choice" ? String : Boolean,
      choices: r.type === "choice" ? r.choices : undefined,
      default: r.default,
      requiresReload: false,
      // Rules change what sheets show (trackers, penalties): redraw open actor sheets.
      onChange: () => Object.values(ui.windows ?? {}).forEach(w => w.actor && w.render?.())
    });
  }
  // The "N5e Rules" button in Configure Settings. restricted: false lets players open it read-only
  // (the panel refuses to save for non-GMs).
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
