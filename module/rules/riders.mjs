/**
 * Feature riders on the action card (pure; CARD1d, King 2026-11-14; plan docs/CARD1D_SPEC.md).
 *
 * A rider is a feature effect that rides on an attack, jutsu or feature use and shows on its card.
 *   Cast riders     chosen and paid in the cast dialog: a feature castOption with a `rider` field
 *                   ("as part of casting / when you cast… you can spend"; Q-CD6).
 *   Trigger riders  flags.n5e.riders on a feature: offered on the card once their trigger happened
 *                   ("when you hit / when a creature fails / when you deal damage"; Q-CD6).
 *
 * Rider fields: id, label, when ([hit, crit, failedSave, damageDealt, cast]), appliesTo, target
 * (each | one | chosen), requires ({state: "combatRival"}: Specialized; any row, with a warning,
 * Q-CD7), cost, oncePerTurn, effects:
 *   addRanks {amount | "halfPoolRoll", conditions: "inflicted" | <condition tag>}
 *   inflict  {choose: [{key, kind, ranks, label}]}   one choice for every affected creature (Q-CD8)
 *   save     {ability, dc: {source}, inflicts, text} one save per event: rides the action's save
 *   effect   {name, changes, seconds, state, limit: {count, state}}
 *   note     {text}
 *
 * One save per event (King 2026-11-14): if the action forces a save, every rider's save effects use
 * that save's result (its ability and DC). If it doesn't, the player picks one rider's save as the
 * event save and every other rider rides on it. A target never makes a second save in one event.
 * Rank increases from several riders stack additively, then the condition's cap (Q-CD5).
 */
import { attackTargetRows } from "./parity.mjs";

const list = v => (Array.isArray(v) ? v : v == null ? [] : [...v]);
export const NATURE_RELEASES = Object.freeze(["fireRelease", "windRelease", "waterRelease", "earthRelease", "lightningRelease"]);

/**
 * Does a rider fit this action?
 * @param {object} rider
 * @param {{kind, discipline, keywords: string[], inflicts: object[]}} action
 * @param {(key: string) => string[]} [conditionTags]   a condition's tags (elemental...)
 */
export function riderFits(rider, action, conditionTags = () => []) {
  const a = rider?.appliesTo ?? {};
  const kw = new Set(list(action?.keywords).map(k => String(k).split(":")[0]));
  if ( a.kind && !list(a.kind).includes(action?.kind) ) return false;
  if ( a.discipline && action?.discipline !== a.discipline ) return false;
  if ( a.keywords?.length && !a.keywords.some(k => kw.has(k)) ) return false;
  if ( a.natureRelease && !NATURE_RELEASES.some(k => kw.has(k)) ) return false;
  const conditions = list(action?.inflicts).filter(i => i?.kind === "condition");
  if ( a.inflictsCondition && !conditions.length ) return false;
  if ( a.inflictsTag && !conditions.some(i => conditionTags(i.key).includes(a.inflictsTag)) ) return false;
  return true;
}

/** Trigger riders a caster's features offer for this action (once per turn already spent is marked). */
export function triggerRiders(items, action, { now = null, riderTurn = {}, conditionTags } = {}) {
  const same = (x, y) => !!x && !!y && x.round === y.round && x.turn === y.turn;
  return list(items).flatMap(item => list(item?.flags?.n5e?.riders).map((rider, i) => ({ rider, i, item })))
    .filter(({ rider }) => riderFits(rider, action, conditionTags))
    .map(({ rider, i, item }) => {
      const id = `${item.id}:${i}`;
      return { id, itemId: item.id, rider, used: !!rider.oncePerTurn && same(riderTurn[id], now) };
    });
}

/**
 * Per-target facts the riders read, with full information (GM view; who sees the outcome is the
 * card's concern).
 * @returns {Map<string, {hit, crit, saved, saveFailed, damaged}>}
 */
export function targetFacts(card, results = card?.results ?? {}) {
  const attack = results.attack;
  const named = new Map();
  for ( const t of [...list(card?.targets), ...list(attack?.targets)] ) if ( t?.uuid && !named.has(t.uuid) ) named.set(t.uuid, t);
  for ( const uuid of Object.keys(results.saves ?? {}) ) if ( !named.has(uuid) ) named.set(uuid, { uuid });
  const hits = new Map(attack ? attackTargetRows(attack, [...named.values()].map(t => ({ ...t, ac: Number(t.ac) })), { isGM: true })
    .map(r => [r.uuid, r.result]) : []);
  const facts = new Map();
  for ( const uuid of named.keys() ) {
    const save = results.saves?.[uuid];
    const applied = results.applied?.[uuid];
    const r = hits.get(uuid);
    facts.set(uuid, { hit: r === "hit" || r === "crit", crit: r === "crit", saved: !!save, saveFailed: !!save && save.degree < 2,
      damaged: !!applied && !applied.undone });
  }
  return facts;
}

