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
import { cardSections, resultsFromLinked, addCardResult, mergedResults, cardTargetRows, sectionStates } from "../rules/action-card.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

export const actionCardOn = () => !!rule("actionCard");

/** Foundry targets of the current user when the card is posted: {uuid, name, img, ac}. */
function currentTargets() {
  return [...(globalThis.game?.user?.targets ?? [])].filter(t => t.actor).slice(0, 20).map(t => ({
    uuid: t.actor.uuid, name: t.name ?? t.actor.name, img: t.document?.texture?.src ?? t.actor.img ?? "",
    ac: Number(t.actor.system?.ac?.value ?? t.actor.system?.attributes?.ac?.value) }));
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
  if ( f.roll?.source ) origin = messages()?.get(f.roll.source);
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
