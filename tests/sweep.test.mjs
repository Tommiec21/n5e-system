/**
 * Feature sweep (King 2026-11-25): class and clan features that grant jutsu work with the NT1 slots.
 * Level grants (grants.jutsuByLevel), slots at listed levels (atLevels), slots equal to the proficiency
 * bonus (countBy "prof"), Nature Release slots with a minimum rank, and slots for named jutsu (uuids).
 */
import "./helpers/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { bonusCount, matchesFilter, bonusSources, browserFilters } from "../module/rules/jutsu-slots.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const find = (dir, part) => {
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const f = walk(path.join(ROOT, "packs/_source", dir)).filter(p => path.basename(p).includes(part));
  assert.equal(f.length, 1, part);
  return JSON.parse(fs.readFileSync(f[0], "utf8"));
};
const jutsu = (name, sys = {}, extra = {}) => ({ type: "jutsu", name, id: name, system: { rank: "D", discipline: "nin", keywords: [], ...sys }, ...extra });

test("Sweep: slot counts at listed levels and by proficiency bonus", () => {
  assert.equal(bonusCount({ atLevels: "3, 9, 14" }, 2, 2), 0);
  assert.equal(bonusCount({ atLevels: "3, 9, 14" }, 9, 4), 2);
  assert.equal(bonusCount({ atLevels: "3, 9, 14" }, 20, 6), 3);
  assert.equal(bonusCount({ countBy: "prof" }, 5, 3), 3);
  assert.equal(bonusCount({ count: 2 }, 1, 2), 2);
});

test("Sweep: Nature Release, minimum rank and named-jutsu filters", () => {
  const fire = jutsu("Fire", { rank: "C", keywords: ["fireRelease"] });
  assert.ok(matchesFilter(fire, { nature: true, minRank: "C", maxRank: "C" }));
  assert.ok(!matchesFilter(fire, { nature: true, minRank: "B" }));
  assert.ok(!matchesFilter(jutsu("Clone", { rank: "C" }), { nature: true }));
  const named = jutsu("Zephyr", {}, { _stats: { compendiumSource: "Compendium.n5e.jutsu.Item.z" } });
  assert.ok(matchesFilter(named, { uuids: ["Compendium.n5e.jutsu.Item.z"] }));
  assert.ok(!matchesFilter(jutsu("Other"), { uuids: ["Compendium.n5e.jutsu.Item.z"] }));
  assert.deepEqual(browserFilters({ maxRank: "S", filter: { minRank: "C", maxRank: "C" } }).rank, ["C"]);
});

test("Sweep: level grants count toward the feature once the level is reached", () => {
  const reaper = { type: "feat", id: "r", name: "Reaper's Techniques", uuid: "Actor.a.Item.r", system: { bonusJutsu: { count: 0 },
    grants: { jutsu: [], jutsuByLevel: [{ uuid: "Compendium.n5e.jutsu.Item.m", level: 2 }, { uuid: "Compendium.n5e.jutsu.Item.c", level: 10 }] } } };
  const cls = { type: "class", id: "cls", name: "Medical-nin", system: { levels: 6 } };
  const a = { name: "Kenji", items: [cls, reaper], system: { level: 6, attributes: { prof: 3 } } };
  const src = bonusSources(a).find(s => s.name === "Reaper's Techniques");
  assert.equal(src.fixed.length, 1, "only the 2nd-level grant at 6th");
});

test("Sweep: the class and clan features carry their grants", () => {
  const id = u => u.split(".").pop();
  const reaper = find("features", "reapers-techniques-").system.grants.jutsuByLevel;
  assert.deepEqual(reaper.map(g => g.level), [2, 2, 6, 6, 10, 14]);
  const savant = find("features", "mobile-savant-pathfinder-scout").system.bonusJutsu;
  assert.equal(savant.atLevels.replace(/\s/g, ""), "3,9,14");
  assert.equal(savant.uuids.length, 4);
  assert.equal(find("features", "superior-clones-cloning-scout").system.grants.jutsu.length, 1);
  assert.equal(find("features", "void-heart-mask-void-heart-scout").system.bonusJutsu.countBy, "prof");
  assert.equal(find("clans", "deep-sea-predator-commander-of-the-deep").system.grants.jutsu.length, 1);
  assert.equal(id(find("clans", "mutation-full-sage-undiluted-rage").system.grants.jutsu[0]), "c9c3cbacfe7d0147");
  assert.deepEqual(find("clans", "hoshigaki-latent-commander-of-the-deep").system.grants.jutsuByLevel.map(g => g.level), [11]);
  for ( const [r, lvl, rank] of [["i-", "3", "D"], ["ii-", "7", "C"], ["iii-", "15", "B"], ["iiii-", "18", "A"]] ) {
    const b = find("clans", `sarutobi-latent-advanced-nature-proficiency-${r}`).system.bonusJutsu;
    assert.deepEqual([b.atLevels, b.nature, b.minRank, b.maxRank, b.discipline], [lvl, true, rank, rank, "nin"]);
  }
  // Every granted uuid resolves to a jutsu (or the Full Sage clan item) in the packs.
  const ids = new Set();
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(d, e.name))
    : e.name.endsWith(".json") && ids.add(JSON.parse(fs.readFileSync(path.join(d, e.name), "utf8"))._id));
  walk(path.join(ROOT, "packs/_source/jutsu")); walk(path.join(ROOT, "packs/_source/clans"));
  for ( const u of [...reaper.map(g => g.uuid), ...savant.uuids] ) assert.ok(ids.has(id(u)), u);
});
