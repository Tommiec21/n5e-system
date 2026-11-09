/**
 * Compendium browser (0.9.2): rows from index entries, facets, filters and sorting.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { TABS, tabFor, entryFrom, facetOptions, filterEntries, sortEntries } from "../module/rules/browser.mjs";

// Every document in the real compendium sources, as the browser would see it.
const entries = [];
for ( const pack of ["jutsu", "features", "feats", "stances", "equipment", "classes", "clans"] ) {
  for ( const f of readdirSync(`packs/_source/${pack}`, { recursive: true }).filter(f => f.endsWith(".json")) ) {
    const d = JSON.parse(readFileSync(`packs/_source/${pack}/${f}`, "utf8"));
    if ( d._key.startsWith("!folders!") ) continue;
    entries.push(entryFrom({ ...d, uuid: `Compendium.n5e.${pack}.Item.${d._id}` }, { pack }));
  }
}

test("every item type has a tab and every row lands in one", () => {
  for ( const t of ["jutsu", "feat", "stance", "weapon", "armor", "class", "subclass", "clan", "background"] ) assert.ok(tabFor(t), t);
  assert.ok(entries.every(e => e.tab), "no row without a tab");
  assert.ok(entries.filter(e => e.tab === "features").length > 250);
});

test("jutsu rows: rank, discipline, cost, area, concentration", () => {
  const lh = entries.find(e => e.name === "Leaf Hurricane");
  assert.deepEqual([lh.rank, lh.discipline, lh.cost, lh.hasArea, lh.concentration], ["C", "tai", 8, true, false]);
  const fox = entries.find(e => e.name === "Fire Release: Fox Fire");
  assert.ok(fox.concentration);
});

test("facets list values with counts, ranks in rank order", () => {
  const jutsu = entries.filter(e => e.tab === "jutsu");
  const f = facetOptions(jutsu, "jutsu");
  const ranks = f.rank.map(o => o.value);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => "EDCBAS".indexOf(a) - "EDCBAS".indexOf(b)));
  assert.equal(f.rank.reduce((t, o) => t + o.count, 0), jutsu.length);
  assert.ok(f.cost.max >= f.cost.min);
});

test("filters: any-of, all-of keywords, cost range, booleans, search", () => {
  const tab = "jutsu";
  const tai = filterEntries(entries, { discipline: ["tai"] }, { tab });
  assert.ok(tai.length && tai.every(e => e.discipline === "tai"));
  const fin = filterEntries(entries, { keywords: ["taijutsu", "finisher"] }, { tab });
  assert.ok(fin.some(e => e.name === "Leaf Hurricane") && fin.every(e => e.keywords.includes("finisher")));
  const cheap = filterEntries(entries, { cost: { min: 0, max: 5 } }, { tab });
  assert.ok(cheap.every(e => e.cost <= 5));
  const area = filterEntries(entries, { hasArea: "true" }, { tab });
  assert.ok(area.every(e => e.hasArea));
  assert.deepEqual(filterEntries(entries, {}, { tab, search: "leaf hurr" }).map(e => e.name), ["Leaf Hurricane"]);
  assert.ok(filterEntries(entries, {}, { tab, search: "whirlwind", inText: true }).some(e => e.name === "Leaf Hurricane"), "rules text search");
  const gen = filterEntries(entries, { cls: ["genjutsu-specialist"], level: 2 }, { tab: "features" });
  assert.ok(gen.length && gen.every(e => e.cls === "genjutsu-specialist" && e.level <= 2));
});

test("sorting by rank then name, and by cost", () => {
  const jutsu = entries.filter(e => e.tab === "jutsu");
  const byRank = sortEntries(jutsu, "rank");
  for ( let i = 1; i < byRank.length; i++ ) assert.ok("EDCBAS".indexOf(byRank[i - 1].rank) <= "EDCBAS".indexOf(byRank[i].rank));
  const byCost = sortEntries(jutsu, "cost").filter(e => e.cost != null);
  for ( let i = 1; i < byCost.length; i++ ) assert.ok(byCost[i - 1].cost <= byCost[i].cost);
  assert.ok(Object.values(TABS).every(t => t.sorts.length && t.filters.length));
});
