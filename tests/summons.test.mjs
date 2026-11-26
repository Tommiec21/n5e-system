/** Class & Clan Summons (King 2026-11-21): the Bunshin and the Void Soul, and summoner-linked numbers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { summonerData, summonerDelta, linkValue, mergeDeep } from "../module/rules/summoner-links.mjs";
import { alliedTokenData } from "../module/workflow/allied.mjs";

const dir = path.join(import.meta.dirname, "..", "packs/_source/summons");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const docs = walk(dir).map(f => ({ file: path.relative(dir, f), doc: JSON.parse(fs.readFileSync(f, "utf8")) }));
const npc = name => docs.find(d => d.doc.name === name)?.doc;

const caster = summonerData({
  prof: 4, level: 10, abilities: { str: { mod: 1 }, dex: { mod: 4 }, con: { mod: 2 }, int: { mod: 3 }, wis: { mod: 0 }, cha: { mod: -1 } },
  disciplines: { nin: { dc: 15, attack: 7 }, gen: { dc: 12, attack: 4 }, tai: { dc: 13, attack: 5 } },
  hp: { max: 73 }, speed: { walk: 40 }, saves: { str: { proficient: false }, con: { proficient: true } },
  skills: { ste: { total: 9, passive: 19 } }, traits: { senses: { darkvision: 60 } }, bonuses: { attack: { weapon: 1 } }
});

test("summoner links: single references keep their value; arithmetic is worked out; unknowns leave the template's", () => {
  assert.equal(linkValue("@dc.nin", caster), 15);
  assert.equal(linkValue("@saves.con.proficient", caster), true);
  assert.equal(linkValue("max(@str, @dex) + @bonuses.attack.weapon", caster), 5);
  assert.equal(linkValue("0 - floor(@prof / 2)", caster), -2);
  assert.equal(linkValue("@nothing.here + 1", caster), undefined);
  assert.equal(linkValue("alert(1)", caster), undefined, "no code beyond arithmetic");
  assert.deepEqual(summonerDelta({ "attributes.ac.flat": "@dc.nin", "details.level": "@level" }, caster), { attributes: { ac: { flat: 15 } }, details: { level: 10 } });
  assert.deepEqual(mergeDeep({ a: { b: 1, c: 2 } }, { a: { c: 3 } }), { a: { b: 1, c: 3 } });
});

test("Class & Clan Summons: Scout-Nin > Cloning Scout holds the Bunshin; Scout-Nin > Void Heart Scout the Void Soul", () => {
  const folders = docs.filter(d => d.doc._key.startsWith("!folders!")).map(d => d.doc);
  const byId = Object.fromEntries(folders.map(f => [f._id, f]));
  const chain = doc => { const out = []; for ( let f = byId[doc.folder]; f; f = byId[f.folder] ) out.unshift(f.name); return out.join(" > "); };
  assert.ok(folders.every(f => f.type === "Actor"));
  assert.equal(chain(npc("Bunshin")), "Scout-Nin > Cloning Scout");
  assert.equal(chain(npc("Void Soul")), "Scout-Nin > Void Heart Scout");
  const system = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "system.json"), "utf8"));
  assert.equal(system.packs.find(p => p.name === "summons")?.type, "Actor");
});

test("Bunshin: 1 HP, 30 ft., AC your Ninjutsu DC, Bunshin Strike 1d6, Bunshins Cast by rank; your attack, DCs, skills and senses", () => {
  const b = npc("Bunshin");
  assert.deepEqual([b.type, b.system.hpMax, b.system.traits.speed.walk, b.system.attributes.ac.calc, b.system.details.template], ["npc", 1, 30, "flat", "clone"]);
  const linked = summonerDelta(b.flags.n5e.fromSummoner, caster);
  assert.equal(linked.attributes.ac.flat, 15);
  // King 2026-11-25: its totals are yours (an override of the total, whatever its own abilities).
  assert.equal(linked.override.attack.nin, 7, "your +7");
  assert.equal(linked.override.dc.nin, 15, "your DC 15");
  assert.equal(linked.skills.ste.bonus, 9);
  assert.equal(linked.traits.senses.darkvision, 60);
  const strike = b.items.find(i => i.name === "Bunshin Strike").system.activities[0];
  assert.deepEqual([strike.type, strike.damage.parts[0].formula], ["attack", "1d6"]);
  assert.deepEqual(b.items.find(i => i.name === "Bunshins Cast").system.activities.map(a => a.damage.parts[0].formula), ["2d6", "3d6", "4d6", "5d6", "6d6"]);
  assert.deepEqual(b.items.filter(i => i.system.category === "npcTraits").map(i => i.name), ["Limited Casting I", "Placement", "Basic Tools", "Gang Up", "Hiding In Plain Sight"]);
});

test("Void Soul: Medium Construct, AC 8 + Dex + Con + Prof, immune to Charmed, darkvision 30; your level, hit points, speed and saves", () => {
  const v = npc("Void Soul");
  assert.deepEqual([v.system.details.creatureType, v.system.attributes.ac.formula, v.system.traits.conditionImmune, v.system.traits.senses.darkvision],
    ["construct", "8 + @dex + @con + @prof", ["charmed"], 30]);
  const linked = summonerDelta(v.flags.n5e.fromSummoner, caster);
  assert.deepEqual([linked.hpMax, linked.traits.speed.walk, linked.details.level, linked.saves.con.proficient, linked.saves.str.proficient], [73, 40, 10, true, false]);
  const strike = v.items.find(i => i.name === "Unarmed Strike").system.activities[0];
  assert.deepEqual([strike.damage.parts[0].formula, strike.damage.parts[0].type], ["1d6 + @str", "bludgeoning"]);
});

test("a summoned token carries its links and its summoner (and, SUMM1, the cast rank)", () => {
  const [t] = alliedTokenData({ name: "Bunshin", delta: { system: { details: { blurb: "x" } } } },
    { count: 1, positions: [{ x: 0, y: 0 }], ownerId: "u1", casterUuid: "Actor.me", itemId: "i", itemUuid: "Actor.me.Item.i", expires: 60, linked: { attributes: { ac: { flat: 15 } } } });
  assert.deepEqual(t.delta.system, { details: { blurb: "x", summoner: "Actor.me", summonRank: "" }, attributes: { ac: { flat: 15 } }, allied: true });
});

test("Tajū Kage Bunshin, Superior Clones and Void Heart Mask place the summons", () => {
  const f = id => JSON.parse(fs.readFileSync(walk(path.join(import.meta.dirname, "..", "packs/_source/features")).find(p => p.includes(`/${id}-`)), "utf8"));
  const uuid = n => `Compendium.n5e.summons.Actor.${npc(n)._id}`;
  for ( const id of ["taj-kage-bunshin-cloning-scout", "superior-clones-cloning-scout"] ) {
    assert.equal(f(id).system.activities.find(a => a.type === "summon").summon.uuid, uuid("Bunshin"), id);
  }
  const mask = f("void-heart-mask-void-heart-scout");
  assert.equal(mask.system.activities.find(a => a.type === "summon").summon.uuid, uuid("Void Soul"));
  assert.equal(mask.system.duration.unit, "day");
});
