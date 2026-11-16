/**
 * Single action card (pure; CARD1, King 2026-11-14). One chat card per attack, jutsu or feature. Its
 * sections fill in as buttons are pressed.
 *
 *   Data         flags.n5e.card = {version, kind, actorUuid, itemUuid, rank, discipline, targets,
 *                sections, results}. results = {attack, saves: {[uuid]: {[effect]: save}}, damage,
 *                applied: {[uuid]: {[effect]: application}}, effects: {[uuid]: [application]}}.
 *                FIN3b: damage is {[effect]: roll} too (one roll per effect: a strike and its Finisher);
 *                a card from before reads its single roll and applications as their own effect's.
 *                FIN3: one save per effect. `effect` is the key of the card's row that holds the save
 *                (its data-effect); a card written before FIN3 has one save per target, read as "0".
 *   Who writes   The card's author writes their own results. Results rolled by other users reach
 *                the card through the active GM (owner intent "cardResult", Q-CD1). With no GM, the
 *                linked roll stays a separate card and is merged in for display only.
 *   Shares       Hit, miss and save tiers come from RES1 (rules/resolution.mjs).
 *   Visibility   AC and hit/miss for non-GM viewers follow attackRollVisibility (rules/parity.mjs).
 */
import { targetOutcomes } from "./resolution.mjs";
import { attackTargetRows, ATTACK_RESULT_LABELS } from "./parity.mjs";
import { reactionPhase } from "./reactions.mjs";

export const CARD_KINDS = Object.freeze(["jutsu", "attack", "feature"]);
export const SECTION_ORDER = Object.freeze(["attack", "area", "saves", "damage", "effects", "riders", "reactions", "concentration"]);
const SAVE_LABELS = ["Critical Failure", "Failure", "Success", "Critical Success"];
const list = v => (Array.isArray(v) ? v : []);

/**
 * One creature's saves on a card, by effect key (FIN3). A pre-FIN3 entry (a single save) reads as
 * its own key, or "0".
 * @returns {Object<string, object>}
 */
export function savesOf(results, uuid) {
  const entry = results?.saves?.[uuid];
  if ( !entry || typeof entry !== "object" ) return {};
  if ( "degree" in entry ) return { [entry.effect ?? "0"]: entry };
  return entry;
}

/** A card's damage rolls by effect (FIN3b). A pre-FIN3b single roll reads as its own effect ("" when unknown). */
export function damagesOf(results) {
  const d = results?.damage;
  if ( !d || typeof d !== "object" ) return {};
  if ( "messageId" in d || "total" in d ) return { [String(d.effect ?? "")]: d };
  return d;
}

/** One creature's damage applications by effect (FIN3b; a pre-FIN3b single application reads as its own). */
export function appliedOf(results, uuid) {
  const a = results?.applied?.[uuid];
  if ( !a || typeof a !== "object" ) return {};
  if ( "messageId" in a || "mode" in a ) return { [String(a.effect ?? "")]: a };
  return a;
}

/** Every application on a card as a flat list. */
export const allApplied = results => Object.keys(results?.applied ?? {}).flatMap(uuid => Object.entries(appliedOf(results, uuid))
  .map(([effect, a]) => ({ ...a, actorUuid: uuid, effect })));

/** Every save on a card as a flat list, with its creature and effect. */
export function allSaves(results) {
  return Object.keys(results?.saves ?? {}).flatMap(uuid => Object.entries(savesOf(results, uuid)).map(([effect, s]) => ({ ...s, actorUuid: uuid, effect })));
}

/**
 * The saves that decide a damage roll's share (FIN3, King Q-F11: one save per effect). The save of
 * the damage's own effect; a damage with no save of its own follows the action's one save (or, if a
 * card ever has several, the first).
 * @param {object[]} saves   flat saves ({actorUuid, effect, degree...})
 * @param {string|null} damageEffect
 * @param {string[]} [saveEffects]  the card's save effect keys in order
 */
