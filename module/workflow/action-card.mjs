/**
 * Single action card (Foundry side; CARD1, King 2026-11-14). Rules: rules/action-card.mjs.
 *
 * The action card is the cast card, the feature card or, for weapon attacks and strikes, the attack
 * roll itself, with flags.n5e.card added. Rolls made from its buttons stay their own linked messages
 * (roll.source, damage.originUuid, damageApplication.sourceUuid → damage → card), so rolling, Dice So
 * Nice, roll modes and Will of Fire work as before.
 *
 *   Recording  The card's author writes linked results into the card. Another user's result goes to
 *              the active GM as a "cardResult" owner intent, checked against the linked message
 *              itself. With no GM connected the linked message stays a separate card and the action
 *              card merges it for display; the GM records it when they connect (Q-CD1).
 *   Display    Linked messages recorded in a card collapse to one line. Per-target rows with Apply
 *              and Undo are drawn per viewer (only creatures the viewer may change get buttons).
 *   Setting    rule("actionCard") off: nothing here runs and cards look as they did (Q-CD3).
 */
import { rule } from "../rules-settings.mjs";
import { cardSections, resultsFromLinked, addCardResult, mergedResults, cardTargetRows, sectionStates, mergeTargets } from "../rules/action-card.mjs";
import { challengeVisible } from "../rules/parity.mjs";
import { riderView, onRiderClick } from "./riders.mjs";
import { castFacts, counteredOn, counterTagFor, onDefenseClick, onCounterTagClick } from "./jutsu-defense.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

export const actionCardOn = () => !!rule("actionCard");

/** {uuid, name, img, ac} for tokens. */
const targetData = tokens => tokens.filter(t => t.actor).slice(0, 40).map(t => ({
  uuid: t.actor.uuid, name: t.name ?? t.actor.name, img: t.document?.texture?.src ?? t.actor.img ?? "",
  ac: Number(t.actor.system?.ac?.value ?? t.actor.system?.attributes?.ac?.value) }));

/** Foundry targets of the current user when the card is posted. */
const currentTargets = () => targetData([...(globalThis.game?.user?.targets ?? [])]).slice(0, 20);

/**
 * B1: an area placed from the card adds the tokens it covers to the card's targets (author or GM;
 * covered tokens are those the placing user can see).
 */
export async function addAreaTargets(message, tokens) {
  const card = message?.flags?.n5e?.card;
  if ( !card || !actionCardOn() || !(message.isAuthor || globalThis.game.user.isGM) ) return null;
  return message.update({ "flags.n5e.card.targets": mergeTargets(card.targets, targetData(tokens)), "flags.n5e.card.areaPlaced": true });
}

/**
 * flags.n5e.card for a new action card, or undefined when the setting is off.
 * @param {object} o
 * @param {"jutsu"|"attack"|"feature"} o.kind
 * @param {object} o.actor
 * @param {object} [o.item]
 * @param {object[]} [o.activities]
 */
export function cardFlag({ kind, actor, item = null, activities = [], area = false, concentration = false, rank = null, discipline = null } = {}) {
  if ( !actionCardOn() ) return undefined;
  return { version: 1, kind, actorUuid: actor?.uuid ?? null, itemUuid: item?.uuid ?? null, rank, discipline,
    targets: currentTargets(), sections: cardSections({ kind, activities, area, concentration }), results: {} };
}

const messages = () => globalThis.game?.messages;
const idOf = uuid => (typeof uuid === "string" ? uuid.split(".").pop() : null);

/** The action card a linked message belongs to (roll source, damage origin, or application → damage → card). */
export function cardOfLinked(message) {
  const f = message?.flags?.n5e ?? {};
  let origin = null;
  if ( f.cardEffects?.sourceUuid ) origin = messages()?.get(idOf(f.cardEffects.sourceUuid));
  else if ( f.roll?.source ) origin = messages()?.get(f.roll.source);
  else if ( f.damage?.originUuid ) origin = messages()?.get(idOf(f.damage.originUuid));
  else if ( f.damageApplication?.sourceUuid ) {
    const damage = messages()?.get(idOf(f.damageApplication.sourceUuid));
    origin = damage?.flags?.n5e?.damage?.originUuid ? messages()?.get(idOf(damage.flags.n5e.damage.originUuid)) : null;
  }
  return origin?.flags?.n5e?.card && origin.id !== message.id ? origin : null;
}

