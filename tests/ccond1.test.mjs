/** CCOND1: class and clan condition cards (docs/CCOND1_SPEC.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, taiSpec, baseAbilities } from "./helpers/actor.mjs";
import { cardDefinition, cardKey, ownsCondition, conditionCardsFor, visibleRegistry, cardResave, appliedBy, isCard } from "../module/rules/condition-cards.mjs";
import { aggregatePenalties } from "../module/rules/conditions.mjs";
import { validateIntent } from "../module/automation/owner-intents.mjs";
import { validateConditionalRules } from "../module/rules/effect-authoring.mjs";

const DIR = path.join(import.meta.dirname, "..", "packs/_source/conditions");
const cards = fs.readdirSync(DIR).filter(f => !f.startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
const card = id => cards.find(c => c.system.identifier === id);
const registry = Object.fromEntries(cards.map(c => [cardKey(c), cardDefinition({ ...c, uuid: `Compendium.n5e.conditions.Item.${c._id}` })]));

test("every card in the pack becomes a registry entry with its owner, tags and rules", () => {
  assert.deepEqual(Object.keys(registry).sort(), ["balance-broken", "bone-broken", "flow-broken", "shattered"]);
  const bone = registry["bone-broken"];
  assert.ok(isCard(bone));
  assert.deepEqual(bone.owner, { kind: "class", id: "taijutsu-specialist", subclass: "" });
  assert.deepEqual(bone.tags, ["physical"], "King Q-CC1: it counts as Physical");
  assert.equal(bone.endsAt, "nextTurnEnd");
  assert.equal(bone.maxRanks, null, "no ranks: applying again replaces it (King Q-CC3)");
  assert.equal(registry.shattered.owner.subclass, "talented-genius");
  assert.deepEqual(registry.shattered.removal, [{ action: "action", check: ["str"], dc: 20, ranks: "all" }]);
  for ( const def of Object.values(registry) ) validateConditionalRules(def.rules ?? []);
});

test("the core penalty engine runs a card: Bone Broken sets DR to 0, Shattered adds damage taken", () => {
  const pen = aggregatePenalties([{ key: "bone-broken", ranks: 1 }, { key: "shattered", ranks: 1 }], registry);
  assert.equal(pen.flags.drZero, true);
  assert.equal(pen.flags.noDash, true);
  assert.equal(pen.damageTaken, 2);
  CONFIG.N5E.clanConditions["bone-broken"] = registry["bone-broken"];
  try {
    const a = makeActor({ system: { ...baseAbilities, traits: { dr: 3 } }, items: [taiSpec(5)], conditions: [{ key: "bone-broken", ranks: 1 }] });
    assert.equal(a.system.dr, 0);
    const b = makeActor({ system: { ...baseAbilities, traits: { dr: 3 } }, items: [taiSpec(5)] });
    assert.equal(b.system.dr, 3, "without it the DR is kept");
  } finally { delete CONFIG.N5E.clanConditions["bone-broken"]; }
});

test("owner check: the class (and subclass) or clan; a mismatch only warns (King Q-CC2)", () => {
  const tai = { items: [{ type: "class", system: { identifier: "taijutsu-specialist" } }] };
  const genius = { items: [...tai.items, { type: "subclass", system: { identifier: "talented-genius" } }] };
  assert.ok(ownsCondition(tai, registry["bone-broken"]));
  assert.ok(!ownsCondition(tai, registry.shattered), "Shattered needs the Talented Genius subclass");
  assert.ok(ownsCondition(genius, registry.shattered));
  assert.ok(!ownsCondition({ items: [] }, registry["bone-broken"]));
  assert.ok(ownsCondition({ items: [] }, { label: "Burned" }), "core conditions have no owner");
  const clanDef = { owner: { kind: "clan", id: "uchiha", subclass: "" } };
  assert.ok(ownsCondition({ items: [{ type: "clan", system: { identifier: "uchiha" } }] }, clanDef));
  assert.deepEqual(conditionCardsFor(genius, { ...registry, burned: { label: "Burned" } }).map(c => c.key), ["balance-broken", "bone-broken", "flow-broken", "shattered"]);
  assert.deepEqual(conditionCardsFor(tai, registry).map(c => c.key), ["balance-broken", "bone-broken", "flow-broken"]);
});

test("King Q-CC7: players can be shown only a card's name on creatures they don't own", () => {
  const reg = { ...registry, burned: { label: "Burned", summary: "Fire" } };
  assert.equal(visibleRegistry(reg, { details: "full", owner: false }), reg);
  assert.equal(visibleRegistry(reg, { details: "name", owner: true }), reg);
  const hidden = visibleRegistry(reg, { details: "name", owner: false });
  assert.equal(hidden["bone-broken"].summary, "");
  assert.equal(hidden["bone-broken"].hidden, true);
  assert.equal(hidden.burned.summary, "Fire", "core conditions are unchanged");
});

test("a card's end-of-turn save uses a fixed DC or the applier's discipline DC", () => {
  assert.equal(cardResave(registry["bone-broken"], null), null);
  const def = { label: "X", resave: { ability: "con", source: "tai", dc: null } };
  assert.deepEqual(cardResave(def, { system: { disciplines: { tai: { dc: 15 } } } }), { ability: "con", dc: 15, label: "X" });
  assert.deepEqual(cardResave({ ...def, resave: { ability: "con", source: "", dc: 12 } }, null), { ability: "con", dc: 12, label: "X" });
});

test("King Q-CC5: the conditions an applier put on a creature are found by its uuid", () => {
  const actor = { effects: [
    { type: "condition", system: { key: "bone-broken" }, flags: { n5e: { appliedBy: "Actor.a" } } },
    { type: "condition", system: { key: "burned" }, flags: {} },
    { type: "condition", system: { key: "shattered" }, flags: { n5e: { appliedBy: "Actor.b" } } }] };
  assert.deepEqual(appliedBy(actor, "Actor.a").map(x => x.key), ["bone-broken"]);
});

test("the GM-side apply request is validated", () => {
  assert.deepEqual(validateIntent("applyCondition", { key: "bone-broken", targetUuid: "Scene.x.Token.y.Actor.z" }), { key: "bone-broken", targetUuid: "Scene.x.Token.y.Actor.z", ranks: 1 });
  assert.throws(() => validateIntent("applyCondition", { key: "bad key!", targetUuid: "Actor.a" }));
  assert.throws(() => validateIntent("applyCondition", { key: "bone-broken", targetUuid: "Actor.a", ranks: 99 }));
});

test("the Moment of Stillness and Shatterpoint saves apply the cards", () => {
  const load = name => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "packs/_source/features", fs.readdirSync(path.join(import.meta.dirname, "..", "packs/_source/features"), { recursive: true }).find(f => f.startsWith(name) || f.includes(`/${name}`))), "utf8"));
  assert.deepEqual(load("bone-breaker").system.activities.map(a => a.inflicts?.[0]?.key), ["bone-broken"]);
  assert.ok(load("focused-genius").system.activities.some(a => a.inflicts?.[0]?.key === "shattered"));
  assert.ok(card("bone-broken").flags.n5e.rules.length);
});

test("Flow Broken's initiative −4 waits for the start of the next round, then re-sorts the order", async () => {
  const { pendingInitiative } = await import("../module/rules/condition-cards.mjs");
  assert.equal(registry["flow-broken"].initiativeShift, -4);
  assert.equal(registry["bone-broken"].initiativeShift, undefined);
  const updates = pendingInitiative([
    { id: "a", initiative: 15, flags: { n5e: { pendingInitiative: -8 } } },
    { id: "b", initiative: 12, flags: {} },
    { id: "c", initiative: null, flags: { n5e: { pendingInitiative: -4 } } }]);
  assert.deepEqual(updates, [{ _id: "a", initiative: 7, "flags.n5e.-=pendingInitiative": null }, { _id: "c", "flags.n5e.-=pendingInitiative": null }]);
});
