// The rules core adapter (SHARED1): rule provider and host hooks, before anything uses the core.
import "./module/adapters/system.mjs";
import { registerEffectServices } from "./module/automation/effect-services.mjs";
/**
 * N5e 4.0 game system for Foundry VTT v13 — entry point.
 *
 * Foundry loads this file first (system.json → "esmodules"). Everything the system does is wired up
 * here, in three moments:
 *
 *   1. Module load (top level, below): hooks that must exist before any world data renders
 *      (chat card buttons, turn hooks, the GM Party Overview button).
 *   2. "init" hook: registries (CONFIG.N5E), document classes, data models, sheets, settings,
 *      Handlebars helpers and templates. Nothing here may read world data (it isn't loaded yet).
 *   3. "ready" hook: world data exists. Clan data from world items, the GM socket, migrations.
 *
 * Where to look for things (the folder map is in docs/DEVELOPER.md):
 *   module/config/       the rules as data (conditions, keywords, skills, optional rules...)
 *   module/rules/        pure rules functions, no Foundry calls, tested in Node (tests/)
 *   module/data/         data models: what is stored on actors, items and effects, and the
 *                        derived-data pipeline (module/data/actor/creature.mjs)
 *   module/workflow/     Foundry-side actions: casting, attacking, applying damage, rests, turns
 *   module/view-models/  pure functions that turn an actor into what a sheet displays
 *   module/applications/ the sheets and dialogs (ApplicationV2)
 */
import N5E from "./module/config/index.mjs";
import { registerDataModels } from "./module/data/_index.mjs";
import N5eActor from "./module/documents/actor.mjs";
import N5eItem from "./module/documents/item.mjs";
import N5eActiveEffect from "./module/documents/active-effect.mjs";
import N5eTokenDocument from "./module/documents/token.mjs";
import N5eCombat from "./module/documents/combat.mjs";
import { registerExpiryHooks } from "./module/workflow/expiry.mjs";
import { registerConcentrationHooks, onRenderReadyCard } from "./module/workflow/concentration.mjs";
import { registerDetectionModes } from "./module/canvas/detection.mjs";
import { registerMovement } from "./module/canvas/ruler.mjs";
import { registerAreaHooks } from "./module/workflow/areas.mjs";
import { registerAutomationHooks } from "./module/workflow/automation.mjs";
import { registerFreeformHooks } from "./module/workflow/freeform.mjs";
import { registerEnvironmentHooks } from "./module/workflow/environment.mjs";
import { registerAuraHooks } from "./module/workflow/auras.mjs";
import { registerTableOptions } from "./module/workflow/table-options.mjs";
import { registerVariantTools } from "./module/workflow/variant-tools.mjs";
import { registerEnrichers } from "./module/applications/enrichers.mjs";
import CompendiumBrowser, { registerCompendiumBrowser } from "./module/applications/browser/compendium-browser.mjs";
import { N5eActorSheet, TEMPLATE_PATHS } from "./module/applications/sheets.mjs";
import CharacterSheet, { CHARACTER_TEMPLATE_PATHS } from "./module/applications/actor/character-sheet.mjs";
import { SHEET_DESIGNS, DESIGN_TEMPLATE_PATHS, designSheet } from "./module/applications/actor/character-designs.mjs";
import NPCSheet, { NPC_TEMPLATE_PATHS } from "./module/applications/actor/npc-sheet.mjs";
import LootSheet from "./module/applications/actor/loot-sheet.mjs";
import { HazardSheet, VehicleSheet } from "./module/applications/actor/hazard-sheet.mjs";
import EffectConfig from "./module/applications/effect/effect-config.mjs";
import ItemSheet, { ITEM_TEMPLATE_PATHS } from "./module/applications/item/item-sheet.mjs";
import { registerHelpers } from "./module/applications/helpers.mjs";
import { registerSettings } from "./module/settings.mjs";
import * as dice from "./module/dice/roll.mjs";
import { registerTurnHooks, onRenderTurnCard } from "./module/workflow/turn.mjs";
import { registerOwnerIntents } from "./module/automation/owner-intents.mjs";
import { registerAlliedIntents } from "./module/workflow/allied.mjs";
import { registerRestIntents } from "./module/workflow/rest.mjs";
import { registerEffectApplication } from "./module/workflow/effect-application.mjs";
import { registerReactionWindows } from "./module/workflow/reactions.mjs";
import { registerPartyOverview } from "./module/applications/gm/party-overview.mjs";
import { registerItemIntegrity } from "./module/applications/gm/item-integrity.mjs";
import { addJournalDeskButton } from "./module/applications/gm/journal-desk-entry.mjs";
import * as d20 from "./module/dice/d20.mjs";
import { checkMigrations, MIGRATIONS } from "./module/migration/runner.mjs";
import api from "./module/api.mjs";
import * as progression from "./module/rules/progression.mjs";
import * as cost from "./module/rules/cost.mjs";
import * as conditions from "./module/rules/conditions.mjs";
import * as degree from "./module/rules/degree.mjs";
import * as chain from "./module/rules/chain.mjs";
import * as ac from "./module/rules/ac.mjs";
import * as formula from "./module/rules/formula.mjs";
import * as elements from "./module/rules/elements.mjs";
import { applyChatAppearance, tagN5eMessage } from "./module/workflow/chat-appearance.mjs";