/** Write results into a card (its author or a GM). Entries the card can't take are skipped. */
async function writeResults(card, entries) {
  let results = card.flags.n5e.card.results ?? {};
  for ( const entry of entries ) {
    try { results = addCardResult({ ...card.flags.n5e.card, results }, entry); } catch { /* recorded already, or not for this card */ }
  }
  if ( JSON.stringify(results) === JSON.stringify(card.flags.n5e.card.results ?? {}) ) return card;
  return card.update({ "flags.n5e.card.results": results });
}

/** The actor this user owns that a linked message is about (the intent travels on it). */
function intentActor(message, entries, undoneTarget = null) {
  const f = message.flags?.n5e ?? {};
  const uuids = [undoneTarget, f.roll?.actorUuid, f.actorUuid, ...entries.map(e => e.targetUuid)].filter(Boolean);
  return uuids.map(u => globalThis.fromUuidSync?.(u)).find(a => a && canModify(globalThis.game.user, a)) ?? null;
}

/**
 * Record a linked message in its card. The author (or a GM) writes directly; anyone else asks the
 * active GM. With no GM the linked message stays a separate card (the action card still shows it).
 * An Undo is read from the application summary itself (flags.n5e.undone, set by its author), so it
 * holds with or without a GM.
 */
export async function recordLinked(message, { undoneTarget = null } = {}) {
  if ( !actionCardOn() ) return null;
  const card = cardOfLinked(message);
  if ( !card ) return null;
  let entries = resultsFromLinked(message.flags.n5e, message.id);
  if ( undoneTarget ) entries = entries.filter(e => e.section === "applied" && e.targetUuid === undoneTarget);
  if ( !entries.length ) return null;
  const game = globalThis.game;
  if ( card.isAuthor || game.user.isGM ) return writeResults(card, entries);
  const actor = intentActor(message, entries, undoneTarget);
  if ( !actor ) return null;
  const { submitIntent } = await import("../automation/owner-intents.mjs");
  try {
    return await submitIntent(actor, "cardResult", { cardMessageId: card.id, linkedMessageId: message.id, undoneTarget });
  } catch (error) {
    console.info(`n5e | action card: ${error.message} The result stays a separate linked card.`);
    return null;
  }
}

/** Active GM: record another user's result, checked against the linked message itself. */
export async function receiveCardResult(actor, { cardMessageId, linkedMessageId, undoneTarget }, user) {
  const card = messages()?.get(cardMessageId);
  const linked = messages()?.get(linkedMessageId);
  if ( !card?.flags?.n5e?.card || !linked ) throw new Error("That card or result no longer exists.");
  if ( linked.author?.id !== user.id ) throw new Error("Only the user who rolled a result can record it.");
  if ( cardOfLinked(linked)?.id !== card.id ) throw new Error("That result doesn't belong to this card.");
  let entries = resultsFromLinked(linked.flags.n5e, linked.id);
  if ( undoneTarget ) entries = entries.filter(e => e.section === "applied" && e.targetUuid === undoneTarget);
  // Per-target results only for creatures the user may change.
  entries = entries.filter(e => !e.targetUuid || canModify(user, globalThis.fromUuidSync?.(e.targetUuid)));
  if ( !entries.length ) throw new Error("Nothing to record.");
  await writeResults(card, entries);
  return true;
}

/** Active GM, on connect: record linked results that arrived while no GM was connected. */
export async function syncCards() {
  const game = globalThis.game;
  if ( !actionCardOn() || !game.users.activeGM?.isSelf ) return;
  for ( const message of messages().contents.slice(-200) ) {
    const card = cardOfLinked(message);
    if ( card ) await writeResults(card, resultsFromLinked(message.flags.n5e, message.id)).catch(() => null);
  }
}

/** Every result a card's linked messages carry (and the attack card's own roll). */
function linkedEntries(card) {
  const own = card.flags.n5e.card.kind === "attack" ? resultsFromLinked({ roll: card.flags.n5e.roll }, card.id).filter(e => e.section === "attack") : [];
  const linked = messages()?.contents.slice(-200).filter(m => m.id !== card.id && cardOfLinked(m)?.id === card.id) ?? [];
  return [...own, ...linked.flatMap(m => resultsFromLinked(m.flags.n5e, m.id))];
}

