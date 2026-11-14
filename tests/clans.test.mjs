import { isFeatItem } from "../module/rules/keywords.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, taiSpec } from "./helpers/actor.mjs";
import { clanSetupFields, clanSetupPlan } from "../module/advancement/clan.mjs";
import { advancementSteps, stepsForLevel, learnableJutsu, eligibleFeats } from "../module/advancement/steps.mjs";
import { clampRanks } from "../module/rules/conditions.mjs";
import { addClan } from "../module/workflow/clan.mjs";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "content/clans/source.md"), "utf8").split(/\r?\n/);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const docs = ["clans", "feats"].flatMap(pack => walk(path.join(root, "packs/_source", pack)).filter(f => f.endsWith(".json")).map(f => {
  const d = JSON.parse(fs.readFileSync(f, "utf8")); return { ...d, uuid: `Compendium.n5e.${pack}.Item.${d._id}` };
}));
const clans = docs.filter(d => d.type === "clan");
const byName = name => clans.find(d => d.name === name);
const norm = text => text.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
const roster = JSON.parse(fs.readFileSync(path.join(root, "content/clans/roster.json"), "utf8"));
const block = (at, depth) => {
  let end = at + 1;
  while ( end < source.length && !new RegExp(`^#{1,${depth}} `).test(source[end]) ) end++;
  return { end, lines: source.slice(at + 1, end) };
};

test("six consecutive batches contain the actual 44 source clans and preserve Uchiha's original identity", () => {
  assert.equal(clans.length, 44);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(batch => roster.filter(c => c.batch === batch).length), [8, 8, 8, 8, 8, 4]);
  for ( const c of roster ) assert.ok(byName(c.name), c.name);
  assert.equal(byName("Uchiha")._id, "n5eUchihaClan001");
});

