/** EXPIRE1: timed effects end in and out of combat. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { expiredEffects, durationExpired } from "../../module/rules/expiry.mjs";

const settings = { conditionDurations: true };
globalThis.game = { settings: { get: (s, k) => settings[k] } };
const fx = (id, type, remaining, extra = {}) => ({ id, name: id, type, duration: remaining === null ? { type: "none" } : { type: "seconds", remaining }, system: {}, flags: {}, ...extra });

test("Foundry duration check: only timed durations with nothing left", () => {
  assert.equal(durationExpired(fx("a", "generic", 0)), true);
  assert.equal(durationExpired(fx("a", "generic", 6)), false);
  assert.equal(durationExpired(fx("a", "generic", null)), false);
  assert.equal(durationExpired({ duration: { type: "seconds" } }), false, "no remaining value: unknown, not expired");
});

test("expired generic effects and Amps go; untimed, running and caster-tied ones stay", () => {
  const actor = { effects: [fx("Mark", "generic", 0), fx("Amp", "amp", -6), fx("Running", "generic", 12), fx("Forever", "generic", null),
    fx("CasterTied", "generic", 0, { flags: { n5e: { expires: { at: "turnStart" } } } })] };
  assert.deepEqual(expiredEffects(actor).map(e => e.name), ["Mark", "Amp"]);
});

test("conditions: kept for turn-end processing in combat; expire out of combat unless they Persist or the rule is off", () => {
  const actor = { effects: [fx("Bruised", "condition", 0, { system: { key: "bruised" } }), fx("Envenomed", "condition", 0, { system: { key: "envenomed" } })] };
  assert.deepEqual(expiredEffects(actor).map(e => e.name), [], "in combat, conditions use their turn-end processing");
  assert.deepEqual(expiredEffects(actor, { includeConditions: true }).map(e => e.name), ["Bruised"], "Envenomed persists");
  settings.conditionDurations = false;
  assert.deepEqual(expiredEffects(actor, { includeConditions: true }).map(e => e.name), []);
  settings.conditionDurations = true;
});

test("workflow: the active GM deletes expired effects and posts one card; other clients do nothing", async () => {
  const deleted = [], cards = [];
  const actor = { name: "Hero", uuid: "Actor.h", effects: [fx("Mark", "generic", 0), fx("Running", "generic", 5)],
    deleteEmbeddedDocuments: async (kind, ids) => deleted.push(...ids) };
  globalThis.CONFIG = { ChatMessage: { documentClass: { create: async d => { cards.push(d); return d; } } } };
  globalThis.game = { settings: { get: (s, k) => settings[k] }, users: Object.assign([{ id: "gm", isGM: true }], { activeGM: { isSelf: false } }),
    combats: [], actors: [actor], scenes: { contents: [] } };
  const { expireOutOfCombat, expireInCombat } = await import("../../module/workflow/expiry.mjs");
  assert.equal(await expireOutOfCombat(), null);
  assert.deepEqual(deleted, []);
  game.users.activeGM.isSelf = true;
  await expireOutOfCombat();
  assert.deepEqual(deleted, ["Mark"]);
  assert.match(cards[0].content, /Hero: Mark/);
  assert.deepEqual(cards[0].whisper, ["gm"]);
  // In a started combat this actor is handled by the turn engine, not by world time.
  deleted.length = 0;
  game.combats = [{ started: true, combatants: [{ actor }] }];
  await expireOutOfCombat();
  assert.deepEqual(deleted, []);
  await expireInCombat(game.combats[0]);
  assert.deepEqual(deleted, ["Mark"]);
});

test("out of combat, 'end of next turn' conditions from game effects end at once; deliberate ones stay", () => {
  const auto = fx("Dazed", "condition", null, { system: { key: "dazed" }, flags: { n5e: { applied: "auto" } } });
  const manual = fx("Staggered", "condition", null, { system: { key: "staggered" } });
  const timed = fx("Bruised", "condition", null, { system: { key: "bruised" }, flags: { n5e: { applied: "auto" } } });
  const actor = { effects: [auto, manual, timed] };
  assert.deepEqual(expiredEffects(actor, { includeConditions: true }).map(e => e.name), ["Dazed"]);
  assert.deepEqual(expiredEffects(actor).map(e => e.name), [], "in combat they wait for the end of the next turn");
});
