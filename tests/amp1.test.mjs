/** AMP1a: Amp cards, the engine (docs/AMP1_SPEC.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, taiSpec, baseAbilities } from "./helpers/actor.mjs";
import { ampDefinition, ampKey, effectiveAmpType, ampTypeLabel, ownsAmp, ampUsesLeft, ampCooldownLeft, ampCardsFor, ampWarnings,
  ampSpendUpdate, ampCooldownUpdate, ampEffectPlan, ampLimitConflict, ampsEndingOn, ampUsesAfterRest } from "../module/rules/amp-cards.mjs";
import { validateIntent, INTENT_TYPES } from "../module/automation/owner-intents.mjs";
import { restPlan } from "../module/rules/rest.mjs";
import { ampsVM } from "../module/view-models/combat.mjs";
import { AmpCardData } from "../module/data/item/amp-card.mjs";

const card = (system, extra = {}) => ({ name: "Test Amp", img: "icons/x.svg", uuid: "Compendium.n5e.amps.Item.abc", system, ...extra });
const white = ampDefinition(card({ identifier: "inuzuka-white-wolf", ampType: "battle", owner: { kind: "clan", id: "inuzuka" },
  summary: "+2 damage", duration: { seconds: 60, until: "", concentration: false }, uses: { max: "2", per: "lr" }, cooldown: 600,
  endsOn: ["staggered", "noChakra"], changes: [{ key: "system.bonuses.damage", value: "2", mode: 2 }] }, { name: "White Wolf" }));

test("the Amp card data model has every field the engine reads", () => {
  const keys = Object.keys(AmpCardData.defineSchema());
  for ( const k of ["identifier", "ampType", "namedType", "owner", "summary", "activation", "giveable", "startOnInitiative", "duration",
    "uses", "cooldown", "exclusive", "state", "tempHp", "endsOn", "changes", "aura"] ) assert.ok(keys.includes(k), k);
});

test("King Q-A1: an Amp a clan provides is a Clan Amp; the box's type is kept as a note", () => {
  assert.equal(white.ampType, "clan");
  assert.equal(white.namedType, "battle");
  assert.equal(effectiveAmpType({ ampType: "reflex", owner: { kind: "class", id: "x" } }), "reflex");
  assert.equal(ampKey({ name: "Kujaku Mode!", system: {} }), "kujaku-mode");
});

test("King Q-A4: an Amp can have no type, labelled \"No type\"", () => {
  const feral = ampDefinition(card({ identifier: "feral", ampType: "" }));
  assert.equal(feral.ampType, "");
  assert.equal(ampTypeLabel(feral.ampType), "No type");
  assert.equal(effectiveAmpType({ ampType: "nonsense" }), "");
});

test("ownership: class (and subclass), clan, feat, or anyone", () => {
  const inu = makeActor({ system: baseAbilities, items: [{ type: "clan", name: "Inuzuka", system: { identifier: "inuzuka" } }] });
  const tai = makeActor({ system: baseAbilities, items: [taiSpec(3)] });
  assert.ok(ownsAmp(inu, white));
  assert.ok(!ownsAmp(tai, white));
  assert.ok(ownsAmp(tai, { owner: { kind: "class", id: "taijutsu-specialist" } }));
  assert.ok(!ownsAmp(tai, { owner: { kind: "class", id: "taijutsu-specialist", subclass: "nope" } }));
  assert.ok(ownsAmp(tai, { owner: { kind: "any" } }));
});

test("uses and cooldowns are counted per creature", () => {
  const a = { flags: { n5e: { ampUses: { w: { spent: 1, per: "lr", cooldownUntil: 700 } } } } };
  assert.deepEqual(ampUsesLeft(a, "w", white), { max: 2, left: 1, spent: 1 });
  assert.equal(ampUsesLeft(a, "w", { uses: { max: "" } }), null);
  assert.equal(ampCooldownLeft(a, "w", 100), 600);
  assert.deepEqual(ampSpendUpdate(a, "w", white), { "flags.n5e.ampUses.w": { spent: 2, per: "lr", cooldownUntil: 700 } });
  assert.deepEqual(ampCooldownUpdate("w", white, 1000, { spent: 2 }), { "flags.n5e.ampUses.w": { spent: 2, cooldownUntil: 1600 } });
  assert.equal(ampSpendUpdate(a, "w", { uses: { max: "" }, cooldown: 0 }), null);
});

test("King Q-A2: the confirmation warns about the source, giving a self-only Amp, uses and cooldown", () => {
  const inu = makeActor({ name: "Kiba", system: baseAbilities, items: [{ type: "clan", name: "Inuzuka", system: { identifier: "inuzuka" } }],
    flags: { ampUses: { w: { spent: 2, cooldownUntil: 999 } } } });
  inu.uuid = "Actor.kiba";
  const ally = { name: "Hinata", uuid: "Actor.hinata", items: [] };
  const w = ampWarnings(white, { applier: inu, target: ally, key: "w", worldTime: 0 });
  assert.equal(w.length, 3);
  assert.match(w[0], /normally used on yourself/);
  assert.match(w[1], /No uses/);
  assert.match(w[2], /cooling down/);
  assert.match(ampWarnings(white, { applier: ally, target: ally })[0], /no clan that grants White Wolf/);
  assert.deepEqual(ampWarnings({ ...white, giveable: true, uses: { max: "" }, owner: { kind: "any" } }, { applier: inu, target: ally }), []);
});

test("a card applies as an Amp effect of its type, carrying its key and endings", () => {
  const plan = ampEffectPlan("w", white);
  assert.equal(plan.ampType, "clan");
  assert.equal(plan.ampKey, "w");
  assert.equal(plan.seconds, 60);
  assert.deepEqual(plan.endsOn, ["staggered", "noChakra"]);
  const turn = ampEffectPlan("t", { ...white, duration: { seconds: 0, until: "nextTurnEnd" } });
  assert.equal(turn.expires, "nextTurnEnd");
  const fight = ampEffectPlan("c", { ...white, duration: { seconds: 0, until: "combatEnd" } });
  assert.equal(fight.until, "combatEnd");
  assert.ok(fight.seconds >= 3600, "lasts until the combat ends, not 1 minute");
});

test("King Q-A3: Singleton asks among the Amps of the new one's type; typeless Amps don't clash", () => {
  const amps = [{ id: "1", system: { ampType: "battle" } }, { id: "2", system: { ampType: "reflex" } }, { id: "3", system: { ampType: "battle" }, disabled: true }];
  const added = { id: "4", system: { ampType: "battle" } };
  const c = ampLimitConflict(amps, added, "singleton");
  assert.equal(c.kind, "singleton");
  assert.deepEqual(c.candidates.map(a => a.id), ["1", "4"]);
  assert.equal(c.keep, 1);
  assert.equal(ampLimitConflict(amps, { id: "5", system: { ampType: "" } }, "singleton"), null);
  assert.equal(ampLimitConflict(amps, added, "none"), null);
});

test("Rule of 3's asks which three stay on; a typeless Amp counts", () => {
  const amps = [1, 2, 3].map(i => ({ id: String(i), system: { ampType: "" } }));
  const c = ampLimitConflict(amps, { id: "4", system: { ampType: "will" } }, "ruleOfThree");
  assert.equal(c.keep, 3);
  assert.equal(c.candidates.length, 4);
  assert.equal(ampLimitConflict(amps.slice(0, 2), { id: "4", system: { ampType: "will" } }, "ruleOfThree"), null);
});

test("King Q-A5: the Amps an event ends", () => {
  const actor = { effects: [
    { id: "a", type: "amp", flags: { n5e: { ampEnds: ["staggered"] } } },
    { id: "b", type: "amp", flags: { n5e: { ampEnds: ["noChakra", "combatEnd"] } } },
    { id: "c", type: "amp", disabled: true, flags: { n5e: { ampEnds: ["staggered"] } } },
    { id: "d", type: "condition", flags: { n5e: { ampEnds: ["staggered"] } } }] };
  assert.deepEqual(ampsEndingOn(actor, "staggered").map(e => e.id), ["a"]);
  assert.deepEqual(ampsEndingOn(actor, "combatEnd").map(e => e.id), ["b"]);
  assert.deepEqual(ampsEndingOn(actor, "blinded"), []);
});

test("rests bring Amp uses back by their per", () => {
  const actor = { flags: { n5e: { ampUses: { a: { spent: 2, per: "lr" }, b: { spent: 1, per: "sr" }, c: { spent: 0, per: "sr" } } } } };
  assert.deepEqual(ampUsesAfterRest(actor, new Set(["sr"])), { "flags.n5e.ampUses.b.spent": 0 });
  assert.deepEqual(ampUsesAfterRest(actor, new Set(["sr", "lr"])), { "flags.n5e.ampUses.a.spent": 0, "flags.n5e.ampUses.b.spent": 0 });
  const a = makeActor({ system: baseAbilities, items: [taiSpec(3)], flags: { ampUses: { a: { spent: 1, per: "lr" } } } });
  assert.equal(restPlan(a, "long").update["flags.n5e.ampUses.a.spent"], 0);
  assert.equal(restPlan(a, "short").update["flags.n5e.ampUses.a.spent"], undefined);
});

test("the Amps panel lists the active Amps and the cards this creature can start", () => {
  const inu = makeActor({ system: baseAbilities, items: [{ type: "clan", name: "Inuzuka", system: { identifier: "inuzuka" } }],
    flags: { ampUses: { w: { spent: 1, per: "lr" } } } });
  inu.effects.push({ id: "e1", type: "amp", name: "Feral", system: { ampType: "", key: "feral" }, duration: { label: "1 min" } });
  const reg = { w: white, other: ampDefinition(card({ identifier: "other", owner: { kind: "clan", id: "uchiha" } })),
    open: ampDefinition(card({ identifier: "open", owner: { kind: "any" } })) };
  const vm = ampsVM(inu, reg, { worldTime: 0 });
  assert.ok(vm.show);
  assert.equal(vm.rows[0].type, "No type");
  assert.ok(vm.rows[0].typeless);
  assert.deepEqual(vm.available.map(c => c.key), ["w"], "its clan's card only; cards for anyone are applied by drag");
  assert.deepEqual(vm.available[0].pips, [true, false], "1 of 2 uses left");
  assert.equal(vm.available[0].typeLabel, "Clan");
  assert.deepEqual(ampCardsFor(inu, reg).map(c => c.key), ["w"]);
});

test("the applyAmp intent is validated", () => {
  assert.ok(INTENT_TYPES.includes("applyAmp"));
  assert.deepEqual(validateIntent("applyAmp", { key: "inuzuka-white-wolf", targetUuid: "Actor.x" }), { key: "inuzuka-white-wolf", targetUuid: "Actor.x" });
  assert.throws(() => validateIntent("applyAmp", { key: "1bad key", targetUuid: "Actor.x" }));
});

test("the Amps pack exists with its folders, and the system declares the Amp item type", () => {
  const sys = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "system.json"), "utf8"));
  assert.ok(sys.documentTypes.Item.amp);
  assert.ok(sys.packs.some(p => p.name === "amps"));
  const dir = path.join(import.meta.dirname, "..", "packs/_source/amps");
  assert.ok(fs.readdirSync(dir).some(f => f.startsWith("_folder")));
});

// King 2026-11-16: an active Amp shows its card's current name and what it changes on hover.
import { ampEffectView, ampDefFor } from "../module/rules/amp-cards.mjs";
import { N5E } from "../module/config/index.mjs";
test("an active Amp shows its card's current name and a hover listing what it changes", () => {
  const def = ampDefinition(card({ identifier: "caloric", summary: "Grow huge.", owner: { kind: "clan", id: "akimichi" } }, { name: "Caloric Ignition", uuid: "Item.cal" }));
  const registry = { "amp-card": { ...def, label: "Amp card", card: "Item.old" }, caloric: def };
  const effect = { name: "Amp card", origin: "Item.cal", system: { key: "amp-card", ampType: "clan" }, duration: { label: "60 Seconds" },
    changes: [{ key: "n5e.dr", value: "2", mode: 2 }, { key: "system.bonuses.speed", value: "10", mode: 2 }], flags: { n5e: { rules: [{ key: "advantage", selector: "save:con" }] } } };
  assert.equal(ampDefFor(effect, registry), def, "found by the card it came from");
  const view = ampEffectView(effect, registry, N5E);
  assert.equal(view.name, "Caloric Ignition");
  assert.match(view.tip, /Clan Amp · 60 Seconds/);
  assert.match(view.tip, /Grow huge\./);
  assert.match(view.tip, /\+2 Damage Reduction/);
  assert.match(view.tip, /\+10 Speed/);
  assert.match(view.tip, /Advantage on your Constitution saves/);
});

// AMP1b: the Amp audit.
import { ampAuditOf, ampAuditCounts, namedAmpType } from "../module/rules/amp-audit.mjs";
test("AMP1b: the scan sorts cards, buttons, candidates and dismissals, and ignores one-off bonuses", () => {
  assert.equal(namedAmpType("This counts as a Battle Amp."), "battle");
  assert.equal(ampAuditOf({ type: "amp", name: "Feral", system: { ampType: "" } }).status, "untyped");
  assert.equal(ampAuditOf({ type: "amp", name: "W", system: { ampType: "battle", owner: { kind: "clan", id: "x" } } }).typeLabel, "Clan");
  assert.equal(ampAuditOf({ type: "feat", name: "Crash", system: { activities: [{ effect: { ampType: "battle" } }] } }).status, "linked");
  const stance = ampAuditOf({ type: "stance", name: "Gentle Fist", system: {} });
  assert.equal(stance.status, "stance", "King Q-E1: stances are labelled Stance, not offered as Amps");
  assert.equal(stance.label, "Stance");
  assert.equal(stance.reason, "Stance");
  const lasting = { uuid: "Item.a", type: "jutsu", name: "Sand Armor", system: { duration: { unit: "minute", value: 1 }, description: "<p>You gain 16 temporary hit points.</p>" } };
  assert.equal(ampAuditOf(lasting).status, "candidate");
  assert.equal(ampAuditOf(lasting, { dismissed: new Set(["Item.a"]) }).status, "dismissed");
  assert.equal(ampAuditOf({ type: "jutsu", name: "Punch", system: { duration: { unit: "instant" }, description: "<p>Make an attack. You gain a +2 bonus to this attack.</p>" } }), null, "a one-off bonus isn't an Amp");
  assert.equal(ampAuditOf({ type: "jutsu", name: "Up", system: { duration: { unit: "minute" }, description: "<p>The target takes damage. When you cast this jutsu above C-Rank, increase the damage by 1d6.</p>" } }), null, "upcasting isn't a bonus");
  assert.equal(ampAuditOf({ type: "clan", name: "Inuzuka", system: { description: "Battle Amp" } }), null, "whole clans aren't scanned");
  assert.deepEqual(ampAuditCounts([{ status: "candidate" }, { status: "linked" }, { status: "candidate" }]), { typed: 0, untyped: 0, linked: 1, candidate: 2, dismissed: 0, stance: 0 });
});

// AMP1c: the Amp cards for every feature whose button started an Amp.
import { validateConditionalRules as validateCardRules } from "../module/rules/effect-authoring.mjs";
test("AMP1c: every Amp card is valid, and every Amp button names an existing card", () => {
  const dir = path.join(import.meta.dirname, "..", "packs/_source/amps");
  const cards = fs.readdirSync(dir).filter(f => !f.startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  assert.equal(cards.filter(c => !c.system.level && c.system.owner?.kind !== "jutsu").length, 61, "20 cards for the Amp buttons (AMP1c), 33 clan and 5 class cards (AMP1d; Combat Coordinated is a condition, King Q-E4), DYNAMIC FORM! and Flawless (AMP1e), Chakra Barrier (CARDS1); the rest are AMP1g versions");
  const keys = new Set(cards.map(c => c.system.identifier));
  for ( const c of cards ) {
    validateCardRules(c.flags.n5e.rules ?? []);
    assert.ok(c.system.summary && c.system.description, c.name);
    assert.ok(c.system.owner.id, `${c.name} has an owner`);
  }
  const crash = cards.find(c => c.system.identifier === "chakra-surge-crash");
  assert.equal(crash.system.state, "crash", "the Crash state still drives the bonus damage and Moldings");
  assert.ok(crash.flags.n5e.rules.some(r => r.key === "costReduction" && r.value === 0), "no cost reduction in Crash");
  const flow = cards.find(c => c.system.identifier === "chakra-surge-flow");
  assert.ok(flow.system.changes.some(ch => ch.key === "n5e.saveDC.nin"), "Flow kept its save DC bonus");
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".json") ? [path.join(d, e.name)] : []);
  let buttons = 0;
  for ( const f of walk(path.join(import.meta.dirname, "..", "packs/_source/features")) ) {
    for ( const a of JSON.parse(fs.readFileSync(f, "utf8")).system?.activities ?? [] ) {
      assert.ok(!a.effect?.ampType, `${f}: a bare ampType button is left`);
      if ( a.effect?.amp ) { buttons++; assert.ok(keys.has(a.effect.amp), `${f}: unknown card ${a.effect.amp}`); }
    }
  }
  assert.equal(buttons, 29, "25, plus DYNAMIC FORM! and Flawless (AMP1e), plus Battle Trance entered again for more Discipline (STD6d Weapon Specialist), plus Create Chakra Barrier (CARDS1)");
});

test("AMP1c: checks and saves know the ability they use (Battle Trance: your Taijutsu ability)", async () => {
  const { rollOptions } = await import("../module/rules/elements.mjs");
  const actor = { system: { skills: { ath: { ability: "str" } }, disciplines: { tai: { ability: "str" }, nin: { ability: "int" } } }, items: [], effects: [] };
  const o = rollOptions(actor, { kind: "check", type: "skill", key: "ath" });
  assert.ok(o.has("ability:str") && o.has("ability:tai") && !o.has("ability:nin"));
  assert.ok(rollOptions(actor, { kind: "save", type: "save", key: "int" }).has("ability:nin"));
});

// King 2026-11-16: Crash's bonus dice join the jutsu's own damage roll.
import { mergeExtraDamage } from "../module/rules/cast-options.mjs";
test("Crash's bonus damage joins the jutsu's damage roll, in its damage type", () => {
  const acts = [{ type: "save", save: { ability: "dex" } }, { type: "damage", damage: { parts: [{ formula: "4d6+4", type: "fire" }] } }];
  const { activities, leftover } = mergeExtraDamage(acts, [{ label: "Crash: bonus damage", formula: "1d10", type: "" }]);
  assert.deepEqual(activities[1].damage.parts, [{ formula: "4d6+4", type: "fire" }, { formula: "1d10", type: "fire" }]);
  assert.deepEqual(acts[1].damage.parts.length, 1, "the jutsu itself is untouched");
  assert.deepEqual(leftover, []);
  assert.equal(mergeExtraDamage([{ type: "effect" }], [{ formula: "1d10" }]).leftover.length, 1, "no damage roll: a separate button");
});

// King 2026-11-16: a save that deals damage gets a damage section, so its damage roll joins the card.
import { cardSections } from "../module/rules/action-card.mjs";
test("a save jutsu with damage (Fireball) records its damage on the card", () => {
  const s = cardSections({ kind: "jutsu", area: true, activities: [{ type: "save", save: { ability: "dex" }, damage: { parts: [{ formula: "4d6+4", type: "fire" }] } }] });
  assert.ok(s.includes("damage") && s.includes("saves") && s.includes("area"));
  assert.ok(!cardSections({ kind: "jutsu", activities: [{ type: "save", save: { ability: "wis" } }] }).includes("damage"));
});

// AMP1d: the clan Amp cards (King Q-A1: Clan Amps, the box's type kept as namedType).
import { validateEffectChanges, effectFieldCatalog } from "../module/rules/effect-authoring.mjs";
import { N5E as N5E_CONFIG } from "../module/config/index.mjs";
import { resolveLevelTables } from "../module/rules/effect-services.mjs";
test("AMP1d: 33 clan Amp cards (Combat Coordinated became a condition, AMP1e), typed Clan, owned by a real clan feature, with valid changes", () => {
  const dir = path.join(import.meta.dirname, "..", "packs/_source/amps");
  const cards = fs.readdirSync(dir).filter(f => f.startsWith("clan-")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  assert.equal(cards.length, 33);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".json") ? [path.join(d, e.name)] : []);
  const ids = new Set(walk(path.join(import.meta.dirname, "..", "packs/_source/clans")).map(f => JSON.parse(fs.readFileSync(f, "utf8"))).filter(d => d?.system).map(d => d.system.identifier));
  const catalog = effectFieldCatalog(N5E_CONFIG);
  for ( const c of cards ) {
    assert.equal(c.system.ampType, "clan", c.name);
    assert.match(c.system.namedType, /^(Battle|Will|Fortitude|Reflex) Amp$/, c.name);
    assert.equal(c.folder, "n5eAmpFoldClan01");
    assert.ok(ids.has(c.system.owner.id), `${c.name}: owner ${c.system.owner.id} exists`);
    assert.ok(["", "turnStart", "turnEnd", "nextTurnEnd", "combatEnd", "rest", "dismissed"].includes(c.system.duration.until), c.name);
    validateCardRules(c.flags.n5e.rules);
    const resolved = c.system.changes.map(ch => ({ ...ch, value: resolveLevelTables(ch.value, 11) }));
    assert.deepEqual(validateEffectChanges(resolved, [], catalog).errors, [], c.name);
    assert.ok(c.system.description.includes(c.system.namedType.split(" ")[0]), `${c.name}: the box text is on the card`);
  }
  const wolf = cards.find(c => c.system.identifier === "white-wolf");
  assert.deepEqual([wolf.system.activation, wolf.system.duration.seconds, wolf.system.uses.per], ["bonus", 60, "lr"]);
  // AMP1g: the speed is fixed per version (+10, then +20 from 11th).
  assert.equal(cards.find(c => c.system.identifier === "kujaku-mode").system.changes[0].value, "10");
});

test("AMP1d fix: level tables in effect changes resolve by level (Flow's save DC was dropped)", () => {
  assert.equal(resolveLevelTables("lvl(3:1,11:2,19:3)", 2), "0");
  assert.equal(resolveLevelTables("lvl(3:1,11:2,19:3)", 11), "2");
  assert.equal(resolveLevelTables("lvl(1:-2,10:-4)", 12), "-4");
  assert.equal(resolveLevelTables("5", 12), "5");
});

test("AMP1d: an Amp that lasts until dismissed has no time limit", async () => {
  const { ampEffectPlan } = await import("../module/rules/amp-cards.mjs");
  const p = ampEffectPlan("crimson-pact", { label: "Crimson Pact", duration: { seconds: 0, until: "dismissed" } });
  assert.deepEqual([p.permanent, p.seconds, p.until], [true, 0, ""]);
  assert.equal(ampEffectPlan("x", { label: "X", duration: { seconds: 0, until: "" } }).seconds, 60, "no duration given is still a minute");
});

test("AMP1d: the class Amp boxes (Flash, Elemental Flux, Chained Cascade, Crash and Flow Duality)", () => {
  const dir = path.join(import.meta.dirname, "..", "packs/_source/amps");
  const cards = Object.fromEntries(fs.readdirSync(dir).filter(f => !f.startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))).map(c => [c.system.identifier, c]));
  const flash = cards.flash.system;
  assert.deepEqual([flash.ampType, flash.owner.id, flash.duration.seconds], ["reflex", "burst-of-speed-pathfinder-scout", 60]);
  assert.ok(flash.changes.some(c => c.key === "system.bonuses.ac" && c.value === "1"));
  assert.ok(cards["flash-9"].system.changes.some(c => c.key === "system.bonuses.ac" && c.value === "2"), "AMP1g: +2 from 9th is its own version");
  assert.equal(cards["elemental-flux"].system.duration.until, "nextTurnEnd");
  assert.equal(cards["chained-cascade"].system.duration.until, "nextTurnEnd");
  assert.equal(cards["crash-duality"].system.state, "crashDuality", "not Crash's own dice table");
  assert.equal(cards["flow-duality"].system.state, "flow", "Flow's turn-start Focus and no-damage-boost rules apply");
  assert.equal(cards["crash-duality"].system.exclusive, "surge");
  // King 2026-11-20 batch: the "flow" state already gives the turn-start Focus; the card's rule doubled it.
  for ( const k of ["chakra-surge-flow", "chakra-surge-flow-perfected", "flow-duality"] ) {
    assert.ok(!cards[k].flags.n5e.rules.some(r => r.key === "resource" && r.on === "turnStart" && r.pool === "focus"), `${k}: one Focus, not two`);
  }
  const auto = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "content/automation/ninjutsu-specialist.json"), "utf8"));
  assert.equal(auto.features["summoning-duality-summoner"].castOptions[0].requiresState, "crashDuality");
});

test("King 2026-11-20: an Amp card appears only once the character has the feature that grants it", async () => {
  const { ampCardsFor, ampDefinition } = await import("../module/rules/amp-cards.mjs");
  const dir = path.join(import.meta.dirname, "..", "packs/_source/amps");
  const registry = Object.fromEntries(fs.readdirSync(dir).filter(f => !f.startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .map(c => [c.system.identifier, ampDefinition(c)]));
  const feat = id => ({ type: "feat", name: id, system: { identifier: id } });
  const cls = { type: "class", name: "Ninjutsu Specialist", system: { identifier: "ninjutsu-specialist" } };
  const keys = items => ampCardsFor({ items, effects: [], flags: {} }, registry).map(c => c.key).sort();
  assert.deepEqual(keys([cls, feat("chakra-surge")]), ["chakra-surge-crash", "chakra-surge-flow"], "3rd level: no Perfected versions");
  assert.deepEqual(keys([cls, feat("chakra-surge"), feat("ninjutsu-master")]),
    ["chakra-surge-crash", "chakra-surge-crash-perfected", "chakra-surge-flow", "chakra-surge-flow-perfected"], "20th level: the upgrades join");
  for ( const [k, d] of Object.entries(registry) ) assert.equal(["feat", "clan", "jutsu"].includes(d.owner.kind), true, `${k} belongs to a feature, a clan or a jutsu (AMP1f)`);
});

// AMP1g (King 2026-11-20): every Amp that grows by level is a separate card per version.
test("AMP1g: versions are separate cards with only their own numbers", () => {
  const dir = path.join(import.meta.dirname, "..", "packs/_source/amps");
  const cards = Object.fromEntries(fs.readdirSync(dir).filter(f => !f.startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))).map(c => [c.system.identifier, c]));
  const text = c => c.system.description.replace(/<[^>]+>/g, " ");
  assert.deepEqual(["chakra-surge-flow", "chakra-surge-flow-11", "chakra-surge-flow-19"].map(k => [cards[k].name, cards[k].system.level, cards[k].system.changes[0].value]),
    [["Chakra Surge: Flow", 0, "1"], ["Chakra Surge: Flow (11th)", 11, "2"], ["Chakra Surge: Flow (19th)", 19, "3"]]);
  assert.ok(text(cards["chakra-surge-flow-11"]).includes("+2 bonus to your Ninjutsu Save DC") && !/at 11th|at 19th/.test(text(cards["chakra-surge-flow-11"])));
  for ( const c of Object.values(cards) ) {
    assert.ok(!JSON.stringify([c.system.changes, c.flags.n5e.rules]).includes("lvl(") || !c.system.series, `${c.system.identifier}: a versioned card has fixed numbers`);
    if ( c.system.level ) {
      assert.ok(cards[c.system.series], `${c.system.identifier}: its base exists`);
      assert.equal(c.system.owner.id, cards[c.system.series].system.owner.id, "a version belongs to the same feature");
    }
  }
  assert.equal(cards["miraigan-15"].system.changes.filter(ch => ch.key === "n5e.mastery.skill.ins").length, 3, "3 ranks of Mastery at 15th");
  assert.ok(!text(cards["dragons-rage"]).includes("Unbound Savagery") && text(cards["dragons-rage-15"]).includes("Unbound Savagery"));
  assert.equal(cards["crash-overheat"].flags.n5e.rules.find(r => r.label === "Overheat").value, 2, "Overheat's first version is +2, not 0");
});

test("AMP1g: the panel and the buttons use the highest version the character's level reaches; versions share uses", async () => {
  const { ampCardsFor, ampDefinition, ampVersionFor, ampSpendUpdate, ampUsesLeft } = await import("../module/rules/amp-cards.mjs");
  const dir = path.join(import.meta.dirname, "..", "packs/_source/amps");
  const registry = Object.fromEntries(fs.readdirSync(dir).filter(f => !f.startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .map(c => [c.system.identifier, ampDefinition(c)]));
  const feat = id => ({ type: "feat", name: id, system: { identifier: id } });
  const ninja = level => ({ system: { level }, items: [feat("chakra-surge")], effects: [], flags: {} });
  const labels = level => ampCardsFor(ninja(level), registry).map(c => c.label).sort();
  assert.deepEqual(labels(3), ["Chakra Surge: Crash", "Chakra Surge: Flow"]);
  assert.deepEqual(labels(12), ["Chakra Surge: Crash (11th)", "Chakra Surge: Flow (11th)"]);
  assert.equal(ampVersionFor(registry, "chakra-surge-flow", 20), "chakra-surge-flow-19");
  assert.equal(ampVersionFor(registry, "chakra-surge-flow", 5), "chakra-surge-flow");
  assert.equal(ampVersionFor(registry, "white-wolf", 20), "white-wolf", "an Amp without versions is itself");
  const spend = ampSpendUpdate({ flags: {} }, "white-wolf", registry["white-wolf"]);
  assert.ok(spend["flags.n5e.ampUses.white-wolf"]);
  const kujaku = ampSpendUpdate({ flags: {} }, "kujaku-mode-11", registry["kujaku-mode-11"]);
  assert.ok(kujaku["flags.n5e.ampUses.kujaku-mode"], "a version spends the Amp's one pool of uses");
  const used = { flags: { n5e: { ampUses: { "kujaku-mode": { spent: 1 } } } } };
  assert.equal(ampUsesLeft(used, "kujaku-mode-15", registry["kujaku-mode-15"]).left, 0);
});
