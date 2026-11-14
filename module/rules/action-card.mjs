/**
 * Single action card (pure; CARD1, King 2026-11-14). One chat card per attack, jutsu or feature. Its
 * sections fill in as buttons are pressed.
 *
 *   Data         flags.n5e.card = {version, kind, actorUuid, itemUuid, rank, discipline, targets,
 *                sections, results}. results = {attack, saves: {[uuid]: save}, damage,
 *                applied: {[uuid]: application}, effects: {[uuid]: [application]}}.
 *   Who writes   The card's author writes their own results. Results rolled by other users reach
 *                the card through the active GM (owner intent "cardResult", Q-CD1). With no GM, the
 *                linked roll stays a separate card and is merged in for display only.
 *   Shares       Hit, miss and save tiers come from RES1 (rules/resolution.mjs).
 *   Visibility   AC and hit/miss for non-GM viewers follow attackRollVisibility (rules/parity.mjs).
 */
import { targetOutcomes } from "./resolution.mjs";
import { attackTargetRows, ATTACK_RESULT_LABELS } from "./parity.mjs";

export const CARD_KINDS = Object.freeze(["jutsu", "attack", "feature"]);
export const SECTION_ORDER = Object.freeze(["attack", "area", "saves", "damage", "effects", "reactions", "concentration"]);
const SAVE_LABELS = ["Critical Failure", "Failure", "Success", "Critical Success"];
const list = v => (Array.isArray(v) ? v : []);

/**
 * The sections a card has, in fixed order.
 * @param {object} action
 * @param {"jutsu"|"attack"|"feature"} action.kind
 * @param {{type: string}[]} [action.activities]   the item's effective activities
 * @param {boolean} [action.area]                  the jutsu places a template
 * @param {boolean} [action.concentration]         the cast starts concentration
 * @returns {string[]}
 */
export function cardSections({ kind, activities = [], area = false, concentration = false } = {}) {
  const types = new Set(list(activities).map(a => a?.type));
  const has = {
    attack: kind === "attack" || types.has("attack") || types.has("strike"),
    area: !!area,
    saves: types.has("save"),
    damage: kind === "attack" || types.has("damage") || types.has("attack") || types.has("strike"),
    effects: types.has("effect") || types.has("save"),
    reactions: false,
    concentration: !!concentration
  };
  return SECTION_ORDER.filter(s => has[s]);
}

/**
 * What a linked message adds to its card: an attack, a save, a damage roll or a damage application.
 * @param {object} flags      the linked message's flags.n5e
 * @param {string} messageId
 * @returns {{section: string, targetUuid?: string, result: object}[]}
 */
export function resultsFromLinked(flags = {}, messageId = "") {
  const out = [];
  const roll = flags.roll;
  if ( roll?.kind === "attack" ) {
    out.push({ section: "attack", result: { total: roll.total, natural: roll.natural, threshold: roll.threshold ?? 20,
      targets: list(roll.targets), messageId } });
  } else if ( roll?.kind === "save" && roll.dc != null && roll.actorUuid ) {
    out.push({ section: "saves", targetUuid: roll.actorUuid, result: { degree: roll.degree, fourTier: !!roll.fourTier,
      onSuccess: roll.onSuccess ?? "none", name: roll.name ?? "", messageId } });
  }
  const damage = flags.damage;
  if ( damage ) out.push({ section: "damage", result: { total: damage.total, crit: !!damage.crit, messageId } });
  const applied = flags.damageApplication;
  if ( applied ) {
    for ( const r of list(applied.recipients) ) {
      const uuid = r?.actorUuid ?? r?.targetUuid ?? r?.uuid;
      if ( uuid ) out.push({ section: "applied", targetUuid: uuid, result: { mode: applied.mode, messageId, undone: !!flags.undone } });
    }
  }
  const effects = flags.cardEffects;
  if ( effects ) {
    for ( const r of list(effects.recipients) ) {
      if ( r?.actorUuid ) out.push({ section: "effects", targetUuid: r.actorUuid,
        result: { messageId, effects: list(r.effects).map(e => ({ uuid: e.uuid, label: e.label })), undone: !!flags.undone } });
    }
  }
  return out;
}

/** The card's targets plus newly covered ones (an area), without duplicates, at most 40. */
export function mergeTargets(existing = [], added = []) {
  const out = new Map();
  for ( const t of [...list(existing), ...list(added)] ) if ( t?.uuid && !out.has(t.uuid) ) out.set(t.uuid, t);
  return [...out.values()].slice(0, 40);
}

/**
 * Add one result to a card's results (returns new results; the input is unchanged).
 * Attack and damage are recorded once per card; saves and applications once per target, except that
 * an application that was undone can be replaced, and an undo can be recorded on an application.
 * Throws on anything the card can't take.
 */
