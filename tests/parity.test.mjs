import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { canModify, ownedRecipients, skippedNotice, isAllied, alliedOwnerId } from "../module/automation/authority.mjs";
import { validateIntent, processIntent, registerIntentHandler, newIntents, INTENT_TYPES } from "../module/automation/owner-intents.mjs";
import { alliedTokenData, rowPositions } from "../module/workflow/allied.mjs";
import { cleanEffectData, tagDependent } from "../module/workflow/effect-application.mjs";

const player = { id: "p", isGM: false }, gm = { id: "gm", isGM: true }, other = { id: "o", isGM: false };
const doc = (uuid, owners = []) => ({ uuid, name: uuid, testUserPermission: (u, level) => level === "OWNER" && owners.includes(u.id) });

test("canModify: the GM changes anything; players only what they own", () => {
  const pc = doc("Actor.pc", ["p"]), npc = doc("Actor.npc");
  assert.equal(canModify(gm, npc), true);
  assert.equal(canModify(player, pc), true);
  assert.equal(canModify(player, npc), false);
  assert.equal(canModify(player, null), false);
});

test("ownedRecipients splits by ownership, drops duplicates, and names what the GM applies", () => {
  const pc = doc("Actor.pc", ["p"]), npc = doc("Actor.npc");
  const { owned, skipped } = ownedRecipients([pc, npc, pc, null], player);
  assert.deepEqual(owned.map(a => a.uuid), ["Actor.pc"]);
  assert.deepEqual(skipped.map(a => a.uuid), ["Actor.npc"]);
  assert.equal(skippedNotice(skipped), "The GM applies this to: Actor.npc.");
  assert.equal(skippedNotice([]), null);
});

test("Allied NPC markers", () => {
  assert.equal(isAllied({ type: "npc", system: { allied: true } }), true);
  assert.equal(isAllied({ type: "character", system: { allied: true } }), false);
  assert.equal(alliedOwnerId({ flags: { n5e: { allied: { ownerId: "p" } } } }), "p");
  assert.equal(alliedOwnerId({}), null);
});

test("intent validation keeps to known types and bounds", () => {
  assert.deepEqual(INTENT_TYPES.includes("summonAllied"), true);
  assert.throws(() => validateIntent("deleteActor", {}), /Unknown/);
  assert.throws(() => validateIntent("spendRations", { amount: -1 }), /positive/);
  assert.throws(() => validateIntent("summonAllied", { itemId: "abc", templateUuid: "Actor.t", count: 21 }), /between 1 and 20/);
  const clean = validateIntent("summonAllied", { itemId: "abc", templateUuid: "Actor.t", x: "100", y: null, initiative: "bogus" });
  assert.equal(clean.x, 100); assert.equal(clean.y, null); assert.equal(clean.initiative, "match"); assert.equal(clean.count, 1);
  assert.deepEqual(newIntents({ flags: { n5e: { intents: { a1: { type: "spendRations" }, "-=a0": null } } } }).map(([k]) => k), ["a1"]);
});

test("processIntent runs once for a verified owner, refuses others, and writes the result back", async () => {
  const users = [player, other, gm]; users.get = id => users.find(u => u.id === id);
  globalThis.game = { users };
  const writes = [];
  const actor = { ...doc("Actor.pc", ["p"]), update: async u => writes.push(u) };
  let ran = 0;
  registerIntentHandler("spendRations", async (a, data, user) => { ran++; return { by: user.id, amount: data.amount }; });
  const refused = await processIntent(actor, "r1", { type: "spendRations", data: { amount: 1 } }, "o");
  assert.equal(refused.ok, false); assert.equal(ran, 0);
  const done = await processIntent(actor, "r2", { type: "spendRations", data: { amount: 2 } }, "p");
  assert.deepEqual(done, { ok: true, result: { by: "p", amount: 2 } });
  assert.equal(await processIntent(actor, "r2", { type: "spendRations", data: { amount: 2 } }, "p"), null);
  assert.equal(ran, 1);
  assert.deepEqual(writes[1], { "flags.n5e.intents.-=r2": null, "flags.n5e.intentResults.r2": { ok: true, result: { by: "p", amount: 2 } } });
  const bad = await processIntent(actor, "r3", { type: "spendRations", data: { amount: 0 } }, "p");
  assert.equal(bad.ok, false);
});

test("Allied token data: unlinked, friendly, owned by the summoner, flagged for lifetime and ownership", () => {
  const base = { _id: "x", name: "Toad", delta: { system: { hp: 5 } }, flags: { core: {} } };
  const positions = rowPositions({ x: 100, y: 50, width: 2, size: 100, count: 3 });
  assert.deepEqual(positions, [{ x: 100, y: 50 }, { x: 300, y: 50 }, { x: 500, y: 50 }]);
  const data = alliedTokenData(base, { count: 3, positions, ownerId: "p", casterUuid: "Actor.pc", itemId: "j", itemUuid: "Actor.pc.Item.j", concentration: true, expires: 70 });
  assert.equal(data.length, 3);
  assert.equal(data[2].x, 500);
  for ( const t of data ) {
    assert.equal(t._id, undefined); assert.equal(t.actorLink, false); assert.equal(t.disposition, 1);
    assert.equal(t.delta.ownership.p, 3); assert.equal(t.delta.system.allied, true); assert.equal(t.delta.system.hp, 5);
    assert.deepEqual(t.flags.n5e.allied, { ownerId: "p", casterUuid: "Actor.pc", itemId: "j" });
    assert.equal(t.flags.n5e.summon.expires, 70); assert.equal(t.flags.n5e.summon.concentration, true);
  }
  assert.equal(base._id, "x", "the template source is not modified");
});

test("effect-application data is copied clean and tagged to the caster's concentration", () => {
  const data = cleanEffectData({ _id: "e", name: "Mark", disabled: true, changes: [] });
  assert.equal(data._id, undefined); assert.equal(data.disabled, false);
  assert.throws(() => cleanEffectData({}), /Invalid/);
  const tagged = tagDependent(data, { uuid: "Actor.pc" }, "j");
  assert.deepEqual(tagged.flags.n5e.dependentOn, { actorUuid: "Actor.pc", itemId: "j" });
  assert.equal(tagDependent({ name: "A" }, null, "j").flags, undefined);
});

test("parity: no module imports the removed relay, and no request path opens a GM review dialog", () => {
  const files = [];
  const walk = dir => { for ( const f of readdirSync(dir) ) { const p = join(dir, f); if ( statSync(p).isDirectory() ) walk(p); else if ( p.endsWith(".mjs") ) files.push(p); } };
  walk(new URL("../module", import.meta.url).pathname);
  files.push(new URL("../n5e.mjs", import.meta.url).pathname);
  for ( const file of files ) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /socket\.mjs|automation\/multiplayer\.mjs|submitWorkflow|shouldCoordinate|asGM\(/, file);
    assert.doesNotMatch(text, /Review player request|Review reaction choice|Confirm successful hit/, file);
    assert.doesNotMatch(text, /game\.socket/, file);
  }
  const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
  assert.equal(manifest.socket, undefined);
});
