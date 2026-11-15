/** NPC1c: defenses, senses and switches; simple sheet; journal stat block; reset; situational bonuses; what the players can learn. */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { makeActor } from "./helpers/actor.mjs";
import { headerVM } from "../module/view-models/character.mjs";
import { registerHelpers } from "../module/applications/helpers.mjs";
import { statBlockVM, npcHeaderVM, npcBuildVM, npcSimpleVM, npcDefensesVM, npcKnowledgeVM, knowledgeEntryView, learnedVM, attackLine } from "../module/view-models/npc.mjs";
import { resetPlan, RESET_OPTIONS } from "../module/rules/npc-reset.mjs";
import { rollSpec } from "../module/dice/d20.mjs";
import { validateIntent, INTENT_TYPES } from "../module/automation/owner-intents.mjs";

const dir = path.join(import.meta.dirname, "..", "templates/actor/npc");
const hbs = Handlebars.create();
registerHelpers(hbs);
const read = name => fs.readFileSync(path.join(dir, `${name}.hbs`), "utf8");
for ( const name of ["stat-block", "casting-lines"] ) hbs.registerPartial(`systems/n5e/templates/actor/npc/${name}.hbs`, read(name));
const tpl = name => hbs.compile(read(name));
const saved = { game: globalThis.game, fromUuid: globalThis.fromUuid, CONFIG: globalThis.CONFIG };
afterEach(() => Object.assign(globalThis, saved));

const withSource = actor => Object.assign(actor, { _source: { system: actor.system.toObject?.() ?? actor.system } });
const npc = (system = {}, items = []) => withSource(makeActor({ type: "npc", name: "Bandit", items, system: {
  details: { build: "adversary", level: 5, rank: "D", class: "standard", role: "lurker" },
  adversary: { mods: { str: 1, dex: 3, con: 1, int: 0, wis: 0, cha: -2 } }, ...system } }));
const spear = { _id: "spear00000000001", name: "Spear", type: "weapon", system: { weaponType: "melee", damage: { die: "1d6", types: ["piercing"] }, properties: { reach: 1 } } };

test("defenses, senses, languages and every speed appear in the stat block only when filled", () => {
  const plain = statBlockVM(npc());
  assert.deepEqual([plain.defenses, plain.languages, plain.senses], [[], "", `passive Perception ${plain.passivePerception}`]);
  assert.doesNotMatch(tpl("stat-block")({ block: plain }), /Resistances|Languages/);
  const a = npc({ traits: { resist: ["fire"], immune: ["poison"], vuln: ["cold"], conditionImmune: ["prone"], conditionResist: ["weakened"],
    senses: { darkvision: 60, tremorSense: 15 }, languages: ["common", "Old Tongue"], speed: { walk: 30, climb: 20 } },
  situational: [{ skill: "ste", value: 2, when: "in forests" }] });
  const block = statBlockVM(a);
  assert.deepEqual(block.defenses.map(d => d.label), ["Damage Resistances", "Damage Immunities", "Damage Vulnerabilities", "Condition Immunities", "Condition Resistances"]);
  assert.equal(block.defenses[0].value, "Fire");
  assert.match(block.senses, /^Darkvision 60 ft, Tremor Sense 15 ft, passive Perception \d+$/);
  assert.equal(block.languages, "Common, Old Tongue");
  assert.match(block.speed, /climb 40 ft/, "the Lurker +20 applies to every speed, as other speed bonuses do");
  const html = tpl("stat-block")({ block });
  assert.match(html, /Damage Resistances<\/b> Fire/);
  assert.match(html, /Stealth \+\d+ \(\+2 in forests\)/);
  assert.match(html, /Languages<\/b> Common, Old Tongue/);
});

