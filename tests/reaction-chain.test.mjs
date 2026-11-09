import { test } from "node:test";
import assert from "node:assert/strict";
import { createReactionChain } from "../module/workflow/reaction-chain.mjs";

const actor = { uuid: "Actor.a" };
test("nested reactions apply newest first and return to each interrupted frame", async () => {
  const order = [];
  const resolve = createReactionChain({ authority: () => true, choose: async (actor, event, context) => ({
    interruptions: async () => context.n < 2 ? [{ actor, event, context: { n: context.n + 1 } }] : []
  }) });
  await resolve(actor, "beforeDamage", { n: 0 }, async ({ context }) => { order.push(context.n); });
  assert.deepEqual(order, [2, 1, 0]);
});

test("nested cycles stop at the bound before application instead of looping", async () => {
  let applied = 0;
  const resolve = createReactionChain({ maxDepth: 2, authority: () => true, choose: async () => ({
    interruptions: async () => [{ actor, event: "beforeDamage", context: {} }]
  }) });
  await assert.rejects(resolve(actor, "beforeDamage", {}, async () => { applied++; }), /limit reached/);
  assert.equal(applied, 0);
});

test("failed child reactions stop their parent; authority loss blocks continuation", async () => {
  const order = []; let authority = true;
  const resolve = createReactionChain({ authority: () => authority, choose: async (actor, event, context) => ({
    interruptions: async () => context.child ? [] : [{ actor, event, context: { child: true } }]
  }) });
  await assert.rejects(resolve(actor, "beforeDamage", {}, async ({ context }) => {
    order.push(context.child); authority = false;
  }), /lost GM authority/);
  assert.deepEqual(order, [true]);
});

test("declined root applies the original action once without opening a second prompt", async () => {
  let prompts = 0, applied = 0;
  const resolve = createReactionChain({ authority: () => true, choose: async () => { prompts++; return null; } });
  await resolve(actor, "beforeDamage", {}, async ({ selection }) => { assert.equal(selection, null); applied++; }, { selection: null });
  assert.equal(prompts, 0); assert.equal(applied, 1);
});
