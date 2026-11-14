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

test("header: the stat block in play mode; edit mode never repeats a Build tab field", () => {
  const a = avenger();
  const play = tpl("header")({ vm: headerVM(a), npc: npcHeaderVM(a), editable: true, editMode: false });
  assert.match(play, /Level 5 · D-Rank · Standard/);
  assert.match(play, /Proficiency<\/b> \+4/);
  const names = html => [...html.matchAll(/name="([^"]+)"/g)].map(m => m[1]);
  const edit = tpl("header")({ vm: headerVM(a), npc: npcHeaderVM(a), editable: true, editMode: true });
  const build = tpl("build")({ vm: npcBuildVM(a), editable: true, tab: { cssClass: "" } });
  const all = [...names(edit), ...names(build)];
  assert.deepEqual(all.filter((n, i) => all.indexOf(n) !== i), [], "a name twice in one form would save an array");
  assert.ok(names(build).includes("system.adversary.mods.str") && names(build).includes("system.adversary.overrides.dc.freeform"));
  const pc = withSource(makeActor({ type: "npc", system: { ...structuredClone(baseAbilities), details: { level: 6, rank: "C" }, hpMax: 55 } }));
  const pcEdit = tpl("header")({ vm: headerVM(pc), npc: npcHeaderVM(pc), editable: true, editMode: true });
  assert.match(pcEdit, /name="system.hpMax" value="55"/);
  assert.match(pcEdit, /name="system.abilities.str.value"/);
  assert.doesNotMatch(tpl("build")({ vm: npcBuildVM(pc), editable: true, tab: {} }), /adversary\.mods/);
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

test("notes, simple sheet and limited view", () => {
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
  const html = tpl("simple")({ vm, editable: true });
  assert.match(html, /Hold Still\.[\s\S]*Compelled Duel<\/a> \(5\)[\s\S]*Weapon\/Freeform[\s\S]*Blessed Blade/);
  assert.match(html, /Genjutsu\.<\/b> <span[^>]*>\+6 to hit<\/span>, <span[^>]*>save DC 14/);
  const limited = tpl("limited")({ limited: { name: "Avenger", img: "x.png", blurb: "A zealot.", publicHTML: "<p>seen</p>" } });
  assert.match(limited, /A zealot\.[\s\S]*seen/);
  assert.doesNotMatch(limited, /Armor Class/);
});
