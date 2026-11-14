/** DATA1a: data model update (King 2026-11-13). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { migrateJutsuDisciplines, migrateKeywords, migrateFeatureKind, migrateItemData1 } from "../module/migration/data1.mjs";
import { canonicalKeywords, isBukijutsu, featureKind, isFeatItem, featGroups, hasKeyword } from "../module/rules/keywords.mjs";

test("keywords: camelCase, compound keywords split, stimuli plain, Combination removed, values kept", () => {
  assert.deepEqual(canonicalKeywords("main-branch"), ["mainBranch"]);
  assert.deepEqual(canonicalKeywords("bukijutsu-fire-release"), ["bukijutsu", "fireRelease"]);
  assert.deepEqual(canonicalKeywords("genjutsu-visual"), ["genjutsu", "visual"]);
  assert.deepEqual(canonicalKeywords("inhale"), ["inhaled"]);
  assert.deepEqual(canonicalKeywords("combination"), []);
  assert.deepEqual(canonicalKeywords("deadly:1"), ["deadly:1"]);
  assert.equal(hasKeyword({ system: { keywords: ["deadly:1"] } }, "deadly"), true);
  assert.equal(hasKeyword({ system: { keywords: ["deadly:1"] } }, "deadly", 2), false);
  assert.deepEqual(migrateKeywords({ system: { keywords: ["fireRelease", "combination", "tactile-chain", "chain"] } }).system.keywords, ["fireRelease", "tactile", "chain"]);
});

test("jutsu: Bukijutsu becomes Taijutsu + keyword; multi-discipline jutsu keep every discipline; Ninjutsu+Bukijutsu stays Ninjutsu", () => {
  const buki = migrateJutsuDisciplines({ type: "jutsu", system: { discipline: "buki", keywords: ["bukijutsu", "chain"] } });
  assert.equal(buki.system.discipline, "tai"); assert.deepEqual(buki.system.disciplines, ["tai"]);
  assert.equal(isBukijutsu(buki), true);
  const hijutsu = migrateJutsuDisciplines({ type: "jutsu", system: { discipline: "nin", keywords: ["hijutsu", "ninjutsu", "genjutsu", "fuinjutsu"] } });
  assert.deepEqual(hijutsu.system.disciplines, ["nin", "gen"]);
  const ninBuki = migrateJutsuDisciplines({ type: "jutsu", system: { discipline: "nin", keywords: ["ninjutsu", "bukijutsu"] } });
  assert.equal(ninBuki.system.discipline, "nin"); assert.deepEqual(ninBuki.system.disciplines, ["nin", "tai"]);
  assert.equal(isBukijutsu(ninBuki), false, "shown in the Ninjutsu group");
});

test("feature kinds and the Feats group", () => {
  assert.equal(migrateFeatureKind({ type: "feat", system: { category: "backgroundFeature" } }).system.category, "clanFeature");
  assert.equal(migrateFeatureKind({ type: "feat", system: { category: "classOption" } }).system.category, "classFeatureOption");
  const feat = migrateFeatureKind({ type: "feat", system: { category: "skill", keywords: [] } });
  assert.equal(feat.system.category, "feat"); assert.deepEqual(feat.system.keywords, ["skill"]);
  assert.equal(isFeatItem(feat), true); assert.deepEqual(featGroups(feat), ["skill"]);
  assert.equal(featureKind({ type: "feat", system: { category: "clanOption" } }), "clanFeatureOption", "pre-migration items read correctly");
  assert.equal(migrateFeatureKind({ type: "feat", system: { category: "classFeature" } }), null);
});

test("packs are fully migrated: running the update again changes nothing, and no old shapes remain", () => {
  const files = [];
  const walk = dir => { for ( const f of readdirSync(dir) ) { const p = join(dir, f); if ( statSync(p).isDirectory() ) walk(p); else if ( f.endsWith(".json") ) files.push(p); } };
  walk(new URL("../packs/_source", import.meta.url).pathname);
  for ( const file of files ) {
    const doc = JSON.parse(readFileSync(file, "utf8"));
    if ( !doc.system ) continue;
    assert.equal(migrateItemData1(doc), null, file);
    if ( doc.type === "jutsu" ) assert.notEqual(doc.system.discipline, "buki", file);
    for ( const k of doc.system.keywords ?? [] ) assert.ok(!/-/.test(k) && k !== "combination", `${file}: ${k}`);
    if ( doc.type === "feat" ) assert.ok(["feat", "classFeature", "classFeatureOption", "clanFeature", "clanFeatureOption"].includes(doc.system.category) || doc.system.category.startsWith("npc"), file);
  }
});
