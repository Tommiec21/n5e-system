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
  Hooks: { once: (name, fn) => { hooks[name] = fn; }, on: () => {} },
  Actor: class extends Doc {}, Item: class extends Doc {}, ActiveEffect: class extends Doc {},
  CONFIG: {
    Actor: { dataModels: {} }, Item: { dataModels: {} }, ActiveEffect: { dataModels: {} },
    Combat: {}, specialStatusEffects: {}, statusEffects: []
  },
  game: {
    settings: { register: (ns, key, cfg) => registered.settings.push(`${ns}.${key}`) },
    items: [], actors: { size: 0 }, user: { isGM: false }
  }
});
foundry.applications = {
  api: { HandlebarsApplicationMixin: C => class extends C {}, DialogV2: {}, ApplicationV2: class {} },
  sheets: { ActorSheetV2: Sheet, ItemSheetV2: Sheet },
  handlebars: { loadTemplates: paths => registered.templates.push(...paths) },
  apps: { FilePicker: { implementation: class {} } }
};
foundry.documents = { collections: {
  Actors: { registerSheet: (ns, cls, o) => registered.sheets.push(["Actor", ns, o.makeDefault]) },
  Items: { registerSheet: (ns, cls, o) => registered.sheets.push(["Item", ns, o.makeDefault]) }
} };
foundry.utils = { deepClone: structuredClone, expandObject: o => o };

test("init hook registers models, documents, sheets, settings, statuses", async () => {
  await import("../n5e.mjs");
  assert.ok(hooks.init, "init hook registered");
  hooks.init();
  assert.deepEqual(Object.keys(CONFIG.Actor.dataModels).sort(), ["character", "npc"]);
  assert.equal(Object.keys(CONFIG.Item.dataModels).length, 13);
  assert.equal(Object.keys(CONFIG.ActiveEffect.dataModels).length, 6);
  assert.ok(CONFIG.N5E.conditions.exhaustion);
  assert.ok(CONFIG.statusEffects.find(s => s.id === "sealed"));
  assert.ok(CONFIG.statusEffects.find(s => s.id === "prone"), "states on the HUD");
  assert.equal(CONFIG.Combat.initiative.formula, "1d20 + @init");
  assert.equal(registered.sheets.length, 3, "character sheet + NPC placeholder + item placeholder");
  assert.ok(registered.settings.includes("n5e.migrationVersion"));
  assert.ok(registered.settings.includes("n5e.stamina"));
  assert.ok(registered.templates.length >= 1);
  assert.ok(game.n5e.rules.cost.computeJutsuCost);
  await hooks.ready();   // no clan items, not GM -> no-op
});
