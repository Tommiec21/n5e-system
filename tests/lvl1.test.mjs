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
