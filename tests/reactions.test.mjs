import { test } from "node:test";
import assert from "node:assert/strict";
import { reactionDeadline, reactionPhase, decideReaction } from "../module/rules/reactions.mjs";
import { rules } from "../module/config/rules.mjs";
import { openReactionWindow, resolveReactionWindow, registerReactionWindows } from "../module/workflow/reactions.mjs";

test("reaction timeout defaults to 60 seconds, accepts custom seconds, and zero disables it", () => {
  assert.equal(rules.reactionTimeoutSeconds.default, 60);
  assert.equal(reactionDeadline(60, 1000), 61000);
  assert.equal(reactionDeadline(125.5, 1000), 126500);
  assert.equal(reactionDeadline(0, 1000), null);
  for ( const value of [-1, Infinity, NaN] ) assert.throws(() => reactionDeadline(value), /timeout/);
});

test("expiry hands an unanswered window to the GM, never accepting or declining automatically", () => {
  const window = { state: "pending", deadline: 61000, owners: ["player"] };
  assert.equal(reactionPhase(window, 61000), "gm");
  assert.throws(() => decideReaction(window, "accept", { userId: "player", now: 61000 }), /GM resolution/);
  assert.equal(decideReaction(window, "accept", { gm: true, now: 62000 }).state, "accepted");
  assert.equal(reactionPhase({ ...window, deadline: null }, 99999999), "pending");
});

test("only eligible owners decide, terminal decisions cannot be overwritten and inputs are immutable", () => {
  const window = { state: "pending", deadline: null, owners: ["player"] };
  assert.throws(() => decideReaction(window, "accept", { userId: "other" }), /eligible/);
  const result = decideReaction(window, "decline", { userId: "player" });
  assert.equal(result.state, "declined"); assert.equal(window.state, "pending");
  assert.throws(() => decideReaction(result, "accept", { gm: true }), /resolved/);
});

test("private windows preserve actor resources and require GM review of advisory player choices", async () => {
  const gm = { id: "gm", isGM: true, active: true }, player = { id: "p", name: "Player", isGM: false, active: true }, outsider = { id: "x", isGM: false, active: true };
  const users = [gm, player, outsider]; users.activeGM = { isSelf: true }; users.get = id => users.find(u => u.id === id);
  const messages = new Map(), handlers = new Map(); let receiver, approved = false, reviews = 0, mutations = 0;
  globalThis.game = { user: gm, users, messages, settings: { get: (scope, key) => key === "reactionWindows" ? true : key === "reactionTimeoutSeconds" ? 0 : undefined }, socket: { on: (channel, callback) => { receiver = callback; } } };
  const actor = { documentName: "Actor", uuid: "Actor.a", system: { resources: { discipline: { value: 2 } } },
    testUserPermission: user => user.id === player.id, items: new Map(), update: async () => { mutations++; } };
  const item = { id: "dodge", name: "Test reaction", actor }; actor.items.set(item.id, item);
  globalThis.fromUuid = async () => actor;
  globalThis.ui = { notifications: { warn() {}, info() {} } };
  globalThis.Hooks = { on: (name, callback) => handlers.set(name, callback), callAll() {} };
  globalThis.foundry = { applications: { api: { DialogV2: { confirm: async () => { reviews++; return approved; } } } } };
  globalThis.CONFIG = { ChatMessage: { documentClass: { create: async data => {
    const message = { ...data, id: "window", author: gm, getFlag: () => message.flags.n5e.reactionWindow,
      update: async update => { message.flags.n5e.reactionWindow = update["flags.n5e.reactionWindow"]; message.content = update.content; } };
    messages.set(message.id, message); return message;
  } } } };
  const message = await openReactionWindow(actor, item);
  assert.deepEqual(message.whisper.sort(), ["gm", "p"]);
  registerReactionWindows();
  let closed = 0;
  handlers.get("renderDialogV2")({ id: "n5e-reaction-prompt-window", close: async () => closed++ });
  assert.equal(closed, 0, "a live owner prompt remains open");
  await receiver({ reactionResponse: { messageId: message.id, decision: "accept", userId: "x" } });
  assert.equal(reviews, 0);
  await receiver({ reactionResponse: { messageId: message.id, decision: "accept", userId: "p" } });
  assert.equal(message.getFlag().state, "pending"); assert.equal(reviews, 1);
  approved = true;
  await receiver({ reactionResponse: { messageId: message.id, decision: "accept", userId: "p" } });
  assert.equal(message.getFlag().state, "accepted");
  handlers.get("updateChatMessage")(message);
  assert.equal(closed, 1, "resolved decisions close the owner's stale prompt without a second response");
  await assert.rejects(resolveReactionWindow(message, "decline"), /resolved/);
  assert.equal(actor.system.resources.discipline.value, 2); assert.equal(mutations, 0);
});