/** Is this linked message recorded in its card's own results? */
function recordedIn(card, messageId) {
  const r = card?.flags?.n5e?.card?.results ?? {};
  return [r.attack, r.damage, ...Object.values(r.saves ?? {}), ...Object.values(r.applied ?? {})].some(x => x?.messageId === messageId);
}

const SECTION_LABELS = { attack: "Attack", area: "Area", saves: "Saves", damage: "Damage", effects: "Effects", riders: "Riders", reactions: "Reactions", concentration: "Concentration" };
const SHARE_LABELS = { full: "Full damage", half: "Half damage", none: "No damage" };
const MODE_LABELS = { full: "Applied", half: "Applied half", double: "Applied double", heal: "Healed" };

const wofButtons = (kind, uuid) => ["reroll", "advantage"].map(how =>
  `<button type="button" data-n5e-card-wof="${kind}" data-how="${how}"${uuid ? ` data-target="${esc(uuid)}"` : ""}>Will of Fire: ${how === "reroll" ? "reroll" : "keep higher"}</button>`).join("");
const parse = v => { try { return JSON.parse(v || "null") ?? []; } catch { return []; } };
const hasPlayerOwner = actor => !!actor && (globalThis.game?.users ?? []).some(u => !u.isGM && actor.testUserPermission?.(u, "OWNER"));
const saveLabel = d => `Roll ${globalThis.CONFIG?.N5E?.abilities?.[d.ability]?.abbr ?? d.ability ?? ""} save`.replace(/\s+/g, " ");

/** The card's own save buttons and target-effect buttons, as plain datasets, in order. */
function cardActivities(message) {
  const doc = new DOMParser().parseFromString(message.content ?? "", "text/html");
  const data = sel => [...doc.querySelectorAll(sel)].map(b => ({ ...b.dataset }));
  return { saves: data('[data-n5e-act="save"]'), effects: data('[data-n5e-act="effect"]')
    // Per-target only when one click per creature costs nothing extra (no pool cost, use limit or action).
    .filter(d => parse(d.effect)?.target === "targets" && !d.cost && !d.once && !d.activation) };
}