/** Has this rider's trigger happened for this target? */
export function triggered(rider, fact) {
  if ( !fact ) return false;
  return list(rider?.when ?? ["cast"]).some(w => (w === "cast") || (w === "hit" && fact.hit) || (w === "crit" && fact.crit)
    || (w === "failedSave" && fact.saveFailed) || (w === "damageDealt" && fact.damaged));
}

/** A rider's save effect, if any. */
export const saveEffect = rider => list(rider?.effects).find(e => e?.type === "save") ?? null;

/**
 * The event's one save (King 2026-11-14).
 * @param {object} card
 * @param {number} sourceSaves   how many save buttons the action itself has
 * @returns {{from: "action"} | {from: "rider", key: string, ability, dc} | {from: "choose", keys: string[]} | null}
 */
export function eventSave(card, sourceSaves = 0) {
  if ( sourceSaves > 0 ) return { from: "action" };
  if ( card?.eventSave?.key ) return { from: "rider", ...card.eventSave };
  const keys = list(card?.riders).filter(r => !r.undone && saveEffect(r)).map(r => r.key);
  if ( !keys.length ) return null;
  if ( keys.length === 1 ) {
    const s = saveEffect(list(card.riders).find(r => r.key === keys[0]));
    return { from: "rider", key: keys[0], ability: s.ability, dc: s.dcValue ?? null };
  }
  return { from: "choose", keys };
}

/** "halfPoolRoll" → half the paid die, rounded down; numbers pass through. */
export function resolveAmount(amount, poolRoll = null) {
  if ( amount === "halfPoolRoll" ) return Math.floor((Number(poolRoll) || 0) / 2);
  return Math.max(0, Math.floor(Number(amount) || 0));
}

/**
 * What a rider entry does to one target.
 * @param {object} entry           a card rider ({key, label, when, effects, targets, choice, poolRoll, requires})
 * @param {object} fact            targetFacts(...).get(uuid)
 * @param {object[]} sourceInflicts the action's own inflicts (from its save)
 * @param {(key) => string[]} [conditionTags]
 * @returns {{adds: {key, ranks}[], apps: {id, kind, key, label, ranks, effect, text}[], warning: string|null}}
 */
export function riderOnTarget(entry, uuid, fact, sourceInflicts = [], conditionTags = () => [], { isRival = () => true } = {}) {
  const out = { adds: [], apps: [], warning: null };
  if ( !entry || entry.undone || !fact ) return out;
  if ( entry.targets && !entry.targets.includes(uuid) ) return out;
  // "Creatures of your choice" (Menacing Assault): the trigger is the card's, not each creature's.
  if ( entry.targetMode !== "chosen" && !triggered(entry, fact) ) return out;
  const save = saveEffect(entry);
  // One save per event: a rider with a save effect applies on a failed event save.
  if ( save && !fact.saveFailed ) return out;
  if ( entry.requires?.state === "combatRival" && !isRival(uuid) ) out.warning = "not your Combat Rival";
  list(entry.effects).forEach((e, i) => {
    const id = `${entry.key}:${i}`;
    if ( e.type === "addRanks" ) {
      const ranks = resolveAmount(e.amount, entry.poolRoll);
      if ( !ranks ) return;
      for ( const x of list(sourceInflicts) ) {
        if ( x?.kind !== "condition" ) continue;
        if ( e.conditions && e.conditions !== "inflicted" && !conditionTags(x.key).includes(e.conditions) ) continue;
        out.adds.push({ key: x.key, ranks });
      }
    } else if ( e.type === "inflict" ) {
      const c = entry.choice ?? (list(e.choose).length === 1 ? e.choose[0] : null);
      if ( c ) out.apps.push({ id, kind: c.kind ?? "condition", key: c.key, label: c.label ?? c.key, ranks: resolveAmount(c.ranks ?? 1, entry.poolRoll) || 1 });
    } else if ( e.type === "save" ) {
      list(e.inflicts).forEach((x, j) => out.apps.push({ id: `${id}.${j}`, kind: x.kind ?? "condition", key: x.key, label: x.label ?? x.key,
        ranks: resolveAmount(x.ranks ?? 1, entry.poolRoll) || 1 }));
      if ( e.text ) out.apps.push({ id: `${id}.note`, kind: "note", label: e.text });
    } else if ( e.type === "effect" ) {
      out.apps.push({ id, kind: "effect", key: e.state ?? "", label: e.name ?? entry.label, effect: e });
    } else if ( e.type === "note" ) {
      out.apps.push({ id, kind: "note", label: e.text ?? "" });
    }
  });
  return out;
}

