/** FIN1: item transfer plans and the item audit (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { transferPlan, transferRefusal, canReceive } from "../../module/rules/transfer.mjs";
import { itemAudit, existingCopy, identityKey } from "../../module/rules/item-audit.mjs";

const kunai = (q, extra = {}) => ({ _id: "k1", name: "Kunai", type: "weapon", system: { identifier: "kunai", quantity: q, equipped: true, location: "stored", bulk: 1, ...extra },
  flags: { n5e: { backgroundOrigin: "bg1", keep: 1 } } });

test("only physical items move; the Unarmed Strike never does", () => {
  assert.equal(transferRefusal(kunai(3)), "");
  assert.match(transferRefusal({ type: "jutsu", name: "Fireball" }), /Only physical items/);
  assert.match(transferRefusal({ type: "weapon", name: "Unarmed Strike", system: { identifier: "unarmedStrike" } }), /Unarmed Strike/);
  assert.match(transferRefusal(null), /no longer exists/);
});

test("who can receive: player characters and Allied NPCs; the GM anything", () => {
  assert.ok(canReceive({ type: "character" }));
  assert.ok(canReceive({ type: "npc", allied: true }));
  assert.ok(!canReceive({ type: "npc", allied: false }));
  assert.ok(canReceive({ type: "npc", allied: false }, { isGM: true }));
});

test("a new item arrives unequipped, carried, without the giver's grant links", () => {
  const plan = transferPlan(kunai(5), [], 2);
  assert.deepEqual([plan.quantity, plan.remaining, plan.mergeInto], [2, 3, null]);
  assert.deepEqual([plan.data.system.quantity, plan.data.system.equipped, plan.data.system.location], [2, false, "carried"]);
  assert.deepEqual(plan.data.flags.n5e, { keep: 1 });
  assert.equal(transferPlan(kunai(5), []).remaining, 0, "default: the whole stack");
});

test("a matching stack on the target is merged; different data is not", () => {
  const same = { _id: "t1", name: "Kunai", type: "weapon", system: { identifier: "kunai", quantity: 4, equipped: false, location: "carried", bulk: 1 } };
  const plan = transferPlan(kunai(5), [same], 5);
  assert.deepEqual([plan.mergeInto, plan.mergedQuantity, plan.data], ["t1", 9, null]);
  const coated = { ...same, system: { ...same.system, bulk: 2 } };
  assert.equal(transferPlan(kunai(5), [coated], 1).mergeInto, null);
});

test("bad quantities are refused", () => {
  assert.throws(() => transferPlan(kunai(2), [], 3), /Only 2 Kunai/);
  assert.throws(() => transferPlan(kunai(2), [], 0), /how many/);
  assert.throws(() => transferPlan({ type: "feature", name: "X" }, []), /Only physical/);
});

test("the audit finds duplicates, keeps the copy with play state, and never flags stackable gear", () => {
  const items = [
    { _id: "a", name: "Body Flicker", type: "jutsu", system: { identifier: "body-flicker" }, _stats: { createdTime: 1 } },
    { _id: "b", name: "Body Flicker", type: "jutsu", system: { identifier: "body-flicker", uses: { spent: 1 } }, _stats: { createdTime: 2 } },
    { _id: "c", name: "Kunai", type: "weapon", system: { identifier: "kunai" } },
    { _id: "d", name: "Kunai", type: "weapon", system: { identifier: "kunai" } },
    { _id: "e", name: "Toughness", type: "feat", system: { identifier: "toughness" }, flags: { n5e: { repeatable: true } } },
    { _id: "f", name: "Toughness", type: "feat", system: { identifier: "toughness" }, flags: { n5e: { repeatable: true } } },
    { _id: "u", name: "Unarmed Strike", type: "weapon", system: { identifier: "unarmedStrike" } }
  ];
  const audit = itemAudit({ type: "character", items });
  assert.deepEqual(audit.duplicates, [{ key: "jutsu:body-flicker", name: "Body Flicker", keep: "b", remove: ["a"] }]);
  assert.equal(audit.missingUnarmed, false);
  assert.equal(itemAudit({ type: "npc", items: [] }).missingUnarmed, true);
  assert.equal(itemAudit({ type: "group", items: [] }).missingUnarmed, false);
});

test("grant guards: an item the actor already has is found; gear and repeatables are not", () => {
  const owned = [{ _id: "a", name: "Body Flicker", type: "jutsu", system: { identifier: "body-flicker" } }];
  assert.equal(existingCopy(owned, { name: "Body Flicker", type: "jutsu", system: { identifier: "body-flicker" } })._id, "a");
  assert.equal(existingCopy(owned, { name: "Kunai", type: "weapon", system: { identifier: "kunai" } }), null);
  assert.equal(identityKey({ type: "feat", name: "X", system: {}, flags: { n5e: { repeatable: true } } }), null);
});