/** The card's sections and per-target rows (A5). Synchronous: listeners are bound right after. */
export function renderActionCard(message, html) {
  if ( !actionCardOn() ) return;
  const card = message?.flags?.n5e?.card;
  if ( !card ) return collapseLinked(message, html);
  html.querySelector("[data-n5e-action-card]")?.remove();
  const game = globalThis.game;
  const entries = linkedEntries(message);
  const results = mergedResults(card, entries);
  const casterNow = globalThis.fromUuidSync?.(card.actorUuid);
  const itemNow = globalThis.fromUuidSync?.(card.itemUuid);
  const concentrationEnded = card.sections.includes("concentration") && !!casterNow && !!itemNow
    && !(casterNow.system?.combat?.concentrating ?? []).includes(itemNow.id);
  const states = sectionStates({ ...card, concentrationEnded }, results);
  const setting = rule("challengeVisibility");
  const canSeeSave = uuid => challengeVisible(setting, game.user, hasPlayerOwner(globalThis.fromUuidSync?.(uuid)));
  const rows = cardTargetRows(card, results, { visibility: rule("attackRollVisibility"), isGM: game.user.isGM, canSeeSave });
  const pending = entries.some(e => !recordedIn(message, e.result.messageId) && e.result.messageId !== message.id);
  const canDamage = !!results.damage;
  const acts = cardActivities(message);
  const casterOwner = !!globalThis.fromUuidSync?.(card.actorUuid)?.isOwner;
  // CARD1d: riders (feature fixtures) — the caster's bar, the event save, per-row controls.
  const appliedSources = new Set(rows.flatMap(r => r.effectSources.map(src => `${r.uuid}|${src}`)));
  const riders = riderView(message, results, acts, appliedSources);
  // FIN2b: Counter Tags (single-target casts) and the creatures the jutsu was absorbed for.
  const countered = card.kind === "jutsu" ? counteredOn(message) : new Set();
  const row = r => {
    const actor = globalThis.fromUuidSync?.(r.uuid);
    const mine = game.user.isGM || (actor && canModify(game.user, actor));
    if ( countered.has(r.uuid) ) return `<div class="n5e-card-target"><span class="name">${esc(r.name)}</span><span class="sub">Absorbed by a Counter Tag: no effect</span></div>`;
    const facts = [r.ac != null ? `AC ${r.ac}` : "", r.attack ?? "", r.save ? `save ${r.save}` : "", r.share && mine ? SHARE_LABELS[r.share] : "",
      ...r.effects].filter(Boolean);
    const controls = [];
    // B2: the target's owner (GM for NPCs) rolls its save from the card.
    if ( mine && !r.saved && card.sections.includes("saves") ) acts.saves.forEach((d, i) =>
      controls.push(`<button type="button" data-n5e-card-save="${i}" data-target="${esc(r.uuid)}">${esc(saveLabel(d))}</button>`));
    // B3: conditions on a failed save (applied by whoever may change the creature), with rider ranks added (CARD1d).
    const riderRow = riders.row(r.uuid, mine);
    let k = 0;
    if ( mine && r.saveFailed ) acts.saves.forEach((d, i) => parse(d.inflicts).forEach((x, j) => {
      const adj = riderRow.inflicts[k++] ?? x;
      if ( appliedSources.has(`${r.uuid}|src:${i}:${j}`) ) return;
      controls.push(`<button type="button" data-n5e-card-inflict="${i}:${j}" data-target="${esc(r.uuid)}">Apply ${esc(x.label)}${x.kind === "condition" ? ` ${adj.ranks}` : ""}${adj.added ? ` (+${adj.added} riders)` : ""}</button>`);
    }));
    controls.push(...riderRow.controls);
    // FIN2b: a Counter Tag of the jutsu's rank or higher on the only target absorbs it.
    if ( mine && card.kind === "jutsu" && counterTagFor(message, actor, rows.length) ) controls.unshift(`<button type="button" data-n5e-card-counter="1" data-count="${rows.length}" data-target="${esc(r.uuid)}">Counter Tag absorbs this</button>`);
    facts.push(...riderRow.notes);
    // B3: effects the jutsu puts on its targets (the caster's owner applies; others get the offer card).
    if ( casterOwner ) acts.effects.forEach((d, i) => appliedSources.has(`${r.uuid}|act:${i}`) ||
      controls.push(`<button type="button" data-n5e-card-effect="${i}" data-target="${esc(r.uuid)}">Apply ${esc(d.label || parse(d.effect).name || "effect")}</button>`));
    if ( mine && canDamage && !r.applied ) ["full", "half"].forEach(m =>
      controls.push(`<button type="button" data-n5e-card-apply="${m}" data-target="${esc(r.uuid)}"${r.share === m ? ' class="suggested"' : ""}>${m === "full" ? "Apply" : "Half"}</button>`));
    if ( r.applied ) facts.push(MODE_LABELS[r.applied.mode] ?? "Applied");
    // C1: the reaction the creature took against this damage.
    if ( r.applied?.reaction ) facts.push(`${r.applied.reaction.label}${r.applied.reaction.reduction ? ` (−${r.applied.reaction.reduction})` : ""}${r.applied.reaction.multiplier !== 1 ? ` (×${r.applied.reaction.multiplier})` : ""}`);
    // C2: Will of Fire on this creature's save (its owner).
    if ( mine && r.saveMessage && (actor?.system?.willOfFire?.value ?? 0) > 0 ) controls.push(wofButtons("save", r.uuid));
    // C3: the concentration check the damage called for (that creature's owner).
    if ( mine && r.applied?.concentration ) controls.push(`<button type="button" data-n5e-card-concheck="${esc(r.uuid)}">Concentration check DC ${r.applied.concentration.dc}</button>`);
    // Undo (Q-CD4): the damage and the conditions/effects applied to this creature from the card.
    if ( mine && (r.applied || r.effectMessages.length) ) controls.push(`<button type="button" data-n5e-card-undo="${esc(r.uuid)}">Undo</button>`);
    return `<div class="n5e-card-target"><span class="name">${esc(r.name)}</span><span class="sub">${esc(facts.join(" · "))}</span>${controls.join("")}</div>`;
  };
  const box = document.createElement("div");
  box.className = "n5e-action-card";
  box.dataset.n5eActionCard = "1";
  // C1/C2: attack-level controls for the caster's owner: Will of Fire on the attack, successful-hit reactions.
  const caster = globalThis.fromUuidSync?.(card.actorUuid);
  const attackControls = [];
  if ( results.attack && results.attack.messageId !== message.id && caster?.isOwner && (caster.system?.willOfFire?.value ?? 0) > 0 ) attackControls.push(wofButtons("attack", ""));
  if ( results.attack && results.attack.messageId !== message.id ) attackControls.push('<button type="button" data-n5e-card-hit="1">Successful hit: reactions</button>');
  // C3: is the caster still concentrating on this jutsu?
  const item = globalThis.fromUuidSync?.(card.itemUuid);
  const concLine = card.sections.includes("concentration") && caster && item
    ? `<div class="note">Concentration: ${(caster.system?.combat?.concentrating ?? []).includes(item.id) ? `${esc(caster.name)} is concentrating on ${esc(item.name)}` : "ended"}${results.effects ? "; effects applied from this card end with it" : ""}.</div>` : "";
  // FIN2b: Read the Enemy and Identify, for users acting with a creature other than the caster.
  const defense = castFacts(message)?.casterDC != null
    ? '<div class="n5e-card-defense"><button type="button" data-n5e-card-defense="read">Read the Enemy</button><button type="button" data-n5e-card-defense="identify">Identify</button></div>' : "";
  const shown = riders.bar.length && !card.sections.includes("riders") ? [...card.sections, "riders"] : card.sections;
  const shownStates = { ...states, riders: riders.entries.length ? "done" : "ready" };
  box.innerHTML = `<div class="n5e-card-sections">${shown.map(s => `<span class="n5e-card-section ${shownStates[s]}">${esc(SECTION_LABELS[s] ?? s)}</span>`).join("")}</div>
    ${attackControls.length ? `<div class="n5e-card-attack">${attackControls.join("")}</div>` : ""}${concLine}${defense}
    ${riders.bar.length ? `<div class="n5e-card-riders">${riders.bar.join("")}</div>` : ""}
    ${rows.length ? rows.map(row).join("") : '<div class="note">No targets. Target tokens before rolling, or use the damage card\'s own Apply buttons.</div>'}
    ${pending ? '<div class="note">Some results are separate cards until a GM connects.</div>' : ""}`;
  (html.querySelector(".message-content") ?? html).append(box);
}