/**
 * The action's own inflicts after riders (Q-CD5: additive, then the condition's cap).
 * @param {object[]} sourceInflicts
 * @param {{key, ranks}[]} adds
 * @param {(key) => number|null} [maxRanks]   the registry cap (null: no cap)
 */
export function adjustedInflicts(sourceInflicts = [], adds = [], maxRanks = () => null) {
  return list(sourceInflicts).map(x => {
    if ( x?.kind !== "condition" ) return { ...x };
    const extra = adds.filter(a => a.key === x.key).reduce((t, a) => t + a.ranks, 0);
    const cap = maxRanks(x.key);
    const ranks = (Number(x.ranks) || 1) + extra;
    return { ...x, ranks: cap == null ? ranks : Math.min(cap, ranks), added: extra };
  });
}

/**
 * A card rider entry from a rider definition, resolved when it is chosen or used.
 * @param {object} rider
 * @param {object} o
 * @param {string} o.key           unique on the card
 * @param {number|null} [o.poolRoll]
 * @param {object|null} [o.choice] the chosen condition (Q-CD8)
 * @param {string[]|null} [o.targets]  for target "one" / "chosen"
 * @param {number|null} [o.dc]     the event-save DC when this rider supplies it
 */
export function riderEntry(rider, { key, id = "", itemUuid = null, arm = "trigger", poolRoll = null, choice = null, targets = null, dc = null } = {}) {
  const effects = list(rider.effects).map(e => (e.type === "save" ? { ...e, dcValue: dc } : { ...e }));
  return { key, id, itemUuid, arm, label: rider.label ?? "", when: list(rider.when ?? ["cast"]), requires: rider.requires ?? null,
    effects, poolRoll, choice, targets: targets ? [...targets] : null, undone: false };
}

const WHEN = ["cast", "hit", "crit", "failedSave", "damageDealt"];
const EFFECTS = ["addRanks", "inflict", "save", "effect", "note"];
const ARMS = ["cast", "trigger"];

/**
 * Check a rider definition (authoring aid; tools/report-riders.mjs and tests use it). Returns a list
 * of problems, empty when the rider is valid. `arm` is "cast" for castOption.rider, else "trigger".
 */
export function validateRider(rider, arm = "trigger") {
  const p = [];
  if ( !rider || typeof rider !== "object" ) return ["not an object"];
  if ( !ARMS.includes(arm) ) p.push(`arm must be one of ${ARMS.join(", ")}`);
  if ( !rider.label ) p.push("label is required");
  const when = list(rider.when ?? (arm === "cast" ? ["cast"] : []));
  if ( !when.length ) p.push("when is required for a trigger rider");
  for ( const w of when ) if ( !WHEN.includes(w) ) p.push(`unknown when: ${w}`);
  if ( rider.target && !["each", "one", "chosen"].includes(rider.target) ) p.push(`unknown target: ${rider.target}`);
  if ( rider.cost && (!rider.cost.pool || !(Number(rider.cost.amount ?? 1) > 0)) ) p.push("cost needs a pool and a positive amount");
  const effects = list(rider.effects);
  if ( !effects.length ) p.push("effects are required");
  for ( const e of effects ) {
    if ( !EFFECTS.includes(e?.type) ) { p.push(`unknown effect type: ${e?.type}`); continue; }
    if ( e.type === "addRanks" && !(e.amount === "halfPoolRoll" || Number(e.amount) > 0) ) p.push("addRanks needs amount (a number or halfPoolRoll)");
    if ( e.type === "inflict" && !list(e.choose).length ) p.push("inflict needs choose: [conditions]");
    if ( e.type === "save" && (!e.ability || !e.dc?.source) ) p.push("save needs ability and dc.source");
    if ( e.type === "effect" && !e.name ) p.push("effect needs a name");
    if ( (e.amount === "halfPoolRoll" || list(e.inflicts).some(x => x.ranks === "halfPoolRoll") || list(e.choose).some(x => x.ranks === "halfPoolRoll")) && !rider.cost?.roll ) {
      p.push("halfPoolRoll needs a cost that rolls its die (cost.roll: true)");
    }
  }
  if ( effects.filter(e => e?.type === "save").length > 1 ) p.push("one save per event: a rider has at most one save");
  return p;
}