test("every source level-feature heading is present with the full body and the stated grant level", () => {
  let count = 0;
  for ( const clan of roster ) {
    const start = clan.line - 1, main = block(start, 2);
    const featuresAt = source.findIndex((s, i) => i > start && i < main.end && /^### .*Features/.test(s));
    const region = block(featuresAt, 3);
    for ( let at = featuresAt + 1; at < region.end; at++ ) {
      if ( !source[at].startsWith("#### ") ) continue;
      const b = block(at, 4), level = b.lines.slice(0, 4).join(" ").match(/(\d+)(?:st|nd|rd|th)[ -]+[Ll]evel/);
      if ( !level ) continue;
      const doc = docs.find(d => d.type === "feat" && d.flags?.n5e?.clanPackage === byName(clan.name).system.identifier && d.flags.n5e.sourceLine === at + 1 && d.system.category === "clanFeature");
      assert.ok(doc, `${clan.name}: ${source[at]}`);
      const body = b.lines.filter(s => !/^\[\/?BOX\]$/.test(s.trim())).join("\n");
      assert.equal(norm(doc.system.description), norm(body), doc.name);
      assert.ok(byName(clan.name).system.advancement.some(a => a.type === "feature" && a.level === Number(level[1]) && a.uuids.includes(doc.uuid)), doc.name);
      count++;
    }
  }
  assert.equal(count, 266);
});

test("all 408 clan Hijutsu retain their rules and usable rank, cost and component data", () => {
  const jutsu = docs.filter(d => d.type === "jutsu");
  assert.equal(jutsu.length, 408);
  for ( const j of jutsu ) {
    assert.ok(["E", "D", "C", "B", "A", "S"].includes(j.system.rank));
    assert.ok(clans.some(c => c.system.identifier === j.system.hijutsu.clan));
    const at = j.flags.n5e.sourceLine - 1, body = block(at, 4).lines.join("\n").match(/Description:\s*([\s\S]*)/i)?.[1];
    assert.ok(body, j.name);
    assert.equal(norm(j.system.description), norm(body.replace(/\[\/?BOX\]/g, "")), j.name);
    assert.ok(j.flags.n5e.sourceHeader.keywords, j.name);
    assert.ok(j.system.cost.mode === "special" || j.system.cost.value >= 0);
  }
});

test("all linked grants resolve, package IDs are unique, folders fit three levels and mutations stay optional", () => {
  const owned = docs.filter(d => d.uuid.startsWith("Compendium.n5e.clans."));
  assert.equal(new Set(owned.map(d => d._id)).size, owned.length);
  const folders = new Map(owned.filter(d => d._key.startsWith("!folders!")).map(d => [d._id, d]));
  for ( const d of owned ) {
    let parent = d.folder, depth = 0;
    while ( parent ) { assert.ok(folders.has(parent), `${d.name}: ${parent}`); parent = folders.get(parent).folder; depth++; assert.ok(depth <= 3, d.name); }
    for ( const a of d.system?.advancement ?? [] ) for ( const uuid of a.uuids.filter(u => u.startsWith("Compendium.")) ) assert.ok(owned.some(d => d.uuid === uuid), uuid);
    for ( const uuid of d.flags?.n5e?.grants ?? [] ) assert.ok(owned.some(d => d.uuid === uuid), uuid);
  }
  const mutations = docs.filter(d => d.flags?.n5e?.mutation);
  assert.equal(mutations.length, 19);
  for ( const m of mutations ) assert.equal(clans.some(c => c.system.advancement.some(a => a.uuids.includes(m.uuid))), false, m.name);
  for ( const d of owned.filter(d => d.type === "stance") ) assert.doesNotMatch(d.name, /^(?:Taijutsu|Bukijutsu|Chakra)$|\bor\b|qualify|Expert/);
});

test("latent bloodline table rows remain separate Non-Clan records", () => {
  const start = source.findIndex((s, i) => i > 9900 && /^Latent /.test(s));
  const expected = source.slice(start).filter(s => { const row = s.split("|").slice(1, -1); return row.length >= 3 && /^\s*\d/.test(row[1]); }).length;
  const latent = docs.filter(d => d.flags?.n5e?.latent);
  assert.equal(latent.reduce((n, d) => n + d.flags.n5e.latent.sourceLines.length, 0), expected);
  assert.ok(latent.length > 100);
  assert.ok(latent.every(d => d.system.requirement.clan === "non-clan"));
  assert.equal(docs.some(d => d.name === "Frigid Frost"), false);
});

function choose(fields, branch = "main", mode = "choose") {
  const selected = new Set(), selectedSkills = [];
  const choices = {};
  for ( const f of fields ) {
    if ( f.kind === "branch" ) { choices[f.id] = [branch]; continue; }
    const pool = f.kind === "mastery" ? f.options.filter(o => selectedSkills.includes(o.value)) : f.options;
    const picked = pool.filter(o => !selected.has(o.value) || f.kind === "mastery").slice(0, f.count).map(o => o.value);
    choices[f.id] = picked; picked.forEach(v => selected.add(v));
    if ( f.kind === "skill" ) selectedSkills.push(...picked);
  }
  return { choices, mode, abilities: mode === "three" ? ["str", "dex", "wis"] : ["str", "wis"] };
}

test("clan setup grants only the selected Hyuga branch and rejects overlapping ability increases", () => {
  const actor = makeActor({ items: [taiSpec(7)] });
  const clan = byName("Hyūga"), fields = clanSetupFields(actor, clan, docs), selection = choose(fields);
  const plan = clanSetupPlan(actor, clan, fields, selection, docs);
  assert.deepEqual(plan.errors, []);
  const branchGrants = clan.system.advancement.filter(a => a.level === 7 && a.branch);
  assert.equal(branchGrants.length, 2);
  const main = branchGrants.find(a => a.branch === "main").uuids[0], side = branchGrants.find(a => a.branch === "side").uuids[0];
  assert.ok(plan.grants.some(g => g.doc.uuid === main));
  assert.equal(plan.grants.some(g => g.doc.uuid === side), false);
  assert.ok(clanSetupPlan(actor, clan, fields, { ...selection, abilities: ["str", "str"] }, docs).errors.length);
});

test("Non-Clan supports three different +1s, three skills, Self-Taught mastery and the free feat", () => {
  const actor = makeActor({ items: [taiSpec(1)] }), clan = byName("Non-Clan");
  const fields = clanSetupFields(actor, clan, docs), plan = clanSetupPlan(actor, clan, fields, choose(fields, "", "three"), docs);
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.selectedSkills.length, 3);
  assert.deepEqual(plan.increments, { str: 1, dex: 1, wis: 1 });
  assert.equal(plan.mastery.length, 2);
  assert.ok(plan.grants.some(g => g.doc.type === "feat" && isFeatItem(g.doc)));
});

test("clan features participate in level-up once, branches are respected and clan feats are excluded", () => {
  const c = structuredClone(byName("Hyūga")); c.system.branch = "side"; c.flags.n5e.clanAppliedLevels = [1, 3];
  const actor = makeActor({ items: [taiSpec(6), c] });
  const steps = stepsForLevel({ actor, cls: actor.items[0], level: 7 });
  const grants = steps.filter(s => s.origin === "clan").flatMap(s => s.uuids ?? []);
  assert.ok(grants.includes(c.system.advancement.find(a => a.level === 7 && a.branch === "side").uuids[0]));
  assert.equal(grants.includes(c.system.advancement.find(a => a.level === 7 && a.branch === "main").uuids[0]), false);
  actor.items[1].flags.n5e.clanAppliedLevels.push(7);
  assert.equal(stepsForLevel({ actor, cls: actor.items[0], level: 7 }).some(s => s.origin === "clan"), false);
  const feats = docs.filter(d => d.system?.category === "clan");
  assert.equal(feats.length, 0);
  assert.equal(eligibleFeats(feats, { level: 20, owned: new Set() }).length, 0);
  assert.equal(eligibleFeats(feats, { level: 20, owned: new Set(), clan: "hyuga" }).length, 0);
  assert.equal(advancementSteps(c, 7, "clan").length, 1);
});

