/**
 * NT1 (King 2026-11-24): jutsu slots, pure.
 *
 * Every known jutsu counts as one of two kinds (jutsu `system.learned.mode`):
 *   class  counts toward the class's Jutsu Known (the class table column, `jutsuKnownNow`).
 *   bonus  a Bonus Jutsu from a feat, feature, trait... (`learned.source`: that item's id or compendium uuid;
 *          `learned.grantedBy`: its name). Old data: "known" reads as class, "granted" as bonus.
 * Bonus Jutsu come from feat-type items (features, feats, traits): `system.bonusJutsu.count` slots the
 * player fills (with an optional highest rank, discipline, section and keyword), and `system.grants.jutsu`
 * specific jutsu granted outright (each is a Bonus Jutsu too). Slots are derived, never stored: open =
 * limit - used, so Remove level and lost features fix themselves.
 *
 * Nothing here blocks (King: an alert for player and GM, never a block): learnProblems returns reasons.
 */

export const RANKS = ["E", "D", "C", "B", "A", "S"];
const list = v => (Array.isArray(v) ? v : v instanceof Set ? [...v] : v ? [...v] : []);
const items = actor => list(actor?.items?.contents ?? actor?.items);

/** "class" or "bonus" for a jutsu (old data: known → class, granted → bonus). */
export function learnedMode(jutsu) {
  const m = jutsu?.system?.learned?.mode ?? "class";
  return m === "granted" || m === "bonus" ? "bonus" : "class";
}

/** Does an item (by id or compendium uuid) match a learned.source value? */
export function sourceMatches(item, source) {
  if ( !source ) return false;
  return item.id === source || item.uuid === source || item._stats?.compendiumSource === source || item.flags?.core?.sourceId === source;
}

/** The slot limits a bonus-jutsu entry sets, as one line ("C-Rank or lower · Fire Release · Medical"). */
export function filterText(f = {}, labels = {}) {
  return [f.maxRank ? `${f.maxRank}-Rank or lower` : "", f.discipline ? labels.discipline?.(f.discipline) ?? f.discipline : "",
    f.section ? labels.section?.(f.section) ?? f.section : "", f.keyword ? labels.keyword?.(f.keyword) ?? f.keyword : ""].filter(Boolean).join(" · ");
}

/** Items on the actor that give Bonus Jutsu: [{id, uuid, name, count, filter, fixed: [uuids]}]. */
export function bonusSources(actor) {
  return items(actor).filter(i => i.type === "feat" && ((i.system.bonusJutsu?.count ?? 0) > 0 || list(i.system.grants?.jutsu).length))
    .map(i => ({ id: i.id, uuid: i._stats?.compendiumSource ?? i.flags?.core?.sourceId ?? i.uuid, name: i.name,
      count: i.system.bonusJutsu?.count ?? 0, fixed: list(i.system.grants?.jutsu),
      filter: { maxRank: i.system.bonusJutsu?.maxRank ?? "", discipline: i.system.bonusJutsu?.discipline ?? "",
        section: i.system.bonusJutsu?.section ?? "", keyword: i.system.bonusJutsu?.keyword ?? "" } }));
}

/**
 * The actor's jutsu slots.
 * @returns {{class: {used, max, open, maxRank}, bonus: {used, max, open, sources: object[], unassigned}, open}}
 */
export function jutsuSlots(actor) {
  const jutsu = items(actor).filter(i => i.type === "jutsu");
  const cls = actor?.system?.grants?.classItem ?? items(actor).find(i => i.type === "class");
  const classMax = cls?.system?.jutsuKnownNow ?? cls?.system?.jutsuKnown?.[(cls?.system?.levels ?? 1) - 1] ?? null;
  const classUsed = jutsu.filter(j => learnedMode(j) === "class").length;
  const bonus = jutsu.filter(j => learnedMode(j) === "bonus");
  const sources = bonusSources(actor).map(s => {
    const item = items(actor).find(i => i.id === s.id);
    const mine = bonus.filter(j => sourceMatches(item, j.system.learned?.source));
    const fixedNames = new Set(s.fixed);
    const fixedHad = mine.filter(j => fixedNames.has(j._stats?.compendiumSource ?? j.flags?.core?.sourceId)).length;
    const picked = mine.length - fixedHad;
    return { ...s, used: mine.length, max: s.count + s.fixed.length, picked, open: Math.max(0, s.count - picked) };
  });
  const assigned = sources.reduce((n, s) => n + s.used, 0);
  const bonusMax = sources.reduce((n, s) => n + s.max, 0);
  const out = {
    class: { used: classUsed, max: classMax, open: classMax == null ? 0 : Math.max(0, classMax - classUsed), maxRank: actor?.system?.grants?.maxRank ?? "" },
    bonus: { used: bonus.length, max: bonusMax, open: sources.reduce((n, s) => n + s.open, 0), sources, unassigned: bonus.length - assigned }
  };
  out.open = out.class.open + out.bonus.open;
  return out;
}