export function savesForDamage(saves, damageEffect = null, saveEffects = []) {
  const keys = saveEffects.length ? saveEffects : [...new Set(saves.map(s => s.effect))];
  const own = damageEffect != null && keys.includes(String(damageEffect)) ? String(damageEffect) : keys[0];
  return own == null ? saves : saves.filter(s => s.effect === own);
}

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
  // King 2026-11-16: a save that deals damage (Fireball: half on success) has a damage section too.
  const dealsDamage = list(activities).some(a => a?.damage?.parts?.length);
  const has = {
    attack: kind === "attack" || types.has("attack") || types.has("strike"),
    area: !!area,
    saves: types.has("save"),
    damage: kind === "attack" || dealsDamage || types.has("damage") || types.has("attack") || types.has("strike"),
    effects: types.has("effect") || types.has("save"),
    // CARD1c: reactions to the hit or the damage are shown wherever damage is.
    reactions: kind === "attack" || dealsDamage || types.has("damage") || types.has("attack") || types.has("strike"),
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
      targets: list(roll.targets), messageId, replaces: roll.rerollOf ?? null } });
  } else if ( roll?.kind === "save" && roll.dc != null && roll.actorUuid ) {
    out.push({ section: "saves", targetUuid: roll.actorUuid, result: { degree: roll.degree, fourTier: !!roll.fourTier,
      onSuccess: roll.onSuccess ?? "none", name: roll.name ?? "", effect: roll.effect ?? "0", messageId, replaces: roll.rerollOf ?? null } });
  }
  const damage = flags.damage;
  if ( damage ) out.push({ section: "damage", result: { total: damage.total, crit: !!damage.crit, effect: damage.effect ?? null, messageId } });
  const applied = flags.damageApplication;
  if ( applied ) {
    for ( const r of list(applied.recipients) ) {
      const uuid = r?.actorUuid ?? r?.targetUuid ?? r?.uuid;
      if ( uuid ) out.push({ section: "applied", targetUuid: uuid, result: { mode: applied.mode, messageId, undone: !!flags.undone, effect: applied.effect ?? null,
        // CARD1c: the damage reaction the creature took (Deflection, Uncanny Dodge...) and its concentration check.
        reaction: r.reaction ? { label: r.reaction, reduction: r.rolledReduction ?? 0, multiplier: r.reactionMultiplier ?? 1 } : null,
        concentration: r.concentration ?? null } });
    }
  }
  const effects = flags.cardEffects;
  if ( effects ) {
    for ( const r of list(effects.recipients) ) {
      if ( r?.actorUuid ) out.push({ section: "effects", targetUuid: r.actorUuid,
        result: { messageId, effects: list(r.effects).map(e => ({ uuid: e.uuid, label: e.label, source: e.source ?? "" })), undone: !!flags.undone } });
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
  if ( section === "damage" ) {
    if ( !sections.includes("damage") ) throw new Error("This card has no damage section.");
    // FIN3b: one damage roll per effect.
    const key = String(result?.effect ?? "");
    const all = results.damage = { ...damagesOf(results) };
    const prior = all[key];
    if ( prior?.messageId === result?.messageId ) return results;
    if ( prior ) throw new Error("This card's damage is already rolled.");
    all[key] = result;
    return results;
  }
  if ( section === "attack" ) {
    if ( !sections.includes(section) ) throw new Error(`This card has no ${section} section.`);
    if ( results[section] ) {
      if ( results[section].messageId === result?.messageId ) return results;
      // A Will of Fire reroll replaces the roll it rerolled.
      if ( result?.replaces && results[section].messageId === result.replaces ) { results[section] = result; return results; }
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
  if ( section === "saves" ) {
    if ( !targetUuid ) throw new Error("A target is required.");
    if ( !sections.includes("saves") ) throw new Error("This card has no saves section.");
    // FIN3: one save per creature per effect.
    const key = String(result?.effect ?? "0");
    const bucket = results.saves ??= {};
    const mine = bucket[targetUuid] = { ...savesOf(results, targetUuid) };
    const prior = mine[key];
    if ( prior?.messageId === result?.messageId ) return results;
    if ( prior && result?.replaces && prior.messageId === result.replaces ) { mine[key] = result; return results; }
    if ( prior ) throw new Error("That target's save is already recorded.");
    mine[key] = result;
    return results;
  }
  if ( section === "applied" ) {
    if ( !targetUuid ) throw new Error("A target is required.");
    // FIN3b: one application per creature per effect's damage.
    const key = String(result?.effect ?? "");
    const bucket = results.applied ??= {};
    const mine = bucket[targetUuid] = { ...appliedOf(results, targetUuid) };
    const prior = mine[key];
    if ( prior?.messageId === result?.messageId ) {
      if ( result?.undone && !prior.undone ) mine[key] = { ...prior, undone: true };
      return results;
    }
    if ( prior && !prior.undone ) throw new Error("That target's result is already recorded.");
    mine[key] = result;
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
export function cardTargetRows(card, results = card?.results ?? {}, { visibility = "none", isGM = false, canSeeSave = () => true, saveEffects = [], saveLabels = {}, damageLabels = {}, immune = new Map() } = {}) {
  const attack = results.attack ?? null;
  const saves = allSaves(results);
  const keys = saveEffects.length ? saveEffects.map(String) : [...new Set(saves.map(s => s.effect))];
  const named = new Map();
  for ( const t of [...list(card?.targets), ...list(attack?.targets)] ) if ( t?.uuid && !named.has(t.uuid) ) named.set(t.uuid, t);
  for ( const s of saves ) if ( !named.has(s.actorUuid) ) named.set(s.actorUuid, { uuid: s.actorUuid, name: s.name });
  const shown = new Map(attack ? attackTargetRows(attack, [...named.values()].map(t => ({ ...t, ac: Number(t.ac) })), { visibility, isGM })
    .map(r => [r.uuid, r]) : []);
  // FIN3 (Q-F11): each damage roll's share follows the save of its own effect (FIN3b: one roll per effect).
  const damages = damagesOf(results);
  const attackFor = attack ? { ...attack, targets: [...named.values()].map(t => ({ ...t, ac: Number(t.ac) })) } : null;
  const sharesBy = Object.fromEntries(Object.keys(damages).map(k => [k, new Map(targetOutcomes({ attack: attackFor,
    saves: savesForDamage(saves, k === "" ? null : k, keys) }).map(r => [r.uuid, r.mode]))]));
  // With no damage rolled yet, the share the first save would give.
  const preview = new Map(targetOutcomes({ attack: attackFor, saves: savesForDamage(saves, null, keys) }).map(r => [r.uuid, r.mode]));
  const firstKey = Object.keys(damages)[0];
  const shares = firstKey != null ? sharesBy[firstKey] : preview;
  const text = s => (s.fourTier ? SAVE_LABELS[s.degree] : s.degree >= 2 ? "Success" : "Failure");
  return [...named.values()].map(t => {
    const view = shown.get(t.uuid);
    const mine = savesOf(results, t.uuid);
    const attackVisible = !!view?.result;
    // Hidden hit/miss stays hidden: the share is only suggested when the viewer may see why.
    const immuneReasons = immune.get(t.uuid) ?? null;
    const share = immuneReasons ? "none" : shares.get(t.uuid) ?? null;
    const saveVisible = Object.keys(mine).length > 0 && (isGM || canSeeSave(t.uuid));
    // One line per save, in the card's order ("Con Failure · Dex Success").
    const perSave = [...new Set([...keys, ...Object.keys(mine)])].filter(k => mine[k]).map(k => ({ effect: k, label: saveLabels[k] ?? "",
      text: saveVisible ? text(mine[k]) : null, failed: mine[k].degree < 2, messageId: mine[k].messageId }));
    const saveText = saveVisible ? perSave.map(p => (perSave.length > 1 && p.label ? `${p.label} ${p.text}` : p.text)).join(", ") : null;
    const appliedBy = appliedOf(results, t.uuid);
    const applied = firstKey != null ? appliedBy[firstKey] : Object.values(appliedBy)[0];
    const effects = list(results.effects?.[t.uuid]).filter(e => !e.undone);
    const any = perSave.length > 0;
    const hidden = (attack && !attackVisible && !saveVisible) || (!attack && any && !saveVisible);
    const first = perSave[0] ?? null;
    return {
      uuid: t.uuid, name: t.name ?? "", ac: view?.ac ?? null,
      attack: attackVisible ? ATTACK_RESULT_LABELS[view.result] : null,
      save: saveText,
      // Every save of the card is in (each effect's own save).
      saved: keys.length ? keys.every(k => mine[k]) : any,
      savedEffects: Object.keys(mine),
      // Conditions on a failed save; known to whoever may change the creature (they apply them).
      saveFailed: perSave.some(p => p.failed),
      failedEffects: perSave.filter(p => p.failed).map(p => p.effect),
      saves: perSave,
      immune: immuneReasons,
      share: hidden ? null : share,
      applied: applied && !applied.undone ? { mode: applied.mode, messageId: applied.messageId, reaction: applied.reaction ?? null,
        concentration: applied.concentration ?? null } : null,
      // FIN3b: each effect's damage, its share for this creature and whether it was applied.
      damages: Object.keys(damages).map(k => {
        const a = appliedBy[k];
        return { effect: k, label: damageLabels[k] ?? "", messageId: damages[k].messageId,
          share: hidden ? null : immuneReasons ? "none" : sharesBy[k].get(t.uuid) ?? null,
          applied: a && !a.undone ? { mode: a.mode, messageId: a.messageId, reaction: a.reaction ?? null, concentration: a.concentration ?? null } : null };
      }),
      saveMessage: first?.messageId ?? null,
      effects: effects.flatMap(e => e.effects.map(x => x.label)),
      effectMessages: effects.map(e => e.messageId),
      // CARD1b/1d: which buttons were already applied (src:i:j, act:i, rider ids), so each shows once.
      effectSources: effects.flatMap(e => e.effects.map(x => x.source).filter(Boolean))
    };
  });
}

/**
 * FIN3: reaction windows opened for this card's attack or damage, per creature, as short status text.
 * @param {object[]} windows   flags.n5e.reactionWindow of the linked windows
 * @param {number} [now]
 * @returns {Map<string, string[]>}  actorUuid -> ["Deflection: pending (25 s left)", ...]
 */
export function cardReactionWindows(windows = [], now = Date.now()) {
  const out = new Map();
  for ( const w of list(windows) ) {
    if ( !w?.actorUuid ) continue;
    const phase = reactionPhase(w, now);
    const left = w.deadline != null ? Math.max(0, Math.ceil((w.deadline - now) / 1000)) : null;
    const status = phase === "pending" ? (left != null ? `pending (${left} s left)` : "pending")
      : phase === "gm" ? "waiting for the GM" : phase === "accepted" ? "taken" : w.retired ? "withdrawn" : "declined";
    const lines = out.get(w.actorUuid) ?? [];
    lines.push(`${w.label ?? "Reaction"}: ${status}`);
    out.set(w.actorUuid, lines);
  }
  return out;
}

/**
 * Waiting, ready or done for each section, so buttons show in order.
 *   attack   ready, done once rolled
 *   damage   waiting until the attack is rolled (when the card has one), then ready, done once rolled
 *   saves    ready, done once every target has every effect's save (FIN3)
 *   others   ready (their own buttons; filled in by CARD1b and CARD1c)
 */
export function sectionStates(card, results = card?.results ?? {}, { saveEffects = [], damageEffects = [] } = {}) {
  const sections = list(card?.sections);
  const targets = list(card?.targets);
  const states = {};
  // FIN3: done once every target has every effect's save.
  const allIn = uuid => {
    const mine = savesOf(results, uuid);
    return saveEffects.length ? saveEffects.every(k => mine[String(k)]) : Object.keys(mine).length > 0;
  };
  for ( const s of sections ) {
    if ( s === "attack" ) states[s] = results.attack ? "done" : "ready";
    else if ( s === "damage" ) {
      // FIN3b: done once every effect's damage is rolled.
      const rolled = damagesOf(results);
      const all = damageEffects.length ? damageEffects.every(k => rolled[String(k)]) : Object.keys(rolled).length > 0;
      states[s] = all ? "done" : sections.includes("attack") && !results.attack ? "waiting" : "ready";
    }
    else if ( s === "saves" ) states[s] = targets.length && targets.every(t => allIn(t.uuid)) ? "done" : "ready";
    else if ( s === "area" ) states[s] = card.areaPlaced ? "done" : "ready";
    else if ( s === "reactions" ) states[s] = allApplied(results).some(a => a?.reaction && !a.undone) ? "done" : "ready";
    else if ( s === "concentration" ) states[s] = card.concentrationEnded ? "done" : "ready";
    else if ( s === "effects" ) states[s] = Object.values(results.effects ?? {}).some(l => list(l).some(e => !e.undone)) ? "done" : "ready";
    else states[s] = "ready";
  }
  return states;
}
