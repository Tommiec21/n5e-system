import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { migrateV31Item, migrateV31Actor, isV31Item, guessRank } from "../module/migration/v31.mjs";

/** Old V3.1 NeDB packs can be dropped into tests/fixtures/v31/ (not committed); tests skip if absent. */
const FIXTURES = process.env.N5E_V31_PACKS ?? path.join(import.meta.dirname, "fixtures", "v31");
const readDb = file => fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const haveFixtures = fs.existsSync(FIXTURES);

test("V3.1 Non-Elemental jutsu packs migrate without errors", { skip: !haveFixtures && "no V3.1 fixtures" }, () => {
  const files = fs.readdirSync(FIXTURES).filter(f => /^non-elemental-.*\.db$/.test(f));
  let count = 0;
  for ( const file of files ) {
    const expectedRank = /-([edcb])-rank/.exec(file)[1].toUpperCase();
    for ( const doc of readDb(path.join(FIXTURES, file)) ) {
      // Simulate a world item imported from the old pack.
      doc.flags = { core: { sourceId: `Compendium.n5e.${file.replace(".db", "")}.${doc._id}` } };
      const { changed } = migrateV31Item(doc);
      assert.ok(changed, doc.name);
      assert.equal(doc.type, "jutsu");
      assert.equal(doc.system.rank, expectedRank, `${doc.name} rank`);
      assert.ok(doc.system.cost.value >= 0);
      assert.equal(doc.data, undefined);
      assert.ok(!isV31Item(doc), "idempotent");
      count++;
    }
  }
  assert.equal(count, 139);
});

test("V3.1 item pack migrates every document type", { skip: !haveFixtures && "no V3.1 fixtures" }, () => {
  const file = path.join(FIXTURES, "items.db");
  if ( !fs.existsSync(file) ) return;
  const types = {};
  for ( const doc of readDb(file) ) {
    const before = doc.type;
    migrateV31Item(doc);
    types[`${before}->${doc.type}`] = (types[`${before}->${doc.type}`] ?? 0) + 1;
    assert.ok(["weapon", "armor", "consumable", "toolkit", "container", "loot"].includes(doc.type), `${doc.name}: ${doc.type}`);
  }
  console.log(types);
});

test("jutsu rank guess falls back to upcast text", () => {
  const sys = { description: { value: "<p>At Higher Ranks: For each rank you cast this jutsu above C-Rank...</p>" }, level: 1 };
  assert.equal(guessRank({}, sys).rank, "C");
});

test("V3.1 actor maps chakra, skills, saves, speed; drops Crafting and retired conditions", () => {
  const actor = {
    name: "Test", type: "character",
    data: {
      abilities: { str: { value: 14, proficient: 1 }, dex: { value: 12 }, con: { value: 15 } },
      attributes: { hp: { value: 20, max: 24 }, ch: { value: 12, max: 18 }, movement: { walk: 35 },
        "will-of-fire": { value: 2 }, senses: { chakrasight: 30 } },
      skills: { ste: { value: 2 }, ath: { value: 1 }, cra: { value: 1 } },
      traits: { size: "med", dr: { value: ["fire", "radiant"] }, ci: { value: ["frightened"] } },
      currency: { ryo: 300 }
    },
    items: [{ name: "Old Jutsu", type: "spell", data: { level: 1, consume: { target: "attributes.ch.value", amount: 4 } } }],
    effects: [{ name: "Frightened", statuses: ["frightened"] }, { name: "Bless", statuses: [] }]
  };
  const { changed, log } = migrateV31Actor(actor, { conditionKeys: new Set(["blinded"]) });
  assert.ok(changed);
  assert.equal(actor.system.cp.value, 12);
  assert.equal(actor.system.hp.value, 20);
  assert.ok(actor.system.saves.str.proficient);
  assert.ok(actor.system.skills.ath.proficient);
  assert.ok(actor.system.skills.ste.proficient);
  assert.deepEqual(actor.system.mastery.sources, [{ target: "skill.ste", source: "Migrated (V3.1 expertise)" }]);
  assert.equal(actor.system.skills.cra, undefined);
  assert.equal(actor.system.traits.speed.walk, 35);
  assert.equal(actor.system.traits.senses.chakraSight, 30);
  assert.deepEqual(actor.system.traits.resist, ["fire"]);
  assert.equal(actor.system.willOfFire.value, 2);
  assert.equal(actor.system.currency.ryo, 300);
  assert.equal(actor.items[0].type, "jutsu");
  assert.equal(actor.items[0].system.cost.value, 4);
  assert.equal(actor.effects.length, 1);
  assert.ok(log.some(l => /Crafting/.test(l)));
  assert.ok(log.some(l => /frightened/.test(l)));
});

test("vehicle actors become NPCs", () => {
  const actor = { name: "Cart", type: "vehicle", system: { attributes: { hp: { value: 30, max: 30 } } } };
  migrateV31Actor(actor);
  assert.equal(actor.type, "npc");
  assert.equal(actor.system.hpMax, 30);
});