registerAutomationHooks();
Hooks.on("renderJournalDirectory", addJournalDeskButton);
registerFreeformHooks();
registerEnvironmentHooks();
registerAuraHooks();
registerTableOptions();
registerVariantTools();
// Timed effects end out of combat when world time advances (workflow/expiry.mjs; EXPIRE1).
registerExpiryHooks();
// Incapacitation ends concentration; readied jutsu are held by it (workflow/concentration.mjs; CONC1).
registerConcentrationHooks();

Hooks.once("init", () => {
  console.log("N5e | Initializing N5e 4.0 system");

  // The registries (all of module/config/) become CONFIG.N5E, where templates, sheets and the rules
  // read them. game.n5e is the public handle for macros and homebrew modules: the API (adding
  // conditions, keywords...), the pure rules functions, the migration list and the dice helpers.
  CONFIG.N5E = N5E;
  game.n5e = {
    config: N5E,
    api,
    rules: { progression, cost, conditions, degree, chain, ac, formula, elements },
    migrations: MIGRATIONS,
    dice: { ...dice, d20 },
    // The Compendium Browser: game.n5e.browser() or game.n5e.browser("jutsu" | "features" | "stances" | "equipment" | "character").
    browser: (tab, options) => CompendiumBrowser.open(tab, options)
  };

  // Documents and data models. The document classes add N5e behavior to Foundry's Actor, Item and
  // ActiveEffect (condition helpers, effect pass ordering); the data models define each type's
  // stored fields and its derived numbers (module/data/_index.mjs lists every type).
  CONFIG.Actor.documentClass = N5eActor;
  CONFIG.Item.documentClass = N5eItem;
  CONFIG.ActiveEffect.documentClass = N5eActiveEffect;
  // Tokens: sheet senses become vision and detection modes (documents/token.mjs); Chakra Sensing is an
  // N5e detection mode (canvas/detection.mjs); movement costs and the speed-colored ruler (canvas/ruler.mjs).
  CONFIG.Token.documentClass = N5eTokenDocument;
  registerDetectionModes();
  registerMovement();
  registerDataModels();


  // Token bars: hp/cp max are derived, so declare them as bars explicitly.
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["hp", "cp"], value: ["willOfFire.value", "combat.chain.value"] },
    npc: { bar: ["hp", "cp"], value: ["combat.chain.value"] }
  };

  // Initiative: d20 + Dex + floor(prof / 2) + Mastery (computed as @init).
  CONFIG.Combat.initiative = { formula: "1d20 + @init", decimals: 2 };
  // Turn automation runs only when combat moves forward (documents/combat.mjs; TURN1).
  CONFIG.Combat.documentClass = N5eCombat;

  // Conditions and States on the token HUD. Every condition is listed; States only when they are
  // toggled by hand (derived ones like Bloodied and relational ones like Hidden-from are computed).
  // Adding a condition to module/config/conditions.mjs adds it here automatically.
  CONFIG.statusEffects = [
    ...Object.entries(N5E.conditions).map(([id, c]) => ({ id, name: c.label, img: c.icon ?? "icons/svg/aura.svg" })),
    ...Object.entries(N5E.states).filter(([, s]) => !s.derived && !s.relational && s.icon)
      .map(([id, s]) => ({ id, name: s.label, img: s.icon }))
  ];
  // Statuses core Foundry treats specially (the defeated skull, token visibility).
  CONFIG.specialStatusEffects.DEFEATED = "dead";
  CONFIG.specialStatusEffects.INVISIBLE = "invisible";
  CONFIG.specialStatusEffects.BLIND = "blinded";

  // Sheets: character, NPC, item, effect. The Phase 1 placeholder stays available (not default) as a raw data view.
  const { Actors, Items } = foundry.documents.collections;
  Actors.registerSheet("n5e", CharacterSheet, { types: ["character"], makeDefault: true, label: "N5E.SheetCharacter" });
  // SHEETS1: optional designs of the same sheet, chosen per character from its Sheet menu.
  for ( const [id, design] of Object.entries(SHEET_DESIGNS) ) {
    Actors.registerSheet("n5e", designSheet(id), { types: ["character"], makeDefault: false, label: design.label });
  }
  Actors.registerSheet("n5e", NPCSheet, { types: ["npc"], makeDefault: true, label: "N5E.SheetNPC" });
  Actors.registerSheet("n5e", LootSheet, { types: ["loot"], makeDefault: true, label: "N5E.SheetLoot" });
  Actors.registerSheet("n5e", HazardSheet, { types: ["hazard"], makeDefault: true, label: "N5E.SheetHazard" });
  Actors.registerSheet("n5e", VehicleSheet, { types: ["vehicle"], makeDefault: true, label: "N5E.SheetVehicle" });
  Actors.registerSheet("n5e", N5eActorSheet, { types: ["character", "npc", "hazard", "vehicle"], makeDefault: false, label: "N5E.SheetPlaceholder" });
  Items.registerSheet("n5e", ItemSheet, { makeDefault: true, label: "N5E.SheetItem" });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, "n5e", EffectConfig,
    { makeDefault: true, label: "N5E.SheetEffect" });

  // World settings (every optional rule + the migration marker), Handlebars helpers, and every
  // template the sheets use (preloaded so partials resolve on first render).
  registerSettings();
  registerHelpers();
  // Shortcuts in text: [[/save]], [[/check]], [[/damage]], [[/heal]], @Condition[], @State[] (applications/enrichers.mjs).
  registerEnrichers();
  foundry.applications.handlebars.loadTemplates([...new Set([...TEMPLATE_PATHS, ...CHARACTER_TEMPLATE_PATHS, ...DESIGN_TEMPLATE_PATHS, ...NPC_TEMPLATE_PATHS, ...ITEM_TEMPLATE_PATHS])]);
});

