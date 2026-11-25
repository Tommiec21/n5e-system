/**
 * LVL1 L1 (King 2026-11-24): the ability score requirement blocks learning (B 16, A 18, S 20; not Hijutsu);
 * a granted jutsu already known becomes a replacement Bonus Jutsu slot (same discipline and section, up to
 * its rank); deleting a granted jutsu alerts (rules/jutsu-slots.mjs, workflow/learn-jutsu.mjs).
 */
import "./helpers/foundry-stub.mjs";
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

test("LVL1 L5: Level History rows, the editable steps and a past level's selections; changing an ASI and an option", async () => {
  // The pieces of Foundry this test reaches outside Foundry: utils (the alert's escapeHTML) and the app base classes.
  foundry.utils ??= { escapeHTML: t => t };
  foundry.applications ??= { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base } };
  const { levelHistory } = await import("../module/applications/level-history.mjs");
  const { levelSelections, editLevel, EDITABLE_STEPS } = await import("../module/advancement/manager.mjs");
  assert.deepEqual([...EDITABLE_STEPS].sort(), ["asi", "featChoice", "itemChoice", "masteryChoice", "option", "trait"]);
  const flags = {};
  const cls = { id: "c1", type: "class", name: "Scout-Nin", flags: { n5e: { asi: { 4: { ability: "dex", feat: "", mastery: "" } }, levelSwaps: { 4: { removed: [{ name: "Old Path" }] } } } },
    system: { levels: 4, skills: { chosen: ["ste"] }, tools: { chosen: [] }, identifier: "scout",
      advancement: [{ id: "a1", level: 1, type: "option", key: "path", chosen: ["swift"] }], toObject() { return { advancement: structuredClone(this.advancement) }; } },
    getFlag: (s, k) => k.split(".").reduce((o, p) => o?.[p], cls.flags.n5e),
    setFlag: async (s, k, v) => { flags[k] = v; },
    update: async ch => { if ( ch["system.advancement"] ) cls.system.advancement = ch["system.advancement"]; } };
  const items = [cls, { type: "feat", name: "Assault Maneuver", system: {}, flags: { n5e: { advancement: { level: 4, step: "class:x", origin: "c1" } } } },
    { type: "jutsu", name: "Clone", system: { identifier: "clone" }, flags: { n5e: { advancement: { level: 1, step: "class:jutsu", origin: "c1" } } } }];
  let updated = null;
  const actor = { name: "Kenji", items, isOwner: true, _source: { system: { abilities: { dex: { value: 17 }, wis: { value: 12 } }, mastery: { sources: [] } } },
    update: async u => { updated = u; }, createEmbeddedDocuments: async () => [], deleteEmbeddedDocuments: async () => [] };
  items.find = Array.prototype.find.bind(items); items.filter = Array.prototype.filter.bind(items);
  {
    const rows = levelHistory(actor, cls);
    assert.deepEqual(rows.map(r => r.level), [4, 3, 2, 1]);
    assert.ok(rows[0].lines.some(l => l.label === "Ability Score Increase" && /\+1/.test(l.text)));
    assert.ok(rows[0].lines.some(l => l.label === "Switched out" && l.text === "Old Path"));
    assert.ok(rows[3].lines.some(l => l.label === "Jutsu" && l.text === "Clone"));
  }
  const steps = [{ id: "class:asi", type: "asi", title: "ASI" }, { id: "class:a1", type: "option", advId: "a1", origin: "class", title: "Shinobi's Path" }];
  assert.deepEqual(levelSelections(actor, cls, 4, steps), { "class:asi": { ability: "dex", feat: "", mastery: "" }, "class:a1": ["swift"] });
  globalThis.game = { users: [] }; globalThis.ui = { notifications: { warn() {}, info() {} } };
  globalThis.ChatMessage = { implementation: { create: async () => null }, getSpeaker: () => ({}) };
  const changes = await editLevel(actor, cls, 4, steps, { "class:asi": { ability: "wis", feat: "", mastery: "" }, "class:a1": ["rogue"] });
  assert.equal(changes.length, 2);
  assert.deepEqual(updated, { "system.abilities.dex.value": 16, "system.abilities.wis.value": 13 });
  assert.deepEqual(flags["asi.4"], { ability: "wis", feat: "", mastery: "" });
  assert.deepEqual(cls.system.advancement[0].chosen, ["rogue"]);
});

