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
import { registerDetectionModes } from "./module/canvas/detection.mjs";
import { registerMovement } from "./module/canvas/ruler.mjs";
import { registerAreaHooks } from "./module/workflow/areas.mjs";
import { registerAutomationHooks } from "./module/workflow/automation.mjs";
import { registerEnrichers } from "./module/applications/enrichers.mjs";
import CompendiumBrowser, { registerCompendiumBrowser } from "./module/applications/browser/compendium-browser.mjs";
import { N5eActorSheet, TEMPLATE_PATHS } from "./module/applications/sheets.mjs";
import CharacterSheet, { CHARACTER_TEMPLATE_PATHS } from "./module/applications/actor/character-sheet.mjs";
import NPCSheet from "./module/applications/actor/npc-sheet.mjs";
import EffectConfig from "./module/applications/effect/effect-config.mjs";
import ItemSheet, { ITEM_TEMPLATE_PATHS } from "./module/applications/item/item-sheet.mjs";
import { registerHelpers } from "./module/applications/helpers.mjs";
import { registerSettings } from "./module/settings.mjs";
import * as dice from "./module/dice/roll.mjs";
import { registerTurnHooks, onRenderTurnCard } from "./module/workflow/turn.mjs";
import { registerSocket } from "./module/socket.mjs";
import { registerPartyOverview } from "./module/applications/gm/party-overview.mjs";
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

registerAutomationHooks();

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
    browser: tab => CompendiumBrowser.open(tab)
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
  Actors.registerSheet("n5e", NPCSheet, { types: ["npc"], makeDefault: true, label: "N5E.SheetNPC" });
  Actors.registerSheet("n5e", N5eActorSheet, { types: ["character", "npc"], makeDefault: false, label: "N5E.SheetPlaceholder" });
  Items.registerSheet("n5e", ItemSheet, { makeDefault: true, label: "N5E.SheetItem" });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, "n5e", EffectConfig,
    { makeDefault: true, label: "N5E.SheetEffect" });

  // World settings (every optional rule + the migration marker), Handlebars helpers, and every
  // template the sheets use (preloaded so partials resolve on first render).
  registerSettings();
  registerHelpers();
  // Shortcuts in text: [[/save]], [[/check]], [[/damage]], [[/heal]], @Condition[], @State[] (applications/enrichers.mjs).
  registerEnrichers();
  foundry.applications.handlebars.loadTemplates([...new Set([...TEMPLATE_PATHS, ...CHARACTER_TEMPLATE_PATHS, ...ITEM_TEMPLATE_PATHS])]);
});

// Chat card buttons. Cards are plain HTML with data-n5e-* attributes; each render wires the buttons
// (module/dice/roll.mjs dispatches them; turn cards have their own End-concentration buttons).
Hooks.on("renderChatMessageHTML", (message, html) => {
  dice.onRenderChatMessage(message, html);
  onRenderTurnCard(message, html);
});
// Combat turn flow (upkeep, resets, condition damage and decay, trackers, Chilled movement, Amp
// limits) and the GM's Party Overview button on the token controls.
registerTurnHooks();
registerPartyOverview();
// Jutsu areas: concentration areas leave the map when concentration ends (workflow/areas.mjs).
registerAreaHooks();
// Compendium Browser buttons in the Compendium and Items sidebars (applications/browser/).
registerCompendiumBrowser();

Hooks.once("ready", async () => {
  // Clan-scoped conditions and keywords from world clan items (compendium clans load in Phase 6).
  for ( const item of game.items.filter(i => i.type === "clan") ) api.registerClanData(item);
  // The GM relay (players asking the GM to change things they don't own; module/socket.mjs).
  registerSocket();
  // Data migrations the world hasn't run yet (GM only; module/migration/runner.mjs).
  await checkMigrations();
});
