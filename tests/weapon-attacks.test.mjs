/** ATK1a: weapon attacks with bonuses, properties and range (King 2026-11-13). */
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { makeActor, taiSpec, baseAbilities } from "./helpers/actor.mjs";
import { weaponAttackSpec } from "../module/workflow/attack.mjs";
import { unarmedAbility, hasFinesse } from "../module/rules/unarmed.mjs";
import { weaponCritBonus, deadlyDice, heavyPenalty, heavyDamage, backfires, attackMode, attackRange, rangeSources,
  rollsAmmo, thrownAmmo } from "../module/rules/weapon-properties.mjs";
import { migrateThrownAmmo } from "../module/migration/atk1.mjs";
import { unarmedStrike } from "../module/config/equipment.mjs";

// Exact name match (a "shuriken-" substring would also find Fuma-Shuriken).
const EQUIP = path.join(import.meta.dirname, "..", "packs", "_source", "equipment");
const W = name => structuredClone(fs.readdirSync(EQUIP).map(f => JSON.parse(fs.readFileSync(path.join(EQUIP, f), "utf8"))).find(d => d.name === name));
const abilities = (str, dex) => ({ abilities: { ...baseAbilities.abilities, str: { value: str }, dex: { value: dex } } });
const actorWith = (items, { str = 16, dex = 14, changes = [], system = {} } = {}) =>
  makeActor({ system: { ...abilities(str, dex), ...system }, items: [taiSpec(1), ...items], n5eChanges: changes });
const weaponOf = (a, name) => a.items.find(i => i.name === name);

test("property rules: Critical, Deadly, Heavy, Volatile", () => {
  assert.equal(weaponCritBonus(W("Hidden Blade")), 3);
  assert.equal(deadlyDice(W("Katana")), "1d8");
  assert.equal(deadlyDice(W("Tetsubo"), "2d6"), "2d6");
  assert.equal(deadlyDice(W("Tanto")), "");
  assert.equal(heavyPenalty(14, W("Great Axe")), "Heavy (Str below 16)");
  assert.equal(heavyPenalty(16, W("Great Axe")), null);
  assert.equal(heavyDamage(4, W("Great Axe")), 2);
  assert.equal(heavyDamage(4, W("Katana")), 0);
  assert.equal(backfires(W("Ballistic Kunai Gun"), 2), true);
  assert.equal(backfires(W("Ballistic Kunai Gun"), 3), false);
  assert.equal(backfires(W("Katana"), 1), false);
});

test("range rules: reach, thrown mode, long range, beyond long, ranged in melee, ammunition and Returning", () => {
  const axe = W("Hand Axe"), shuriken = W("Shuriken"), boomerang = W("Boomerang"), whip = W("Whip");
  assert.equal(attackRange(whip, "melee").normal, 15, "Reach 2");
  assert.equal(attackMode(axe, { distance: 5 }), "melee");
  assert.equal(attackMode(axe, { distance: 15 }), "thrown");
  assert.equal(attackMode(axe, { requested: "thrown" }), "thrown");
  assert.equal(attackMode(shuriken), "ranged");
  assert.deepEqual(rangeSources("ranged", attackRange(shuriken, "ranged"), 50, 0), { disadvantage: ["Long range"], refuse: null });
  assert.match(rangeSources("ranged", attackRange(shuriken, "ranged"), 130, 0).refuse, /beyond long range/);
  assert.deepEqual(rangeSources("thrown", attackRange(axe, "thrown"), 10, 1).disadvantage, ["Ranged attack in melee"]);
  assert.deepEqual(rangeSources("melee", attackRange(axe, "melee"), 5, 3).disadvantage, []);
  assert.equal(rollsAmmo(axe, "melee", 5), false, "a melee swing never rolls the die");
  assert.equal(rollsAmmo(axe, "thrown", 15), true, "thrown: its d4 die");
  assert.equal(rollsAmmo(shuriken, "ranged", 20), true);
  assert.equal(rollsAmmo(boomerang, "ranged", 40), false, "Returning within 60 ft is caught");
  assert.equal(rollsAmmo(boomerang, "ranged", 80), true);
  assert.deepEqual(axe.system.ammo.steps, [4, 1, 0]);
  assert.equal(thrownAmmo(axe), null, "already has its die");
  const old = structuredClone(axe); old.system.ammo.usesDie = false; old.system.ammo.steps = [8, 6, 4, 1, 0];
  assert.deepEqual(migrateThrownAmmo(old).system.ammo.steps, [4, 1, 0]);
  assert.equal(migrateThrownAmmo(migrateThrownAmmo(old)), null, "idempotent");
});

