/** ADV2: advantage on any dice roll; only the dice a source names (King 2026-11-13). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { contextualAdvantage, keptIndex } from "../module/rules/elements.mjs";
import { validateConditionalRules } from "../module/rules/effect-authoring.mjs";

const actorWith = rules => ({ statuses: new Set(), effects: [], items: [{ name: "Burning Will", type: "feat", flags: { n5e: { rules } }, effects: [] }], system: {} });

test("keep the higher total with advantage, the lower with disadvantage", () => {
  assert.equal(keptIndex([4, 9], "advantage"), 1);
  assert.equal(keptIndex([4, 9], "disadvantage"), 0);
  assert.equal(keptIndex([9, 4], "advantage"), 0);
  assert.equal(keptIndex([4, 9], "normal"), 0);
});

test("named dice only: damage:fire applies to fire damage, not slashing; damage applies to every damage part", () => {
  const fire = actorWith([{ key: "advantage", selector: "damage:fire" }]);
  assert.deepEqual(contextualAdvantage(fire, { kind: "damage", type: "damage", damageType: "fire" }).advantage, ["Burning Will"]);
  assert.deepEqual(contextualAdvantage(fire, { kind: "damage", type: "damage", damageType: "slashing" }).advantage, []);
  const all = actorWith([{ key: "advantage", selector: "damage" }, { key: "disadvantage", selector: "healing", label: "Envenomed" }]);
  assert.deepEqual(contextualAdvantage(all, { kind: "damage", type: "damage", damageType: "slashing" }).advantage, ["Burning Will"]);
  assert.deepEqual(contextualAdvantage(all, { kind: "healing", type: "healing" }).disadvantage, ["Envenomed"]);
  assert.deepEqual(contextualAdvantage(all, { kind: "attack", type: "jutsuAttack" }).advantage, [], "damage advantage does not touch attack rolls");
  const attacks = actorWith([{ key: "advantage", selector: "attack", predicate: ["target:status:prone"] }]);
  assert.deepEqual(contextualAdvantage(attacks, { kind: "attack", type: "weaponAttack" }).advantage, [], "predicate not met");
});

test("the effect editor accepts advantage and disadvantage rules without a value", () => {
  assert.doesNotThrow(() => validateConditionalRules([{ key: "advantage", selector: "damage:fire" }, { key: "disadvantage", selector: "save" }]));
  assert.throws(() => validateConditionalRules([{ key: "advantage", selector: "bad selector!" }]));
});

test("rollDice rolls twice and keeps one when a source applies", async () => {
  let n = 0;
  globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = [3, 8][n++ % 2]; return this; } };
  globalThis.CONFIG = { Dice: { rolls: [] } };
  const { rollDice, advantageNote } = await import("../module/dice/advantaged.mjs");
  const actor = { ...actorWith([{ key: "advantage", selector: "damage" }]), getRollData: () => ({}) };
  const r = await rollDice(actor, "2d6", { kind: "damage", type: "damage", damageType: "fire" });
  assert.equal(r.mode, "advantage"); assert.equal(r.roll.total, 8); assert.equal(r.discarded.total, 3);
  assert.equal(advantageNote(r, "fire"), "fire: Advantage (Burning Will): kept 8, not 3");
  const plain = await rollDice({ ...actorWith([]), getRollData: () => ({}) }, "2d6", { kind: "damage", type: "damage" });
  assert.equal(plain.discarded, null);
});