export function addCardResult(card, { section, targetUuid = null, result } = {}) {
  const results = structuredClone(card?.results ?? {});
  const sections = list(card?.sections);
  if ( section === "attack" || section === "damage" ) {
    if ( !sections.includes(section) ) throw new Error(`This card has no ${section} section.`);
    if ( results[section] ) {
      if ( results[section].messageId === result?.messageId ) return results;
      throw new Error(`This card's ${section} is already rolled.`);
    }
    results[section] = result;
    return results;
  }
  if ( section === "effects" ) {
    if ( !targetUuid ) throw new Error("A target is required.");
    const bucket = results.effects ??= {};
    const entries = bucket[targetUuid] ??= [];
    const prior = entries.find(e => e.messageId === result?.messageId);
    if ( prior ) {
      if ( result?.undone ) prior.undone = true;
      return results;
    }
    entries.push(result);
    return results;
  }
  if ( section === "saves" || section === "applied" ) {
    if ( !targetUuid ) throw new Error("A target is required.");
    if ( section === "saves" && !sections.includes("saves") ) throw new Error("This card has no saves section.");
    const bucket = results[section] ??= {};
    const prior = bucket[targetUuid];
    if ( prior?.messageId === result?.messageId ) {
      if ( section === "applied" && result?.undone && !prior.undone ) bucket[targetUuid] = { ...prior, undone: true };
      return results;
    }
    if ( prior && !(section === "applied" && prior.undone) ) throw new Error("That target's result is already recorded.");
    bucket[targetUuid] = result;
    return results;
  }
  throw new Error("Unknown card section.");
}

/** Card results plus linked results not written into the card yet (display only; no-GM fallback). */
export function mergedResults(card, linked = []) {
  let results = structuredClone(card?.results ?? {});
  for ( const entry of linked ) {
    try { results = addCardResult({ ...card, results }, entry); } catch { /* already recorded or not for this card */ }
  }
  return results;
}

/**
 * One row per target: attack outcome, save outcome, the share of damage, and whether it was applied.
 * @param {object} card
 * @param {object} results              mergedResults(card, linked)
 * @param {{visibility?: string, isGM?: boolean, canSeeSave?: (uuid: string) => boolean}} [viewer]
 *   canSeeSave: challengeVisibility for that creature's save (default: visible)
 */
export function cardTargetRows(card, results = card?.results ?? {}, { visibility = "none", isGM = false, canSeeSave = () => true } = {}) {
  const attack = results.attack ?? null;
  const saves = Object.entries(results.saves ?? {}).map(([actorUuid, s]) => ({ ...s, actorUuid }));
  const named = new Map();
  for ( const t of [...list(card?.targets), ...list(attack?.targets)] ) if ( t?.uuid && !named.has(t.uuid) ) named.set(t.uuid, t);
  for ( const s of saves ) if ( !named.has(s.actorUuid) ) named.set(s.actorUuid, { uuid: s.actorUuid, name: s.name });
  const shown = new Map(attack ? attackTargetRows(attack, [...named.values()].map(t => ({ ...t, ac: Number(t.ac) })), { visibility, isGM })
    .map(r => [r.uuid, r]) : []);
  const shares = new Map(targetOutcomes({ attack: attack ? { ...attack, targets: [...named.values()].map(t => ({ ...t, ac: Number(t.ac) })) } : null, saves })
    .map(r => [r.uuid, r.mode]));
  return [...named.values()].map(t => {
    const view = shown.get(t.uuid);
    const save = saves.find(s => s.actorUuid === t.uuid);
    const attackVisible = !!view?.result;
    // Hidden hit/miss stays hidden: the share is only suggested when the viewer may see why.
    const share = shares.get(t.uuid) ?? null;
    const saveVisible = !!save && (isGM || canSeeSave(t.uuid));
    const saveText = saveVisible ? (save.fourTier ? SAVE_LABELS[save.degree] : save.degree >= 2 ? "Success" : "Failure") : null;
    const applied = results.applied?.[t.uuid];
    const effects = list(results.effects?.[t.uuid]).filter(e => !e.undone);
    const hidden = (attack && !attackVisible && !saveVisible) || (!attack && save && !saveVisible);
    return {
      uuid: t.uuid, name: t.name ?? "", ac: view?.ac ?? null,
      attack: attackVisible ? ATTACK_RESULT_LABELS[view.result] : null,
      save: saveText,
      saved: !!save,
      // Conditions on a failed save; known to whoever may change the creature (they apply them).
      saveFailed: !!save && save.degree < 2,
      share: hidden ? null : share,
      applied: applied && !applied.undone ? { mode: applied.mode, messageId: applied.messageId } : null,
      effects: effects.flatMap(e => e.effects.map(x => x.label)),
      effectMessages: effects.map(e => e.messageId)
    };
  });
}

/**
 * Waiting, ready or done for each section, so buttons show in order.
 *   attack   ready, done once rolled
 *   damage   waiting until the attack is rolled (when the card has one), then ready, done once rolled
 *   saves    ready, done once every target has a save
 *   others   ready (their own buttons; filled in by CARD1b and CARD1c)
 */
export function sectionStates(card, results = card?.results ?? {}) {
  const sections = list(card?.sections);
  const targets = list(card?.targets);
  const states = {};
  for ( const s of sections ) {
    if ( s === "attack" ) states[s] = results.attack ? "done" : "ready";
    else if ( s === "damage" ) states[s] = results.damage ? "done" : sections.includes("attack") && !results.attack ? "waiting" : "ready";
    else if ( s === "saves" ) states[s] = targets.length && targets.every(t => results.saves?.[t.uuid]) ? "done" : "ready";
    else if ( s === "area" ) states[s] = card.areaPlaced ? "done" : "ready";
    else if ( s === "effects" ) states[s] = Object.values(results.effects ?? {}).some(l => list(l).some(e => !e.undone)) ? "done" : "ready";
    else states[s] = "ready";
  }
  return states;
}
