/** ENV1: hostile terrain and suffocation (KB 06). */
import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers/actor.mjs"; // the Foundry stand-in, before any data model import
import { terrainExposure, worstExposure, breathTurns, suffocationStep } from "../module/rules/environment.mjs";
import { terrainsAt, breathTurnStart } from "../module/workflow/environment.mjs";
import { regionBehaviorModels } from "../module/data/_index.mjs";
import fs from "node:fs";
import path from "node:path";

const system = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "system.json"), "utf8"));

test("Direct Exposure by type and rank; the worst of overlapping terrain", () => {
  assert.deepEqual(terrainExposure("extremeHeat", "B"), { dc: 21, damage: "5d6", damageType: "fire", label: "Extreme Heat (B-Rank)" });
  assert.equal(terrainExposure("toxic", "D").damage, null, "D-Rank: Indirect only");
  assert.equal(terrainExposure("chakraResistant", "S").damage, null);
  assert.equal(terrainExposure("lava", "C"), null);
  assert.equal(worstExposure([{ type: "extremeCold", rank: "C" }, { type: "toxic", rank: "A" }]).damageType, "poison");
  assert.equal(worstExposure([]), null);
});

test("breath: Con modifier turns (min 1), then out of breath", () => {
  assert.equal(breathTurns(3), 3);
  assert.equal(breathTurns(-1), 1);
  assert.deepEqual(suffocationStep(null, 2), { remaining: 1, outOfBreath: false });
  assert.deepEqual(suffocationStep(1, 2), { remaining: 0, outOfBreath: false });
  assert.deepEqual(suffocationStep(0, 2), { remaining: 0, outOfBreath: true });
});

test("the Hostile Terrain behaviour is declared and registered; regions are read per token", () => {
  assert.ok(system.documentTypes.RegionBehavior.hostileTerrain);
  assert.ok(regionBehaviorModels.hostileTerrain);
  const token = {};
  const scene = { regions: [
    { name: "Lava", tokens: new Set([token]), behaviors: [{ type: "hostileTerrain", disabled: false, system: { terrain: "extremeHeat", rank: "A" } }] },
    { name: "Off", tokens: new Set([token]), behaviors: [{ type: "hostileTerrain", disabled: true, system: { terrain: "toxic", rank: "S" } }] },
    { name: "Elsewhere", tokens: new Set(), behaviors: [{ type: "hostileTerrain", disabled: false, system: { terrain: "toxic", rank: "S" } }] }
  ] };
  token.parent = scene;
  assert.deepEqual(terrainsAt(token), [{ type: "extremeHeat", rank: "A", region: "Lava" }]);
});

test("Suffocating counts down and ends at 0 HP and Dying", async () => {
  const updates = [], toggles = [];
  const actor = { statuses: new Set(["suffocating"]), flags: { n5e: {} }, system: { abilities: { con: { mod: 1 } } },
    update: async u => { updates.push(u); if ( "flags.n5e.breath" in u ) actor.flags.n5e.breath = u["flags.n5e.breath"]; },
    toggleStatusEffect: async (s, o) => { toggles.push([s, o.active]); } };
  assert.match((await breathTurnStart(actor))[0], /0 turns of breath left/);
  assert.match((await breathTurnStart(actor))[0], /Out of breath/);
  assert.equal(updates.at(-1)["system.hp.value"], 0);
  assert.deepEqual(toggles, [["dying", true]]);
  actor.statuses = new Set();
  actor.flags.n5e.breath = 2;
  assert.deepEqual(await breathTurnStart(actor), []);
  assert.ok("flags.n5e.-=breath" in updates.at(-1), "cleared when no longer Suffocating");
});
