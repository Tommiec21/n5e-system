/**
 * NT1 (King 2026-11-24): jutsu slots. Class jutsu count toward the class's Jutsu Known; Bonus Jutsu come
 * from features, feats and traits (slots, and jutsu granted outright); nothing blocks, problems alert;
 * the level-up window lists no jutsu and open slots don't hold up Apply.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  learnedMode, jutsuSlots, assignSlot, learnProblems, matchesFilter, browserFilters, bonusSources
} from "../module/rules/jutsu-slots.mjs";
import { validate, stepsForLevel } from "../module/advancement/steps.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const jutsu = (name, sys = {}, extra = {}) => ({ type: "jutsu", name, id: name, system: { rank: "D", discipline: "nin", keywords: [], learned: { mode: "class" }, ...sys }, ...extra });
const feature = (id, name, sys = {}) => ({ type: "feat", id, name, uuid: `Actor.a.Item.${id}`, _stats: { compendiumSource: `Compendium.n5e.features.Item.${id}` }, system: { grants: { jutsu: [] }, bonusJutsu: { count: 0 }, ...sys } });
const actor = (items, { known = 3, level = 1, maxRank = "D", affinities = [] } = {}) => {
  const cls = { type: "class", id: "cls", name: "Ninjutsu Specialist", system: { levels: level, jutsuKnown: Array.from({ length: 20 }, () => known), jutsuKnownNow: known } };
  return { name: "Kenji", items: [cls, ...items], system: { grants: { classItem: cls, maxRank, affinities: new Set(affinities) } } };
};

test("NT1: learned mode reads old data (known = class, granted = bonus)", () => {
  assert.equal(learnedMode(jutsu("A", { learned: { mode: "known" } })), "class");
  assert.equal(learnedMode(jutsu("A", { learned: { mode: "granted" } })), "bonus");
  assert.equal(learnedMode(jutsu("A", { learned: { mode: "bonus" } })), "bonus");
  assert.equal(learnedMode(jutsu("A", { learned: undefined })), "class");
});

test("NT1: class and bonus slots are derived; a feature's slots and its outright grants are Bonus Jutsu", () => {
  const blaze = feature("blaze", "Blaze Walker", { bonusJutsu: { count: 2, section: "fire-release" } });
  const reaper = feature("reaper", "Reaper's Tools", { grants: { jutsu: ["Compendium.n5e.jutsu.Item.seal"] } });
  const a = actor([
    jutsu("Clone"), jutsu("Fireball", { section: "fire-release", learned: { mode: "bonus", source: blaze._stats.compendiumSource } }),
    jutsu("Death Seal", { learned: { mode: "bonus", source: reaper.id } }, { _stats: { compendiumSource: "Compendium.n5e.jutsu.Item.seal" } }),
    blaze, reaper
  ]);
  const s = jutsuSlots(a);
  assert.deepEqual([s.class.used, s.class.max, s.class.open], [1, 3, 2]);
  assert.deepEqual([s.bonus.used, s.bonus.max, s.bonus.open], [2, 3, 1]);
  const b = s.bonus.sources.find(x => x.name === "Blaze Walker");
  assert.deepEqual([b.used, b.max, b.open], [1, 2, 1]);
  const r = s.bonus.sources.find(x => x.name === "Reaper's Tools");
  assert.deepEqual([r.used, r.max, r.open], [1, 1, 0], "the outright grant fills its own count, no slot to pick");
  assert.equal(s.open, 3);
  assert.equal(bonusSources(a).length, 2);
});

test("NT1: a new jutsu takes a class slot first, then a fitting bonus slot; with none open it is over the limit", () => {
  const blaze = feature("blaze", "Blaze Walker", { bonusJutsu: { count: 1, section: "fire-release" } });
  const fire = jutsu("Fire Ball", { section: "fire-release" });
  const open = actor([blaze], { known: 1 });
  assert.equal(assignSlot(open, fire).mode, "class");
  const full = actor([jutsu("Clone"), blaze], { known: 1 });
  const pick = assignSlot(full, fire);
  assert.deepEqual([pick.mode, pick.grantedBy, pick.source], ["bonus", "Blaze Walker", "Compendium.n5e.features.Item.blaze"]);
  const none = actor([jutsu("Clone"), jutsu("Ember", { learned: { mode: "bonus", source: "blaze" } }), blaze], { known: 1 });
  assert.equal(assignSlot(none, fire).overLimit, true);
  assert.equal(assignSlot(none, fire).mode, "class");
});

test("NT1: learning problems are reasons, never blocks (rank, affinity, Hijutsu, Kinjutsu, slot limits)", () => {
  const keywords = { "fire-release": { label: "Fire Release", affinity: "fire" } };
  const a = actor([{ type: "clan", system: { identifier: "uchiha", branch: "" } }], { maxRank: "D" });
  assert.match(learnProblems(a, jutsu("Big", { rank: "B" }))[0], /above the highest rank/);
  assert.match(learnProblems(a, jutsu("Fire", { keywords: ["fire-release"] }), { keywords })[0], /affinity/);
  assert.deepEqual(learnProblems(actor([], { affinities: ["fire"] }), jutsu("Fire", { keywords: ["fire-release"] }), { keywords }), []);
  assert.match(learnProblems(a, jutsu("Byakugan", { hijutsu: { clan: "hyuga" } }))[0], /another clan/);
  assert.deepEqual(learnProblems(a, jutsu("Sharingan", { hijutsu: { clan: "uchiha" }, keywords: ["fire-release"] }), { keywords }), [], "Hijutsu skip the affinity check");
  assert.match(learnProblems(a, jutsu("Forbidden", { keywords: ["kinjutsu"] }))[0], /Kinjutsu/);
  assert.match(learnProblems(a, jutsu("Mist", { section: "water-release" }), { filter: { section: "fire-release" } })[0], /slot's limits/);
});

test("NT1: slot filters and the browser presets (all removable)", () => {
  const j = jutsu("Slash", { rank: "C", discipline: "tai", keywords: ["bukijutsu", "blade"], section: "blade" });
  assert.ok(matchesFilter(j, { discipline: "buki", keyword: "blade", maxRank: "C" }));
  assert.ok(!matchesFilter(j, { maxRank: "D" }));
  assert.deepEqual(browserFilters({ maxRank: "C" }), { rank: ["E", "D", "C"] });
  assert.deepEqual(browserFilters({ maxRank: "B", filter: { maxRank: "D", section: "fire-release", keyword: "medical" } }), { rank: ["E", "D"], section: ["fire-release"], keywords: ["medical"] });
});

test("NT1: the level-up's jutsu step is the open class slots and never holds up Apply", () => {
  const steps = [{ id: "class:jutsu", type: "jutsu", title: "Learn jutsu", count: 4 }, { id: "bonus:x", type: "bonusJutsu", title: "Bonus jutsu: X", count: 2 }];
  assert.deepEqual(validate(steps, {}), []);
  const cls = { type: "class", name: "Test", system: { levels: 1, hitDie: "d8", chakraDie: "d8", jutsuKnown: [3, 5, ...Array(18).fill(5)], maxRank: Array(20).fill("D"), advancement: [], subclasses: [] } };
  const a = { system: { level: 1, abilities: { con: { mod: 0 } } }, items: [cls, jutsu("Clone"), jutsu("Gift", { learned: { mode: "bonus" } })] };
  const st = stepsForLevel({ actor: a, cls, level: 2 }).find(s => s.type === "jutsu");
  assert.deepEqual([st.count, st.gain, st.carried], [4, 2, 2], "5 known at 2nd, 1 class jutsu known: 4 open (2 new, 2 left from 1st); the bonus jutsu doesn't count");
});

test("NT1: the level-up window no longer loads the jutsu list; the sheet, browser and item sheet wire the slots", () => {
  const lu = fs.readFileSync(path.join(ROOT, "module/applications/level-up.mjs"), "utf8");
  assert.ok(!lu.includes('#packDocs("jutsu"'), "no full jutsu list");
  assert.ok(lu.includes("openJutsuBrowser"));
  assert.match(fs.readFileSync(path.join(ROOT, "templates/apps/level-up.hbs"), "utf8"), /data-jutsu-step/);
  assert.match(fs.readFileSync(path.join(ROOT, "templates/apps/compendium-browser-results.hbs"), "utf8"), /Learning for/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/applications/actor/character-sheet.mjs"), "utf8"), /learnJutsu\(actor, item\)/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/view-models/item.mjs"), "utf8"), /section\("Bonus Jutsu"/);
});
