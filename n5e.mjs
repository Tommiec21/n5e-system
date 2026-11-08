/**
 * N5e 4.0 game system for Foundry VTT v13 — entry point.
 * Phase 1 (alpha.1): data models, registries, derived data, migrations, placeholder sheets.
 */
import N5E from "./module/config/index.mjs";
import { registerDataModels } from "./module/data/_index.mjs";
import N5eActor from "./module/documents/actor.mjs";
import N5eItem from "./module/documents/item.mjs";
import N5eActiveEffect from "./module/documents/active-effect.mjs";
import { N5eActorSheet, TEMPLATE_PATHS } from "./module/applications/sheets.mjs";
import CharacterSheet, { CHARACTER_TEMPLATE_PATHS } from "./module/applications/actor/character-sheet.mjs";
import NPCSheet from "./module/applications/actor/npc-sheet.mjs";
import EffectConfig from "./module/applications/effect/effect-config.mjs";
import ItemSheet, { ITEM_TEMPLATE_PATHS } from "./module/applications/item/item-sheet.mjs";
import { registerHelpers } from "./module/applications/helpers.mjs";
import { registerSettings } from "./module/settings.mjs";
import * as dice from "./module/dice/roll.mjs";
import { registerTurnHooks, onRenderTurnCard } from "./module/workflow/turn.mjs";
import { registerRestSocket } from "./module/workflow/rest.mjs";
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

Hooks.once("init", () => {
  console.log("N5e | Initializing N5e 4.0 system");

  CONFIG.N5E = N5E;
  game.n5e = {
    config: N5E,
    api,
    rules: { progression, cost, conditions, degree, chain, ac, formula },
    migrations: MIGRATIONS,
    dice: { ...dice, d20 }
  };

  // Documents and data models.
  CONFIG.Actor.documentClass = N5eActor;
  CONFIG.Item.documentClass = N5eItem;
  CONFIG.ActiveEffect.documentClass = N5eActiveEffect;
  registerDataModels();


  // Token bars: hp/cp max are derived, so declare them as bars explicitly.
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["hp", "cp"], value: ["willOfFire.value", "combat.chain.value"] },
    npc: { bar: ["hp", "cp"], value: ["combat.chain.value"] }
  };

  // Initiative: d20 + Dex + floor(prof / 2) + Mastery (computed as @init).
  CONFIG.Combat.initiative = { formula: "1d20 + @init", decimals: 2 };

  // Conditions and States on the token HUD.
  CONFIG.statusEffects = [
    ...Object.entries(N5E.conditions).map(([id, c]) => ({ id, name: c.label, img: c.icon ?? "icons/svg/aura.svg" })),
    ...Object.entries(N5E.states).filter(([, s]) => !s.derived && !s.relational && s.icon)
      .map(([id, s]) => ({ id, name: s.label, img: s.icon }))
  ];
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

  registerSettings();
  registerHelpers();
  foundry.applications.handlebars.loadTemplates([...new Set([...TEMPLATE_PATHS, ...CHARACTER_TEMPLATE_PATHS, ...ITEM_TEMPLATE_PATHS])]);
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  dice.onRenderChatMessage(message, html);
  onRenderTurnCard(message, html);
});
registerTurnHooks();

Hooks.once("ready", async () => {
  // Clan-scoped conditions and keywords from world clan items (compendium clans load in Phase 6).
  for ( const item of game.items.filter(i => i.type === "clan") ) api.registerClanData(item);
  registerRestSocket();
  await checkMigrations();
});
