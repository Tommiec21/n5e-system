/**
 * LVL1 L1 (King 2026-11-24): the ability score requirement blocks learning (B 16, A 18, S 20; not Hijutsu);
 * a granted jutsu already known becomes a replacement Bonus Jutsu slot (same discipline and section, up to
 * its rank); deleting a granted jutsu alerts (rules/jutsu-slots.mjs, workflow/learn-jutsu.mjs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { learnBlock, replacementFor, jutsuSlots, assignSlot } from "../module/rules/jutsu-slots.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const jutsu = (name, sys = {}, extra = {}) => ({ type: "jutsu", name, id: name, system: { rank: "D", discipline: "nin", keywords: [], learned: { mode: "class" }, ...sys }, ...extra });
const actor = (scores, items = [], more = {}) => ({ name: "Kenji", items,
  system: { abilities: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, { value: v }])),
    disciplines: { nin: { ability: "int" }, gen: { ability: "wis" }, tai: { ability: "str" } }, grants: { maxRank: "S" }, ...more } });

test("LVL1 L1: B 16 / A 18 / S 20 in the jutsu's ability block learning; Hijutsu and lower ranks don't", () => {
  const a = actor({ int: 15, wis: 18, str: 10 });
  assert.match(learnBlock(a, jutsu("Big Fire", { rank: "B" })), /needs INT 16/);
  assert.equal(learnBlock(a, jutsu("Small Fire", { rank: "C" })), "");
  assert.equal(learnBlock(a, jutsu("Mind", { rank: "A", discipline: "gen" })), "", "Wis 18 meets A-Rank");
  assert.match(learnBlock(a, jutsu("Mind S", { rank: "S", discipline: "gen" })), /WIS 20/);
  assert.equal(learnBlock(a, jutsu("Clan", { rank: "S", hijutsu: { clan: "uchiha" } })), "", "Hijutsu are exempt");
  assert.equal(learnBlock(a, jutsu("Override", { rank: "B", ability: "wis" })), "", "the jutsu's own ability");
  assert.equal(learnBlock(a, jutsu("Both", { rank: "B", disciplines: ["nin", "gen"] })), "", "any listed discipline's ability (MDISC1)");
  const alt = actor({ int: 10, cha: 16 }, [], { modifiers: { keywordAbility: { "discipline:nin": ["cha"] } } });
  assert.equal(learnBlock(alt, jutsu("Charm", { rank: "B" })), "", "a keyword ability alternative counts");
});

test("LVL1 L1: a granted jutsu already known gives a replacement slot: same discipline and section, up to its rank", () => {
  const seal = jutsu("Slash", { rank: "C", discipline: "tai", keywords: ["bukijutsu"], section: "blade" }, { uuid: "Compendium.n5e.jutsu.Item.slash" });
  assert.deepEqual(replacementFor(seal), { jutsu: "Compendium.n5e.jutsu.Item.slash", name: "Slash", discipline: "buki", section: "blade", maxRank: "C" });
  const feat = { type: "feat", id: "f1", name: "Reaper's Tools", uuid: "Actor.a.Item.f1", _stats: { compendiumSource: "Compendium.n5e.features.Item.f1" },
    system: { grants: { jutsu: ["Compendium.n5e.jutsu.Item.slash"] }, bonusJutsu: { count: 0 } }, flags: { n5e: { replacementSlots: [replacementFor(seal)] } } };
  const cls = { type: "class", system: { levels: 1, jutsuKnownNow: 1 } };
  const a = { name: "K", items: [cls, jutsu("Slash", seal.system), feat], system: { grants: { classItem: cls } } };
  const s = jutsuSlots(a);
  const r = s.bonus.sources.find(x => x.replaces);
  assert.equal(r.name, "Reaper's Tools (instead of Slash)");
  assert.deepEqual([r.open, r.filter.discipline, r.filter.section, r.filter.maxRank], [1, "buki", "blade", "C"]);
  const pick = assignSlot(a, jutsu("Cleave", { rank: "C", discipline: "tai", keywords: ["bukijutsu"], section: "blade" }));
  assert.deepEqual([pick.mode, pick.source], ["bonus", "Compendium.n5e.features.Item.f1#Compendium.n5e.jutsu.Item.slash"]);
  const filled = { ...a, items: [...a.items, jutsu("Cleave", { learned: { mode: "bonus", source: pick.source } })] };
  assert.equal(jutsuSlots(filled).bonus.sources.find(x => x.replaces).open, 0);
});

test("LVL1 L1: learning, the level-up window and the sheet wire the block, the replacement and the delete alert", () => {
  const lj = fs.readFileSync(path.join(ROOT, "module/workflow/learn-jutsu.mjs"), "utf8");
  assert.match(lj, /notifications\?\.error\(block\)/);
  assert.match(lj, /replacementSlots/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/applications/level-up.mjs"), "utf8"), /learnBlock\(this\.#probe\(\), doc\)/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/advancement/manager.mjs"), "utf8"), /learnBlock\(probeAfterAsi/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/applications/actor/character-sheet.mjs"), "utf8"), /can't be voluntarily unlearned/);
});

test("LVL1 L2: Malleable Mirages is a swap choice; jutsu swaps keep the discipline; Remove level restores what was switched out", async () => {
  const { advancementSteps } = await import("../module/advancement/steps.mjs");
  const { jutsuDiscipline } = await import("../module/rules/jutsu-slots.mjs");
  const gs = JSON.parse(fs.readFileSync(path.join(ROOT, "packs/_source/classes/genjutsu-specialist-n5eAIBk617CG9k7w.json"), "utf8"));
  const mirages = gs.system.advancement.filter(a => a.key === "gen-mirage");
  assert.equal(mirages.length, 6);
  assert.ok(mirages.every(a => a.swap === true));
  const st = advancementSteps({ name: gs.name, system: gs.system, flags: gs.flags }, 4, "class").find(s => s.key === "gen-mirage");
  assert.equal(st.swap, true);
  assert.equal(jutsuDiscipline(jutsu("Cut", { discipline: "tai", keywords: ["bukijutsu"] })), "buki");
  assert.equal(jutsuDiscipline(jutsu("Kick", { discipline: "tai" })), "tai");
  const lu = fs.readFileSync(path.join(ROOT, "module/applications/level-up.mjs"), "utf8");
  assert.match(lu, /jst\?\.gain > 0/, "jutsu swaps only when learning a new jutsu at level up");
  assert.match(lu, /!grantedBy\(this\.actor, i\)/, "granted jutsu can't be swapped");
  const mgr = fs.readFileSync(path.join(ROOT, "module/advancement/manager.mjs"), "utf8");
  assert.match(mgr, /levelSwaps/);
  assert.match(mgr, /await restoreSwaps\(actor, cls, level\)/);
  assert.match(fs.readFileSync(path.join(ROOT, "templates/apps/level-up.hbs"), "utf8"), /toggleReplace/);
});

test("LVL1 L3: the five Moldings give 2 conditional Bonus Jutsu (one may be C-Rank above the highest); duplicate class proficiencies become picks", async () => {
  const { conditionHolds, jutsuSlots, learnProblems, browserFilters } = await import("../module/rules/jutsu-slots.mjs");
  const { stepsForLevel } = await import("../module/advancement/steps.mjs");
  const dir = path.join(ROOT, "packs/_source/features");
  const files = fs.readdirSync(dir, { recursive: true }).filter(f => /(^|\/)(fire-release-blaze-walker|water-release-tsunami|wind-release-storm-terror|lightning-release-lightning-breaker|earth-release-stone-crusher)-[^/]*\.json$/.test(f));
  assert.equal(files.length, 5);
  for ( const f of files ) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).system.bonusJutsu;
    assert.deepEqual([b.count, b.discipline, b.condition.split(":")[0], b.aboveMax.count, b.aboveMax.maxRank], [2, "nin", "affinity", 1, "C"], f);
    assert.equal(b.condition.split(":")[1], b.section, f);
  }
  const blaze = { type: "feat", id: "bw", name: "Fire Release (Blaze Walker)", uuid: "Actor.a.Item.bw", system: { grants: { jutsu: [] },
    bonusJutsu: { count: 2, discipline: "nin", section: "fire", condition: "affinity:fire", aboveMax: { count: 1, maxRank: "C" } } }, flags: { n5e: {} } };
  const cls = { type: "class", system: { levels: 2, jutsuKnownNow: 3 } };
  const base = { name: "K", system: { grants: { classItem: cls, maxRank: "D", affinities: new Set(["fire"]) } } };
  assert.equal(conditionHolds(base, "affinity:fire"), true);
  assert.equal(conditionHolds(base, "affinity:water"), false);
  assert.equal(jutsuSlots({ ...base, items: [cls, blaze] }).bonus.open, 0, "the condition wasn't met when it was gained (no flag)");
  const met = { ...blaze, flags: { n5e: { conditionMet: true } } };
  const s = jutsuSlots({ ...base, items: [cls, met] });
  assert.equal(s.bonus.open, 2);
  const f = s.bonus.sources[0].filter;
  assert.equal(f.aboveMaxOpen, 1);
  assert.deepEqual(learnProblems(base, jutsu("Fire C", { rank: "C", section: "fire" }), { filter: f }), [], "one may be C-Rank while the highest is D");
  assert.match(learnProblems(base, jutsu("Fire B", { rank: "B", section: "fire" }), { filter: f })[0], /above the highest rank/);
  const used = jutsuSlots({ ...base, items: [cls, met, jutsu("Fire C", { rank: "C", section: "fire", learned: { mode: "bonus", source: "Actor.a.Item.bw" } })] });
  assert.equal(used.bonus.sources[0].filter.aboveMaxOpen, 0);
  assert.match(learnProblems(base, jutsu("Fire C2", { rank: "C", section: "fire" }), { filter: used.bonus.sources[0].filter })[0], /above the highest rank/);
  assert.deepEqual(browserFilters({ maxRank: "D", filter: f }).rank, ["E", "D", "C"]);
  // Duplicate fixed class proficiencies (Medical-Nin: Medicine and Chakra Control).
  const med = { type: "class", name: "Medical-Nin", id: "mn", system: { levels: 1, hitDie: "d8", chakraDie: "d8", skills: { fixed: ["med", "cha"], choose: 2, from: [] }, tools: { fixed: ["medicine"], choose: 0 }, jutsuKnown: Array(20).fill(0), advancement: [], subclasses: [] } };
  const a = { system: { level: 1, abilities: { con: { mod: 0 } }, skills: {}, tools: {} }, items: [med, { type: "background", id: "bg", system: { skills: ["med"], tool: "medicine" } }] };
  const steps = stepsForLevel({ actor: a, cls: med, level: 1 });
  const dup = steps.find(x => x.id === "class:skills:dup");
  assert.equal(dup.count, 1);
  assert.ok(!dup.options.some(o => ["med", "cha"].includes(o.value)));
  assert.equal(steps.find(x => x.id === "class:tools:dup").count, 1);
});
