/** CARD1: the cardResult owner intent and how the GM records another user's result. */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validateIntent, INTENT_TYPES } from "../module/automation/owner-intents.mjs";

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
  assert.equal(card.flags.n5e.card.results.saves["Actor.a"].degree, 1);
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