test("Hijutsu learning/casting requires the correct clan and uses its flexibility abilities", () => {
  const jutsu = docs.filter(d => d.type === "jutsu");
  const learned = learnableJutsu(jutsu, { maxRank: "D", affinities: new Set(), known: new Set(), keywords: {}, clan: "aburame" });
  assert.ok(learned.length > 0);
  assert.ok(learned.every(j => j.system.hijutsu.clan === "aburame"));
  assert.equal(learnableJutsu(jutsu, { maxRank: "S", affinities: new Set(), known: new Set(), keywords: {} }).length, 0);
  const actor = makeActor({ items: [taiSpec(), byName("Aburame"), learned[0]] });
  assert.ok(["int", "wis"].includes(actor.items[2].system.live.ability));
  assert.equal(actor.items[2].system.live.castable, true);
  const wrong = makeActor({ items: [taiSpec(), byName("Nara"), learned[0]] });
  assert.equal(wrong.items[2].system.live.castable, false);
});

test("clan resources unlock with their feature and unlimited ranked conditions retain their ranks", () => {
  const clan = byName("Akimichi"), calories = docs.find(d => d.name === "Caloric Arts" && d.flags?.n5e?.clanPackage === "akimichi");
  const without = makeActor({ items: [taiSpec(1), clan] });
  assert.equal(without.system.resources.calories, undefined);
  const withCalories = makeActor({ items: [taiSpec(3), clan, calories] });
  assert.equal(withCalories.system.resources.calories.maxValue, 1 + withCalories.system.prof);
  const infested = byName("Aburame").system.conditions.find(c => c.label === "Infested");
  assert.equal(infested.maxRanks, 0);
  assert.equal(clampRanks(infested, 12), 12);
});

test("cancelling clan setup makes no actor or origin writes", async () => {
  const oldGame = globalThis.game, oldUi = globalThis.ui, oldApps = foundry.applications;
  let writes = 0;
  globalThis.game = { packs: new Map([["n5e.clans", { getDocuments: async () => docs }]]), items: [] };
  globalThis.ui = { notifications: { info() {}, warn() {} } };
  foundry.applications = { api: { DialogV2: { wait: async () => "cancel" } } };
  try {
    const actor = makeActor({ items: [taiSpec()] }); actor.isOwner = true;
    actor.createEmbeddedDocuments = async () => { writes++; };
    actor.deleteEmbeddedDocuments = async () => { writes++; };
    assert.equal(await addClan(actor, byName("Aburame")), null);
    assert.equal(writes, 0);
  } finally { globalThis.game = oldGame; globalThis.ui = oldUi; foundry.applications = oldApps; }
});

test("a replacement failure restores the old clan and scores instead of leaving a partial origin", async () => {
  const oldGame = globalThis.game, oldUi = globalThis.ui, oldApps = foundry.applications;
  const catalog = docs.filter(d => d.system).map(d => ({ ...d, toObject: () => structuredClone(d) }));
  const actor = makeActor({ items: [taiSpec(), byName("Uchiha")] }); actor.isOwner = true;
  actor.items.get = id => actor.items.find(i => i.id === id);
  actor._source = { system: { abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(k => [k, { value: 10 }])) } };
  const old = actor.items[1];
  old.toObject = () => ({ ...structuredClone(byName("Uchiha")), _id: old.id });
  const target = catalog.find(d => d.type === "clan" && d.name === "Hatake");
  const selection = { ...choose(clanSetupFields(actor, target, catalog)), applyASI: true };
  let sequence = 0, failed = false;
  actor.createEmbeddedDocuments = async (type, data, options = {}) => data.map(d => {
    const id = options.keepId ? d._id : `created-${++sequence}`;
    const item = { ...d, id, toObject: () => ({ ...structuredClone(d), _id: id }) }; actor.items.push(item); return item;
  });
  actor.deleteEmbeddedDocuments = async (type, ids) => {
    for ( const id of ids ) { const at = actor.items.findIndex(i => i.id === id); if ( at >= 0 ) actor.items.splice(at, 1); }
    if ( ids.includes(old.id) && !failed ) { failed = true; throw new Error("simulated old-origin deletion failure"); }
  };
  actor.update = async changes => {
    for ( const [key, value] of Object.entries(changes) ) actor._source.system.abilities[key.split(".")[2]].value = value;
  };
  globalThis.game = { packs: new Map([["n5e.clans", { getDocuments: async () => catalog }]]), items: [] };
  globalThis.ui = { notifications: { info() {}, warn() {} } };
  foundry.applications = { api: { DialogV2: { wait: async () => selection } } };
  try {
    await assert.rejects(addClan(actor, target), /simulated/);
    assert.ok(actor.items.get(old.id));
    assert.equal(actor.items.some(i => i.type === "clan" && i.name === "Hatake"), false);
    assert.equal(actor._source.system.abilities.str.value, 10);
    assert.equal(actor._source.system.abilities.wis.value, 10);
  } finally { globalThis.game = oldGame; globalThis.ui = oldUi; foundry.applications = oldApps; }
});