// Chat card buttons. Cards are plain HTML with data-n5e-* attributes; each render wires the buttons
// (module/dice/roll.mjs dispatches them; turn cards have their own End-concentration buttons).
// NPC1c C2 and NPC2: "Reset NPCs" and "Create adversary" for the GM on the Actors sidebar.
Hooks.on("renderActorDirectory", (app, html) => {
  import("./module/applications/gm/npc-reset.mjs").then(m => m.addResetButton(app, html)).catch(error => console.warn("n5e | reset button", error));
  import("./module/applications/npc/adversary-builder.mjs").then(m => m.addBuilderButton(app, html)).catch(error => console.warn("n5e | builder button", error));
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  // CHATUI1: N5e messages take the chat appearance settings (styles/n5e.css .n5e-msg).
  tagN5eMessage(message, html);
  dice.onRenderChatMessage(message, html);
  onRenderTurnCard(message, html);
  onRenderReadyCard(message, html);
});
// Combat turn flow (upkeep, resets, condition damage and decay, trackers, Chilled movement, Amp
// limits) and the GM's Party Overview button on the token controls.
registerTurnHooks();
registerPartyOverview();
registerItemIntegrity();
// Per-target rows on damage cards (RES1).
void dice.registerResolution().catch(error => console.error("n5e | resolution", error));
// Opportunity Attack reminders (POS1).
void import("./module/workflow/positioning.mjs").then(m => m.registerPositioningHooks());
// Jutsu areas: concentration areas leave the map when concentration ends (workflow/areas.mjs).
registerAreaHooks();
// Compendium Browser buttons in the Compendium and Items sidebars (applications/browser/).
registerCompendiumBrowser();

Hooks.once("ready", async () => {
  // CHATUI1: chat font sizes and fonts (world default or this user's own).
  applyChatAppearance();
  // Clan-scoped conditions and keywords from world clan items (compendium clans load in Phase 6).
  for ( const item of game.items.filter(i => i.type === "clan") ) api.registerClanData(item);
  // dnd5e/PF2e parity: each user changes what they own. Owner intents finish the few N5e actions
  // (Allied NPCs, rations, reaction choices) on the GM's client (module/automation/owner-intents.mjs).
  registerOwnerIntents();
  registerAlliedIntents();
  void import("./module/workflow/transfer.mjs").then(m => m.registerTransfer());
  void import("./module/workflow/loot.mjs").then(m => m.registerLoot());
  void import("./module/workflow/social.mjs").then(m => m.registerSocial());
  void import("./module/workflow/npc-knowledge.mjs").then(m => m.registerNpcKnowledge());
  registerRestIntents();
  registerEffectApplication();
  registerReactionWindows();
  registerEffectServices();
  // LEFT1 P4: the Bloodied token marker.
  void import("./module/workflow/bloodied-marker.mjs").then(m => m.registerBloodiedMarker());
  // CCOND1: class and clan condition cards (drops, the GM's apply intent, endings) and their registry.
  await import("./module/workflow/condition-cards.mjs").then(async m => { m.registerConditionCards(); await m.loadConditionCards(); })
    .catch(error => console.error("N5e | condition cards", error));
  // AMP1a: Amp cards (drops, the GM's apply intent, limits, endings, initiative) and their registry.
  await import("./module/workflow/amp-cards.mjs").then(async m => { m.registerAmpCards(); await m.loadAmpCards(); })
    .catch(error => console.error("N5e | amp cards", error));
  // Data migrations the world hasn't run yet (GM only; module/migration/runner.mjs).
  await checkMigrations();
});