test("LVL1 L6: XP by default, milestones or both; the GM's gate; applying spends the XP (leftover carries) or a granted level", async () => {
  const { levelUpState, levelUpCost } = await import("../module/rules/leveling.mjs");
  const { RULES } = await import("../module/config/rules.mjs").catch(() => ({}));
  const rules = RULES ?? (await import("../module/config/rules.mjs")).default ?? {};
  // XP mode (default): ready once the XP is there; spends it, the rest carries.
  let st = levelUpState({ level: 3, xp: 350, need: 300 });
  assert.deepEqual([st.allowed, st.ready, st.via], [true, true, "xp"]);
  assert.deepEqual(levelUpCost(st, { xp: 350, need: 300 }), { "system.details.xp": 50 });
  st = levelUpState({ level: 3, xp: 120, need: 300 });
  assert.deepEqual([st.allowed, st.ready], [false, false]);
  assert.match(st.reason, /Needs 300 XP \(has 120\)/);
  // The GM can always level; the gate off lets players level freely (nothing spent).
  assert.deepEqual([levelUpState({ level: 3, xp: 0, need: 300, isGM: true }).allowed, levelUpState({ level: 3, xp: 0, need: 300, isGM: true }).via], [true, "gm"]);
  st = levelUpState({ level: 3, xp: 0, need: 300, gate: false });
  assert.deepEqual([st.allowed, st.ready, st.via], [true, false, "free"]);
  assert.deepEqual(levelUpCost(st, { xp: 0, need: 300 }), {});
  // Milestone: a granted level; XP doesn't count.
  st = levelUpState({ level: 3, xp: 999, need: 300, granted: 0, mode: "milestone" });
  assert.equal(st.allowed, false);
  st = levelUpState({ level: 3, xp: 0, need: 300, granted: 2, mode: "milestone" });
  assert.deepEqual([st.allowed, st.via], [true, "grant"]);
  assert.deepEqual(levelUpCost(st, { granted: 2 }), { "flags.n5e.levelsGranted": 1 });
  // Both: a granted level first, else XP.
  assert.equal(levelUpState({ level: 3, xp: 300, need: 300, granted: 1, mode: "both" }).via, "grant");
  assert.equal(levelUpState({ level: 3, xp: 300, need: 300, granted: 0, mode: "both" }).via, "xp");
  assert.equal(levelUpState({ level: 20, xp: 9999, need: null, isGM: true }).allowed, false);
  // The two rules, with their defaults.
  const src = fs.readFileSync(path.join(ROOT, "module/config/rules.mjs"), "utf8");
  assert.match(src, /leveling: \{ group: "character", type: "choice", default: "xp"/);
  assert.match(src, /levelUpGate: \{ group: "character", type: "boolean", default: true/);
  // Party Overview: Award XP to all, per-row XP and Grant level.
  const po = fs.readFileSync(path.join(ROOT, "templates/apps/party-overview.hbs"), "utf8");
  assert.match(po, /data-action="awardAll"/);
  assert.match(po, /data-kind="grant"/);
  const { partyRowVM } = await import("../module/view-models/party.mjs");
  const row = partyRowVM({ type: "character", uuid: "A", name: "K", effects: [], items: [], flags: { n5e: { levelsGranted: 1 } }, system: { details: { xp: 10, xpNext: 300 }, hp: {}, cp: {}, combat: {} } });
  assert.deepEqual(row.xp, { value: 10, next: 300, granted: 1, ready: true });
  void rules;
});

test("LVL1 L4: structured feat prerequisites; unmet feats listed (grayed), not hidden, and not blocked at Apply", async () => {
  const { featPrereqProblems, prereqText } = await import("../module/rules/feat-prereqs.mjs");
  const { eligibleFeats } = await import("../module/advancement/steps.mjs");
  const feat = (name, requirement = {}, prerequisites = []) => ({ type: "feat", name, uuid: `Compendium.n5e.feats.Item.${name}`, system: { category: "general", requirement, prerequisites } });
  const actor = { name: "K", system: { level: 4, abilities: { dex: { value: 13 }, wis: { value: 16 } }, skills: { ste: { isProficient: true } }, tools: {}, grants: { affinities: ["fire"] } },
    items: [{ type: "class", system: { identifier: "scout-nin" } }, { type: "clan", system: { identifier: "uchiha" } },
      { type: "jutsu", system: { keywords: ["medical"] } }, { type: "feat", name: "Light Step", _stats: { compendiumSource: "Compendium.n5e.feats.Item.light" }, system: {} }] };
  const ok = feat("Ok", { level: 4, class: "scout-nin", clan: "uchiha", abilities: { dex: 13 }, skills: ["ste"], affinity: "fire", keyword: "medical", feats: ["Compendium.n5e.feats.Item.light"] });
  assert.deepEqual(featPrereqProblems(actor, ok), []);
  const hard = feat("Hard", { level: 8, class: "medical-nin", abilities: { dex: 15, int: 0 }, skills: ["med"], tools: ["alchemist"], affinity: "water", keyword: "fire-release", feats: ["Compendium.n5e.feats.Item.other"] });
  assert.deepEqual(featPrereqProblems(actor, hard), ["Level 8 (is 4)", "Class: medical-nin", "DEX 15 (has 13)", "Proficiency: med", "Proficiency: alchemist", "Affinity: water", "Knows a fire-release jutsu", "Has Compendium.n5e.feats.Item.other"]);
  assert.deepEqual(featPrereqProblems(actor, feat("Free text", {}, ["A wizard did it"])), [], "free text never grays a feat out");
  assert.equal(prereqText(feat("T", { level: 5, abilities: { wis: 15 } }, ["Ninja"])), "Level 5; WIS 15; Ninja");
  const feats = [hard, ok, feat("Owned")];
  assert.deepEqual(eligibleFeats(feats, { level: 4, owned: new Set(["owned"]), all: true }).map(f => f.name), ["Hard", "Ok"], "unmet feats stay listed");
  assert.deepEqual(eligibleFeats(feats, { level: 4, owned: new Set(["owned"]), clan: "uchiha" }).map(f => f.name), ["Ok"], "without all, level filtering stays (other callers)");
  const elig = fs.readFileSync(path.join(ROOT, "module/advancement/eligibility.mjs"), "utf8");
  assert.match(elig, /step\.type !== "featChoice" && !itemChoiceAllowed/);
  const lu = fs.readFileSync(path.join(ROOT, "module/applications/level-up.mjs"), "utf8");
  assert.match(lu, /took the feat/);
  assert.match(fs.readFileSync(path.join(ROOT, "templates/apps/level-up.hbs"), "utf8"), /unmet/);
});

test("LVL1 L6: Remove level refunds what the level spent (King 2026-11-25)", async () => {
  const { levelSpent, levelRefund } = await import("../module/rules/leveling.mjs");
  assert.deepEqual(levelSpent({ via: "xp" }, { need: 900 }), { xp: 900 });
  assert.deepEqual(levelSpent({ via: "grant" }, {}), { granted: 1 });
  assert.equal(levelSpent({ via: "free" }, {}), null);
  assert.deepEqual(levelRefund({ xp: 900 }, { xp: 150 }), { "system.details.xp": 1050 });
  assert.deepEqual(levelRefund({ granted: 1 }, { granted: 0 }), { "flags.n5e.levelsGranted": 1 });
  assert.deepEqual(levelRefund(null, {}), {});
  const m = fs.readFileSync(path.join(ROOT, "module/advancement/manager.mjs"), "utf8");
  assert.match(m, /levelSpent\.\$\{level\}/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/applications/level-up.mjs"), "utf8"), /levelSpent\.\$\{this\.level\}/);
});
