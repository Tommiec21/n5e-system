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
  for ( const k of ["balance-broken", "bone-broken", "flow-broken", "shattered"] ) assert.ok(registry[k], k);
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
  const classOnly = Object.fromEntries(Object.entries(registry).filter(([, d]) => d.owner.kind === "class"));
  assert.deepEqual(conditionCardsFor(genius, { ...classOnly, burned: { label: "Burned" } }).map(c => c.key), ["balance-broken", "bone-broken", "flow-broken", "shattered"]);
  assert.deepEqual(conditionCardsFor(tai, classOnly).map(c => c.key), ["balance-broken", "bone-broken", "flow-broken"]);
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

// ---------------------------------------------------------------- CCOND1c clan cards
import { elementValue } from "../module/rules/elements.mjs";
import { restPlan } from "../module/rules/rest.mjs";

test("clan cards, batch A: every one registers as a clan card with the book's tags", () => {
  const batchA = ["offGuard", "hyuga-network-distortion", "nara-shadow-bound", "senju-drained", "aburame-infested", "uzumaki-5-pronged-seal",
    "uzumaki-river-dam-seal", "yamanaka-mental-overwrite", "kuru-yin-seal", "hebi-virulent", "hoshi-star-sickness"];
  for ( const k of batchA ) {
    assert.equal(registry[k]?.owner.kind, "clan", k);
    assert.ok(registry[k].summary, `${k} summary`);
  }
  assert.equal(registry.offGuard.owner.id, "uchiha");
  assert.deepEqual(registry["hyuga-network-distortion"].perRank.baseCost, { nin: 4, gen: 4, tai: 4, buki: 4 });
  assert.deepEqual(registry["hyuga-network-distortion"].decay, { when: "turnEnd", amount: 1 });
  assert.deepEqual(registry["senju-drained"].turnStartDamage, { die: "1d8", type: "chakra", perRank: true });
  assert.equal(registry["uzumaki-5-pronged-seal"].seconds, 3600);
  assert.deepEqual(registry["uzumaki-5-pronged-seal"].removal[0].onFail, { dcIncrease: 5 });
  assert.equal(registry["aburame-infested"].resave.source, "highest");
  const pen = aggregatePenalties([{ key: "hyuga-network-distortion", ranks: 3 }, { key: "offGuard", ranks: 1 }, { key: "hoshi-star-sickness", ranks: 2 }], registry);
  assert.equal(pen.baseCost.nin, 12);
  assert.equal(pen.ac, -2);
  assert.equal(pen.damageDealt, -4);
});

test("a rule element can scale with the ranks of the condition carrying it", () => {
  assert.equal(elementValue("ranks(-2)", {}, { system: { effectiveRanks: 3 } }), -6);
  assert.equal(elementValue("ranks(-2)", {}, null), -2);
  validateConditionalRules([{ key: "modifier", selector: "skill:cha", value: "ranks(-2)" }]);
});

test("Infested's end-of-turn save uses the applier's highest jutsu DC", () => {
  const applier = { system: { disciplines: { nin: { dc: 14 }, gen: { dc: 16 }, tai: { dc: 12 } } } };
  assert.deepEqual(cardResave(registry["aburame-infested"], applier), { ability: "con", dc: 16, label: "Infested" });
});

test("Star Sickness loses 2 ranks on a long rest; persisting clan conditions end on a full rest", () => {
  CONFIG.N5E.clanConditions["hoshi-star-sickness"] = registry["hoshi-star-sickness"];
  try {
    const a = makeActor({ system: baseAbilities, items: [taiSpec(5)], conditions: [{ key: "hoshi-star-sickness", ranks: 4 }] });
    assert.deepEqual(restPlan(a, "long").conditions.filter(c => c.key === "hoshi-star-sickness"), [{ key: "hoshi-star-sickness", ranks: 2 }]);
    assert.deepEqual(restPlan(a, "full").conditions.filter(c => c.key === "hoshi-star-sickness"), [{ key: "hoshi-star-sickness", ranks: "all" }]);
  } finally { delete CONFIG.N5E.clanConditions["hoshi-star-sickness"]; }
});

test("clan cards, batch B, and immunity through other immunities", async () => {
  const { immuneVia } = await import("../module/rules/condition-cards.mjs");
  const { triggerOutcomes } = await import("../module/rules/triggers.mjs");
  for ( const k of ["futton-deteriorate", "futton-scald", "yoton-molten", "keton-convergence", "ranton-refraction-point", "jinzo-stupor",
    "jinzo-doused", "kashu-disoriented", "shoton-crystallization", "shakuton-immolation", "yuki-frostbite"] ) assert.equal(registry[k]?.owner.kind, "clan", k);
  const fireImmune = { system: { traits: { immune: new Set(["fire"]), conditionImmune: new Set(["dazzled"]) } } };
  assert.ok(immuneVia(fireImmune, registry["shakuton-immolation"]));
  assert.ok(!immuneVia(fireImmune, registry["yoton-molten"]), "Molten needs fire and earth immunity");
  assert.ok(immuneVia({ system: { traits: { immune: new Set(["fire", "earth"]) } } }, registry["yoton-molten"]));
  assert.ok(immuneVia(fireImmune, registry["kashu-disoriented"]), "Dazzled immunity");
  assert.ok(!immuneVia(fireImmune, registry["jinzo-doused"]));
  assert.deepEqual(registry["shakuton-immolation"].turnStartDamage, { die: "1d12", type: "fire", perRank: true });
  const frost = registry["yuki-frostbite"].rules[0];
  const out = triggerOutcomes([{ element: frost, label: "Frostbite", key: "x#0", source: { system: { effectiveRanks: 3 } } }]);
  assert.equal(out.damage[0].formula, "(3)d10");
  assert.equal(aggregatePenalties([{ key: "shoton-crystallization", ranks: 2 }], registry).baseCost.tai, 8);
});
