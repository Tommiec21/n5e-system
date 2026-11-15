/** CARD1: single action card rules (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardSections, resultsFromLinked, addCardResult, mergedResults, cardTargetRows, sectionStates } from "../../module/rules/action-card.mjs";

const targets = [{ uuid: "A", name: "Ana", ac: 14 }, { uuid: "B", name: "Bo", ac: 18 }];
const attackFlags = { roll: { kind: "attack", total: 16, natural: 9, threshold: 20, targets } };

test("sections for each kind of action, in fixed order", () => {
  assert.deepEqual(cardSections({ kind: "attack" }), ["attack", "damage", "reactions"]);
  assert.deepEqual(cardSections({ kind: "jutsu", activities: [{ type: "save" }, { type: "damage" }], area: true, concentration: true }),
    ["area", "saves", "damage", "effects", "reactions", "concentration"]);
  assert.deepEqual(cardSections({ kind: "jutsu", activities: [{ type: "attack" }] }), ["attack", "damage", "reactions"]);
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
  assert.equal(results.applied.A[""].undone, true);
  results = addCardResult({ ...card, results }, { section: "applied", targetUuid: "A", result: { mode: "half", messageId: "s2", undone: false } });
  assert.equal(results.applied.A[""].messageId, "s2");
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
  const results = { attack: { messageId: "m1" }, saves: { A: { 0: { degree: 2 } }, B: { degree: 1 } }, damage: { messageId: "d1" } };
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

test("CARD1c: a Will of Fire reroll replaces the attack or save it rerolls", () => {
  const card = { sections: ["attack", "saves", "damage"], targets, results: {} };
  const first = resultsFromLinked(attackFlags, "m1");
  const reroll = resultsFromLinked({ roll: { ...attackFlags.roll, total: 10, natural: 4, rerollOf: "m1" } }, "m2");
  let results = mergedResults(card, [...first, ...reroll]);
  assert.equal(results.attack.messageId, "m2");
  assert.deepEqual(cardTargetRows(card, results, { isGM: true }).map(r => r.attack), ["Miss", "Miss"]);
  assert.throws(() => addCardResult({ ...card, results }, resultsFromLinked(attackFlags, "m3")[0]), /already rolled/, "a new roll is not a reroll");
  const save = resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 1, actorUuid: "A" } }, "s1");
  const again = resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 2, actorUuid: "A", rerollOf: "s1" } }, "s2");
  results = mergedResults(card, [...save, ...again]);
  assert.deepEqual([results.saves.A["0"].messageId, results.saves.A["0"].degree], ["s2", 2]);
});

test("CARD1c: rows show the damage reaction and the concentration check; sections follow", () => {
  const card = { sections: ["damage", "reactions", "concentration"], targets, results: {} };
  const applied = resultsFromLinked({ damageApplication: { mode: "full", recipients: [
    { actorUuid: "A", reaction: "Deflection", rolledReduction: 7, reactionMultiplier: 1, concentration: { dc: 15, jutsu: ["j1"], names: ["Mist"] } },
    { actorUuid: "B" }] } }, "a1");
  const results = mergedResults(card, applied);
  const rows = cardTargetRows(card, results, { isGM: true });
  assert.deepEqual(rows[0].applied.reaction, { label: "Deflection", reduction: 7, multiplier: 1 });
  assert.equal(rows[0].applied.concentration.dc, 15);
  assert.equal(rows[1].applied.reaction, null);
  assert.deepEqual(sectionStates(card, results), { damage: "ready", reactions: "done", concentration: "ready" });
  assert.equal(sectionStates({ ...card, concentrationEnded: true }, results).concentration, "done");
});

test("FIN3: one save per effect: two saves per creature, each its own conditions; done when all are in", async () => {
  const { savesOf, savesForDamage, allSaves } = await import("../../module/rules/action-card.mjs");
  const card = { sections: ["saves", "damage"], targets, results: {} };
  const con = resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 1, actorUuid: "A", effect: "0" } }, "s1");
  const dex = resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 2, actorUuid: "A", effect: "1", onSuccess: "half" } }, "s2");
  const bCon = resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 2, actorUuid: "B", effect: "0" } }, "s3");
  let results = mergedResults(card, [...con, ...dex, ...bCon]);
  assert.deepEqual(Object.keys(savesOf(results, "A")), ["0", "1"]);
  assert.throws(() => addCardResult({ ...card, results }, resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 1, actorUuid: "A", effect: "1" } }, "s9")[0]), /already recorded/);
  const opts = { isGM: true, saveEffects: ["0", "1"], saveLabels: { 0: "Con", 1: "Dex" } };
  const [a, b] = cardTargetRows(card, results, opts);
  assert.equal(a.save, "Con Failure, Dex Success");
  assert.deepEqual(a.failedEffects, ["0"]);
  assert.equal(a.saved, true);
  assert.equal(b.saved, false, "B still owes the Dex save");
  assert.deepEqual(b.savedEffects, ["0"]);
  assert.equal(sectionStates(card, results, { saveEffects: ["0", "1"] }).saves, "ready");
  // Q-F11: the Finisher's damage (effect 1) is halved by the Dex save only.
  results = mergedResults({ ...card, results }, resultsFromLinked({ damage: { total: 21, effect: "1" } }, "d1"));
  assert.equal(cardTargetRows(card, results, opts)[0].share, "half");
  assert.equal(savesForDamage(allSaves(results), "1", ["0", "1"]).length, 1);
  assert.equal(savesForDamage(allSaves(results), "7", ["0"]).every(sv => sv.effect === "0"), true, "a damage with no save of its own follows the action's save");
});

test("FIN3: a card written before FIN3 reads its single save as effect 0", async () => {
  const { savesOf } = await import("../../module/rules/action-card.mjs");
  const legacy = { saves: { A: { degree: 1, messageId: "s1" } } };
  assert.deepEqual(Object.keys(savesOf(legacy, "A")), ["0"]);
  const card = { sections: ["saves"], targets, results: legacy };
  assert.equal(cardTargetRows(card, legacy, { isGM: true })[0].saveFailed, true);
});

test("FIN3: an immune creature shows Immune and takes no share", () => {
  const card = { sections: ["saves", "damage"], targets, results: {} };
  const results = mergedResults(card, [...resultsFromLinked({ damage: { total: 9 } }, "d1")]);
  const rows = cardTargetRows(card, results, { isGM: true, immune: new Map([["A", ["Blind: immune to Sight"]]]) });
  assert.deepEqual(rows[0].immune, ["Blind: immune to Sight"]);
  assert.equal(rows[0].share, "none");
});

test("FIN3: reaction windows opened for the card show per creature", async () => {
  const { cardReactionWindows } = await import("../../module/rules/action-card.mjs");
  const now = 1_000_000;
  const map = cardReactionWindows([
    { actorUuid: "A", label: "Deflection", state: "pending", deadline: now + 25_000 },
    { actorUuid: "A", label: "Uncanny Dodge", state: "accepted", deadline: null },
    { actorUuid: "B", label: "Deflection", state: "pending", deadline: now - 1 },
    { actorUuid: "C", label: "Deflection", state: "declined", deadline: null, retired: true }], now);
  assert.deepEqual(map.get("A"), ["Deflection: pending (25 s left)", "Uncanny Dodge: taken"]);
  assert.deepEqual(map.get("B"), ["Deflection: waiting for the GM"]);
  assert.deepEqual(map.get("C"), ["Deflection: withdrawn"]);
});

test("FIN3b: one damage roll per effect; each row has each effect's share and application", async () => {
  const { damagesOf, appliedOf } = await import("../../module/rules/action-card.mjs");
  const card = { sections: ["saves", "damage"], targets, results: {} };
  const saves = [
    ...resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 1, actorUuid: "A", effect: "0", onSuccess: "none" } }, "s1"),
    ...resultsFromLinked({ roll: { kind: "save", dc: 14, degree: 2, actorUuid: "A", effect: "1", onSuccess: "half" } }, "s2")];
  const strike = resultsFromLinked({ damage: { total: 30, effect: "0" } }, "d0");
  const finisher = resultsFromLinked({ damage: { total: 21, effect: "1" } }, "d1");
  let results = mergedResults(card, [...saves, ...strike, ...finisher]);
  assert.deepEqual(Object.keys(damagesOf(results)), ["0", "1"]);
  assert.throws(() => addCardResult({ ...card, results }, resultsFromLinked({ damage: { total: 5, effect: "1" } }, "d9")[0]), /already rolled/);
  const opts = { isGM: true, saveEffects: ["0", "1"], damageEffects: ["0", "1"], damageLabels: { 0: "Strike", 1: "Finisher" } };
  let row = cardTargetRows(card, results, opts)[0];
  assert.deepEqual(row.damages.map(d => [d.label, d.share]), [["Strike", "full"], ["Finisher", "half"]]);
  // An application to the Finisher only.
  results = mergedResults({ ...card, results }, resultsFromLinked({ damageApplication: { mode: "half", effect: "1", recipients: [{ actorUuid: "A" }] } }, "a1"));
  row = cardTargetRows(card, results, opts)[0];
  assert.deepEqual(row.damages.map(d => !!d.applied), [false, true]);
  assert.deepEqual(Object.keys(appliedOf(results, "A")), ["1"]);
  assert.equal(sectionStates(card, results, { damageEffects: ["0", "1"] }).damage, "done");
  assert.equal(sectionStates(card, mergedResults(card, strike), { damageEffects: ["0", "1"] }).damage, "ready", "the Finisher isn't rolled yet");
});

test("FIN3b: a card from before reads its single damage roll and application", async () => {
  const { damagesOf, appliedOf } = await import("../../module/rules/action-card.mjs");
  const legacy = { damage: { total: 9, messageId: "d1" }, applied: { A: { mode: "full", messageId: "a1" } } };
  assert.deepEqual(Object.keys(damagesOf(legacy)), [""]);
  assert.equal(appliedOf(legacy, "A")[""].messageId, "a1");
  const row = cardTargetRows({ sections: ["damage"], targets, results: legacy }, legacy, { isGM: true })[0];
  assert.equal(row.damages[0].applied.mode, "full");
});
