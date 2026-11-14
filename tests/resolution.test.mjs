/** RES1: per-target resolution of one damage roll (KB 03, 04). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { saveMode, targetOutcomes, pickLinkedRolls } from "../module/rules/resolution.mjs";
import { linkedOutcomes } from "../module/workflow/resolution.mjs";

const T = (n, ac) => ({ uuid: `Actor.${n}`, name: n, ac });

test("save shares: fail full, success half or none, four-tier critical success none", () => {
  assert.equal(saveMode(1), "full");
  assert.equal(saveMode(0, { fourTier: true }), "full");
  assert.equal(saveMode(2, { onSuccess: "half" }), "half");
  assert.equal(saveMode(2), "none");
  assert.equal(saveMode(3, { onSuccess: "half", fourTier: true }), "none");
  assert.equal(saveMode(null), null);
});

test("one attack roll against each AC: hit and crit full, miss and natural 1 none", () => {
  const rows = targetOutcomes({ attack: { total: 15, natural: 10, threshold: 20, targets: [T("A", 12), T("B", 16), T("C")] } });
  assert.deepEqual(rows.map(r => [r.name, r.mode]), [["A", "full"], ["B", "none"]], "no AC: no automatic result");
  const crit = targetOutcomes({ attack: { total: 5, natural: 20, threshold: 20, targets: [T("A", 30)] } });
  assert.equal(crit[0].mode, "full");
  assert.equal(crit[0].outcome, "Critical hit");
  assert.equal(targetOutcomes({ attack: { total: 40, natural: 1, threshold: 20, targets: [T("A", 5)] } })[0].mode, "none");
});

test("per-target saves, and a hit target that also saved takes the save's share", () => {
  const rows = targetOutcomes({
    attack: { total: 18, natural: 12, threshold: 20, targets: [T("A", 12)] },
    saves: [{ actorUuid: "Actor.A", name: "A", degree: 2, onSuccess: "half" }, { actorUuid: "Actor.B", name: "B", degree: 1 }]
  });
  assert.deepEqual(rows.map(r => [r.name, r.mode]), [["A", "half"], ["B", "full"]]);
  assert.match(rows[0].outcome, /Hit, save Success \(half\)/);
});

test("linking: the origin attack card or the latest linked attack; the latest save per creature", () => {
  const origin = { kind: "attack", total: 10 };
  const linked = [{ kind: "save", dc: 14, actorUuid: "Actor.A", degree: 1 }, { kind: "attack", total: 3 },
    { kind: "save", dc: 14, actorUuid: "Actor.A", degree: 2 }, { kind: "check", actorUuid: "Actor.B" }];
  assert.equal(pickLinkedRolls(origin, linked).attack, origin);
  assert.equal(pickLinkedRolls(null, linked).attack.total, 3);
  assert.deepEqual(pickLinkedRolls(null, linked).saves.map(s => s.degree), [2], "a reroll replaces the earlier save");
});

test("a damage card finds its origin card's linked rolls", () => {
  const cast = { id: "cast1", flags: { n5e: { cast: {} } } };
  const messages = [cast,
    { flags: { n5e: { roll: { kind: "save", dc: 15, actorUuid: "Actor.A", name: "A", degree: 1, source: "cast1" } } } },
    { flags: { n5e: { roll: { kind: "save", dc: 15, actorUuid: "Actor.B", name: "B", degree: 2, onSuccess: "half", source: "cast1" } } } },
    { flags: { n5e: { roll: { kind: "save", dc: 15, actorUuid: "Actor.C", name: "C", degree: 1, source: "other" } } } }];
  const saved = { game: globalThis.game, fromUuidSync: globalThis.fromUuidSync };
  globalThis.game = { ...(globalThis.game ?? {}), messages: { contents: messages } };
  globalThis.fromUuidSync = uuid => (uuid === "ChatMessage.cast1" ? cast : null);
  try {
    const rows = linkedOutcomes({ flags: { n5e: { damage: { originUuid: "ChatMessage.cast1" } } } });
    assert.deepEqual(rows.map(r => [r.name, r.mode]), [["A", "full"], ["B", "half"]]);
    assert.deepEqual(linkedOutcomes({ flags: { n5e: { damage: {} } } }), []);
  } finally {
    globalThis.game = saved.game;
    globalThis.fromUuidSync = saved.fromUuidSync;
  }
});
