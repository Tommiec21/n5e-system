/** NPC1b: the NPC view models and templates (stat-block header, Build tab, notes, simple sheet, limited view). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { makeActor, baseAbilities } from "./helpers/actor.mjs";
import { headerVM } from "../module/view-models/character.mjs";
import { registerHelpers } from "../module/applications/helpers.mjs";
import { statBlockVM, npcHeaderVM, npcBuildVM, npcSimpleVM } from "../module/view-models/npc.mjs";
import { npcSheetHeaderVM } from "../module/view-models/npc-statblock.mjs";

const dir = path.join(import.meta.dirname, "..", "templates/actor/npc");
const hbs = Handlebars.create();
registerHelpers(hbs);
const read = name => fs.readFileSync(path.join(dir, `${name}.hbs`), "utf8");
for ( const name of ["stat-block", "casting-lines"] ) hbs.registerPartial(`systems/n5e/templates/actor/npc/${name}.hbs`, read(name));
hbs.registerPartial("systems/n5e/templates/parts/field-rows.hbs", "");
const tpl = name => hbs.compile(read(name));
const withSource = actor => Object.assign(actor, { _source: { system: actor.system.toObject?.() ?? actor.system } });

const avenger = (details = {}, adv = {}) => withSource(makeActor({ type: "npc", name: "Jashin Cultist, Avenger", system: {
  details: { build: "adversary", level: 5, rank: "D", class: "standard", role: "striker", affiliation: "Earth Village", blurb: "A zealot.", ...details },
  adversary: { mods: { str: 4, dex: 0, con: 0, int: -1, wis: 2, cha: -2 }, armor: "heavy", ...adv },
  skills: { ath: { proficient: true } } } }));

test("the stat block reads as the book prints it", () => {
  const block = statBlockVM(avenger());
  assert.equal(block.identity, "Standard, Medium, D-Rank, Striker, Earth Village");
  assert.deepEqual([block.level, block.prof, block.ac.value, block.dr.value, block.hp.max, block.cp.max, block.speed, block.initiative.value], [5, "+4", 15, 6, 40, 40, "30 ft", "+4"]);
  assert.deepEqual(block.abilities.map(a => [a.abbr, a.mod, a.save]).slice(0, 2), [["STR", "+4", "+8"], ["DEX", "+0", "+2"]]);
  assert.deepEqual(block.skills.map(s => [s.label, s.total]), [["Athletics", "+8"]]);
  assert.deepEqual(block.lines.map(l => [l.label, l.attack, l.dc]), [["Ninjutsu", "+3", 11], ["Genjutsu", "+6", 14], ["Taijutsu", "+8", 16]]);
  assert.deepEqual([block.freeform.attack, block.freeform.dc], ["+8", 16]);
  const html = tpl("stat-block")({ block });
  assert.match(html, /Armor Class<\/b> 15/);
  assert.match(html, /data-roll="save" data-key="str">\+8/);
  assert.match(html, /Athletics \+8/);
  const minion = statBlockVM(avenger({ class: "minion", role: "none" }));
  assert.match(tpl("stat-block")({ block: minion }), /Chakra Points<\/b> none[\s\S]*saving throws fail automatically/);
});

test("NPCUI1 header: identity and trackers; no field is both in the header and the Build tab", () => {
  const a = avenger();
  const head = npcSheetHeaderVM(a, {});
  const play = tpl("header")({ head, editable: true, editMode: false, conditionChoices: [] });
  assert.match(play, /Level 5 · D-Rank · Standard/);
  assert.match(play, /name="system.hp.value"/);
  assert.doesNotMatch(play, /Proficiency|Armor Class/, "the header repeats no stat-block number");
  const names = html => [...html.matchAll(/name="([^"]+)"/g)].map(m => m[1]);
  const build = tpl("build")({ vm: npcBuildVM(a), npc: npcHeaderVM(a), scores: headerVM(a).abilities, editable: true, tab: { cssClass: "" } });
  const all = [...names(play), ...names(build)];
  assert.deepEqual(all.filter((n, i) => all.indexOf(n) !== i), [], "a name twice in one form would save an array");
  assert.ok(names(build).includes("system.adversary.mods.str") && names(build).includes("system.adversary.overrides.dc.freeform"));
  assert.ok(names(build).includes("system.details.blurb"), "identity lives on the Build tab");
  const pc = withSource(makeActor({ type: "npc", system: { ...structuredClone(baseAbilities), details: { level: 6, rank: "C" }, hpMax: 55 } }));
  const pcBuild = tpl("build")({ vm: npcBuildVM(pc), npc: npcHeaderVM(pc), scores: headerVM(pc).abilities, editable: true, tab: {} });
  assert.match(pcBuild, /name="system.hpMax" value="55"/);
  assert.match(pcBuild, /name="system.abilities.str.value"/);
  assert.doesNotMatch(pcBuild, /adversary\.mods/);
});

test("Build tab: budget, baseline line, full saves, overrides with their baselines, suggested counts", () => {
  const a = avenger({}, { overrides: { ac: 12, saves: { str: 10 } } });
  const vm = npcBuildVM(a);
  assert.deepEqual([vm.statLine, vm.budget, vm.assigned, vm.overBudget], ["+3  +2  +1  +0  −1  −2", 3, 3, false]);
  assert.deepEqual(vm.saves.filter(s => s.full).map(s => s.key), ["str", "wis"]);
  assert.deepEqual([vm.fullCount, vm.fullSuggested, vm.savesPicked], [2, 2, false]);
  const ac = vm.stats.find(s => s.label === "Armor Class");
  assert.deepEqual([ac.final, ac.stated, ac.overridden, ac.baseline], ["12", 12, true, 15]);
  const str = vm.saves.find(s => s.key === "str");
  assert.deepEqual([str.final, str.baseline, str.overridden], ["+10", 8, true]);
  assert.deepEqual(vm.lines.map(l => [l.label, l.attack.final, l.dc.final]).at(-1), ["Weapon/Freeform", "+8", "16"]);
  assert.deepEqual(vm.suggested, { traits: 2, jutsu: 4, freeformSlots: 3, multiattack: 1, fullSaves: 2 });
  const html = tpl("build")({ vm, editable: true, tab: { cssClass: "active" } });
  assert.match(html, /Assigned 3 of 3/);
  assert.match(html, /name="system.adversary.overrides.ac" value="12"/);
  assert.match(html, /data-action="npcToggleFullSave" data-key="str" checked/);
  const over = npcBuildVM(avenger({ class: "solo", level: 2 }, { mods: { str: 9 } }));
  assert.equal(over.overBudget, true);
  assert.match(over.warnings.join("|"), /below level 5/);
  assert.equal(over.showPartySize, true);
});

test("notes, the journal stat block's view model and the player view", () => {
  const notes = tpl("notes");
  const data = { public: "seen", private: "hidden plan", biography: "", publicHTML: "<p>seen</p>", privateHTML: "<p>hidden plan</p>", biographyHTML: "" };
  assert.match(notes({ notes: { ...data, isGM: true }, tab: {} }), /hidden plan/);
  assert.doesNotMatch(notes({ notes: { ...data, isGM: false, privateHTML: "" }, tab: {} }), /hidden plan|Private notes/);
  const a = avenger();
  a.items = [{ id: "t1", type: "feature", name: "Hold Still", system: { description: "<p>Advantage.</p>" } },
    { id: "j1", type: "jutsu", name: "Compelled Duel", system: { discipline: "gen", rank: "D", live: { cost: 5 } } },
    { id: "w1", type: "weapon", name: "Blessed Blade", system: {} }];
  const vm = npcSimpleVM(a);
  assert.deepEqual([vm.traits.map(t => t.name), vm.jutsu.map(g => [g.label, g.ranks[0].jutsu[0].name]), vm.attacks.map(w => w.name)],
    [["Hold Still"], [["Genjutsu", "Compelled Duel"]], ["Blessed Blade"]]);
  const limited = tpl("limited")({ limited: { name: "Avenger", img: "x.png", blurb: "A zealot.", condition: "Bloodied", learned: [], publicHTML: "<p>seen</p>" } });
  assert.match(limited, /A zealot\.[\s\S]*Bloodied[\s\S]*seen/);
  assert.doesNotMatch(limited, /Armor Class/);
});

test("NPCUI1 Stat Block: jutsu by discipline then rank E→S, Bukijutsu under Taijutsu, hidden groups, color key", async () => {
  const { npcJutsuGroups, jutsuLegendVM } = await import("../module/view-models/npc-statblock.mjs");
  const a = avenger();
  const j = (id, name, discipline, rank, keywords = []) => ({ id, name, type: "jutsu", flags: {},
    system: { discipline, rank, keywords: new Set(keywords), activation: { type: "action" }, cost: { mode: "chakra", value: 2 }, live: { cost: 2 } } });
  a.items = [j("j1", "Big Fire", "nin", "B", ["fireRelease"]), j("j2", "Spark", "nin", "D"), j("j3", "Chain Swing", "tai", "C", ["bukijutsu"]),
    j("j4", "Palm", "tai", "D")];
  const groups = npcJutsuGroups(a, { hidden: ["tai"] });
  assert.deepEqual(groups.map(g => g.key), ["nin", "tai"], "no Genjutsu: no group");
  assert.deepEqual(groups[0].ranks.map(r => r.rank), ["D", "B"]);
  assert.deepEqual(groups[1].ranks.map(r => r.pills[0].name), ["Palm", "Chain Swing"]);
  assert.equal(groups[1].hidden, true);
  assert.match(groups[1].numbers, /also Bukijutsu/);
  assert.match(groups[0].ranks[1].pills[0].style, /linear-gradient\(90deg, #bcd5f5, #f2b8c1\)/);
  const legend = jutsuLegendVM();
  assert.equal(legend.actions.length, 5);
  assert.equal(legend.colors.length, 9);
});

test("NPCUI1 Stat Block template: core panel with MOD and SAVE, rolls, pills", async () => {
  const { npcStatBlockVM } = await import("../module/view-models/npc-statblock.mjs");
  const a = avenger();
  a.items = [{ id: "j1", name: "Spark", type: "jutsu", flags: {}, system: { discipline: "nin", rank: "D", keywords: new Set(["lightningRelease"]),
    activation: { type: "bonus" }, cost: { mode: "chakra", value: 2 }, live: { cost: 2 } } }];
  const html = tpl("statblock")({ sb: npcStatBlockVM(a, { legend: true, hidden: [] }), editable: true, tab: { cssClass: "active" } });
  assert.match(html, /data-roll="save" data-key="str"[^>]*><span class="lbl">Save<\/span>/);
  assert.match(html, /data-roll="ability" data-key="wis"/);
  assert.match(html, /data-action="rollInit"/);
  assert.match(html, /class="npc-pill n5e-row[^"]*" data-item-id="j1"[\s\S]*n5e-glyph[\s\S]*Spark/);
  assert.match(html, /Hide color key/);
  const hidden = tpl("statblock")({ sb: npcStatBlockVM(a, { legend: false, hidden: ["nin"] }), editable: true, tab: {} });
  assert.doesNotMatch(hidden, /data-item-id="j1"/);
  assert.match(hidden, /Show color key/);
});
