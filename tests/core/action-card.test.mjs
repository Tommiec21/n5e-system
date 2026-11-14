/** CARD1: single action card rules (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardSections, resultsFromLinked, addCardResult, mergedResults, cardTargetRows, sectionStates } from "../../module/rules/action-card.mjs";

const targets = [{ uuid: "A", name: "Ana", ac: 14 }, { uuid: "B", name: "Bo", ac: 18 }];
const attackFlags = { roll: { kind: "attack", total: 16, natural: 9, threshold: 20, targets } };

test("sections for each kind of action, in fixed order", () => {
  assert.deepEqual(cardSections({ kind: "attack" }), ["attack", "damage"]);
  assert.deepEqual(cardSections({ kind: "jutsu", activities: [{ type: "save" }, { type: "damage" }], area: true, concentration: true }),
    ["area", "saves", "damage", "effects", "concentration"]);
  assert.deepEqual(cardSections({ kind: "jutsu", activities: [{ type: "attack" }] }), ["attack", "damage"]);
  assert.deepEqual(cardSections({ kind: "feature", activities: [{ type: "heal" }] }), []);
});

test("linked messages become card results", () => {
  assert.equal(resultsFromLinked(attackFlags, "m1")[0].section, "attack");
  const save = resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 1, actorUuid: "A", name: "Ana", onSuccess: "half" } }, "m2")[0];
  assert.deepEqual([save.section, save.targetUuid, save.result.degree], ["saves", "A", 1]);
  assert.equal(resultsFromLinked({ damage: { total: 12, crit: false } }, "m3")[0].section, "damage");
  const applied = resultsFromLinked({ damageApplication: { mode: "full", recipients: [{ actorUuid: "A" }] }, undone: true }, "m4")[0];
  assert.deepEqual([applied.section, applied.targetUuid, applied.result.undone], ["applied", "A", true]);
  assert.deepEqual(resultsFromLinked({ roll: { kind: "check" } }, "m5"), []);
});

test("results are recorded once; an undone application can be replaced", () => {
  const card = { sections: ["attack", "saves", "damage"], targets, results: {} };
  let results = addCardResult(card, { section: "attack", result: { total: 16, messageId: "m1" } });
  assert.equal(addCardResult({ ...card, results }, { section: "attack", result: { messageId: "m1" } }).attack.total, 16, "same message again is a no-op");
  assert.throws(() => addCardResult({ ...card, results }, { section: "attack", result: { messageId: "m9" } }), /already rolled/);
  assert.throws(() => addCardResult(card, { section: "area", result: {} }), /Unknown card section/);
  assert.throws(() => addCardResult({ sections: ["damage"] }, { section: "attack", result: {} }), /no attack section/);
  results = addCardResult({ ...card, results }, { section: "applied", targetUuid: "A", result: { mode: "full", messageId: "s1", undone: false } });
  assert.throws(() => addCardResult({ ...card, results }, { section: "applied", targetUuid: "A", result: { mode: "half", messageId: "s2" } }), /already recorded/);
  results = addCardResult({ ...card, results }, { section: "applied", targetUuid: "A", result: { mode: "full", messageId: "s1", undone: true } });
  assert.equal(results.applied.A.undone, true);
  results = addCardResult({ ...card, results }, { section: "applied", targetUuid: "A", result: { mode: "half", messageId: "s2", undone: false } });
  assert.equal(results.applied.A.messageId, "s2");
  assert.deepEqual(card.results, {}, "input unchanged");
});

test("per-target rows: hit, miss, crit, save tiers and shares", () => {
  const card = { sections: ["attack", "saves", "damage"], targets, results: {} };
  let results = mergedResults(card, resultsFromLinked(attackFlags, "m1"));
  let rows = cardTargetRows(card, results, { isGM: true });
  assert.deepEqual(rows.map(r => [r.uuid, r.attack, r.share, r.ac]), [["A", "Hit", "full", 14], ["B", "Miss", "none", 18]]);
  const crit = mergedResults(card, resultsFromLinked({ roll: { ...attackFlags.roll, natural: 20, total: 5 } }, "m1"));
  assert.deepEqual(cardTargetRows(card, crit, { isGM: true }).map(r => r.attack), ["Critical hit", "Critical hit"]);
  results = mergedResults({ sections: ["saves", "damage"], targets, results: {} }, [
    ...resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 2, actorUuid: "A", onSuccess: "half" } }, "s1"),
    ...resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 3, fourTier: true, actorUuid: "B" } }, "s2")]);
  rows = cardTargetRows({ targets }, results, { isGM: true });
  assert.deepEqual(rows.map(r => [r.save, r.share]), [["Success", "half"], ["Critical Success", "none"]]);
});

test("hidden attack results stay hidden, and so does the suggested share", () => {
  const card = { sections: ["attack", "damage"], targets, results: {} };
  const results = mergedResults(card, resultsFromLinked(attackFlags, "m1"));
  const none = cardTargetRows(card, results, { visibility: "none", isGM: false });
  assert.deepEqual(none.map(r => [r.attack, r.ac, r.share]), [[null, null, null], [null, null, null]]);
  const hideAC = cardTargetRows(card, results, { visibility: "hideAC", isGM: false });
  assert.deepEqual(hideAC.map(r => [r.attack, r.ac]), [["Hit", null], ["Miss", null]]);
  const all = cardTargetRows(card, results, { visibility: "all", isGM: false });
  assert.deepEqual(all.map(r => r.ac), [14, 18]);
});

test("section states move from waiting to ready to done", () => {
  const card = { sections: ["attack", "saves", "damage"], targets, results: {} };
  assert.deepEqual(sectionStates(card), { attack: "ready", saves: "ready", damage: "waiting" });
  const results = { attack: { messageId: "m1" }, saves: { A: {}, B: {} }, damage: { messageId: "d1" } };
  assert.deepEqual(sectionStates(card, results), { attack: "done", saves: "done", damage: "done" });
  assert.equal(sectionStates({ sections: ["damage"], targets }).damage, "ready", "no attack section: damage is ready");
});

test("CARD1b: area targets merge without duplicates; the area section completes", async () => {
  const { mergeTargets } = await import("../../module/rules/action-card.mjs");
  const merged = mergeTargets(targets, [{ uuid: "B", name: "Bo again" }, { uuid: "C", name: "Cy" }]);
  assert.deepEqual(merged.map(t => [t.uuid, t.name]), [["A", "Ana"], ["B", "Bo"], ["C", "Cy"]]);
  assert.equal(mergeTargets([], Array.from({ length: 50 }, (_, i) => ({ uuid: `T${i}` }))).length, 40);
  assert.equal(sectionStates({ sections: ["area"], targets }).area, "ready");
  assert.equal(sectionStates({ sections: ["area"], targets, areaPlaced: true }).area, "done");
});

test("CARD1b: applied effects are listed per target, and undone ones drop out", () => {
  const card = { sections: ["saves", "effects"], targets, results: {} };
  const first = resultsFromLinked({ cardEffects: { recipients: [{ actorUuid: "A", effects: [{ uuid: "E1", label: "Burned" }] }] } }, "n1");
  const second = resultsFromLinked({ cardEffects: { recipients: [{ actorUuid: "A", effects: [{ uuid: "E2", label: "Prone" }] }] } }, "n2");
  let results = mergedResults(card, [...first, ...second]);
  assert.deepEqual(cardTargetRows(card, results, { isGM: true })[0].effects, ["Burned", "Prone"]);
  assert.equal(sectionStates(card, results).effects, "done");
  const undone = resultsFromLinked({ cardEffects: { recipients: [{ actorUuid: "A", effects: [{ uuid: "E1", label: "Burned" }] }] }, undone: true }, "n1");
  results = addCardResult({ ...card, results }, undone[0]);
  const row = cardTargetRows(card, results, { isGM: true })[0];
  assert.deepEqual([row.effects, row.effectMessages], [["Prone"], ["n2"]]);
});

test("CARD1b: save rows say who failed; hidden saves stay hidden", () => {
  const card = { sections: ["saves", "damage"], targets, results: {} };
  const results = mergedResults(card, [
    ...resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 1, actorUuid: "A", onSuccess: "half" } }, "s1"),
    ...resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 2, actorUuid: "B", onSuccess: "half" } }, "s2")]);
  const shown = cardTargetRows(card, results, { isGM: false });
  assert.deepEqual(shown.map(r => [r.save, r.saveFailed, r.share]), [["Failure", true, "full"], ["Success", false, "half"]]);
  const hidden = cardTargetRows(card, results, { isGM: false, canSeeSave: uuid => uuid !== "B" });
  assert.deepEqual(hidden.map(r => [r.save, r.share, r.saved]), [["Failure", "full", true], [null, null, true]]);
  assert.deepEqual(cardTargetRows(card, results, { isGM: true, canSeeSave: () => false }).map(r => r.save), ["Failure", "Success"], "the GM sees all");
});
