/**
 * Combat tab view model and template.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { makeActor, load, baseAbilities, taiSpec } from "./helpers/actor.mjs";
import { combatVM } from "../module/view-models/combat.mjs";
import { actionCardData } from "../module/chat/card.mjs";
import { registerHelpers } from "../module/applications/helpers.mjs";
import N5E from "../module/config/index.mjs";

globalThis.CONFIG ??= {};
CONFIG.N5E ??= N5E;

const chainJutsu = { _id: "chain00000000001", name: "Chain Slash", type: "jutsu", system: {
  discipline: "buki", rank: "D", keywords: ["bukijutsu", "chain"], cost: { mode: "chakra", value: 3 },
  activation: { type: "bonus" }, chainEffects: { 2: "<p>Extra slash.</p>" } } };
const comboJutsu = { _id: "combo00000000001", name: "Opening Jab", type: "jutsu", system: {
  discipline: "tai", rank: "E", keywords: ["taijutsu", "combo"], cost: { mode: "chakra", value: 1 } } };
const concJutsu = { _id: "conc000000000001", name: "Mist Veil", type: "jutsu", system: {
  discipline: "nin", rank: "C", keywords: ["ninjutsu"], cost: { mode: "chakra", value: 9 },
  duration: { unit: "minute", value: 1, concentration: true } } };
const effJutsu = { _id: "eff0000000000001", name: "Quiet Mind", type: "jutsu", system: {
  discipline: "gen", rank: "D", keywords: ["genjutsu", "efficient"], cost: { mode: "chakra", value: 4 },
  duration: { unit: "minute", value: 1, concentration: true }, activation: { type: "reaction" } } };
const stance = { _id: "stance0000000001", name: "Iron Fist Stance", type: "stance", system: { categories: ["taijutsu"], description: "<p>Hit hard.</p>" } };
const stance2 = { _id: "stance0000000002", name: "Willow Stance", type: "stance", system: { categories: ["taijutsu"] } };

const make = () => {
  const kunai = load("equipment", "Kunai");
  kunai.system.equipped = true;
  const a = makeActor({ name: "Taijutsu Test", system: { ...baseAbilities,
      combat: { chain: { value: 2 }, activeStance: "stance0000000001", concentrating: ["conc000000000001", "eff0000000000001"] } },
    acCalc: "martialTechnique",
    items: [taiSpec(7), load("features", "MartialTech"), load("clans", "Uchiha"), load("jutsu", "DynamicEntry"),
      load("jutsu", "LeafHurrican"), kunai, chainJutsu, comboJutsu, concJutsu, effJutsu, stance, stance2] });
  a.flags = { n5e: { combo: { name: "Opening Jab", id: "combo00000000001" }, concentrationPaid: { conc000000000001: 9 } } };
  return a;
};

test("combat: trackers (chain, concentration upkeep, stance, combo)", () => {
  const v = combatVM(make());
  assert.equal(v.chain.value, 2);
  assert.deepEqual(v.chain.atRank.map(j => j.name), ["Chain Slash"], "exact-rank Chain effects");
  const c = v.concentration;
  assert.equal(c.used, 2);
  assert.equal(c.rows[0].upkeep, 4, "half the 9 CP paid, rounded down");
  assert.equal(c.rows[1].upkeep, 0, "Efficient waives upkeep");
  assert.equal(c.upkeep, 4);
  assert.equal(c.dc, 15 + 2 + 1, "15 + ranks of all concentrated jutsu (E=0, D=1, C=2)");
  assert.equal(v.stance.active.name, "Iron Fist Stance");
  assert.deepEqual(v.stance.others.map(s => s.name), ["Willow Stance"]);
  assert.ok(v.combo.show && v.combo.name === "Opening Jab");
  assert.deepEqual(v.combo.finishers.map(j => j.name), ["Leaf Hurricane"]);
  assert.ok(v.chain.show, "Chain shows once it has a count");
});

test("combat: action groups", () => {
  const v = combatVM(make());
  const sec = k => (k === "skills"
    ? { pills: v.skills.rows.flatMap(s => s.pills) }
    : v.basic.sections.find(s => s.key === k));
  assert.deepEqual(v.skills.rows.map(s => s.label), ["Actions", "Bonus Actions", "Reactions", "Free & Special"]);
  assert.ok(!v.basic.sections.some(s => s.skill), "skill actions moved out of Basic Combat");
  assert.ok(sec("core").pills.some(p => p.name === "Dodge"));
  assert.ok(sec("core").pills.some(p => p.name === "Opportunity Attack" && p.economy === "reaction"));
  assert.deepEqual(sec("strikes").pills.map(p => p.name), ["Unarmed Strike", "Kunai"]);
  assert.equal(sec("strikes").pills[0].sub, "1d6 +3", "stance sets the unarmed die to d6");
  const grapple = sec("skills").pills.find(p => p.name === "Grapple");
  assert.match(grapple.tip, /contested Athletics/);
  const stabilize = sec("skills").pills.find(p => p.name === "Stabilize");
  assert.equal(stabilize.sub, "−3", "Proficient action without proficiency");
  assert.ok(!sec("skills").pills.some(p => p.name === "Fast Talk"), "non-combat actions hidden");
  assert.ok(!sec("skills").pills.some(p => p.name === "Coerce"), "1-minute actions hidden");
  assert.deepEqual(v.jutsu.map(g => g.label), ["Ninjutsu", "Genjutsu", "Taijutsu", "Bukijutsu"]);
  const tai = v.jutsu.find(g => g.key === "tai");
  const pills = tai.rows.flatMap(r => r.pills);
  assert.deepEqual(pills.map(p => p.name), ["Opening Jab", "Dynamic Entry", "Leaf Hurricane"], "rank then name");
  assert.ok(pills.find(p => p.name === "Leaf Hurricane").badges.some(b => b.key === "finisher" && b.on));
  const buki = v.jutsu.find(g => g.key === "buki");
  assert.equal(buki.rows[0].key, "bonus");
  const gen = v.jutsu.find(g => g.key === "gen").rows.flatMap(r => r.pills)[0];
  assert.ok(gen.concentrating);
  assert.match(gen.tip, /D-Rank Genjutsu/);
});

test("combat: template and action card render", () => {
  const ROOT = path.join(import.meta.dirname, "..");
  const hbs = Handlebars.create();
  registerHelpers(hbs);
  for ( const p of ["parts/chips", "parts/item-controls", "parts/field-rows", "parts/action-pill"] ) {
    hbs.registerPartial(`systems/n5e/templates/${p}.hbs`, fs.readFileSync(path.join(ROOT, "templates", `${p}.hbs`), "utf8"));
  }
  const tpl = hbs.compile(fs.readFileSync(path.join(ROOT, "templates/actor/character/combat.hbs"), "utf8"));
  const html = tpl({ editable: true, editMode: false, tab: { cssClass: "active" }, vm: combatVM(make()) });
  assert.match(html, /data-action="useAction" data-kind="core" data-key="dodge"/);
  assert.match(html, /data-action="toggleConcentration"/);
  assert.match(html, /Finisher armed/);
  assert.ok(html.indexOf("Skill Actions") > html.indexOf(">Bukijutsu<"), "skill actions last");
  assert.match(html, /Upkeep at turn start <b class="">4 CP/);
  assert.equal((html.match(/class="act-group /g) ?? []).length, 6, "basic + 4 disciplines + skills");
  const card = actionCardData("skill", "grapple", make());
  assert.equal(card.name, "Grapple");
  assert.match(card.subtitle, /Athletics/);
  assert.equal(actionCardData("core", "unarmed", make()).stats[0].value, "1d6 + 3 bludgeoning");
});

test("casting updates Chain and Combo", async () => {
  const { castUpdates } = await import("../module/rules/cast-tracking.mjs");
  const a = make();
  const find = n => a.items.find(i => i.name === n);
  a.system.combat.chain.value = 1;
  assert.deepEqual(castUpdates(a, { ...find("Chain Slash"), system: { ...find("Chain Slash").system, activation: { type: "action" } } }),
    { "system.combat.chain.active": true, "flags.n5e.chainTouched": true, "system.combat.chain.value": 2, "flags.n5e.combo": null });
  assert.equal(castUpdates(a, find("Chain Slash"))["system.combat.chain.value"], undefined, "Bonus Action maintains");
  assert.equal(castUpdates(a, find("Mist Veil"))["system.combat.chain.value"], 0, "non-Chain jutsu resets");
  assert.deepEqual(castUpdates(a, find("Opening Jab"))["flags.n5e.combo"], { name: "Opening Jab", id: "combo00000000001" });
  assert.equal(castUpdates(a, find("Leaf Hurricane"))["flags.n5e.combo"], null, "Finisher spends the Combo");
  const fresh = combatVM(makeActor({ items: [load("jutsu", "DynamicEntry")] }));
  assert.ok(!fresh.chain.show && !fresh.combo.show && !fresh.concentration.show, "trackers hidden until used");
  assert.deepEqual(fresh.jutsu.map(g => g.key), ["tai"], "empty disciplines hidden");
});
