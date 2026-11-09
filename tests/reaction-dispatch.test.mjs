import { test } from "node:test";
import assert from "node:assert/strict";
import { createReactionDispatcher } from "../module/workflow/reaction-dispatch.mjs";
import { authoredReactionOffers, validateReactionRecipe } from "../module/rules/authored-reactions.mjs";
import { coordinateCommand } from "../module/automation/commands.mjs";

function fixture(decisions = ["accepted"]) {
  const item = { id: "a", name: "A" }, second = { id: "b", name: "B" };
  const actor = { uuid: "Actor.a", items: [item, second], _stats: { modifiedTime: 1 } };
  let authority = true, turn = "1", prepared = 0;
  const opened = [];
  const dispatcher = createReactionDispatcher({ authority: () => authority, stamp: () => turn,
    open: async (actor, item) => { opened.push(item.id); return item; }, wait: async () => decisions.shift() ?? "declined" });
  const adapter = { events: ["beforeDamage"], offer: () => ({ item, terms: { cost: 1 } }),
    prepare: async () => { prepared++; return { flatReduction: 4 }; } };
  return { dispatcher, actor, adapter, item, second, opened, prepared: () => prepared,
    loseAuthority: () => { authority = false; }, nextTurn: () => { turn = "2"; } };
}

test("registry validates contracts, snapshots events and releases registrations safely", () => {
  const f = fixture();
  assert.throws(() => f.dispatcher.register("Bad ID", f.adapter), /Invalid/);
  const remove = f.dispatcher.register("test", f.adapter);
  assert.throws(() => f.dispatcher.register("test", f.adapter), /duplicate/);
  f.adapter.events.push("other");
  assert.deepEqual(f.dispatcher.list()[0].events, ["beforeDamage"]);
  remove(); assert.deepEqual(f.dispatcher.list(), []);
});

test("dispatcher orders adapters, supports multiple owned offers and stops at one acceptance", async () => {
  const f = fixture(["declined", "accepted"]);
  f.dispatcher.register("second", { ...f.adapter, priority: 0 });
  f.dispatcher.register("first", { ...f.adapter, priority: 10, offer: () => [{ item: f.second }, { item: f.item }] });
  const choice = await f.dispatcher.choose(f.actor, "beforeDamage");
  assert.deepEqual(f.opened, ["b", "a"]); assert.equal(choice.id, "first");
  assert.equal(f.prepared(), 0);
  assert.equal((await choice.prepare()).flatReduction, 4);
  await assert.rejects(choice.prepare(), /cannot be repeated/);
  assert.equal(f.prepared(), 1);
});

test("unsupported events and declined reactions never prepare or spend", async () => {
  const f = fixture(["declined"]); f.dispatcher.register("test", f.adapter);
  assert.equal(await f.dispatcher.choose(f.actor, "beforeSave"), null);
  assert.equal(await f.dispatcher.choose(f.actor, "beforeDamage"), null);
  assert.equal(f.prepared(), 0);
});

test("reaction preparation rejects changed terms, deleted ownership, turns and adapter removal", async () => {
  for ( const change of [f => { f.adapter.offer = null; f.item._stats = { modifiedTime: 2 }; },
    f => { f.actor.items = []; }, f => f.nextTurn(), f => f.remove()] ) {
    const f = fixture(); f.remove = f.dispatcher.register("test", f.adapter);
    const choice = await f.dispatcher.choose(f.actor, "beforeDamage"); change(f);
    await assert.rejects(choice.prepare(), /changed|belong/); assert.equal(f.prepared(), 0);
  }
  const f = fixture(); let cost = 1;
  f.dispatcher.register("test", { ...f.adapter, offer: () => ({ item: f.item, terms: { cost } }) });
  const choice = await f.dispatcher.choose(f.actor, "beforeDamage"); cost++;
  await assert.rejects(choice.prepare(), /terms changed/);
});

test("authority loss and mutation during asynchronous preparation fail closed", async () => {
  const f = fixture(); f.dispatcher.register("test", f.adapter); f.loseAuthority();
  await assert.rejects(f.dispatcher.choose(f.actor, "beforeDamage"), /active GM/);
  const g = fixture(); g.dispatcher.register("test", { ...g.adapter, prepare: async actor => { actor._stats.modifiedTime++; return {}; } });
  const choice = await g.dispatcher.choose(g.actor, "beforeDamage");
  await assert.rejects(choice.prepare(), /Actor or turn changed/);
});

const recipe = () => ({ version: 1, enabled: true, reduction: "1d12 + @abilities.dex.mod", multiplier: 1,
  requireSight: false, spendReaction: true, pool: "discipline", cost: 1 });
test("authored recipes validate costs and reject property-path injection", () => {
  assert.equal(validateReactionRecipe(recipe()).cost, 1);
  for ( const patch of [{ pool: "__proto__.x" }, { cost: -1 }, { cost: 0.5 }, { multiplier: 0.25 }, { pool: "" }, { version: 2 }] ) {
    assert.throws(() => validateReactionRecipe({ ...recipe(), ...patch }), /Invalid/);
  }
});

test("authored reactions enforce combat, resources, allowance and automated sight", () => {
  const item = { id: "a", name: "Custom defense", flags: { n5e: { reaction: recipe() } } };
  const actor = { items: [item], system: { resources: { discipline: { value: 1 } } }, statuses: new Set() };
  const context = { combat: true, instances: [{ amount: 10 }], visibility: () => ({ visible: null }) };
  assert.equal(authoredReactionOffers(actor, context).length, 1);
  actor.flags = { n5e: { economy: { reaction: true } } }; assert.equal(authoredReactionOffers(actor, context).length, 0);
  actor.flags = {}; actor.system.resources.discipline.value = 0; assert.equal(authoredReactionOffers(actor, context).length, 0);
  actor.system.resources.discipline.value = 1; item.flags.n5e.reaction.requireSight = true;
  assert.throws(() => authoredReactionOffers(actor, context), /unresolved/);
  assert.equal(authoredReactionOffers(actor, { ...context, visibility: () => ({ visible: false }) }).length, 0);
  assert.equal(authoredReactionOffers(actor, { ...context, visibility: () => ({ visible: true }) }).length, 1);
  assert.equal(authoredReactionOffers(actor, { ...context, combat: false }).length, 0);
});

test("shared command boundary requires active GM and stores duplicate-safe completion", async () => {
  let ledger = { version: 1, epoch: 1, entries: [] }, writes = 0;
  globalThis.game = { users: { activeGM: { isSelf: false } }, settings: {
    get: () => ledger, set: async (scope, key, value) => { ledger = value; }
  } };
  const command = { id: "example-action", type: "customAction", payload: { actorUuid: "Actor.a", amount: 1 } };
  const handlers = { approve: async () => true, apply: async () => { writes++; } };
  await assert.rejects(coordinateCommand(command, handlers), /active GM/);
  game.users.activeGM.isSelf = true;
  assert.equal((await coordinateCommand(command, handlers)).state, "committed");
  assert.equal((await coordinateCommand(command, handlers)).replay, true); assert.equal(writes, 1);
  await assert.rejects(coordinateCommand({ ...command, payload: { amount: 2 } }, handlers), /different content/);
});
