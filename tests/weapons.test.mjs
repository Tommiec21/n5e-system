/** DATA2: the Chapter 5 weapons and the Unarmed Strike item (King 2026-11-13). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, load, taiSpec } from "./helpers/actor.mjs";
import { parseWeaponTables, parseProperty } from "../tools/content/build-weapons.mjs";
import { weaponAttackSpec } from "../module/workflow/attack.mjs";
import { isUnarmedStrike, equippedWeapons } from "../module/rules/unarmed.mjs";
import { isProficientWith, expandGrants } from "../module/rules/proficiency.mjs";
import { unarmedStrike, weaponProperties } from "../module/config/equipment.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const DIR = path.join(ROOT, "packs/_source/equipment");
const weapons = fs.readdirSync(DIR).map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))).filter(d => d.type === "weapon");

test("the Chapter 5 tables parse into 55 weapons, all in the compendium", () => {
  const rows = parseWeaponTables(fs.readFileSync(path.join(ROOT, "tools/content/sources/weapons.md"), "utf8"));
  assert.equal(rows.length, 55);
  const count = cat => rows.filter(r => r.category === cat).length;
  assert.deepEqual([count("simple"), count("martial"), count("exotic")], [15, 32, 8]);
  assert.equal(weapons.length, 55);
  assert.deepEqual(parseProperty("Thrown (30/60)"), { key: "thrown", rank: 1, range: { normal: 30, long: 60 } });
  assert.deepEqual(parseProperty("Deadly 2"), { key: "deadly", rank: 2 });
  assert.deepEqual(parseProperty("Two-Handed"), { key: "twoHanded", rank: 1 });
  assert.throws(() => parseProperty("Grapple"), /Unknown weapon property/);
});

test("every weapon has its base keyword, known properties, groups, and an ammunition die with Ammunition (d8) or Thrown (d4)", () => {
  for ( const w of weapons ) {
    const s = w.system;
    assert.deepEqual(s.keywords, [s.identifier], w.name);
    for ( const k of Object.keys(s.properties) ) assert.ok(k in weaponProperties, `${w.name}: ${k}`);
    assert.ok(s.groups.length >= 1 && s.groups.length <= 2, w.name);
    // ATK1: Thrown weapons without Ammunition carry a d4 die.
    assert.equal(s.ammo.usesDie, "ammunition" in s.properties || "thrown" in s.properties, w.name);
    if ( s.ammo.usesDie ) assert.deepEqual(s.ammo.steps, "ammunition" in s.properties ? [8, 6, 4, 1, 0] : [4, 1, 0], w.name);
  }
  const by = n => weapons.find(w => w.name === n).system;
  assert.equal(weapons.find(w => w.name === "Kunai")._id, "n5eKunaiWeapon01", "Kunai keeps its id");
  assert.deepEqual(by("Chokuto").damage.types, ["slashing", "piercing"]);
  assert.deepEqual(by("Combat Scroll").damage.types, [], "variable: the sealed echo's type");
  assert.equal(by("Tetsubo").damage.versatile, "2d6");
  assert.deepEqual(by("Fuma-Shuriken").range, { normal: 60, long: 120 });
  assert.equal(by("Weighted Chain").target.range.value, 15, "Reach 2");
  assert.equal(by("Hiya Taihou").properties.volatile, 4);
  assert.match(by("Battle Wire").description, /Trip Trap/);
});

test("proficiency over the imported weapons: simple pairs cover every simple weapon, universal tools need nothing", () => {
  const simple = expandGrants(["simple"]);
  for ( const w of weapons ) {
    assert.equal(isProficientWith(simple, { ...w.system, name: w.name }), w.system.category === "simple", w.name);
  }
  for ( const n of ["Kunai", "Shuriken", "Senbon"] ) {
    const w = weapons.find(x => x.name === n);
    assert.equal(isProficientWith([], { ...w.system, name: w.name }), true, n);
  }
});

test("the Unarmed Strike item rolls as an unarmed strike and isn't an equipped weapon", () => {
  const strike = structuredClone(unarmedStrike);
  assert.ok(isUnarmedStrike(strike));
  const a = makeActor({ items: [taiSpec(1), strike, load("equipment", "Kunai")] });
  const item = a.items.find(i => i.system.identifier === "unarmedStrike");
  const spec = weaponAttackSpec(a, item);
  assert.equal(spec.scope, "unarmed");
  assert.equal(spec.key, "unarmed");
  assert.deepEqual(spec.damage, weaponAttackSpec(a, null).damage);
  assert.deepEqual(equippedWeapons(a).map(w => w.name), a.items.filter(i => i.name === "Kunai" && i.system.equipped).map(i => i.name));
  assert.equal(isProficientWith([], { ...item.system, name: item.name }), true);
});