/** A linked message recorded in its card shows as one line, with Show to expand it. */
function collapseLinked(message, html) {
  const card = cardOfLinked(message);
  if ( !card || !recordedIn(card, message.id) || html.querySelector("[data-n5e-linked-note]") ) return;
  const name = globalThis.fromUuidSync?.(card.flags.n5e.card.itemUuid)?.name ?? "the action";
  html.classList.add("n5e-linked-collapsed");
  const note = document.createElement("div");
  note.className = "n5e-linked-note";
  note.dataset.n5eLinkedNote = "1";
  note.innerHTML = `Shown on the ${esc(name)} card <button type="button" data-n5e-linked-toggle>Show</button>`;
  note.querySelector("button").addEventListener("click", ev => {
    ev.preventDefault();
    html.classList.toggle("n5e-linked-collapsed");
    ev.currentTarget.textContent = html.classList.contains("n5e-linked-collapsed") ? "Show" : "Hide";
  });
  (html.querySelector(".message-content") ?? html).before(note);
}

/** Post the small linked summary that records conditions/effects applied from the card (B3). */
export async function postEffectSummary(message, actor, created, source = "") {
  if ( !created.length ) return null;
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }),
    content: `<div class="n5e-roll-card"><b>${esc(actor.name)}</b>: ${esc(created.map(e => e.name).join(", "))} applied.</div>`,
    flags: { n5e: { cardEffects: { sourceUuid: message.uuid, recipients: [{ actorUuid: actor.uuid, effects: created.map(e => ({ uuid: e.uuid, label: e.name, source })) }] } } } });
}

/** A condition or state from a failed save, as the save card's own Apply does (resave remembered). */
async function inflict(actor, x, save) {
  let effect;
  if ( x.kind === "state" ) {
    await actor.toggleStatusEffect(x.key, { active: true });
    effect = actor.effects.find(e => e.statuses?.has(x.key));
  } else effect = await actor.addCondition(x.key, Number(x.ranks) || 1);
  if ( save.resave && effect?.setFlag ) {
    const game = globalThis.game;
    const now = game.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null;
    await effect.setFlag("n5e", "resave", { ability: save.ability, dc: Number(save.dc), label: save.label, applied: now });
  }
  return effect ?? null;
}

