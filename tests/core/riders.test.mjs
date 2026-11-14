/** CARD1d: feature riders on the action card (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { riderFits, triggerRiders, targetFacts, triggered, eventSave, riderOnTarget, adjustedInflicts, riderEntry, resolveAmount, validateRider } from "../../module/rules/riders.mjs";

const targets = [{ uuid: "A", name: "Ana", ac: 14 }, { uuid: "B", name: "Bo", ac: 18 }];
const tags = key => ({ burned: ["elemental"], demoralized: ["mental"] })[key] ?? [];
const burned = [{ key: "burned", kind: "condition", ranks: 1, label: "Burned" }];

test("a rider fits by kind, discipline, keywords, nature release and inflicted conditions", () => {
  const action = { kind: "jutsu", discipline: "nin", keywords: ["fireRelease", "clash"], inflicts: burned };
  assert.ok(riderFits({ appliesTo: { discipline: "nin", keywords: ["fireRelease"] } }, action));
  assert.ok(!riderFits({ appliesTo: { discipline: "tai" } }, action));
  assert.ok(riderFits({ appliesTo: { natureRelease: true, inflictsTag: "elemental" } }, action, tags));
  assert.ok(!riderFits({ appliesTo: { inflictsTag: "mental" } }, action, tags));
  assert.ok(!riderFits({ appliesTo: { inflictsCondition: true } }, { ...action, inflicts: [] }));
  assert.ok(!riderFits({ appliesTo: { kind: ["attack"] } }, action));
});

test("trigger riders from features, with once per turn", () => {
  const items = [{ id: "f1", flags: { n5e: { riders: [{ label: "A", oncePerTurn: true, when: ["hit"] }, { label: "B", appliesTo: { discipline: "gen" }, when: ["hit"] }] } } }];
  const now = { round: 2, turn: 1 };
  const got = triggerRiders(items, { kind: "attack", discipline: "tai" }, { now, riderTurn: { "f1:0": now } });
  assert.deepEqual(got.map(o => [o.id, o.used]), [["f1:0", true]]);
});

test("triggers per target: hit, crit, failed save, damage dealt", () => {
  const card = { targets, results: {} };
  const facts = targetFacts(card, { attack: { total: 16, natural: 9, threshold: 20, targets },
    saves: { B: { degree: 1 } }, applied: { A: { mode: "full" } } });
  assert.deepEqual(facts.get("A"), { hit: true, crit: false, saved: false, saveFailed: false, damaged: true });
  assert.deepEqual(facts.get("B"), { hit: false, crit: false, saved: true, saveFailed: true, damaged: false });
  assert.ok(triggered({ when: ["hit", "failedSave"] }, facts.get("B")));
  assert.ok(!triggered({ when: ["hit"] }, facts.get("B")));
  assert.ok(triggered({ when: ["damageDealt"] }, facts.get("A")));
});

test("one save per event: the action's save wins; else the rider save, chosen when several", () => {
  const save = (key, ability) => riderEntry({ label: key, when: ["hit"], effects: [{ type: "save", ability, dc: { source: "tai" }, inflicts: [] }] }, { key, dc: 13 });
  assert.deepEqual(eventSave({ riders: [save("r1", "str")] }, 1), { from: "action" });
  assert.deepEqual(eventSave({ riders: [save("r1", "str")] }, 0), { from: "rider", key: "r1", ability: "str", dc: 13 });
  assert.deepEqual(eventSave({ riders: [save("r1", "str"), save("r2", "wis")] }, 0), { from: "choose", keys: ["r1", "r2"] });
  assert.deepEqual(eventSave({ riders: [save("r1", "str"), save("r2", "wis")], eventSave: { key: "r2", ability: "wis", dc: 13 } }, 0),
    { from: "rider", key: "r2", ability: "wis", dc: 13 });
  assert.equal(eventSave({ riders: [] }, 0), null);
});

test("a rider's save effects ride the event save: they apply only on a failure", () => {
  const arresting = riderEntry({ label: "Arresting Strike", when: ["hit"], effects: [{ type: "save", ability: "str", dc: { source: "action" },
    inflicts: [{ key: "prone", kind: "state", ranks: 1, label: "Prone" }], text: "speed halved" }] }, { key: "r1", targets: ["A"] });
  const hitNoSave = riderOnTarget(arresting, "A", { hit: true, saved: false, saveFailed: false });
  assert.deepEqual(hitNoSave.apps, [], "hit, but the event save hasn't failed");
  const failed = riderOnTarget(arresting, "A", { hit: true, saved: true, saveFailed: true });
  assert.deepEqual(failed.apps.map(a => [a.kind, a.key ?? a.label]), [["state", "prone"], ["note", "speed halved"]]);
  assert.deepEqual(riderOnTarget(arresting, "B", { hit: true, saveFailed: true }).apps, [], "target one: only the chosen creature");
});

test("rank increases stack additively, then the condition's cap (Q-CD5)", () => {
  const amplified = riderEntry({ label: "Amplified Force", when: ["failedSave"], requires: { state: "combatRival" },
    effects: [{ type: "addRanks", amount: 1, conditions: "inflicted" }] }, { key: "a" });
  const malady = riderEntry({ label: "Elemental Malady", when: ["failedSave"], effects: [{ type: "addRanks", amount: "halfPoolRoll", conditions: "elemental" }] },
    { key: "m", poolRoll: 7 });
  const fact = { saved: true, saveFailed: true };
  const a = riderOnTarget(amplified, "A", fact, burned, tags, { isRival: () => false });
  assert.equal(a.warning, "not your Combat Rival", "Specialized: offered with a warning (Q-CD7)");
  const m = riderOnTarget(malady, "A", fact, burned, tags);
  const adj = adjustedInflicts(burned, [...a.adds, ...m.adds], () => 5);
  assert.deepEqual([adj[0].ranks, adj[0].added], [5, 4], "1 + 1 + 3 = 5, the cap");
  assert.equal(adjustedInflicts(burned, [...a.adds, ...m.adds], () => null)[0].ranks, 5);
  assert.equal(adjustedInflicts(burned, a.adds, () => 5)[0].ranks, 2);
  assert.deepEqual(riderOnTarget(malady, "A", { saved: true, saveFailed: false }, burned, tags).adds, [], "no failure, no added ranks");
});

test("one condition choice for every affected creature (Q-CD8); chosen targets skip the per-row trigger", () => {
  const auth = riderEntry({ label: "Authoritative Strike", when: ["hit", "failedSave"], effects: [{ type: "inflict", choose: [
    { key: "demoralized", ranks: 1, label: "Demoralized" }, { key: "weakened", ranks: 1, label: "Weakened" }] }] },
  { key: "x", choice: { key: "weakened", kind: "condition", ranks: 1, label: "Weakened" } });
  assert.deepEqual(riderOnTarget(auth, "A", { hit: true }).apps.map(a => a.key), ["weakened"]);
  assert.deepEqual(riderOnTarget(auth, "B", { hit: false, saveFailed: false }).apps, []);
  const menacing = { ...riderEntry({ label: "Menacing Assault", when: ["damageDealt"], effects: [{ type: "save", ability: "wis", dc: { source: "action" },
    inflicts: [{ key: "demoralized", kind: "condition", ranks: "halfPoolRoll", label: "Demoralized" }] }] }, { key: "y", poolRoll: 5, targets: ["B"] }), targetMode: "chosen" };
  assert.deepEqual(riderOnTarget(menacing, "B", { damaged: false, saved: true, saveFailed: true }).apps.map(a => [a.key, a.ranks]), [["demoralized", 2]]);
});

test("amounts and the validator", () => {
  assert.equal(resolveAmount("halfPoolRoll", 7), 3);
  assert.equal(resolveAmount(2), 2);
  assert.deepEqual(validateRider({ label: "X", when: ["hit"], effects: [{ type: "note", text: "t" }] }), []);
  assert.ok(validateRider({ label: "X", when: ["sometimes"], effects: [] }).some(p => /unknown when/.test(p)));
  assert.ok(validateRider({ label: "X", when: ["hit"], effects: [{ type: "addRanks", amount: "halfPoolRoll" }] }).some(p => /cost.roll/.test(p)));
  assert.ok(validateRider({ label: "X", when: ["hit"], effects: [{ type: "save", ability: "str", dc: { source: "tai" } }, { type: "save", ability: "wis", dc: { source: "tai" } }] })
    .some(p => /one save per event/.test(p)));
});