test("Build tab: defenses, switches, situational bonuses and the learnable list, with no field twice in the form", () => {
  const a = npc({ traits: { resist: ["fire"] }, situational: [{ skill: "ste", value: 2, when: "in forests" }],
    knowledge: { entries: [{ id: "k1", kind: "stat", ref: "ac", label: "Armor Class", note: "" }], learned: [] } });
  const d = npcDefensesVM(a);
  assert.deepEqual(d.sets[0].chips, [{ key: "fire", label: "Fire" }]);
  assert.ok(!d.sets[0].options.some(o => o.value === "fire"), "a chosen type isn't offered again");
  assert.equal(d.sets.at(-1).custom, true, "languages take a typed name");
  const ctx = { vm: npcBuildVM(a), defenses: d, knowledge: npcKnowledgeVM(a), editable: true, tab: {} };
  const build = tpl("build")(ctx);
  assert.match(build, /name="system.diesAtZero" checked/);
  assert.match(build, /name="system.situational.0.when" value="in forests"/);
  assert.match(build, /data-action="npcToggleLearned" data-id="k1"/);
  const header = tpl("header")({ vm: headerVM(a), npc: npcHeaderVM(a), editable: true, editMode: true });
  const names = html => [...html.matchAll(/name="([^"]+)"/g)].map(m => m[1]);
  const all = [...names(header), ...names(build)];
  assert.deepEqual(all.filter((n, i) => all.indexOf(n) !== i), []);
  const pc = withSource(makeActor({ type: "npc", system: { details: { level: 3 } } }));
  assert.match(tpl("build")({ vm: npcBuildVM(pc), defenses: npcDefensesVM(pc), knowledge: npcKnowledgeVM(pc), editable: true, tab: {} }), /Defenses, senses and movement/, "both builds");
});

test("rest buttons on every NPC header", () => {
  const a = npc();
  const html = tpl("header")({ vm: headerVM(a), npc: npcHeaderVM(a), editable: true, editMode: false });
  assert.match(html, /data-action="rest" data-rest="short"/);
  assert.match(html, /data-action="rest" data-rest="long"/);
});

test("simple sheet: attack lines, Multiattack, conditions, temporary HP and CP, uses", () => {
  const a = npc({ details: { build: "adversary", level: 6, rank: "D", class: "standard", role: "none" } }, [spear,
    { _id: "trait00000000001", name: "Ambush", type: "feat", system: { uses: { max: "2", spent: 1 } } }]);
  a.system.hp.temp = 5;
  const vm = npcSimpleVM(a);
  const line = attackLine(a, a.items.find(i => i.name === "Spear"));
  assert.match(line.text, /^Melee weapon attack: \+\d+, reach 10 ft, one target\. Hit: 1d6/);
  assert.deepEqual(vm.attacks[0], line);
  assert.equal(vm.multiattack, "Multiattack. The Bandit makes 2 attacks.");
  assert.equal(vm.traits[0].uses, "1/2");
  assert.equal(vm.temp.hp, 5);
  const html = tpl("simple")({ vm, editable: true });
  assert.match(html, /name="system.hp.temp" value="5"/);
  assert.match(html, /Ambush \(1\/2\)\./);
  assert.match(html, /Multiattack\. The Bandit makes 2 attacks\./);
});

test("journal stat block: the stat block, traits and attacks; never private notes", () => {
  const a = npc({ details: { build: "adversary", level: 5, rank: "D", class: "standard", role: "none", privateNotes: "<p>secret plan</p>", publicNotes: "<p>seen</p>" } }, [spear]);
  const html = tpl("embed")({ vm: npcSimpleVM(a) });
  assert.match(html, /Armor Class/);
  assert.match(html, /Spear\.<\/b> Melee weapon attack/);
  assert.doesNotMatch(html, /secret plan/);
});

test("reset: each option changes only what it names", () => {
  const a = npc({ resources: {} }, [{ _id: "trait00000000001", name: "Ambush", type: "feat", system: { uses: { max: "2", spent: 1 } } }]);
  a.effects = [{ id: "c1", type: "condition", statuses: new Set() }, { id: "s1", type: "base", statuses: new Set(["prone"]) }, { id: "e1", type: "base", statuses: new Set() }];
  const all = resetPlan(a, {});
  assert.equal(all.update["system.hp.value"], a.system.hp.max);
  assert.equal(all.update["system.cp.temp"], 0);
  assert.deepEqual(all.deleteEffects, ["c1", "s1"]);
  assert.deepEqual(all.items, [{ _id: "trait00000000001", "system.uses.spent": 0 }]);
  const hpOnly = resetPlan(a, { cp: false, conditions: false, uses: false, pools: false });
  assert.deepEqual(Object.keys(hpOnly.update).sort(), ["system.deathSaves.failure", "system.deathSaves.success", "system.hp.temp", "system.hp.value"]);
  assert.deepEqual([hpOnly.deleteEffects, hpOnly.items], [[], []]);
  assert.deepEqual(Object.keys(RESET_OPTIONS), ["hp", "cp", "conditions", "uses", "pools"]);
});

