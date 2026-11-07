/**
 * Phase 3 release 2: reading jutsu text into activities, crit damage, weapon attacks, resource costs,
 * and the cast plan.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, load, baseAbilities, taiSpec } from "./helpers/actor.mjs";
import { parseActivities, unarmedFormula, critFormula } from "../module/rules/activity-parse.mjs";
import { resourceCost, cannotPay } from "../module/rules/resource-cost.mjs";
import { castPlan } from "../module/workflow/cast-plan.mjs";
import { weaponAttackSpec } from "../module/workflow/attack.mjs";

const SRC = path.join(import.meta.dirname, "..", "packs", "_source");
const all = [];
for ( const p of fs.readdirSync(SRC) ) {
  for ( const f of fs.readdirSync(path.join(SRC, p)) ) {
    const d = JSON.parse(fs.readFileSync(path.join(SRC, p, f), "utf8"));
    if ( !d._key.startsWith("!folders!") ) all.push(d);
  }
}
const N = n => structuredClone(all.find(d => d.name === n));
const acts = n => parseActivities(N(n).system.description, { discipline: N(n).system.discipline });

test("jutsu text becomes activities", () => {
  const whip = acts("Fire Release: Flame Whip");
  assert.deepEqual(whip.map(a => a.type), ["attack", "save"]);
  assert.equal(whip[0].attack.discipline, "nin");
  assert.deepEqual(whip[0].damage.parts, [{ formula: "2d10+2", type: "fire" }]);
  assert.deepEqual([...whip[1].save.abilities], ["dex"]);

  const leaf = acts("Leaf Hurricane");
  assert.deepEqual(leaf.map(a => a.type), ["save"]);
  assert.equal(leaf[0].save.onSuccess, "half");
  assert.equal(leaf[0].damage.parts[0].formula, "@unarmed + 2d6");

  const kick = acts("Butterfly Kick");
  assert.equal(kick[0].type, "attack");
  assert.equal(kick[0].attack.discipline, "tai");
  assert.equal(kick[0].damage.parts[0].formula, "@unarmed + 2d6");

  assert.deepEqual(acts("Chakra Shield").map(a => [a.type, a.heal?.formula, a.heal?.pool]), [["heal", "12", "tempHp"]]);
  assert.equal(acts("Dynamic Entry")[0].damage.parts[0].type, "bludgeoning");
  assert.deepEqual(acts("Transform"), [], "no rollable parts");
  const petals = acts("Lotus: Anxious Petals");
  assert.equal(petals[0].save.fourTier, true, "Genjutsu saves are four-tier");
});

test("unarmed damage and crit doubling", () => {
  const a = makeActor({ system: structuredClone(baseAbilities) });
  assert.equal(unarmedFormula(a), "1 + 3");
  a.system.combat.activeStance = "x";
  assert.equal(unarmedFormula(a), "1d6 + 3");
  assert.equal(critFormula("2d10+2"), "4d10+2", "flat bonus not doubled");
  assert.equal(critFormula("1d4 + 2", 2), "2d4 + 2 + 2", "dice and ability mod doubled");
});

test("weapon attack: finesse uses the better of Str and Dex", () => {
  const kunai = load("equipment", "Kunai");
  const a = makeActor({ system: { abilities: { str: { value: 10 }, dex: { value: 16 }, con: { value: 10 }, int: { value: 10 },
    wis: { value: 10 }, cha: { value: 10 } } }, items: [taiSpec(1), kunai] });
  const spec = weaponAttackSpec(a, a.items.find(i => i.type === "weapon"));
  assert.equal(spec.ability, "dex");
  assert.equal(spec.bonus, 3 + a.system.prof);
  assert.equal(spec.damage.formula, "1d4 + 3");
  const unarmed = weaponAttackSpec(a, null);
  assert.equal(unarmed.ability, "str");
  assert.equal(unarmed.damage.formula, "1");
});

test("resource costs: Moldings spend Focus, Maneuvers Superiority Dice", () => {
  const items = ["Careful Ninjutsu", "Relentless Retaliation", "Knock Back"].map(n => all.find(d => d.name === n)).filter(Boolean);
  const a = makeActor({ items: [taiSpec(1), ...items] });
  const get = n => a.items.find(i => i.name === n);
  if ( get("Careful Ninjutsu") ) assert.equal(resourceCost(get("Careful Ninjutsu")).pool, "focus");
  assert.deepEqual(resourceCost(get("Relentless Retaliation")), { pool: "superiorityDice", amount: 2, uses: false });
  assert.equal(resourceCost(get("Knock Back")).amount, 1);
  assert.match(cannotPay(a, { pool: "focus", amount: 1 }, get("Knock Back")), /No Focus/);
});

test("cast plan: cost, concentration limit, Chain, Moldings", () => {
  const nin = N("Ninjutsu Specialist");
  nin.system.levels = 4;
  const mold = all.find(d => d.system.tags?.includes?.("nin-molding"));
  const conc = { _id: "conc000000000001", name: "Mist", type: "jutsu", system: { discipline: "nin", rank: "D", keywords: ["ninjutsu"],
    cost: { mode: "chakra", value: 6 }, duration: { unit: "minute", value: 1, concentration: true } } };
  const conc2 = { ...structuredClone(conc), _id: "conc000000000002", name: "Mist Two" };
  const conc3 = { ...structuredClone(conc), _id: "conc000000000003", name: "Mist Three" };
  const noFire = makeActor({ system: structuredClone(baseAbilities), items: [structuredClone(nin), N("Fire Release: Flame Whip")] });
  assert.match(castPlan(noFire, noFire.items[1]).problems[0], /affinity/, "no Fire Release affinity: refused");
  const a = makeActor({ system: structuredClone(baseAbilities), items: [nin, N("Blaze Walker"), mold, N("Fire Release: Flame Whip"), conc, conc2, conc3] });
  a.system.cp.value = 40;
  const whip = a.items.find(i => i.name === "Fire Release: Flame Whip");
  const p = castPlan(a, whip);
  assert.ok(p.ok);
  assert.equal(p.cost, 4);
  assert.equal(p.update["system.cp.value"], a.system.cp.value - 4);
  // Molding spends Focus.
  const m = a.items.find(i => i.name === mold.name);
  const pm = castPlan(a, whip, { options: [m.id] });
  assert.equal(pm.pools.focus, resourceCost(m).amount);
  assert.equal(pm.update["system.resources.focus.value"], a.system.resources.focus.value - resourceCost(m).amount);
  // Concentration: two slots, third must end one.
  const c1 = castPlan(a, a.items.find(i => i.name === "Mist"));
  assert.deepEqual(c1.update["system.combat.concentrating"], ["conc000000000001"]);
  assert.equal(c1.update["flags.n5e.concentrationPaid.conc000000000001"], 6);
  a.system.combat.concentrating = ["conc000000000001", "conc000000000002"];
  const c3 = castPlan(a, a.items.find(i => i.name === "Mist Three"));
  assert.ok(!c3.ok && /choose one to end/.test(c3.problems[0]));
  const c3b = castPlan(a, a.items.find(i => i.name === "Mist Three"), { endConcentration: "conc000000000001" });
  assert.ok(c3b.ok);
  assert.deepEqual(c3b.update["system.combat.concentrating"], ["conc000000000002", "conc000000000003"]);
  // Not enough chakra.
  a.system.cp.value = 1;
  assert.match(castPlan(a, whip).problems[0], /Not enough chakra/);
});
