/**
 * LVL1 L4 (King 2026-11-24): structured feat prerequisites. Unmet feats are grayed out in the level-up
 * lists (still selectable); taking one anyway alerts the GM and the player. Free-text prerequisites
 * (`system.prerequisites`) are shown to judge by hand; they never gray a feat out.
 *
 * Feat-type `system.requirement`: level, class (identifier), clan (identifier), abilities {str..cha: min
 * score, 0 = none}, skills / tools (proficiency in each), affinity (a nature release), keyword (knows a
 * jutsu with it), feats (uuids of feats or features already had).
 */
const list = v => (Array.isArray(v) ? v : v instanceof Set ? [...v] : v ? [...v] : []);
const items = actor => list(actor?.items?.contents ?? actor?.items);
const LABEL = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };

/**
 * What a character is missing for a feat (empty = every structured prerequisite met).
 * @param {object} actor
 * @param {object} feat
 * @param {object} [o]
 * @param {number} [o.level]      the level being taken (default the actor's)
 * @param {object} [o.labels]     {skill(k), tool(k), affinity(k), keyword(k), feat(uuid)} display names
 * @param {object[]} [o.extra]    items gained this same level (count toward "has feat")
 */
export function featPrereqProblems(actor, feat, { level = null, labels = {}, extra = [] } = {}) {
  const r = feat.system?.requirement ?? {};
  if ( typeof r !== "object" ) return [];
  const sys = actor?.system ?? {};
  const out = [];
  const lv = level ?? sys.level ?? 0;
  const owned = [...items(actor), ...extra];
  if ( (r.level ?? 0) > lv ) out.push(`Level ${r.level} (is ${lv})`);
  const cls = owned.find(i => i.type === "class");
  if ( r.class && r.class !== cls?.system?.identifier ) out.push(`Class: ${r.class}`);
  const clan = owned.find(i => i.type === "clan");
  if ( r.clan && r.clan !== clan?.system?.identifier ) out.push(`Clan: ${r.clan}`);
  for ( const [ab, min] of Object.entries(r.abilities ?? {}) ) {
    const have = sys.abilities?.[ab]?.value ?? 0;
    if ( min > 0 && have < min ) out.push(`${LABEL[ab] ?? ab} ${min} (has ${have})`);
  }
  for ( const k of list(r.skills) ) if ( !(sys.skills?.[k]?.isProficient ?? sys.skills?.[k]?.proficient) ) out.push(`Proficiency: ${labels.skill?.(k) ?? k}`);
  for ( const k of list(r.tools) ) if ( !(sys.tools?.[k]?.isProficient ?? sys.tools?.[k]?.proficient) ) out.push(`Proficiency: ${labels.tool?.(k) ?? k}`);
  if ( r.affinity && !list(sys.grants?.affinities).includes(r.affinity) ) out.push(`Affinity: ${labels.affinity?.(r.affinity) ?? r.affinity}`);
  if ( r.keyword && !owned.some(i => i.type === "jutsu" && list(i.system?.keywords).includes(r.keyword)) ) out.push(`Knows a ${labels.keyword?.(r.keyword) ?? r.keyword} jutsu`);
  for ( const uuid of list(r.feats) ) {
    const has = owned.some(i => [i.uuid, i._stats?.compendiumSource, i.flags?.core?.sourceId].includes(uuid));
    if ( !has ) out.push(`Has ${labels.feat?.(uuid) ?? uuid}`);
  }
  return out;
}

/** The structured prerequisites as one line (for the item sheet and the level-up card). */
export function prereqText(feat, labels = {}) {
  const r = feat.system?.requirement ?? {};
  if ( typeof r !== "object" ) return String(r ?? "");
  return [r.level > 1 ? `Level ${r.level}` : "", r.class ? `Class: ${r.class}` : "", r.clan ? `Clan: ${r.clan}` : "",
    ...Object.entries(r.abilities ?? {}).filter(([, v]) => v > 0).map(([k, v]) => `${LABEL[k] ?? k} ${v}`),
    ...list(r.skills).map(k => labels.skill?.(k) ?? k), ...list(r.tools).map(k => labels.tool?.(k) ?? k),
    r.affinity ? `${labels.affinity?.(r.affinity) ?? r.affinity} affinity` : "", r.keyword ? `knows a ${labels.keyword?.(r.keyword) ?? r.keyword} jutsu` : "",
    ...list(r.feats).map(u => labels.feat?.(u) ?? u), ...list(feat.system?.prerequisites)].filter(Boolean).join("; ");
}
