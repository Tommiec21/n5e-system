/**
 * End-to-end derived-data checks on the real data models (with a Node stand-in for Foundry's fields),
 * using the sample compendium content. Mirrors the alpha.1 test checklist.
 */
import "./helpers/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import N5E from "../module/config/index.mjs";
import { actorModels, itemModels, effectModels } from "../module/data/_index.mjs";

globalThis.CONFIG = { N5E };

const SRC = path.join(import.meta.dirname, "..", "packs", "_source");
function load(pack, idPart) {
  const dir = path.join(SRC, pack);
  const file = fs.readdirSync(dir).find(f => f.includes(idPart));
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
}

/** Build a minimal actor: items prepared first, then the actor (Foundry's order). */
function makeActor({ type = "character", system = {}, items = [], conditions = [], n5eChanges = [], acCalc } = {}) {
  const actor = { items: [], appliedEffects: [], _n5eChanges: n5eChanges };
  for ( const src of items ) {
    const item = { name: src.name, type: src.type, actor, getFlag: () => null };
    item.system = new itemModels[src.type](src.system, { parent: item });
    actor.items.push(item);
  }
  for ( const c of conditions ) {
    const e = { type: "condition" };
    e.system = new effectModels.condition(c, { parent: e });
    actor.appliedEffects.push(e);
  }
  actor.system = new actorModels[type](system, { parent: actor });
  for ( const i of actor.items ) { i.system.prepareBaseData?.(); i.system.prepareDerivedData?.(); }
  for ( const e of actor.appliedEffects ) e.system.prepareDerivedData?.();
  actor.system.prepareBaseData();
  if ( acCalc ) actor.system.attributes.ac.calc = acCalc;   // what the Martial Technique effect does
  actor.system.prepareDerivedData();
  return actor;
}

const taiSpec = (levels = 1) => {
  const c = load("classes", "TaiSpec");
  c.system.levels = levels;
  return c;
};
const baseAbilities = { abilities: { str: { value: 16 }, dex: { value: 14 }, con: { value: 14 }, int: { value: 10 },
  wis: { value: 12 }, cha: { value: 8 } } };

test("level 1 Taijutsu Specialist, +2 Con: HP 24, CP 18, prof +3, AC 13 + Dex", () => {
  const a = makeActor({ system: baseAbilities, items: [taiSpec(1), load("features", "MartialTech")], acCalc: "martialTechnique" });
  const s = a.system;
  assert.equal(s.level, 1);
  assert.equal(s.prof, 3);
  assert.equal(s.hp.max, 24);
  assert.equal(s.cp.max, 18);
  assert.equal(s.ac.value, 15, "10 + 3 + Dex 2");
  assert.equal(s.hitDice.die, "d12");
  assert.equal(s.chakraDice.die, "d6");
  // Class saves Str/Dex/Cha: Str save = 3 + 3; Con save not proficient = 2 + floor(3/2).
  assert.equal(s.saves.str.total, 6);
  assert.equal(s.saves.con.total, 3);
  // Martial Arts from the class: Str 3 + prof 3.
  assert.equal(s.skills.mar.total, 6);
  assert.ok(s.tools.trappers.isProficient);
  // Disciplines: Tai = Str, DC 8 + 3 + 3 = 14, attack +6.
  assert.equal(s.disciplines.tai.dc, 14);
  assert.equal(s.disciplines.tai.attack, 6);
  assert.equal(s.disciplines.nin.dc, 11);
  assert.equal(s.initiative.total, 3, "Dex 2 + floor(3/2)");
  assert.equal(s.inventory.slots, 16, "10 + 2 x Str 3");
});

test("level 7: +14 HP per level, prof +5, Mastery cap 2, one ASI Mastery rank to assign", () => {
  const a = makeActor({ system: baseAbilities, items: [taiSpec(7)] });
  const s = a.system;
  assert.equal(s.hp.max, 24 + 6 * 14);
  assert.equal(s.prof, 5);
  assert.equal(s.asi.masteryCap, 2);
  assert.equal(s.mastery.asiAvailable, 1);
  // Assigning it removes the reminder and gives +2 (rank 1).
  const b = makeActor({ system: { ...baseAbilities, mastery: { sources: [{ target: "skill.ste", source: "ASI 4" }] } },
    items: [taiSpec(7)] });
  assert.equal(b.system.mastery.asiAvailable, 0);
  assert.equal(b.system.skills.ste.mastery, 1);
  assert.equal(b.system.skills.ste.total, 2 + 0 + 2, "Dex 2, not proficient, Mastery +2");
});