/** Does a jutsu fit a bonus slot's limits? */
export function matchesFilter(jutsu, f = {}) {
  const s = jutsu.system ?? {};
  if ( f.maxRank && RANKS.indexOf(s.rank) > RANKS.indexOf(f.maxRank) ) return false;
  const discs = new Set([s.discipline, ...list(s.disciplines)]);
  if ( s.discipline === "tai" && list(s.keywords).includes("bukijutsu") ) discs.add("buki");
  if ( f.discipline && !discs.has(f.discipline) ) return false;
  if ( f.section && s.section !== f.section ) return false;
  if ( f.keyword && !list(s.keywords).includes(f.keyword) ) return false;
  return true;
}

/**
 * Why learning this jutsu breaks the rules (empty = fine). Never blocks; the caller alerts.
 * @param {object} actor
 * @param {object} jutsu        the jutsu document being learned
 * @param {object} [o]
 * @param {string} [o.maxRank]  highest rank allowed (default: the actor's)
 * @param {object} [o.filter]   a bonus slot's limits
 * @param {object} [o.keywords] CONFIG.N5E.keywords
 */
export function learnProblems(actor, jutsu, { maxRank = "", filter = null, keywords = {} } = {}) {
  const s = jutsu.system ?? {};
  const out = [];
  const max = maxRank || actor?.system?.grants?.maxRank || "";
  if ( max && RANKS.indexOf(s.rank) > RANKS.indexOf(max) ) out.push(`${s.rank}-Rank is above the highest rank ${actor?.name ?? "the character"} can learn (${max}-Rank).`);
  const clan = items(actor).find(i => i.type === "clan");
  const hijutsu = !!s.hijutsu?.clan || list(s.keywords).includes("hijutsu");
  if ( hijutsu && s.hijutsu?.clan && s.hijutsu.clan !== clan?.system?.identifier ) out.push(`Hijutsu of another clan (${s.hijutsu.clan}).`);
  else if ( hijutsu && s.hijutsu?.branch && s.hijutsu.branch !== clan?.system?.branch ) out.push(`Hijutsu of another branch (${s.hijutsu.branch}).`);
  const affinities = new Set(list(actor?.system?.grants?.affinities));
  for ( const kw of list(s.keywords) ) {
    const def = keywords?.[kw];
    if ( kw === "kinjutsu" ) out.push("Kinjutsu can't be learned normally.");
    else if ( def?.affinity && !hijutsu && !affinities.has(def.affinity) ) out.push(`Needs the ${def.label ?? def.affinity} affinity.`);
  }
  if ( filter && !matchesFilter(jutsu, filter) ) out.push(`Doesn't fit the slot's limits (${filterText(filter) || "none"}).`);
  return out;
}

/**
 * Which slot a newly learned jutsu takes: a class slot if one is open, else the first open bonus slot it
 * fits. With none open it still counts as class (over the limit).
 * @returns {{mode: "class"|"bonus", source: string, grantedBy: string, filter: object|null, overLimit: boolean}}
 */
export function assignSlot(actor, jutsu, slots = jutsuSlots(actor)) {
  if ( slots.class.open > 0 ) return { mode: "class", source: "", grantedBy: "", filter: null, overLimit: false };
  const fit = slots.bonus.sources.find(s => s.open > 0 && matchesFilter(jutsu, s.filter));
  if ( fit ) return { mode: "bonus", source: fit.uuid ?? fit.id, grantedBy: fit.name, filter: fit.filter, overLimit: false };
  const any = slots.bonus.sources.find(s => s.open > 0);
  if ( any ) return { mode: "bonus", source: any.uuid ?? any.id, grantedBy: any.name, filter: any.filter, overLimit: false };
  return { mode: "class", source: "", grantedBy: "", filter: null, overLimit: true };
}

/** Filters to preset in the Jutsu Browser for a slot: ranks up to maxRank, plus the slot's limits. */
export function browserFilters({ maxRank = "", filter = {} } = {}) {
  const top = filter.maxRank || maxRank;
  const out = {};
  if ( top ) out.rank = RANKS.slice(0, RANKS.indexOf(top) + 1);
  if ( filter.discipline ) out.discipline = [filter.discipline];
  if ( filter.section ) out.section = [filter.section];
  if ( filter.keyword ) out.keywords = [filter.keyword];
  return out;
}
