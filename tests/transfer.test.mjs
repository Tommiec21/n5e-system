/** FIN1: the GM's transfer handler (ownership, stale quantity, rollback) and the pack link check. */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validateIntent } from "../module/automation/owner-intents.mjs";
import { brokenLinks } from "../tools/check-grants.mjs";

const saved = { game: globalThis.game, fromUuid: globalThis.fromUuid, CONFIG: globalThis.CONFIG, Actor: globalThis.Actor };
afterEach(() => Object.assign(globalThis, saved));

class FakeActor {
  constructor(name, type, { owner = true, allied = false, failCreate = false } = {}) {
    Object.assign(this, { name, type, uuid: `Actor.${name}`, owner, failCreate, system: { allied } });
    this.items = new Map();
    this.items.map = fn => [...this.items.values()].map(fn);
  }
  testUserPermission(user) { return user.isGM || this.owner; }
  add(data) {
    const actor = this;
    const item = { ...structuredClone(data), id: data._id, parent: actor, toObject() { return structuredClone({ _id: this._id, name: this.name, type: this.type, system: this.system, flags: this.flags }); },
      async update(change) { if ( "system.quantity" in change ) this.system.quantity = change["system.quantity"]; },
      async delete() { actor.items.delete(this.id); } };
    this.items.set(item.id, item);
    return item;
  }
  async createEmbeddedDocuments(type, list) {
    if ( this.failCreate ) throw new Error("create failed");
    return list.map((d, i) => this.add({ ...d, _id: d._id ?? `new${i}` }));
  }
}

function world() {
  const messages = [];
  globalThis.Actor = FakeActor;
  globalThis.game = { user: { id: "gm", isGM: true } };
  globalThis.CONFIG = { ChatMessage: { documentClass: { create: async d => messages.push(d), getSpeaker: () => ({}) } } };
  return messages;
}
const kunai = q => ({ _id: "k1", name: "Kunai", type: "weapon", system: { identifier: "kunai", quantity: q, equipped: true, location: "carried" }, flags: {} });

test("the transferItem intent validates its data", () => {
  assert.deepEqual(validateIntent("transferItem", { itemId: "abc", targetUuid: "Actor.x", quantity: 2 }), { itemId: "abc", targetUuid: "Actor.x", quantity: 2 });
  assert.throws(() => validateIntent("transferItem", { itemId: "abc", targetUuid: "Actor.x", quantity: 0 }), /Invalid item transfer/);
});

test("the GM moves part of a stack for a player and announces it", async () => {
  const { receiveTransfer } = await import("../module/workflow/transfer.mjs");
  const messages = world();
  const giver = new FakeActor("Ana", "character"), taker = new FakeActor("Bo", "character", { owner: false });
  giver.add(kunai(5));
  globalThis.fromUuid = async () => taker;
  assert.equal(await receiveTransfer(giver, { itemId: "k1", targetUuid: taker.uuid, quantity: 2 }, { id: "u1", isGM: false }), true);
  assert.equal(giver.items.get("k1").system.quantity, 3);
  const got = [...taker.items.values()][0];
  assert.deepEqual([got.system.quantity, got.system.equipped], [2, false]);
  assert.equal(messages.length, 1);
});

test("refused: not the giver's owner, a hostile NPC target, a stale quantity", async () => {
  const { receiveTransfer } = await import("../module/workflow/transfer.mjs");
  world();
  const user = { id: "u1", isGM: false };
  const notMine = new FakeActor("Ana", "character", { owner: false }), bo = new FakeActor("Bo", "character");
  notMine.add(kunai(5));
  globalThis.fromUuid = async () => bo;
  await assert.rejects(receiveTransfer(notMine, { itemId: "k1", targetUuid: bo.uuid, quantity: 1 }, user), /creature you own/);
  const ana = new FakeActor("Ana", "character"), bandit = new FakeActor("Bandit", "npc");
  ana.add(kunai(5));
  globalThis.fromUuid = async () => bandit;
  await assert.rejects(receiveTransfer(ana, { itemId: "k1", targetUuid: bandit.uuid, quantity: 1 }, user), /can't be given items/);
  globalThis.fromUuid = async () => bo;
  await assert.rejects(receiveTransfer(ana, { itemId: "k1", targetUuid: bo.uuid, quantity: 9 }, user), /Only 5 Kunai/);
  assert.equal(ana.items.get("k1").system.quantity, 5);
});

test("if the receiver can't take it, the giver's item is restored", async () => {
  const { receiveTransfer } = await import("../module/workflow/transfer.mjs");
  world();
  const ana = new FakeActor("Ana", "character"), bo = new FakeActor("Bo", "character", { failCreate: true });
  ana.add(kunai(2));
  globalThis.fromUuid = async () => bo;
  await assert.rejects(receiveTransfer(ana, { itemId: "k1", targetUuid: bo.uuid, quantity: 2 }, { id: "u1", isGM: false }), /create failed/);
  assert.equal(ana.items.get("k1")?.system.quantity, 2);
});

test("every compendium link in the packs points at an existing item", () => {
  assert.deepEqual(brokenLinks(), []);
});
