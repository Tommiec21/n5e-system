/** PRESTD1 Part F: social encounters (pure; the Bingo Book). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { socialSetup, argumentResult, primaryPoints, socialOutcome, socialScore, actionDC, patienceSpent } from "../../module/rules/social.mjs";

test("attitude sets starting points and Patience", () => {
  assert.deepEqual(socialSetup("hostile"), { poa: 0, pof: 4, patience: 2 });
  assert.deepEqual(socialSetup("indifferent"), { poa: 0, pof: 0, patience: 3 });
  assert.deepEqual(socialSetup("helpful"), { poa: 4, pof: 0, patience: 4 });
});

test("Argument Results table", () => {
  assert.deepEqual([10, 5, 0, -1, -5].map(m => { const r = argumentResult(m); return [r.poa, r.pof, r.reveal, r.newPitfall]; }),
    [[2, 0, true, false], [2, 0, false, false], [1, 0, false, false], [0, 1, false, false], [0, 2, false, true]]);
});

test("motivation, pitfall and Coerce in Diplomatic", () => {
  assert.equal(primaryPoints({ margin: 0, motivation: true }).poa, 2);
  assert.equal(primaryPoints({ margin: -1, motivation: true }).poa, 0);
  assert.equal(primaryPoints({ margin: 3, pitfall: true }).pof, 1);       // 3 − 4 = −1
  const c = primaryPoints({ margin: 6, action: "coerce", type: "diplomatic" });
  assert.deepEqual([c.poa, c.pof], [2, 1]);
});

test("resolution and DCs", () => {
  assert.equal(socialOutcome(5), "critical");
  assert.equal(socialOutcome(0), "success");
  assert.equal(socialOutcome(-4), "failure");
  assert.equal(socialOutcome(-5), "criticalFailure");
  assert.equal(socialScore({ poa: 3, pof: 5 }), -2);
  const npc = { saves: { wis: { total: 3 } }, skills: { ins: { total: 5 }, dec: { total: 2 } } };
  assert.equal(actionDC("impression", npc), 13);
  assert.equal(actionDC("lie", npc), 15);
  assert.equal(actionDC("sense", npc), 12);
  assert.equal(actionDC("recall", npc), null);
  assert.equal(patienceSpent({ round: 4, patience: 3 }), true);
  assert.equal(patienceSpent({ round: 3, patience: 3 }), false);
});