/** Undo everything applied to one creature from the card: damage (A6) and conditions/effects (B3). */
async function undoTarget(message, results, uuid, event) {
  const game = globalThis.game;
  const { onApplyClick } = await import("./apply-damage.mjs");
  let done = 0;
  const applied = results.applied?.[uuid];
  const summary = applied && !applied.undone ? messages()?.get(applied.messageId) : null;
  if ( summary && !summary.flags?.n5e?.undone ) {
    if ( !summary.isAuthor && !game.user.isGM ) ui.notifications.info("Only the user who applied this damage, or the GM, can undo it.");
    else { await onApplyClick(summary, { dataset: { n5eUndo: "1" } }, event); done++; }
  }
  for ( const entry of results.effects?.[uuid] ?? [] ) {
    if ( entry.undone ) continue;
    const note = messages()?.get(entry.messageId);
    if ( !note || note.flags?.n5e?.undone ) continue;
    if ( !note.isAuthor && !game.user.isGM ) { ui.notifications.info("Only the user who applied these effects, or the GM, can undo them."); continue; }
    for ( const e of entry.effects ) {
      const effect = globalThis.fromUuidSync?.(e.uuid);
      if ( effect && canModify(game.user, effect.parent ?? effect) ) await effect.delete();
    }
    await note.setFlag("n5e", "undone", true);
    done++;
  }
  if ( !done ) ui.notifications.info("Nothing to undo.");
  return done;
}

/**
 * Card buttons: per-target Apply / Half (A6, through the damage card's own Apply), Roll save (B2,
 * through the card's own save button for that one creature), Apply condition/effect (B3), Undo.
 */
export async function onActionCardClick(message, btn, event) {
  const card = message.flags?.n5e?.card;
  if ( !card ) return null;
  const game = globalThis.game;
  const d = btn.dataset;
  const results = mergedResults(card, linkedEntries(message));
  // CARD1d riders.
  if ( d.n5eRiderUse || d.n5eRiderCancel || d.n5eRiderEventsave || d.n5eRiderSave || d.n5eRiderApply ) {
    return onRiderClick(message, btn, event, { results, acts: cardActivities(message) });
  }
  if ( d.n5eCardDefense ) return onDefenseClick(message, d.n5eCardDefense, event);
  if ( d.n5eCardCounter ) return onCounterTagClick(message, btn);
  const target = d.target ? await fromUuid(d.target) : null;
  if ( d.n5eCardApply ) {
    const damage = results.damage ? messages()?.get(results.damage.messageId) : null;
    if ( !damage ) return ui.notifications.info("Roll the damage first.");
    btn.disabled = true;
    const { onApplyClick } = await import("./apply-damage.mjs");
    return onApplyClick(damage, { dataset: { n5eApply: d.n5eCardApply, target: d.target } }, event);
  }
  if ( d.n5eCardUndo ) {
    btn.disabled = true;
    return undoTarget(message, results, d.n5eCardUndo, event);
  }
  if ( d.n5eCardWof ) {
    // C2: spend Will of Fire on the recorded roll; the reroll replaces it on the card.
    const id = d.n5eCardWof === "attack" ? results.attack?.messageId : results.saves?.[d.target]?.messageId;
    const roll = id ? messages()?.get(id) : null;
    if ( !roll ) return ui.notifications.info("Nothing to reroll.");
    btn.disabled = true;
    const { spendWillOfFire } = await import("../dice/roll.mjs");
    return spendWillOfFire(roll, d.how === "advantage" ? "advantage" : "reroll");
  }
  if ( d.n5eCardHit ) {
    // C1: successful-hit reactions, through the attack roll's own button.
    const roll = results.attack ? messages()?.get(results.attack.messageId) : null;
    if ( !roll ) return ui.notifications.info("Roll the attack first.");
    const { onApplyClick } = await import("./apply-damage.mjs");
    return onApplyClick(roll, { dataset: { n5eHit: "1" } }, event);
  }
  if ( d.n5eCardConcheck ) {
    // C3: the concentration check the damage called for, through the damage summary's own button.
    const applied = results.applied?.[d.n5eCardConcheck];
    const summary = applied ? messages()?.get(applied.messageId) : null;
    const conc = applied?.concentration;
    if ( !summary || !conc ) return null;
    btn.disabled = true;
    const { onApplyClick } = await import("./apply-damage.mjs");
    return onApplyClick(summary, { dataset: { n5eConcheck: String(conc.dc), actor: d.n5eCardConcheck, jutsu: JSON.stringify(conc.jutsu) } }, event);
  }
  if ( !target ) return ui.notifications.warn("That creature is no longer available.");
  const acts = cardActivities(message);
  const { onActivityClick } = await import("./activity-buttons.mjs");
  if ( d.n5eCardSave != null ) {
    if ( !canModify(game.user, target) ) return ui.notifications.warn("Only that creature's owner (the GM for NPCs) rolls its save.");
    const save = acts.saves[Number(d.n5eCardSave)];
    if ( !save ) return null;
    // Heightened: only the first save made against this cast is at disadvantage.
    const dataset = { ...save };
    if ( Object.keys(results.saves ?? {}).length ) delete dataset.dis;
    btn.disabled = true;
    return onActivityClick(message, { dataset, disabled: false }, event, { selectedActors: [target] });
  }
  if ( d.n5eCardInflict ) {
    if ( !canModify(game.user, target) ) return ui.notifications.warn("Only that creature's owner (the GM for NPCs) applies this.");
    const [i, j] = d.n5eCardInflict.split(":").map(Number);
    const save = acts.saves[i];
    const x = parse(save?.inflicts)[j];
    if ( !x ) return null;
    btn.disabled = true;
    // CARD1d: the action's own condition with the riders' added ranks (Q-CD5: additive, then the cap).
    const { riderView: view } = await import("./riders.mjs");
    const flat = acts.saves.flatMap((s2, a) => parse(s2.inflicts).map((_, b) => `${a}:${b}`));
    const adj = view(message, results, acts).row(target.uuid, true).inflicts[flat.indexOf(`${i}:${j}`)];
    const effect = await inflict(target, adj ? { ...x, ranks: adj.ranks } : x, save);
    return postEffectSummary(message, target, effect ? [effect] : [], `src:${i}:${j}`);
  }
  if ( d.n5eCardEffect != null ) {
    const act = acts.effects[Number(d.n5eCardEffect)];
    if ( !act ) return null;
    btn.disabled = true;
    const before = new Set(target.effects.map(e => e.id));
    await onActivityClick(message, { dataset: act, disabled: false }, event, { targetActors: [target] });
    // Recorded when this user could create the effect; otherwise the owner gets the offer card.
    const created = canModify(game.user, target) ? target.effects.filter(e => !before.has(e.id)) : [];
    return postEffectSummary(message, target, created, `act:${d.n5eCardEffect}`);
  }
  return null;
}

