/**
 * Data model update (pure; DATA1, King 2026-11-13). Each function takes an item source (plain
 * object) and returns a changed copy, or null when nothing changes. Running it twice changes
 * nothing. Used by world migration 3 and by tools/migrate-packs.mjs for the compendium sources.
 */
import { canonicalKeywordList, keywordKey } from "../rules/keywords.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const DISCIPLINE_KEYWORDS = { ninjutsu: "nin", taijutsu: "tai", genjutsu: "gen" };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Jutsu: Bukijutsu → Taijutsu + bukijutsu keyword; multi-discipline Hijutsu keep every discipline. */
export function migrateJutsuDisciplines(source) {
  if ( source?.type !== "jutsu" ) return null;
  const sys = source.system ?? {};
  const keywords = list(sys.keywords);
  let discipline = sys.discipline || "nin";
  if ( discipline === "buki" ) {
    discipline = "tai";
    if ( !keywords.includes("bukijutsu") ) keywords.push("bukijutsu");
  }
  const disciplines = new Set(list(sys.disciplines).filter(d => ["nin", "tai", "gen"].includes(d)));
  disciplines.add(discipline);
  for ( const k of keywords ) if ( DISCIPLINE_KEYWORDS[keywordKey(k)] ) disciplines.add(DISCIPLINE_KEYWORDS[keywordKey(k)]);
  if ( keywords.includes("bukijutsu") ) disciplines.add("tai");
  const ordered = ["nin", "tai", "gen"].filter(d => disciplines.has(d));
  const next = { discipline, disciplines: ordered, keywords };
  if ( sys.discipline === next.discipline && same(list(sys.disciplines), ordered) && same(list(sys.keywords), keywords) ) return null;
  return { ...source, system: { ...sys, ...next } };
}

/** Keywords on any item: canonical keys, compound keywords split, Combination removed. */
export function migrateKeywords(source) {
  const sys = source?.system;
  if ( !sys || !("keywords" in sys) ) return null;
  const before = list(sys.keywords);
  const after = canonicalKeywordList(before);
  if ( same(before, after) ) return null;
  return { ...source, system: { ...sys, keywords: after } };
}

/** Feature kinds (King 2026-11-13). Old feat categories become keywords of the Feats group. */
export const FEATURE_KIND_MAP = Object.freeze({
  classFeature: "classFeature", classOption: "classFeatureOption", clanFeature: "clanFeature", clanOption: "clanFeatureOption",
  backgroundFeature: "clanFeature", npcFeature: "npcFreeform"
});
export function migrateFeatureKind(source) {
  if ( source?.type !== "feat" ) return null;
  const sys = source.system ?? {};
  const category = sys.category || "general";
  if ( ["classFeature", "classFeatureOption", "clanFeature", "clanFeatureOption", "feat"].includes(category) || category.startsWith("npc") ) {
    return category === "npcFeature" ? { ...source, system: { ...sys, category: "npcFreeform" } } : null;
  }
  if ( FEATURE_KIND_MAP[category] ) return { ...source, system: { ...sys, category: FEATURE_KIND_MAP[category] } };
  const keywords = list(sys.keywords);
  if ( !keywords.includes(category) ) keywords.push(category);
  return { ...source, system: { ...sys, category: "feat", keywords } };
}

/** All DATA1a changes for one item source; null when nothing changes. */
export function migrateItemData1(source) {
  let out = source, changed = false;
  for ( const fn of [migrateJutsuDisciplines, migrateKeywords, migrateFeatureKind] ) {
    const next = fn(out);
    if ( next ) { out = next; changed = true; }
  }
  return changed ? out : null;
}
