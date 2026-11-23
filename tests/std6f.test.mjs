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

test("STD6f F2 Taijutsu II: every B- to S-Rank Taijutsu reviewed; the whole section is done", () => {
  const t = table("taijutsu/general");
  assert.deepEqual(t.ranks, ["E", "D", "C", "B", "A", "S"]);
  const items = sectionJutsu("taijutsu/general", ["B", "A", "S"]);
  assert.equal(items.size, 55);
  for ( const [id, { doc }] of items ) assert.equal(doc.flags.n5e.reviewed, true, id);
  assert.equal(Object.keys(t.features).length, 146);
  // King's Fang: +1 attack at S-Rank, base and Finisher.
  const kf = jutsu("taijutsu/general", "kings-fang").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(kf.A.find(a => a.label === "King’s Fang").attack.count, 2);
  assert.equal(kf.S.find(a => a.label === "Finisher: King’s Fang").attack.count, 3);
  // Daytime Tiger: two damage types on one attack.
  const dt = jutsu("taijutsu/general", "daytime-tiger").system.activities[0];
  assert.deepEqual(dt.damage.parts.map(p => p.type), ["bludgeoning", "force"]);
  // No-save conditions (F-D3) on Violent Strangling.
  const vs = jutsu("taijutsu/general", "violent-strangling").system.activities.find(a => a.label === "On a hit");
  assert.deepEqual(vs.effect.inflicts.map(i => i.key), ["grappled", "restrained", "exhaustion"]);
  // Kept Amps (King Q-J2).
  assert.equal(jutsu("taijutsu/general", "tiger-lily").system.activities[0].effect.amp, "jutsu-tiger-lily");
});

test("STD6f F3 Bukijutsu I: Shinobi Basics and Blade reviewed at every rank; weapon strikes and @weapon", () => {
  for ( const [section, count] of [["bukijutsu/shinobi-basics", 68], ["bukijutsu/blade", 35]] ) {
    const t = table(section);
    assert.deepEqual(t.ranks, ["E", "D", "C", "B", "A", "S"]);
    const items = sectionJutsu(section, t.ranks);
    assert.equal(items.size, count, section);
    for ( const [id, { doc }] of items ) {
      assert.ok(t.features[id], id);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  // Weapon strike with per-rank extra dice and a Chain button.
  const fang = jutsu("bukijutsu/shinobi-basics", "breath-of-beasts-fang");
  assert.equal(fang.system.activities[0].strike.kind, "weapon");
  assert.equal(fang.system.activities[0].attack.count, 2);
  const fangC = fang.flags.n5e.jutsuBookImport.activitiesByRank.C[0];
  assert.equal(fangC.strike.extraDice, "1d6");
  assert.equal(fang.flags.n5e.jutsuBookImport.activitiesByRank.B[0].attack.count, 3);
  assert.ok(fang.system.activities.some(a => a.label.startsWith("Chain 1:")));
  // A save dealing [Weapon damage] + typed dice (F-D5 @weapon), growing only the typed part.
  const smash = jutsu("bukijutsu/shinobi-basics", "breath-of-earth-smash");
  assert.deepEqual(smash.system.activities[0].damage.parts.map(p => p.formula), ["@weapon", "1d8"]);
  assert.deepEqual(smash.flags.n5e.jutsuBookImport.activitiesByRank.C[0].damage.parts.map(p => p.formula), ["@weapon", "(1d8) + (1d8)"]);
  // Kept Amps (King Q-J2).
  for ( const [s, id] of [["bukijutsu/shinobi-basics", "breath-of-sound-score"], ["bukijutsu/shinobi-basics", "guardian-knight"], ["bukijutsu/blade", "blade-heart"], ["bukijutsu/shinobi-basics", "the-zone"]] )
    assert.ok(jutsu(s, id).system.activities.some(a => a.effect?.amp), id);
  // Note-only action economy.
  assert.deepEqual(jutsu("bukijutsu/shinobi-basics", "baton-pass").system.activities, []);
});
