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

/* ENV1b */
import { fallDamage } from "../module/rules/environment.mjs";

test("falling (Option A): nothing within the Str score; 1d6 per 10 ft, max 100d6, Prone", () => {
  assert.equal(fallDamage(14, 14), null);
  assert.equal(fallDamage(10, 8).formula, "1d6");
  assert.deepEqual(fallDamage(35, 12), { dice: 3, formula: "3d6", prone: true });
  assert.equal(fallDamage(5000, 10).dice, 100);
  assert.equal(fallDamage(9, 0), null, "under 10 ft rolls no dice");
});

/* FIN4a */
import { breathSeconds, breathState, outOfBreathStatus } from "../module/rules/environment.mjs";

test("FIN4a: breath outside combat is Con modifier minutes (at least 30 s); counts start fresh across combat", () => {
  assert.equal(breathSeconds(3), 180);
  assert.equal(breathSeconds(0), 30);
  assert.equal(breathSeconds(-1), 30);
  assert.deepEqual(breathState({ until: 500 }, { inCombat: false, now: 380 }), { mode: "time", left: 120 });
  assert.deepEqual(breathState({ until: 500 }, { inCombat: true }), { mode: "fresh", left: null }, "combat starts: fresh");
  assert.deepEqual(breathState(3, { inCombat: false, now: 0 }), { mode: "fresh", left: null }, "combat ends: fresh");
  assert.deepEqual(breathState(3, { inCombat: true }), { mode: "turns", left: 3 });
  assert.equal(outOfBreathStatus(), "dying");
  assert.equal(outOfBreathStatus({ choke: true }), "unconscious");
});

test("FIN4a: a choked creature runs out of breath into Unconscious, not Dying; a count from outside combat starts fresh", async () => {
  const updates = [], toggles = [];
  const actor = { statuses: new Set(["suffocating"]), flags: { n5e: { breath: { until: 99 } } }, system: { abilities: { con: { mod: 0 } } },
    effects: [{ statuses: new Set(["suffocating"]), flags: { n5e: { choke: { holder: "Actor.h" } } } }],
    update: async u => { updates.push(u); if ( "flags.n5e.breath" in u ) actor.flags.n5e.breath = u["flags.n5e.breath"]; },
    toggleStatusEffect: async (s, o) => { toggles.push([s, o.active]); } };
  assert.match((await breathTurnStart(actor))[0], /0 turns of breath left \(choked\)/, "fresh: Con 0 gives 1 turn");
  assert.match((await breathTurnStart(actor))[0], /Unconscious \(choked, not Dying\)/);
  assert.deepEqual(toggles, [["unconscious", true]]);
});

/* FIN4b */
import { indirectExposure, mayBeImmune } from "../module/rules/environment.mjs";

test("FIN4b: Indirect Exposure suggests the highest terrain DC and the Releases that may make a creature immune", () => {
  assert.deepEqual(indirectExposure([{ type: "extremeHeat", rank: "D" }]), { dc: 18, skill: "sur", label: "Extreme Heat", releases: ["fire"] });
  const two = indirectExposure([{ type: "extremeCold", rank: "C" }, { type: "toxic", rank: "A" }]);
  assert.equal(two.dc, 23);
  assert.deepEqual(two.releases, ["water", "medical"]);
  assert.equal(indirectExposure([{ type: "chakraResistant", rank: "S" }]), null, "Chakra Resistant has no check");
  assert.deepEqual(mayBeImmune(new Set(["fire", "wind"]), ["fire"]), ["fire"]);
  assert.deepEqual(mayBeImmune(["earth"], ["fire"]), []);
});
