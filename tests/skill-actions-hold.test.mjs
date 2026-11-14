/** FIN2a: the hold link, Escape's target and release (workflow). */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const saved = { game: globalThis.game, fromUuid: globalThis.fromUuid, ui: globalThis.ui };
afterEach(() => Object.assign(globalThis, saved));

function actor(name, { size = "medium", effects = [] } = {}) {
  const a = { name, uuid: `Actor.${name}`, system: { traits: { size } }, effects, isOwner: true, testUserPermission: () => true,
    statuses: new Set(effects.flatMap(e => [...e.statuses])),
    async toggleStatusEffect(status) { const e = effect(status); a.effects.push(e); a.statuses.add(status); },
    async deleteEmbeddedDocuments(type, ids) { a.effects = a.effects.filter(e => !ids.includes(e.id)); return ids; } };
  a.effects.find = Array.prototype.find.bind(a.effects);
  return a;
}
let n = 0;
const effect = (status, heldBy = null) => {
  const e = { id: `e${++n}`, statuses: new Set([status]), disabled: false, flags: { n5e: heldBy ? { heldBy } : {} },
    async setFlag(scope, key, value) { e.flags[scope][key] = value; } };
  return e;
};

test("Escape targets the holder; a restraining hold gives disadvantage; Pin needs a hold", async () => {
  const { prepareSkillAction } = await import("../module/workflow/skill-actions.mjs");
  const holder = actor("Holder");
  const held = actor("Held", { effects: [effect("grappled", holder.uuid), effect("restrained", holder.uuid)] });
  globalThis.fromUuid = async uuid => (uuid === holder.uuid ? holder : null);
  const escape = await prepareSkillAction(held, "escape", []);
  assert.deepEqual([escape.targets[0]?.name, escape.refuse, escape.disadvantage], ["Holder", null, ["Restrained by the hold"]]);
  assert.match((await prepareSkillAction(actor("Free"), "escape", [])).refuse, /aren't being held/);
  assert.equal((await prepareSkillAction(holder, "pin", [held])).refuse, null);
  assert.match((await prepareSkillAction(actor("Other"), "pin", [held])).refuse, /grappling/);
  assert.match((await prepareSkillAction(actor("Small", { size: "small" }), "trip", [actor("Big", { size: "large" })])).refuse, /two or more/);
});

test("applying Grappled records the holder; release ends only that holder's holds", async () => {
  const { onSkillApplyClick, onSkillReleaseClick, holdsOn } = await import("../module/workflow/skill-actions.mjs");
  globalThis.game = { user: { isGM: true } };
  globalThis.ui = { notifications: { warn() {} } };
  const held = actor("Held", { effects: [effect("prone")] });
  globalThis.fromUuid = async () => held;
  await onSkillApplyClick({ dataset: { target: held.uuid, n5eSkillApply: "grappled", holder: "Actor.Holder" } });
  assert.deepEqual(holdsOn(held).map(h => h.by), ["Actor.Holder"]);
  assert.equal(await onSkillReleaseClick({ dataset: { target: held.uuid, n5eSkillRelease: "Actor.Other" } }), 0);
  assert.equal(await onSkillReleaseClick({ dataset: { target: held.uuid, n5eSkillRelease: "Actor.Holder" } }), 1);
  assert.deepEqual(held.effects.map(e => [...e.statuses][0]), ["prone"]);
});
