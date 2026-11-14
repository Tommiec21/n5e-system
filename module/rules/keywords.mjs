/**
 * Keywords (pure; DATA1, King 2026-11-13). Stored as text: "finesse", or "deadly:1" for a keyword
 * with a value (approved storage {key, value}, written key:value). Keys are camelCase, matching the
 * Release keys (fireRelease). Rules test keyword:<key> and keyword:<key>:<value>.
 */
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);

/** Compound keywords the import joined by mistake, split into their parts. */
export const SPLIT_KEYWORDS = Object.freeze({
  "bukijutsu-fire-release": ["bukijutsu", "fireRelease"],
  "bukijutsu-water-release": ["bukijutsu", "waterRelease"],
  "medical-stable": ["medical", "stable"],
  "ninjutsu-clash": ["ninjutsu", "clash"],
  "tactile-chain": ["tactile", "chain"],
  "tactile-medical": ["tactile", "medical"],
  "tactile-earth-release": ["tactile", "earthRelease"],
  "tactile-wind-release": ["tactile", "windRelease"],
  "tactile-lightning-release": ["tactile", "lightningRelease"],
  "genjutsu-visual": ["genjutsu", "visual"],
  "genjutsu-auditory": ["genjutsu", "auditory"],
  "genjutsu-tactile": ["genjutsu", "tactile"],
  "genjutsu-inhale": ["genjutsu", "inhaled"],
  inhale: ["inhaled"]
});

/** Keywords removed from the game (King 2026-11-13: Combination is removed entirely). */
export const REMOVED_KEYWORDS = Object.freeze(["combination"]);

/** kebab-case → camelCase, keeping any ":value" part. */
export function normalizeKeyword(entry) {
  const [key, ...rest] = String(entry ?? "").trim().split(":");
  const camel = key.replace(/-([a-z0-9])/g, (m, c) => c.toUpperCase());
  return rest.length ? `${camel}:${rest.join(":")}` : camel;
}

/** One stored keyword → canonical keywords (split, renamed, or removed). */
export function canonicalKeywords(entry) {
  const raw = String(entry ?? "").trim();
  if ( !raw ) return [];
  if ( SPLIT_KEYWORDS[raw] ) return [...SPLIT_KEYWORDS[raw]];
  const key = normalizeKeyword(raw);
  return REMOVED_KEYWORDS.includes(keywordKey(key)) ? [] : [key];
}

/** A whole keyword list → canonical, without duplicates, in first-seen order. */
export function canonicalKeywordList(keywords) {
  return [...new Set(list(keywords).flatMap(canonicalKeywords))];
}

export const keywordKey = entry => String(entry ?? "").split(":")[0];
export function keywordValue(entry) {
  const i = String(entry ?? "").indexOf(":");
  return i < 0 ? null : String(entry).slice(i + 1);
}

/** Does this item carry the keyword (optionally with this value)? */
export function hasKeyword(item, key, value = undefined) {
  const kws = list(item?.system?.keywords ?? item?.keywords);
  return kws.some(k => keywordKey(k) === key && (value === undefined || keywordValue(k) === String(value)));
}

/** Bukijutsu is a keyword on a Taijutsu jutsu (King 2026-11-13). */
/** Bukijutsu: a Taijutsu with the bukijutsu keyword (King 2026-11-13), or a pre-migration "buki" jutsu. */
export const isBukijutsu = item => item?.system?.discipline === "buki" || (item?.system?.discipline === "tai" && hasKeyword(item, "bukijutsu"));

/** Display group for a raw source or document: buki for Bukijutsu, otherwise the discipline. */
export const jutsuGroup = item => (isBukijutsu(item) ? "buki" : item?.system?.discipline ?? "");

/** Feat group keywords (King 2026-11-13: all feats are one Feats group; these keep them apart). */
export const FEAT_KEYWORDS = Object.freeze(["general", "skill", "chakra", "ninjutsu", "genjutsu", "taijutsu", "critical", "clan", "class", "archetype", "rare"]);
export function featKeywords(item) {
  return list(item?.system?.keywords).filter(k => FEAT_KEYWORDS.includes(keywordKey(k)));
}

/** Feature kinds (King 2026-11-13). Background features are Clan Features; feats are one Feats group. */
export const FEATURE_KINDS = Object.freeze(["classFeature", "classFeatureOption", "clanFeature", "clanFeatureOption",
  "npcTraits", "npcAbilities", "npcStrikes", "npcRole", "npcClass", "npcFreeform"]);
const LEGACY_FEATURE = { classOption: "classFeatureOption", clanOption: "clanFeatureOption", backgroundFeature: "clanFeature", npcFeature: "npcFreeform" };

/** The item's feature kind, or "feat" (reads pre-migration categories too). */
export function featureKind(item) {
  const c = item?.system?.category ?? "";
  if ( LEGACY_FEATURE[c] ) return LEGACY_FEATURE[c];
  return FEATURE_KINDS.includes(c) ? c : "feat";
}
export const isFeatItem = item => item?.type === "feat" && featureKind(item) === "feat";

/** A feat's group keywords, including a pre-migration category. */
export function featGroups(item) {
  const out = featKeywords(item).map(keywordKey);
  const c = item?.system?.category;
  if ( c && FEAT_KEYWORDS.includes(c) && !out.includes(c) ) out.push(c);
  return out;
}