test("situational skill bonuses reach the roll dialog for that skill only", () => {
  const a = npc({ situational: [{ skill: "ste", value: 2, when: "in forests" }, { skill: "ste", value: 0, when: "never" }] });
  assert.deepEqual(rollSpec(a, "skill", "ste").situational, [{ label: "Stealth +2", value: 2, when: "in forests" }]);
  assert.deepEqual(rollSpec(a, "skill", "ath").situational, []);
});

test("what the players can learn: items, statistics and notes; the party's knowledge; picks are checked", async () => {
  const a = npc({ knowledge: { entries: [
    { id: "k1", kind: "item", ref: "spear00000000001", label: "Spear", note: "" },
    { id: "k2", kind: "stat", ref: "ac", label: "Armor Class", note: "hard to hit" },
    { id: "k3", kind: "text", ref: "", label: "Note", note: "Afraid of fire" },
    { id: "k4", kind: "item", ref: "gone000000000001", label: "Old trick", note: "" }], learned: ["k2"] } }, [spear]);
  assert.equal(knowledgeEntryView(a, a.system.knowledge.entries[0]).label, "Spear");
  assert.deepEqual(knowledgeEntryView(a, a.system.knowledge.entries[1]), { label: "Armor Class", text: String(a.system.ac.value), note: "hard to hit" });
  assert.equal(knowledgeEntryView(a, a.system.knowledge.entries[2]).text, "Afraid of fire");
  assert.equal(knowledgeEntryView(a, a.system.knowledge.entries[3]).missing, true);
  const vm = npcKnowledgeVM(a);
  assert.deepEqual([vm.learnedCount, vm.entries.map(e => e.learned)], [1, [false, true, false, false]]);
  assert.ok(!vm.statOptions.some(o => o.value === "ac"), "a statistic already listed isn't offered again");
  assert.deepEqual(learnedVM(a).map(e => e.label), ["Armor Class"]);
  assert.ok(INTENT_TYPES.includes("learnEntry"));
  assert.deepEqual(validateIntent("learnEntry", { messageId: "m1", entryId: "k1" }), { messageId: "m1", entryId: "k1" });
  assert.throws(() => validateIntent("learnEntry", { messageId: "m1", entryId: "../x" }), /Invalid pick/);

  const { learnEntry, unknownEntries } = await import("../module/workflow/npc-knowledge.mjs");
  assert.deepEqual(unknownEntries(a).map(e => e.id), ["k1", "k3", "k4"]);
  const flags = { learn: { npcUuid: "Actor.npc", readerUuid: "Actor.reader", available: ["k1"], picked: null } };
  const message = { id: "m1", flags: { n5e: flags }, async setFlag(scope, key, value) { flags[key] = value; } };
  const posted = [];
  a.uuid = "Actor.npc";
  a.update = async data => { a.system.knowledge.learned = data["system.knowledge.learned"]; };
  globalThis.fromUuid = async uuid => (uuid === "Actor.npc" ? a : null);
  globalThis.game = { ...(saved.game ?? {}), messages: { get: () => message } };
  globalThis.CONFIG = { ...saved.CONFIG, ChatMessage: { documentClass: { getSpeaker: () => ({}), create: async d => posted.push(d) } } };
  globalThis.foundry.applications ??= {};
  globalThis.foundry.applications.ux ??= { TextEditor: { implementation: { enrichHTML: async t => t } } };
  const reader = { uuid: "Actor.reader", name: "Kai" };
  await assert.rejects(learnEntry(reader, { messageId: "m1", entryId: "k3" }), /didn't offer/);
  await assert.rejects(learnEntry({ uuid: "Actor.other" }, { messageId: "m1", entryId: "k1" }), /isn't yours/);
  await learnEntry(reader, { messageId: "m1", entryId: "k1" });
  assert.deepEqual(a.system.knowledge.learned, ["k2", "k1"]);
  assert.equal(flags.learn.picked, "k1");
  assert.match(posted[0].content, /Kai reads Bandit[\s\S]*Spear\./);
  assert.equal(posted[0].whisper, undefined, "the whole party sees it");
  await assert.rejects(learnEntry(reader, { messageId: "m1", entryId: "k1" }), /already learned/);
});
