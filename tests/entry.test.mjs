/**
 * Loads n5e.mjs against a stubbed Foundry client and runs the init hook, to catch import and
 * registration errors without a Foundry install.
 */
import "./helpers/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

const hooks = {};
const registered = { sheets: [], settings: [], templates: [] };
class Doc { static migrateData(s) { return s; } }
class Sheet {}
Object.assign(globalThis, {
  Handlebars: { registerHelper: () => {} },
  CSS: { escape: s => s },
  Hooks: { once: (name, fn) => { hooks[name] = fn; }, on: () => {} },
  Actor: class extends Doc {}, Item: class extends Doc {}, ActiveEffect: class extends Doc {},
  CONFIG: {
    Actor: { dataModels: {} }, Item: { dataModels: {} }, ActiveEffect: { dataModels: {} },
    Combat: {}, specialStatusEffects: {}, statusEffects: [], Token: {}, Canvas: { detectionModes: {} }
  },
  game: {
    settings: { register: (ns, key, cfg) => registered.settings.push(`${ns}.${key}`), registerMenu: (ns, key) => registered.settings.push(`menu:${ns}.${key}`) },
    items: [], actors: { size: 0 }, user: { isGM: false }
  }
});
foundry.applications = {
  api: { HandlebarsApplicationMixin: C => class extends C {}, DialogV2: {}, ApplicationV2: class {} },
  sheets: { ActorSheetV2: Sheet, ItemSheetV2: Sheet, ActiveEffectConfig: Sheet },
  handlebars: { loadTemplates: paths => registered.templates.push(...paths) },
  apps: { FilePicker: { implementation: class {} },
    DocumentSheetConfig: { registerSheet: (doc, ns, cls, o) => registered.sheets.push(["ActiveEffect", ns, o.makeDefault]) } }
};
foundry.documents = { TokenDocument: class extends Doc {}, Combat: class extends Doc {}, collections: {
  Actors: { registerSheet: (ns, cls, o) => { registered.sheets.push(["Actor", ns, o.makeDefault]); (registered.actorSheetNames ??= []).push(cls.name); } },
  Items: { registerSheet: (ns, cls, o) => registered.sheets.push(["Item", ns, o.makeDefault]) }
} };
foundry.utils = { deepClone: structuredClone, expandObject: o => o };

test("init hook registers models, documents, sheets, settings, statuses", async () => {
  await import("../n5e.mjs");
  assert.ok(hooks.init, "init hook registered");
  hooks.init();
  assert.deepEqual(Object.keys(CONFIG.Actor.dataModels).sort(), ["character", "hazard", "loot", "npc", "vehicle"]);
  assert.equal(Object.keys(CONFIG.Item.dataModels).length, 14, "with the condition card (CCOND1)");
  assert.equal(Object.keys(CONFIG.ActiveEffect.dataModels).length, 6);
  assert.ok(CONFIG.N5E.conditions.exhaustion);
  assert.ok(CONFIG.statusEffects.find(s => s.id === "sealed"));
  assert.ok(CONFIG.statusEffects.find(s => s.id === "prone"), "states on the HUD");
  assert.equal(CONFIG.Combat.initiative.formula, "1d20 + @init");
  assert.equal(registered.sheets.length, 13, "character, five character designs (SHEETS1), NPC, loot, hazard, vehicle, raw-data placeholder, item, effect");
  // Foundry saves a chosen sheet as "n5e.<class name>": every design needs its own, stable name.
  for ( const n of ["Classic", "Glass", "Ink", "Scroll", "Oneui"] ) assert.ok(registered.actorSheetNames.includes(`CharacterSheet${n}`), n);
  assert.equal(new Set(registered.actorSheetNames).size, registered.actorSheetNames.length, "unique sheet ids");
  assert.ok(registered.settings.includes("n5e.migrationVersion"));
  assert.ok(registered.settings.includes("n5e.stamina"));
  assert.ok(registered.settings.includes("n5e.restLimit"));
  assert.ok(registered.settings.includes("menu:n5e.rulesConfig"));
  assert.ok(registered.templates.length >= 1);
  assert.ok(game.n5e.rules.cost.computeJutsuCost);
  assert.ok(CONFIG.Token.documentClass, "token document with senses");
  await hooks.ready();   // no clan items, not GM -> no-op
});