test("weapon attack spec: bonuses, effects and Mastery; damage bonuses", () => {
  const a = actorWith([W("Katana")], { system: { bonuses: { attack: { weapon: 1 }, damage: { weapon: 2 } } },
    changes: [{ key: "n5e.attack.weapon", value: 1 }, { key: "n5e.damage.weapon", value: 1 }, { key: "n5e.mastery.attack.weapon", value: "Test" }] });
  const spec = weaponAttackSpec(a, weaponOf(a, "Katana"));
  const labels = spec.breakdown.parts.map(p => p.label);
  assert.ok(labels.includes("Bonuses") && labels.includes("Effects"), labels.join());
  assert.ok(labels.some(l => l.startsWith("Mastery")), labels.join());
  assert.equal(spec.damage.flat, 3);
  assert.equal(spec.ability, "str", "Finesse: the better of Str 16 and Dex 14");
  assert.equal(spec.damage.critExtra, "1d8", "Deadly 1");
  const plain = actorWith([W("Katana")]);
  assert.equal(spec.bonus - weaponAttackSpec(plain, weaponOf(plain, "Katana")).bonus, 2 + a.system.weaponBonuses.weapon.attack.find(p => p.label.startsWith("Mastery")).value);
});

test("weapon attack spec: Heavy, Volatile, Versatile, Critical, range sources and refusal", () => {
  const a = actorWith([W("Great Axe"), W("Ballistic Kunai Gun"), W("Quarterstaff"), W("Hidden Blade"), W("Shuriken")], { str: 14 });
  const axe = weaponAttackSpec(a, weaponOf(a, "Great Axe"));
  assert.deepEqual(axe.disadvantageSources, ["Heavy (Str below 16)"]);
  assert.equal(axe.damage.flat, 1, "half of Str +2, on top of the modifier");
  assert.match(axe.damage.formula, /^1d12 \+ 1 \+ 2$/);
  const gun = weaponAttackSpec(a, weaponOf(a, "Ballistic Kunai Gun"));
  assert.equal(gun.abilityMod, 0, "Volatile: no ability modifier");
  assert.equal(gun.volatile, 2);
  assert.equal(weaponAttackSpec(a, weaponOf(a, "Quarterstaff"), { twoHanded: true }).damage.die, "1d8");
  assert.equal(weaponAttackSpec(a, weaponOf(a, "Hidden Blade")).critBonus, 3);
  const far = weaponAttackSpec(a, weaponOf(a, "Shuriken"), { distance: 60, closeHostiles: 1 });
  assert.deepEqual(far.disadvantageSources, ["Long range", "Ranged attack in melee"]);
  assert.match(weaponAttackSpec(a, weaponOf(a, "Shuriken"), { distance: 200 }).refuse, /beyond long range/);
  const bonus = weaponAttackSpec(a, weaponOf(a, "Shuriken"), { bonusAction: true });
  assert.equal(bonus.abilityMod, 0, "Multiattack bonus attack: no ability modifier");
});

