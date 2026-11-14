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
