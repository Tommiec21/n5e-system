/** SKILL1: skill actions against one target (KB 02, Chapter 6). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVs, passiveScore, fixedDC, contestOutcome, checkOutcome, skillActionEffects, SKILL_RESULTS } from "../module/rules/skill-resolution.mjs";
import { skillActions } from "../module/config/character.mjs";

test("vs forms parse", () => {
  assert.deepEqual(parseVs("contest:ath|acr"), { kind: "contest", skills: ["ath", "acr"] });
  assert.deepEqual(parseVs("passive:prc"), { kind: "passive", skill: "prc" });
  assert.deepEqual(parseVs("fixed:8+level"), { kind: "fixed", expr: "8+level" });
  assert.deepEqual(parseVs("dc:str"), { kind: "dc", ability: "str" });
  assert.equal(parseVs("").kind, "none");
});

test("passive scores, fixed DCs, contests and ties", () => {
  assert.equal(passiveScore(5), 15);
  assert.equal(passiveScore(5, "advantage"), 20);
  assert.equal(passiveScore(5, "disadvantage"), 10);
  assert.equal(fixedDC("20"), 20);
  assert.equal(fixedDC("8+level", { level: 4 }), 12);
  assert.equal(fixedDC("15+rank", {}), null);
  assert.deepEqual(contestOutcome(17, 17), { result: "tie", margin: 0 });
  assert.deepEqual(contestOutcome(18, 12), { result: "success", margin: 6 });
  assert.equal(contestOutcome(9, 12).result, "failure");
  assert.equal(checkOutcome(15, 15).result, "success", "meets or beats");
  assert.equal(checkOutcome(14, 15).result, "failure");
});

test("results: Grapple upgrades to Restrained by 10 with Mastery; ties and failures do nothing", () => {
  assert.deepEqual(skillActionEffects("grapple", { result: "success", margin: 3 }).statuses, ["grappled"]);
  assert.deepEqual(skillActionEffects("grapple", { result: "success", margin: 10, mastery: 0 }).statuses, ["grappled"], "needs Mastery");
  assert.deepEqual(skillActionEffects("grapple", { result: "success", margin: 10, mastery: 1 }).statuses, ["restrained"]);
  assert.deepEqual(skillActionEffects("trip", { result: "success" }).statuses, ["prone"]);
  assert.deepEqual(skillActionEffects("choke", { result: "success" }).statuses, ["suffocating"]);
  assert.deepEqual(skillActionEffects("trip", { result: "tie" }), { statuses: [], notes: ["Tie: nothing changes"] });
  assert.deepEqual(skillActionEffects("trip", { result: "failure" }).statuses, []);
  for ( const key of Object.keys(SKILL_RESULTS) ) assert.ok(skillActions[key], key);
  assert.equal(parseVs(skillActions.grapple.vs).kind, "contest");
});
