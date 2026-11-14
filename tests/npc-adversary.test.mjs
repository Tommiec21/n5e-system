/** NPC1a: the adversary build on the NPC data model. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor } from "./helpers/actor.mjs";
import NPCData from "../module/data/actor/npc.mjs";

const avenger = (extra = {}, adv = {}) => makeActor({ type: "npc", system: {
  details: { build: "adversary", level: 5, rank: "D", class: "standard", role: "striker", ...extra },
  adversary: { mods: { str: 4, dex: 0, con: 0, int: -1, wis: 2, cha: -2 }, armor: "heavy", ...adv } } });

test("the Avenger from the book: AC 15, DR 6, HP and CP 40, Taijutsu +8 and DC 16, Genjutsu +6 and DC 14", () => {
  const s = avenger().system;
  assert.deepEqual([s.prof, s.ac.value, s.dr, s.hp.max, s.cp.max], [4, 15, 6, 40, 40]);
  assert.deepEqual([s.disciplines.tai.attack, s.disciplines.tai.dc, s.disciplines.gen.attack, s.disciplines.gen.dc], [8, 16, 6, 14]);
  assert.deepEqual([s.abilities.str.mod, s.abilities.cha.mod], [4, -2]);
  assert.deepEqual([s.saves.str.total, s.saves.wis.total, s.saves.dex.total, s.saves.cha.total], [8, 6, 2, 0], "two full saves at level 5, the rest half");
  assert.equal(s.initiative.total, 0 + 2 + 2, "Dex + half proficiency + Striker");
  assert.deepEqual(s.breakdowns.ac.parts.map(p => p.label), ["Heavy armor, level 5"]);
  assert.deepEqual([s.adversaryBuild.freeform.attack, s.adversaryBuild.freeform.dc], [8, 16]);
  assert.deepEqual([s.adversaryBuild.budget.budget, s.adversaryBuild.budget.assigned], [3, 3]);
  assert.equal(s.hitDice.die, "d6");
});

test("class, role and classification change the numbers; skills roll the modifier unless added", () => {
  const elite = avenger({ class: "elite", role: "defender", iconic: true }).system;
  assert.deepEqual([elite.ac.value, elite.dr, elite.hp.max, elite.saves.str.total], [15 + 1 + 1 + 1, 8, Math.floor(40 * 1.25 * 1.5), 8 + 1]);
  assert.deepEqual([elite.disciplines.tai.attack, elite.disciplines.tai.dc], [9, 17]);
  const lurker = makeActor({ type: "npc", system: { details: { build: "adversary", level: 5, role: "lurker" },
    adversary: { mods: { dex: 3 } }, skills: { ath: { proficient: true } } } }).system;
  assert.deepEqual([lurker.skills.ste.total, lurker.skills.acr.total, lurker.skills.ath.total, lurker.speed.walk], [5, 3, 4, 50]);
});

test("Minions: HP 10 + level, no Chakra, AC -2, initiative -2, saves fail automatically", () => {
  const s = avenger({ class: "minion", role: "none" }).system;
  assert.deepEqual([s.hp.max, s.cp.max, s.ac.value, s.initiative.total, s.autoFailSaves], [15, 0, 13, 0, true]);
  assert.equal(avenger().system.autoFailSaves, false);
});

test("overrides replace one number; effects and conditions still apply on top", () => {
  const over = avenger({}, { overrides: { ac: 12, dr: 2, saves: { str: 10 }, attack: { tai: 11 }, dc: { tai: 18 }, initiative: 6, speed: 40, skills: { ath: 10 }, passivePerception: 15 } });
  const s = over.system;
  assert.deepEqual([s.ac.value, s.dr, s.saves.str.total, s.saves.wis.total, s.disciplines.tai.attack, s.disciplines.tai.dc, s.initiative.total, s.speed.walk, s.skills.ath.total, s.skills.prc.passive],
    [12, 2, 10, 6, 11, 18, 6, 40, 10, 15]);
  assert.deepEqual([s.adversaryBuild.baselines.ac, s.adversaryBuild.baselines["save.str"], s.adversaryBuild.baselines["tai.attack"]], [15, 8, 8]);
  const stated = makeActor({ type: "npc", system: { hpMax: 55, details: { build: "adversary", level: 5, rank: "C" }, adversary: { mods: { con: 1 } } } }).system;
  assert.deepEqual([stated.hp.max, stated.adversaryBuild.baselines.hp, stated.cp.max], [55, 55, 55]);
  const weakened = makeActor({ type: "npc", conditions: [{ key: "weakened", ranks: 1 }], system: { details: { build: "adversary", level: 5 },
    adversary: { mods: { str: 4 }, overrides: { saves: { str: 10 } } } } }).system;
  assert.ok(weakened.saves.str.total < 10 || weakened.breakdowns["save.str"].parts.length === 1, "condition penalties add to the stated value");
});

test("player-style NPCs are unchanged; old data keeps its class and stays player-style", () => {
  const s = makeActor({ type: "npc", system: { details: { level: 3 }, abilities: { str: { value: 16 } } } }).system;
  assert.deepEqual([s.isAdversary, s.adversaryBuild, s.abilities.str.mod, s.prof], [false, null, 3, 3]);
  const old = NPCData.migrateData({ details: { level: 4, role: "elite", rank: "B" } });
  assert.deepEqual([old.details.class, old.details.role, old.details.build], ["elite", "none", "character"]);
  const again = NPCData.migrateData(structuredClone(old));
  assert.deepEqual(again, old, "idempotent");
  const fresh = NPCData.migrateData({ details: { build: "adversary", role: "striker", class: "solo" } });
  assert.deepEqual([fresh.details.class, fresh.details.role, fresh.details.build], ["solo", "striker", "adversary"]);
});

test("migration 8 saves the converted profile of every NPC, linked or on a token", async () => {
  const { migrateNpcProfile, MIGRATIONS } = await import("../module/migration/runner.mjs");
  assert.equal(MIGRATIONS.at(-1).id, 8);
  const saved = globalThis.game;
  const updates = [];
  const npc = (uuid, details) => ({ type: "npc", uuid, _source: { system: { details } }, async update(data, options) { updates.push([uuid, data, options.diff]); } });
  globalThis.game = { actors: [npc("Actor.a", { class: "elite", role: "none", build: "character" }), { type: "character" }],
    scenes: { contents: [{ tokens: { contents: [{ actorLink: false, actor: npc("Token.t", { class: "minion", role: "none", build: "character" }) }] } }] } };
  try {
    const log = [];
    await migrateNpcProfile(log);
    assert.deepEqual(updates.map(u => [u[0], u[1]["system.details.class"], u[2]]), [["Actor.a", "elite", false], ["Token.t", "minion", false]]);
    assert.equal(log.length, 2);
  } finally { globalThis.game = saved; }
});