test("Unarmed Strike: Str, or Dex when Taijutsu use Dex; finesse for features", () => {
  const str = actorWith([], { str: 12, dex: 18 });
  assert.equal(unarmedAbility(str), "str");
  assert.equal(weaponAttackSpec(str, null).ability, "str");
  const dex = actorWith([], { str: 12, dex: 18, changes: [{ key: "n5e.disciplineAbility.tai", value: "dex" }] });
  assert.equal(unarmedAbility(dex), "dex");
  const spec = weaponAttackSpec(dex, null);
  assert.equal(spec.ability, "dex");
  assert.equal(spec.damage.formula, "1 + 4");
  assert.equal(hasFinesse(null), true);
  assert.equal(hasFinesse(structuredClone(unarmedStrike)), true);
  assert.equal(hasFinesse({ system: { properties: { light: 1 } } }), false);
});

/* ATK1b */
import { canDualWieldLight, lightAttackBlock, matchingWeapons, needText, evocationDice, evocationDie, evocationEcho } from "../module/rules/weapon-properties.mjs";

test("Light extra attack: two Light weapons, after the Attack action, once per turn, with the modifier", () => {
  assert.equal(canDualWieldLight([W("Tanto"), W("Gunsen")]), true);
  assert.equal(canDualWieldLight([W("Tanto"), W("Katana")]), false);
  assert.equal(lightAttackBlock({ inCombat: false }), null, "outside combat nothing is tracked");
  assert.match(lightAttackBlock({ inCombat: true, economy: {} }), /Attack action first/);
  assert.equal(lightAttackBlock({ inCombat: true, economy: { attackAction: true } }), null);
  assert.match(lightAttackBlock({ inCombat: true, economy: { attackAction: true, lightAttack: true } }), /once per turn/);
  const a = actorWith([W("Tanto"), W("Gunsen")]);
  const spec = weaponAttackSpec(a, weaponOf(a, "Gunsen"), { light: true });
  assert.equal(spec.abilityMod, 3, "adds the modifier (King 2026-11-13)");
  assert.match(spec.label, /Light extra attack/);
});

test("strikes choose their weapon by keyword, group or property", () => {
  const weapons = [W("Katana"), W("Shuriken"), W("Naginata")];
  assert.deepEqual(matchingWeapons(weapons, null).map(w => w.name), ["Katana", "Shuriken", "Naginata"]);
  assert.deepEqual(matchingWeapons(weapons, { groups: ["polearm"] }).map(w => w.name), ["Naginata"]);
  assert.deepEqual(matchingWeapons(weapons, { groups: ["blade"], properties: ["reach"] }).map(w => w.name), ["Naginata"]);
  assert.deepEqual(matchingWeapons(weapons, { keywords: ["shuriken"] }).map(w => w.name), ["Shuriken"]);
  assert.deepEqual(matchingWeapons(weapons, { properties: ["heavy", "finesse"] }), []);
  assert.equal(needText({ groups: ["blade", "polearm"], properties: ["reach"] }), "blade or polearm weapon with reach");
});

test("Evocation: sealed echo bonus and type, no modifier, dice by level, half die for Bukijutsu", () => {
  assert.deepEqual([1, 4, 5, 10, 11, 17, 20].map(evocationDice), [1, 1, 2, 2, 3, 4, 4]);
  const scroll = W("Combat Scroll");
  assert.equal(evocationEcho(scroll), null, "nothing sealed yet");
  assert.equal(evocationDie(scroll, 11), "3d8");
  assert.equal(evocationDie(W("Giant Combat Scroll"), 1, { bukijutsu: true }), "1d6");
  scroll.system.evocation = { discipline: "nin", type: "fire" };
  const a = actorWith([scroll], { system: { level: 5 } });
  const item = weaponOf(a, "Combat Scroll");
  const spec = weaponAttackSpec(a, item);
  assert.equal(spec.bonus, a.system.disciplines.nin.attack, "Ninjutsu attack bonus");
  assert.equal(spec.damage.formula, `${evocationDie(item, a.system.level)}`, "no ability modifier");
  assert.deepEqual(spec.damage.types, ["fire"]);
  assert.match(spec.note, /1 attack/);
  const empty = actorWith([W("Combat Scroll")]);
  assert.match(weaponAttackSpec(empty, weaponOf(empty, "Combat Scroll")).refuse, /Seal an echo/);
});