/**
 * Hooks (A5): the creator records each new linked message; every client re-draws the card; a card
 * update re-draws its collapsed linked messages; an undone application is recorded by its author.
 * The GM records results that arrived while no GM was connected.
 */
export async function registerActionCardHooks() {
  const { registerIntentHandler } = await import("../automation/owner-intents.mjs");
  registerIntentHandler("cardResult", receiveCardResult);
  Hooks.on("createChatMessage", (message, options, userId) => {
    if ( !actionCardOn() ) return;
    // FIN2b: a Counter Tag note re-draws the card it absorbed.
    const absorbed = messages()?.get(message.flags?.n5e?.counterTag?.cardId);
    if ( absorbed ) ui.chat?.updateMessage?.(absorbed);
    const card = cardOfLinked(message);
    if ( !card ) return;
    if ( userId === globalThis.game.user.id ) void recordLinked(message).catch(error => console.warn("n5e | action card", error));
    ui.chat?.updateMessage?.(card);
  });
  Hooks.on("updateChatMessage", (message, change, options, userId) => {
    if ( !actionCardOn() ) return;
    if ( change?.flags?.n5e?.undone && userId === globalThis.game.user.id ) void recordLinked(message).catch(error => console.warn("n5e | action card", error));
    const card = message.flags?.n5e?.card ? message : cardOfLinked(message);
    if ( !card ) return;
    if ( card !== message ) ui.chat?.updateMessage?.(card);
    else for ( const m of messages()?.contents.slice(-200) ?? [] ) if ( cardOfLinked(m)?.id === card.id ) ui.chat?.updateMessage?.(m);
  });
  Hooks.once("ready", () => void syncCards().catch(error => console.warn("n5e | action card sync", error)));
}
