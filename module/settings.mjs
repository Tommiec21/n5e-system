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
import AutomationRecovery from "./applications/gm/automation-recovery.mjs";
import ChatAppearanceConfig from "./applications/settings/chat-appearance.mjs";
import JournalDesk from "./applications/gm/journal-desk.mjs";
import { applyChatAppearance } from "./workflow/chat-appearance.mjs";

/**
 * Called at init: one hidden world setting per rule in config/rules.mjs (edited through the N5e Rules
 * panel, registered here as a settings menu), plus the migration version setting.
 */
export function registerSettings() {
  game.settings.registerMenu("n5e", "journalDesk", { name: "N5e Journal Desk", label: "Open Journal Desk",
    hint: "Write and organize campaigns, missions, characters and ideas.", icon: "fa-solid fa-book-open", type: JournalDesk, restricted: true });
  // Per user (King Q-R1): skip the roll dialog. Off by default; visible in Configure Settings.
  game.settings.register("n5e", "rollWithoutDialog", {
    name: "Roll without the dialog", scope: "client", config: true, type: Boolean, default: false,
    hint: "Rolls happen at once with the numbers the system worked out. Off: every roll shows its math first, where you can untick parts, add modifiers and pick advantage."
  });
  // NPCUI1: each user's NPC sheet toggles (the jutsu color key, hidden disciplines).
  game.settings.register("n5e", "npcSheetView", { scope: "client", config: false, type: Object, default: { legend: true, hidden: [] } });
  game.settings.register("n5e", "effectMacroApprovals", { scope: "world", config: false, type: Object, default: {} });
  // AMP1b: the Amp audit's "not an Amp" list (item uuids the GM dismissed).
  game.settings.register("n5e", "ampAuditDismissed", { scope: "world", config: false, type: Array, default: [] });
  game.settings.registerMenu("n5e", "automationRecovery", { name: "N5e Automation Recovery", label: "Review automation requests",
    hint: "Inspect interrupted actions, reconcile targets, and export/archive request history.", icon: "fa-solid fa-clock-rotate-left", type: AutomationRecovery, restricted: true });
  game.settings.register("n5e", "requestReceipts", {
    scope: "world", config: false, type: Object, default: { version: 1, epoch: 1, entries: [] }
  });
  for ( const [key, r] of Object.entries(rules) ) {
    game.settings.register("n5e", key, {
      name: r.label,
      hint: r.hint ?? "",
      scope: "world",
      // Hidden from Foundry's default settings list: the N5e Rules panel shows them grouped instead.
      config: false,
      type: r.type === "number" ? Number : r.type === "choice" || r.type === "text" ? String : Boolean,
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
  // CHATUI1 (King 2026-11-16): chat font sizes and fonts. The GM's world setting is everyone's
  // default; each user may turn on their own copy (King Q-F1: both).
  game.settings.register("n5e", "chatAppearance", { scope: "world", config: false, type: Object, default: {}, onChange: () => applyChatAppearance() });
  game.settings.register("n5e", "chatAppearanceMine", { scope: "client", config: false, type: Object, default: {}, onChange: () => applyChatAppearance() });
  game.settings.registerMenu("n5e", "chatAppearanceConfig", {
    name: "N5e Chat Card Appearance",
    label: "Open Chat Card Appearance",
    hint: "Font sizes for each part of N5e chat messages, and the heading and body fonts. The GM sets everyone's; anyone can use their own.",
    icon: "fa-solid fa-font",
    type: ChatAppearanceConfig,
    restricted: false
  });
  registerMigrationSetting();
}
