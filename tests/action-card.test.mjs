/** CARD1: the cardResult owner intent and how the GM records another user's result. */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validateIntent, INTENT_TYPES } from "../module/automation/owner-intents.mjs";
import { normalizeResults, encodeResults, cardTargetRows } from "../module/rules/action-card.mjs";

const saved = { game: globalThis.game, fromUuidSync: globalThis.fromUuidSync };
afterEach(() => { globalThis.game = saved.game; globalThis.fromUuidSync = saved.fromUuidSync; });

function world({ author = "u2", source = "card1", owner = true } = {}) {
  const updates = [];
  const card = { id: "card1", flags: { n5e: { card: { version: 1, kind: "jutsu", sections: ["saves", "damage"], targets: [{ uuid: "Actor.a", name: "Ana" }], results: {} } } },
    update(change) { updates.push(change); this.flags.n5e.card.results = change["flags.n5e.card.results"]; return this; } };
  const save = { id: "save1", author: { id: author }, flags: { n5e: { roll: { kind: "save", dc: 14, degree: 1, actorUuid: "Actor.a", name: "Ana", source } } } };
  const all = [card, save];
  globalThis.game = { user: { id: "gm", isGM: true }, settings: { get: () => true },
    messages: { get: id => all.find(m => m.id === id), contents: all } };
  globalThis.fromUuidSync = uuid => (uuid === "Actor.a" ? { uuid, isOwner: owner, testUserPermission: () => owner } : null);
  return { card, save, updates };
}

test("cardResult is a known intent and validates its ids", () => {
  assert.ok(INTENT_TYPES.includes("cardResult"));
  assert.deepEqual(validateIntent("cardResult", { cardMessageId: "card1", linkedMessageId: "save1" }),
    { cardMessageId: "card1", linkedMessageId: "save1", undoneTarget: null });
  assert.throws(() => validateIntent("cardResult", { cardMessageId: "bad id!", linkedMessageId: "save1" }), /Invalid card result/);
});

test("the GM records another user's save, checked against the linked message", async () => {
  const { receiveCardResult } = await import("../module/workflow/action-card.mjs");
  const { card, updates } = world();
  assert.equal(await receiveCardResult(null, { cardMessageId: "card1", linkedMessageId: "save1" }, { id: "u2", isGM: false }), true);
  assert.equal(updates.length, 1);
  // CARD2 fix: stored with "~" for "." (Foundry splits dotted keys); read back through normalizeResults.
  assert.ok(card.flags.n5e.card.results.saves["Actor~a"]);
  assert.equal(normalizeResults(card.flags.n5e.card.results).saves["Actor.a"]["0"].degree, 1);
});

test("the GM refuses results from another user, another card, or for creatures the user can't change", async () => {
  const { receiveCardResult } = await import("../module/workflow/action-card.mjs");
  world({ author: "u3" });
  await assert.rejects(receiveCardResult(null, { cardMessageId: "card1", linkedMessageId: "save1" }, { id: "u2" }), /Only the user who rolled/);
  world({ source: "other" });
  await assert.rejects(receiveCardResult(null, { cardMessageId: "card1", linkedMessageId: "save1" }, { id: "u2" }), /doesn't belong/);
  world({ owner: false });
  await assert.rejects(receiveCardResult(null, { cardMessageId: "card1", linkedMessageId: "save1" }, { id: "u2", isGM: false }), /Nothing to record/);
});

test("CARD1b: an effect summary links to its card and is recorded for that creature", async () => {
  const { receiveCardResult, cardOfLinked } = await import("../module/workflow/action-card.mjs");
  const { card } = world();
  card.uuid = "ChatMessage.card1";
  card.flags.n5e.card.sections.push("effects");
  const note = { id: "note1", author: { id: "u2" }, flags: { n5e: { cardEffects: { sourceUuid: "ChatMessage.card1",
    recipients: [{ actorUuid: "Actor.a", effects: [{ uuid: "Actor.a.ActiveEffect.e1", label: "Burned" }] }] } } } };
  globalThis.game.messages.contents.push(note);
  const get = globalThis.game.messages.get;
  globalThis.game.messages.get = id => (id === "note1" ? note : get(id));
  assert.equal(cardOfLinked(note)?.id, "card1");
  assert.equal(await receiveCardResult(null, { cardMessageId: "card1", linkedMessageId: "note1" }, { id: "u2", isGM: false }), true);
  assert.deepEqual(normalizeResults(card.flags.n5e.card.results).effects["Actor.a"][0].effects.map(e => e.label), ["Burned"]);
});

test("CARD2 fix: results Foundry split on the dots read back whole (no nameless ghost row)", () => {
  const save = { degree: 1, messageId: "s1", name: "Ana" };
  const split = { saves: { Scene: { x: { Token: { y: { Actor: { z: { 0: save } } } } } }, Actor: { a: { 0: { degree: 2, messageId: "s2" } } } },
    applied: { Actor: { a: { "": { mode: "half", messageId: "ap1" } } } }, effects: { Actor: { a: [{ messageId: "e1", effects: [] }] } } };
  const n = normalizeResults(split);
  assert.deepEqual(Object.keys(n.saves).sort(), ["Actor.a", "Scene.x.Token.y.Actor.z"]);
  assert.equal(n.applied["Actor.a"][""].mode, "half");
  assert.equal(n.effects["Actor.a"].length, 1);
  assert.deepEqual(Object.keys(encodeResults(n).saves).sort(), ["Actor~a", "Scene~x~Token~y~Actor~z"]);
  assert.deepEqual(normalizeResults(encodeResults(n)), n);
  const card = { sections: ["saves"], targets: [{ uuid: "Actor.a", name: "Ana" }, { uuid: "Scene.x.Token.y.Actor.z", name: "Bo" }] };
  const rows = cardTargetRows(card, split, { isGM: true, saveEffects: ["0"], saveLabels: { 0: "Dex" } });
  assert.deepEqual(rows.map(r => [r.name, r.save]), [["Ana", "Success"], ["Bo", "Failure"]]);
});
