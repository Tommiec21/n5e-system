import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor, load, baseAbilities, taiSpec } from "./helpers/actor.mjs";
import { headerVM, railVM, mainVM, jutsuVM, inventoryVM, featuresVM, effectsVM, biographyVM } from "../module/view-models/character.mjs";
import { glyph, breakdownTooltip, keywordChip, conditionSummary } from "../module/view-models/common.mjs";

const level7 = (extra = {}) => {
  const jacket = load("equipment", "ShinobiJacket");
  const kunai = load("equipment", "Kunai");
  kunai.system.equipped = true;
  const pack = load("equipment", "Backpk");
  pack.system.equipped = true;
  return makeActor({
    name: "Taijutsu Test", system: baseAbilities, acCalc: "martialTechnique",
    items: [taiSpec(7), load("features", "MartialTech"), load("clans", "Uchiha"), load("jutsu", "DynamicEntry"),
      load("jutsu", "LeafHurrican"), jacket, kunai, pack],
    ...extra
  });
};

test("header", () => {
  const h = headerVM(level7());
  assert.equal(h.name, "Taijutsu Test");
  assert.equal(h.subtitle, "Level 7 · Taijutsu Specialist · Uchiha");
  assert.equal(h.prof, "+5");
  assert.deepEqual(h.abilities.map(x => x.abbr), ["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
  assert.deepEqual(h.origins.map(o => o.kind), ["class", "clan", "background"]);
  assert.equal(h.origins[0].name, "Taijutsu Specialist");
  assert.equal(h.origins[0].sub, "Level 7");
  assert.equal(h.origins[1].name, "Uchiha");
  assert.ok(h.origins[2].empty, "no background -> empty bubble");
});

test("rail: resources in one list (Will of Fire, pools, feature uses)", () => {
  const a = level7({ system: { ...baseAbilities, resources: { ocular: { label: "Ocular Charges", value: 4, max: "1 + @prof",
    recovery: [{ on: "sr" }, { on: "lr" }] } } } });
  const feat = a.items.find(i => i.type === "feat");
  feat.system.uses.max = "@prof"; feat.system.uses.spent = 2; feat.system.uses.per = "lr";
  a.system.prepareDerivedData();
  const r = railVM(a);
  assert.equal(r.prof, "+5");
  const [wof, ocular, uses] = r.resources;
  assert.equal(wof.label, "Will of Fire");
  assert.equal(wof.segments.filter(p => p.filled).length, 1);
  assert.equal(ocular.max, 6);
  assert.equal(ocular.segments.length, 6);
  assert.equal(ocular.note, "1 + prof · back on a short or long rest");
  assert.equal(uses.kind, "uses");
  assert.equal(uses.value, 3);
  assert.equal(uses.max, 5);
  assert.equal(uses.action, "setUses");
});

test("rail: vitals, breakdown tips, condition pips and summaries", () => {
  const a = level7({ conditions: [{ key: "burned", ranks: 2 }, { key: "dazed", ranks: 1 }] });
  const r = railVM(a);
  assert.equal(r.hp.max, 108);
  assert.equal(r.cp.max, 66);
  assert.equal(r.ac.value, 17);
  assert.equal(r.ac.label, "Martial Technique");
  assert.match(r.ac.tip, /Proficiency \(Martial Technique\)/);
  assert.equal(r.initiative.value, "+4");
  const burned = r.conditions.find(c => c.key === "burned");
  assert.equal(burned.pips.length, 5);
  assert.equal(burned.pips.filter(p => p.filled).length, 2);
  assert.match(burned.summary, /2d8 fire/);
  assert.equal(r.conditions.find(c => c.key === "dazed").ranked, false);
});

test("main: abilities, disciplines, skills in two columns, pins", () => {
  const a = level7();
  const kunaiId = a.items.find(i => i.name === "Kunai").id;
  a.flags.n5e.pins = [kunaiId, "missing"];
  const m = mainVM(a);
  assert.deepEqual(m.abilities.map(x => x.mod), ["+3", "+2", "+2", "+0", "+1", "−1"]);
  assert.equal(m.abilities[0].save, "+8");
  assert.ok(m.abilities[0].saveProficient);
  assert.equal(m.disciplines.find(d => d.key === "tai").attack, "+8");
  assert.equal(m.disciplines.find(d => d.key === "tai").dc, 16);
  assert.equal(m.skillColumns[0].length + m.skillColumns[1].length, 20);
  const mar = m.skillColumns.flat().find(s => s.key === "mar");
  assert.equal(mar.total, "+8");
  assert.ok(m.skillColumns.flat().find(s => s.key === "ins").granted, "Insight granted by clan");
  assert.equal(m.asiAvailable, 1);
  assert.equal(m.pinned.length, 1, "missing pins are skipped");
  assert.equal(m.toolkits.length, 2);
});

test("jutsu: grouped by discipline then rank, live numbers, filters, expansion", () => {
  const a = level7();
  const de = a.items.find(i => i.name === "Dynamic Entry");
  const v = jutsuVM(a, { expanded: new Set([de.id]), castRank: { [de.id]: "C" } });
  assert.equal(v.groups.length, 1);
  assert.equal(v.groups[0].label, "Taijutsu");
  assert.deepEqual(v.groups[0].ranks.map(r => r.rank), ["D", "C"]);
  const row = v.groups[0].ranks[0].rows[0];
  assert.equal(row.name, "Dynamic Entry");
  assert.equal(row.hit, "+8");
  assert.equal(row.cost, 7, "cast at C: 4 + 3");
  assert.equal(row.range, "30 ft");
  assert.ok(row.glyph.includes("<svg"));
  assert.ok(row.chips.some(c => c.label === "Clash"));
  assert.deepEqual(row.detail.ranks.map(r => [r.rank, r.cost]), [["D", 4], ["C", 7]]);
  const lh = v.groups[0].ranks[1].rows[0];
  assert.equal(lh.dc, 16);
  assert.equal(lh.area, "15 ft sphere");
  assert.equal(lh.detail, null, "collapsed rows carry no detail");
  assert.equal(jutsuVM(a, { discipline: "nin" }).noMatches, true);
  assert.equal(jutsuVM(a, { search: "finisher" }).groups[0].ranks.length, 1, "search matches keywords");
});

test("inventory: slots meter, sections, ammo ladder, seals", () => {
  const v = inventoryVM(level7());
  assert.equal(v.slots, 26);
  assert.equal(v.used, 4, "jacket 3 + kunai 1");
  assert.equal(v.meter.length, 26);
  const equipped = v.sections.find(s => s.key === "equipped");
  assert.deepEqual(equipped.rows.map(r => r.name), ["Kunai"]);
  const kunai = equipped.rows[0];
  assert.deepEqual(kunai.ammo.map(s => s.label), ["d8", "d6", "d4", "1", "0"]);
  assert.ok(kunai.ammo[0].current);
  assert.ok(kunai.chips.some(c => c.label === "Thrown"));
  assert.match(v.slotsTip, /2 × Str/);
});

test("features, effects, biography", () => {
  const a = level7({ conditions: [{ key: "sealed", ranks: 2 }] });
  const f = featuresVM(a);
  assert.equal(f.classCard.name, "Taijutsu Specialist");
  assert.deepEqual(f.clanCard.hijutsu.map(h => h.label), ["Int", "Wis"]);
  assert.equal(f.groups[0].rows[0].name, "Martial Technique");
  const e = effectsVM(a);
  assert.equal(e.groups[0].rows[0].ranks, 2);
  assert.equal(biographyVM(a).fields.length, 7);
});

test("common: glyphs, tooltips, chips", () => {
  assert.equal(glyph({ type: "reaction" }).label, "Reaction");
  assert.equal(glyph({ type: "none" }), null);
  const tip = breakdownTooltip({ label: "AC", total: 17, parts: [{ label: "Base", value: 10, base: true }, { label: "Dex", value: 2 }, { label: "Exhaustion 2", value: -2 }] }, { signedTotal: false });
  assert.match(tip, /<b>17<\/b>/);
  assert.match(tip, /class="neg"/);
  assert.match(keywordChip("fireRelease").tooltip, /fire affinity/);
  assert.match(conditionSummary("sealed", 2), /Ninjutsu base cost \+8/);
  assert.match(conditionSummary("exhaustion", 3), /−3 AC/);
});
