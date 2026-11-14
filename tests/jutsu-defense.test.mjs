/** FIN2b: Suppress Chakra, chakra spending, Counter Tags and the tag items (workflow). */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const saved = { game: globalThis.game, CONFIG: globalThis.CONFIG, fromUuidSync: globalThis.fromUuidSync, fromUuid: globalThis.fromUuid, ui: globalThis.ui };
afterEach(() => Object.assign(globalThis, saved));

let n = 0;
function actor(name, effects = []) {
  const a = { name, uuid: `Actor.${name}`, isOwner: true, effects: [...effects], system: { cp: { value: 10 }, resources: {} }, testUserPermission: () => true,
    async createEmbeddedDocuments(type, data) { const made = data.map(d => ({ ...d, id: `e${++n}`, async delete() { a.effects = a.effects.filter(e => e !== this); } })); a.effects.push(...made); return made; },
    async deleteEmbeddedDocuments(type, ids) { a.effects = a.effects.filter(e => !ids.includes(e.id)); return ids; } };
  return a;
}
function world(posted = []) {
  globalThis.CONFIG = { ...saved.CONFIG, ChatMessage: { documentClass: { create: async d => { posted.push(d); return d; }, getSpeaker: () => ({}) } }, N5E: saved.CONFIG?.N5E ?? {} };
  globalThis.game = { user: { isGM: true, id: "gm" }, users: [{ id: "gm", isGM: true }], time: { worldTime: 0 }, combat: null, messages: { contents: posted.map((d, i) => ({ id: `m${i}`, ...d })) } };
  globalThis.ui = { notifications: { warn() {}, info() {} } };
  return posted;
}

test("Suppress Chakra: score effect for 10 minutes; a reattempt in a row is at -2; spending chakra ends it", async () => {
  const { applySuppression, endSuppression } = await import("../module/workflow/jutsu-defense.mjs");
  const { spendsChakra } = await import("../module/workflow/cast.mjs");
  const posted = world();
  const a = actor("Sensor");
  await applySuppression(a, 17);
  assert.deepEqual(a.effects.map(e => [e.flags.n5e.state, e.flags.n5e.suppression.score, e.duration.seconds]), [["chakraSuppressed", 17, 600]]);
  await applySuppression(a, 17);
  await applySuppression(a, 20);
  assert.deepEqual(a.effects.map(e => [e.flags.n5e.suppression.score, e.flags.n5e.suppression.reattempts]), [[16, 2]]);
  assert.equal(await endSuppression(a), 1);
  assert.equal(a.effects.length, 0);
  await applySuppression(a, 12);
  assert.equal(a.effects[0].flags.n5e.suppression.reattempts, 0, "not in a row after it ended");
  assert.ok(posted.every(p => p.whisper?.length), "scores are whispered");
  a.system.resources = { sage: { value: 3, countsAsChakraSpend: true }, dice: { value: 3 } };
  assert.equal(spendsChakra(a, { "system.cp.value": 8 }), true);
  assert.equal(spendsChakra(a, { "system.cp.value": 10, "system.resources.dice.value": 2 }), false);
  assert.equal(spendsChakra(a, { "system.resources.sage.value": 2 }), true);
});

test("Counter Tag: offered on a single-target cast of its rank or lower; using it burns the tag and marks the card", async () => {
  const { counterTagFor, onCounterTagClick, counteredOn } = await import("../module/workflow/jutsu-defense.mjs");
  const posted = world();
  const tagEffect = { id: "t1", disabled: false, flags: { n5e: { state: "counterTag:C" } } };
  const target = actor("Target", [tagEffect]);
  tagEffect.delete = async () => { target.effects = target.effects.filter(e => e !== tagEffect); };
  const caster = actor("Caster");
  const item = { name: "Fireball", uuid: "Item.j", system: { rank: "C", discipline: "nin" } };
  globalThis.fromUuidSync = uuid => ({ [caster.uuid]: caster, [item.uuid]: item })[uuid] ?? null;
  globalThis.fromUuid = async uuid => (uuid === target.uuid ? target : null);
  const card = (extra = {}) => ({ id: "card1", flags: { n5e: { card: { kind: "jutsu", actorUuid: caster.uuid, itemUuid: item.uuid, rank: "C", discipline: "nin", sections: ["saves"], targets: [], ...extra } } } });
  assert.equal(counterTagFor(card(), target, 1)?.rank, "C");
  assert.equal(counterTagFor(card(), target, 2), null, "several targets");
  assert.equal(counterTagFor(card({ sections: ["area", "saves"] }), target, 1), null, "an area");
  assert.equal(counterTagFor(card({ rank: "B" }), target, 1), null, "above the tag's rank");
  await onCounterTagClick(card(), { dataset: { target: target.uuid, count: "1" } });
  assert.equal(target.effects.length, 0);
  world(posted);
  assert.deepEqual([...counteredOn({ id: "card1" })], [target.uuid]);
});

test("the pack has the seven tags, with the states and DCs the rules read", () => {
  const dir = path.join(import.meta.dirname, "..", "packs", "_source", "equipment");
  const tags = fs.readdirSync(dir).filter(f => /tag/.test(f) && !f.startsWith("_")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  assert.equal(tags.length, 7);
  const states = tags.flatMap(t => t.system.activities.filter(a => a.type === "effect").map(a => a.effect.state)).sort();
  assert.deepEqual(states, ["counterTag:A", "counterTag:B", "counterTag:C", "counterTag:D", "suppressionTag:A", "suppressionTag:B", "suppressionTag:C"]);
  const dcs = tags.flatMap(t => t.system.activities.filter(a => a.type === "save").map(a => [t.system.rank, a.save.dc.source, a.save.dc.formula])).sort();
  assert.deepEqual(dcs, [["A", "fixed", "19"], ["B", "fixed", "17"], ["C", "fixed", "15"]]);
});
