/** PRESTD1 Part C: loot piles, merchants and the party stash (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { priceOf, canTake, purchase, saleValue } from "../../module/rules/loot.mjs";
import { canReceive } from "../../module/rules/transfer.mjs";

test("buy at the listed price, sell at half (King Q-P5), rounded down; rates per merchant", () => {
  assert.equal(priceOf(25, 3), 75);
  assert.equal(priceOf(25, 3, 1.5), 112);
  assert.equal(saleValue({ unitPrice: 25, quantity: 3 }), 37);
  assert.equal(saleValue({ unitPrice: 25, quantity: 1, sellRate: 0.75 }), 18);
  assert.deepEqual(purchase({ unitPrice: 50, quantity: 2, ryo: 120 }), { price: 100, buyerLeft: 20 });
  assert.match(purchase({ unitPrice: 50, quantity: 3, ryo: 120 }).error, /costs 150 ryo \(you have 120\)/);
});

test("take from piles and the stash, not from merchants; leave items on piles and in the stash", () => {
  assert.equal(canTake("pile"), true);
  assert.equal(canTake("stash"), true);
  assert.equal(canTake("merchant"), false);
  assert.equal(canReceive({ type: "loot", mode: "pile" }), true);
  assert.equal(canReceive({ type: "loot", mode: "merchant" }), false, "merchants buy instead");
  assert.equal(canReceive({ type: "npc", allied: false }), false);
});
