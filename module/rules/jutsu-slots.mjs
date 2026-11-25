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
 * Only the ability score requirement blocks (LVL1 L1, King: B-Rank 16, A-Rank 18, S-Rank 20 in the jutsu's
 * ability; not Hijutsu): learnBlock. Everything else is an alert for player and GM: learnProblems.
 * LVL1 L1: a jutsu a feature grants that the character already knows becomes a replacement Bonus Jutsu
 * slot on that feature (flags.n5e.replacementSlots: [{jutsu, name, discipline, section, maxRank}]: same
 * discipline and section, up to the granted jutsu's rank); jutsu learned into it carry the source
 * "<feature source>#<granted jutsu uuid>".
 */
import { abilityRequirement } from "./progression.mjs";

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

/** The source key a feature's Bonus Jutsu carry (its compendium source, else its own uuid). */
export const sourceKey = i => i._stats?.compendiumSource ?? i.flags?.core?.sourceId ?? i.uuid;

/**
 * Bonus Jutsu slot entries on the actor: one per feature with slots or outright grants, and one per
 * replacement slot. [{id, uuid (source key), keys, name, count, filter, fixed: [uuids], replaces}]
 */
export function bonusSources(actor) {
  const out = [];
  for ( const i of items(actor).filter(x => x.type === "feat") ) {
    const key = sourceKey(i);
    const count = i.system.bonusJutsu?.count ?? 0;
    const fixed = list(i.system.grants?.jutsu);
    if ( count > 0 || fixed.length ) out.push({ id: i.id, uuid: key, keys: [i.id, i.uuid, key].filter(Boolean), name: i.name, count, fixed,
      filter: { maxRank: i.system.bonusJutsu?.maxRank ?? "", discipline: i.system.bonusJutsu?.discipline ?? "",
        section: i.system.bonusJutsu?.section ?? "", keyword: i.system.bonusJutsu?.keyword ?? "" } });
    for ( const r of list(i.flags?.n5e?.replacementSlots) ) {
      const k = `${key}#${r.jutsu}`;
      out.push({ id: i.id, uuid: k, keys: [k, `${i.id}#${r.jutsu}`], name: `${i.name} (instead of ${r.name})`, count: 1, fixed: [], replaces: r.jutsu,
        filter: { maxRank: r.maxRank ?? "", discipline: r.discipline ?? "", section: r.section ?? "", keyword: "" } });
    }
  }
  return out;
}

/** The replacement slot's limits for a granted jutsu already known: same discipline and section, up to its rank. */
export function replacementFor(jutsu) {
  const s = jutsu.system ?? {};
  const buki = s.discipline === "tai" && list(s.keywords).includes("bukijutsu");
  return { jutsu: jutsu.uuid ?? "", name: jutsu.name, discipline: buki ? "buki" : s.discipline ?? "", section: s.section ?? "", maxRank: s.rank ?? "" };
}

/**
 * LVL1 L1 (King: block): the ability score requirement to learn a ranked jutsu (B 16, A 18, S 20) in its
 * ability (an override, else any of its disciplines' abilities or a keyword alternative). Hijutsu are
 * exempt. Returns the reason it is blocked, or "".
 */
export function learnBlock(actor, jutsu) {
  const s = jutsu.system ?? {};
  if ( s.hijutsu?.clan || list(s.keywords).includes("hijutsu") ) return "";
  const need = abilityRequirement(s.rank);
  if ( need == null ) return "";
  const sys = actor?.system ?? {};
  const discs = [...new Set([s.discipline, ...list(s.disciplines)].filter(Boolean).map(d => (d === "buki" ? "tai" : d)))];
  const candidates = new Set(s.ability ? [s.ability] : discs.map(d => sys.disciplines?.[d]?.ability).filter(Boolean));
  if ( !s.ability ) for ( const kw of [...list(s.keywords), ...discs.map(d => `discipline:${d}`)] ) for ( const alt of list(sys.modifiers?.keywordAbility?.[kw]) ) candidates.add(alt);
  if ( !candidates.size ) return "";
  const best = [...candidates].sort((a, b) => (sys.abilities?.[b]?.value ?? 0) - (sys.abilities?.[a]?.value ?? 0))[0];
  const have = sys.abilities?.[best]?.value ?? 0;
  return have >= need ? "" : `${jutsu.name} needs ${String(best).toUpperCase()} ${need} to learn (${s.rank}-Rank); ${actor?.name ?? "the character"} has ${have}.`;
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
    const mine = bonus.filter(j => s.keys.includes(j.system.learned?.source));
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

/** A jutsu's discipline for swaps and slot limits (Bukijutsu = Taijutsu with the bukijutsu keyword). */
export function jutsuDiscipline(jutsu) {
  const s = jutsu.system ?? {};
  return s.discipline === "tai" && list(s.keywords).includes("bukijutsu") ? "buki" : s.discipline ?? "";
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
