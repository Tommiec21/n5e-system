/* STD6f: jutsu as data (docs/STD6f_SPEC.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { jutsuTables, sectionJutsu, tableProblems } from "../tools/content/apply-automation.mjs";
import { validateIntent, INTENT_TYPES } from "../module/automation/owner-intents.mjs";
import { inflictOn } from "../module/workflow/trackers.mjs";

const table = section => jutsuTables().find(t => t.section === section);
const jutsu = (section, id) => {
  const t = table(section);
  return sectionJutsu(section, t.ranks).get(id).doc;
};

test("STD6f F1 Taijutsu I: every E- to C-Rank Taijutsu has an entry and is reviewed", () => {
  const t = table("taijutsu/general");
  assert.ok(t);
  assert.deepEqual(t.ranks.slice(0, 3), ["E", "D", "C"]);
  const items = sectionJutsu("taijutsu/general", ["E", "D", "C"]);
  assert.equal(items.size, 91);
  for ( const [id, { doc }] of items ) {
    assert.ok(t.features[id], id);
    assert.equal(doc.flags.n5e.reviewed, true, id);
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
});

test("STD6f F1: Finisher versions are their own buttons; upcasts carry their dice", () => {
  const hammer = jutsu("taijutsu/general", "hammer");
  const labels = hammer.system.activities.map(a => a.label);
  assert.deepEqual(labels, ["Hammer", "Hammer: Concussed", "Finisher: Hammer", "Finisher: Concussed"]);
  assert.equal(hammer.system.activities[3].inflicts[0].ranks, 2);
  const byRank = hammer.flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(byRank.S.find(a => a.label === "Hammer").strike.extraDice, "1d12 + 4d12");
  // Noble Impact: +1 attack per rank.
  const noble = jutsu("taijutsu/general", "noble-impact").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(noble.C[0].attack.count, 5);
  assert.equal(noble.S[0].attack.count, 8);
  // Bolting Blossom: die steps up per rank, +1 attack from B-Rank.
  const bb = jutsu("taijutsu/general", "bolting-blossom").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(bb.C[0].damage.parts[0].formula, "3d8");
  assert.equal(bb.B[0].attack.count, 3);
  assert.equal(bb.S[0].damage.parts[0].formula, "3d12");
  // A note-only jutsu has no guessed buttons.
  const late = jutsu("taijutsu/general", "late-death");
  assert.deepEqual(late.system.activities, []);
  assert.equal(late.flags.n5e.rules[0].key, "note");
});

test("STD6f F-D3: an effect's conditions and states with no save (inflicts)", async () => {
  assert.ok(INTENT_TYPES.includes("inflictConditions"));
  const ok = validateIntent("inflictConditions", { targetUuid: "Actor.x", inflicts: [{ key: "prone", kind: "state", ranks: 1 }, { key: "dazed", kind: "condition", ranks: 2 }] });
  assert.deepEqual(ok.inflicts.map(i => i.key), ["prone", "dazed"]);
  assert.throws(() => validateIntent("inflictConditions", { targetUuid: "Actor.x", inflicts: [{ key: "x y", kind: "condition" }] }));
  assert.throws(() => validateIntent("inflictConditions", { targetUuid: "Actor.x", inflicts: [] }));
  const calls = [];
  const actor = { toggleStatusEffect: async (k, o) => calls.push(["state", k, o.active]), addCondition: async (k, r) => calls.push(["condition", k, r]) };
  await inflictOn(actor, [{ key: "prone", kind: "state" }, { key: "weakened", kind: "condition", ranks: 3 }]);
  assert.deepEqual(calls, [["state", "prone", true], ["condition", "weakened", 3]]);
  const drop = jutsu("taijutsu/general", "falcon-drop").system.activities.find(a => a.type === "effect");
  assert.deepEqual(drop.effect.inflicts.map(i => i.key), ["prone", "weakened", "bruised"]);
});