test("Mastery is capped by level even with three sources", () => {
  const sources = ["a", "b", "c"].map(s => ({ target: "skill.prc", source: s }));
  const lvl5 = makeActor({ system: { ...baseAbilities, mastery: { sources } }, items: [taiSpec(5)] });
  assert.equal(lvl5.system.skills.prc.mastery, 1);
  const lvl12 = makeActor({ system: { ...baseAbilities, mastery: { sources } }, items: [taiSpec(12)] });
  assert.equal(lvl12.system.skills.prc.mastery, 3);
  // n5e.mastery.* effects count as sources too.
  const fx = makeActor({ system: baseAbilities, items: [taiSpec(7)],
    n5eChanges: [{ key: "n5e.mastery.skill.prc", value: "Byakugan" }, { key: "n5e.mastery.skill.prc", value: "Feat" }] });
  assert.equal(fx.system.skills.prc.mastery, 2);
});

test("Exhaustion 3 + Sealed 2: AC -3, save DCs -3, Ninjutsu cost +8 on the jutsu", () => {
  const nin = load("jutsu", "DynamicEntry");
  nin.system.discipline = "nin";
  const a = makeActor({ system: baseAbilities, items: [taiSpec(1), nin, load("jutsu", "DynamicEntry")],
    conditions: [{ key: "exhaustion", ranks: 3 }, { key: "sealed", ranks: 2 }], acCalc: "martialTechnique" });
  const s = a.system;
  assert.equal(s.ac.value, 12, "15 - 3");
  assert.equal(s.disciplines.tai.dc, 11, "14 - 3");
  assert.equal(s.exhaustion, 3);
  const [ninJutsu, taiJutsu] = a.items.filter(i => i.type === "jutsu");
  assert.equal(ninJutsu.system.live.cost, 4 + 8, "Sealed adds to Ninjutsu base cost");
  assert.equal(taiJutsu.system.live.cost, 4, "Taijutsu unaffected by Sealed");
});

test("jutsu live numbers: DC, attack, upcast range, ability requirement", () => {
  const a = makeActor({ system: baseAbilities, items: [taiSpec(9), load("jutsu", "LeafHurrican")] });
  const j = a.items.find(i => i.type === "jutsu").system;
  assert.equal(j.live.dc, 8 + 5 + 3, "level 9: prof +5, Str +3");
  assert.deepEqual(j.live.upcastRanks, ["B"], "C-Rank jutsu at level 9 can upcast to B");
  assert.equal(j.computeCost(a.system, "B").cost, 11, "8 + 3 per rank");
  // B-Rank needs 16 in the jutsu's ability.
  const bRank = load("jutsu", "LeafHurrican");
  bRank.system.rank = "B";
  const weak = makeActor({ system: { abilities: { str: { value: 15 } } }, items: [taiSpec(9), bRank] });
  assert.equal(weak.items[1].system.live.meetsRequirement, false);
});

test("n5e.cost and n5e.saveDC change keys apply with the half-base floor", () => {
  const a = makeActor({ system: baseAbilities, items: [taiSpec(5), load("jutsu", "LeafHurrican")],
    n5eChanges: [{ key: "n5e.cost.tai", value: "-10" }, { key: "n5e.saveDC.tai", value: "1" }] });
  const j = a.items[1].system;
  assert.equal(j.live.cost, 4, "8 - 10, floored at half base");
  assert.equal(a.system.disciplines.tai.dc, 8 + 3 + 4 + 1);
});

test("armor, reinforced DR, containers, encumbrance", () => {
  const jacket = load("equipment", "ShinobiJacket");
  jacket.system.equipped = true;
  const pack = load("equipment", "Backpk");
  pack.system.equipped = true;
  const a = makeActor({ system: baseAbilities, items: [taiSpec(1), jacket, pack], acCalc: "martialTechnique" });
  assert.equal(a.system.ac.value, 10 + 4 + 2 + 1, "Martial Technique falls back to armor formula while armored");
  assert.equal(a.system.dr, 2, "Reinforced (2)");
  assert.equal(a.system.inventory.slots, 26);
  assert.equal(a.system.inventory.used, 3);
  const heavy = load("equipment", "Kunai");
  heavy.system.quantity = 20;
  const b = makeActor({ system: baseAbilities, items: [taiSpec(1), heavy] });
  assert.ok(b.system.inventory.encumbered);
  assert.equal(b.system.speed.walk, 15);
});

test("clan grants: speed, skills, affinity, Hijutsu Flexibility; resource pool formula", () => {
  const clan = load("clans", "Uchiha");
  const a = makeActor({ system: { ...baseAbilities, resources: { ocular: clan.system.resourcePools[0] } },
    items: [taiSpec(1), clan] });
  assert.ok(a.system.skills.ins.isProficient);
  assert.ok(a.system.grants.affinities.has("fire"));
  assert.deepEqual(a.system.grants.hijutsuAbilities, ["int", "wis"]);
  assert.equal(a.system.resources.ocular.maxValue, 4, "1 + prof 3");
});

test("NPC stat-block overrides and summon template fields", () => {
  const n = makeActor({ type: "npc", system: { details: { level: 5, template: "clone" }, hpMax: 1, cpMax: 0 } });
  assert.equal(n.system.hp.max, 1);
  assert.equal(n.system.level, 5);
  assert.equal(n.system.prof, 4);
});
