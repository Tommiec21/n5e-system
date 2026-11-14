/** DATA1b: weapon base keywords and category + group proficiency (King 2026-11-13). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseWeaponKey, expandGrant, expandGrants, isProficientWith } from "../module/rules/proficiency.mjs";
import { migrateWeaponKeywords, migrateClassWeaponGrants } from "../module/migration/data1.mjs";

test("base weapon keys and grant expansion", () => {
  assert.equal(baseWeaponKey("Battle Wire"), "battleWire");
  assert.equal(baseWeaponKey("Fuma-Shuriken"), "fumaShuriken");
  assert.equal(baseWeaponKey("battleWire"), "battleWire", "already a key");
  assert.deepEqual(expandGrant("Simple"), ["simple:blade", "simple:flail", "simple:polearm", "simple:power", "simple:ammunition", "simple:thrown", "simple:unarmed"]);
  assert.deepEqual(expandGrant("martial:power"), ["martial:power"]);
  assert.deepEqual(expandGrant("one exotic"), ["one exotic"], "a free choice stays as text");
  assert.deepEqual(expandGrants(["Katana", "katana"]), ["katana"]);
});

test("proficiency: any one group of a multi-group weapon; base weapons; universal Kunai/Shuriken/Senbon; NPCs", () => {
  const granted = expandGrants(["simple:blade", "Katana"]);
  const multi = { category: "simple", groups: ["thrown", "blade"], name: "Throwing Knife" };
  assert.equal(isProficientWith(granted, multi), true);
  assert.equal(isProficientWith(granted, { category: "martial", groups: ["blade"], name: "Odachi" }), false);
  assert.equal(isProficientWith(granted, { category: "martial", groups: ["blade"], name: "Katana" }), true, "base weapon grant");
  assert.equal(isProficientWith([], { category: "simple", groups: ["thrown", "ammunition"], identifier: "kunai" }), true, "universal");
  assert.equal(isProficientWith([], { category: "exotic", groups: ["power"], name: "Giant Fan" }, { npc: true }), true);
  assert.equal(isProficientWith(expandGrants(["simple"]), { category: "simple", groups: [], name: "Homebrew Stick" }), true, "no groups: category alone");
  assert.equal(isProficientWith([], { category: "simple", groups: ["unarmed"], name: "Unarmed Strike" }), true);
});

test("migrations add base keywords and write categories out as pairs, and are idempotent", () => {
  const kunai = migrateWeaponKeywords({ type: "weapon", name: "Kunai", system: { identifier: "kunai", keywords: [] } });
  assert.deepEqual(kunai.system.keywords, ["kunai"]);
  assert.equal(migrateWeaponKeywords(kunai), null);
  const cls = migrateClassWeaponGrants({ type: "class", system: { weaponProficiencies: ["simple", "Battle Wire"] } });
  assert.equal(cls.system.weaponProficiencies.length, 8);
  assert.ok(cls.system.weaponProficiencies.includes("battleWire"));
  assert.equal(migrateClassWeaponGrants(cls), null);
});
