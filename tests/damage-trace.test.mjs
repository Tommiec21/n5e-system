import { test } from "node:test";
import assert from "node:assert/strict";
import { damageRollTrace, damageFromMessage, damageApplicationTrace } from "../module/rules/damage-trace.mjs";
import { damageRollHTML, renderDamageRolls } from "../module/view-models/damage-trace.mjs";
import { damagePlan } from "../module/rules/damage.mjs";
import { resolveDamageReaction, applyToSelected } from "../module/workflow/apply-damage.mjs";

const roll = () => ({ formula: "2d6 + 4", total: 16, dice: [{ formula: "2d6", results: [{ result: 6, active: true }, { result: 6, active: true }, { result: 1, discarded: true }] }] });
function source() {
  const data = { instances: [{ amount: 16, type: "fire" }], total: 16, crit: true,
    rollTrace: { parts: [{ normalFormula: "1d6 + 2", abilityMod: 2 }] } };
  return { uuid: "ChatMessage.damage", rolls: [roll()], whisper: ["gm"], blind: true, content: "Damage", flavor: "", data,
    getFlag: (scope, key) => key === "damage" ? data : undefined };
}

test("damage trace retains actual formula, kept/discarded dice, critical basis and source UUID", () => {
  const message = source(), data = damageFromMessage(message), trace = data.rollTrace;
  assert.equal(trace.sourceUuid, message.uuid); assert.equal(trace.total, 16); assert.equal(trace.verifiedRolls, true);
  assert.equal(trace.parts[0].normalFormula, "1d6 + 2"); assert.equal(trace.parts[0].formula, "2d6 + 4");
  assert.equal(trace.parts[0].dice[0].results[2].kept, false);
  const html = damageRollHTML(trace);
  assert.match(html, /2d6 \+ 4/); assert.match(html, /discarded/); assert.doesNotMatch(html, /Critical damage|Normal formula|fire|Rolled total|Dice:/);
  assert.deepEqual(data.sourceVisibility, { whisper: ["gm"], blind: true });
});

test("application refuses totals that differ from saved rolls or typed-part sums", () => {
  const message = source(); message.data.instances[0].amount = 99;
  assert.throws(() => damageFromMessage(message), /do not match/);
  message.data.instances[0].amount = 16; message.data.total = 99;
  assert.throws(() => damageFromMessage(message), /total does not match/);
  message.data.total = 16; message.rolls.push(roll());
  assert.throws(() => damageFromMessage(message), /do not match/);
});

test("legacy/manual entries do not invent dice or present metadata as a verified roll", () => {
  const message = source(); message.rolls = [];
  const trace = damageFromMessage(message).rollTrace;
  assert.equal(trace.verifiedRolls, false); assert.deepEqual(trace.parts[0].dice, []); assert.equal(trace.parts[0].formula, "");
  assert.doesNotMatch(damageRollHTML(trace), /No saved dice|2d6|fire/);
  assert.deepEqual(damageRollTrace([], [{ type: "fire", amount: 3 }]).parts[0].dice, []);
});

test("application record explains DR, half damage and separate temporary/actual pool losses", () => {
  globalThis.game = { settings: { get: () => false } };
  const actor = { uuid: "Actor.target", name: "Target", system: { hp: { value: 100, temp: 4, max: 100 }, cp: { value: 20, temp: 0 }, dr: 3, traits: {} } };
  const data = damageFromMessage(source()), plan = damagePlan(actor, data.instances, { multiplier: 0.5 });
  const before = { hp: 100, cp: 20, tempHp: 4, tempCp: 0 };
  actor.system.hp.value = plan.update["system.hp.value"]; actor.system.hp.temp = plan.update["system.hp.temp"];
  const trace = damageApplicationTrace(actor, data, "half", plan, before);
  assert.equal(trace.rolled, 16); assert.equal(trace.finalDamage, 6); assert.equal(trace.pools[0].after, 98);
  assert.equal(trace.pools[0].temporaryAfter, 0); assert.equal(trace.sourceUuid, "ChatMessage.damage");
  assert.equal(trace.hpDamage, 6);
});

test("damage application uses the saved roll without evaluating again and persists private provenance", async () => {
  const actor = { uuid: "Actor.target", name: "Target", isOwner: true, type: "npc", effects: [],
    system: { hp: { value: 100, temp: 4, max: 100 }, cp: { value: 20, temp: 0 }, dr: 3, traits: {}, deathSaves: {} } };
  let updates = 0;
  actor.update = async update => { updates++; for ( const [key, value] of Object.entries(update) ) { const parts = key.split("."); let target = actor; for ( const p of parts.slice(0, -1) ) target = target[p] ??= {}; target[parts.at(-1)] = value; } };
  globalThis.game = { users: { activeGM: { isSelf: true } }, settings: { get: () => false } };
  globalThis.fromUuid = async () => actor;
  globalThis.Roll = class { constructor() { throw new Error("Unexpected reroll"); } };
  globalThis.CONFIG = { ChatMessage: { documentClass: { create: async data => data, getSpeaker: () => ({}) } } };
  globalThis.ui = { notifications: { warn() {}, info() {} } };
  const message = source();
  const applied = await resolveDamageReaction(message, message.data, "half", actor, applyToSelected);
  assert.equal(updates, 1); assert.equal(actor.system.hp.value, 98);
  assert.equal(applied.flags.n5e.damageApplication.sourceUuid, message.uuid);
  assert.equal(applied.flags.n5e.damageApplication.recipients[0].finalDamage, 6);
  assert.match(applied.content, /data-n5e-source="ChatMessage.damage"/);
  assert.doesNotMatch(applied.content, /2d6|Applied calculation|damage input|Coordinated application|GM reconciliation|Undo is disabled/);
  assert.deepEqual(applied.whisper, ["gm"]); assert.equal(applied.blind, true);
});

test("native damage rendering uses only the actual saved roll without prose or rerolling", async () => {
  let renders = 0;
  const saved = { _evaluated: true, render: async options => { renders++; assert.equal(options.flavor, ""); return '<div class="dice-roll">native roll</div>'; } };
  const html = await renderDamageRolls([saved], damageFromMessage(source()).rollTrace);
  assert.equal(renders, 1); assert.equal(html, '<div class="dice-roll">native roll</div>');
});
