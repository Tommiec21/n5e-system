/**
 * Action effects on cards (STD2; rules/action-effects.mjs). The card a roll is made from (its
 * `source`) carries flags.n5e.actionEffects; this reads which of their elements apply to a roll and
 * which uses earlier rolls from the same card have spent (flags.n5e.roll.consumed on those rolls).
 */
import { cardElements } from "../rules/action-effects.mjs";

/** The acting creature of a card: the cast's or the action card's actor. */
const actorUuidOf = message => message?.flags?.n5e?.cast?.actorUuid ?? message?.flags?.n5e?.card?.actorUuid ?? message?.flags?.n5e?.actionActorUuid ?? null;

/** Uses already spent on this card. */
export function consumedOn(sourceId) {
  return (globalThis.game?.messages?.contents ?? []).filter(m => m.flags?.n5e?.roll?.source === sourceId)
    .flatMap(m => m.flags.n5e.roll.consumed ?? []);
}

/** The card's elements for this roller: {extra: [{element, label, elementId}], actorUuid}. */
export function cardActionContext(sourceId, roller) {
  const message = sourceId ? globalThis.game?.messages?.get(sourceId) : null;
  const list = message?.flags?.n5e?.actionEffects;
  if ( !Array.isArray(list) || !list.length || !roller ) return { extra: [], actorUuid: null };
  const actorUuid = actorUuidOf(message);
  return { extra: cardElements(list, { isActor: roller.uuid === actorUuid, rollerUuid: roller.uuid, consumed: consumedOn(sourceId) }), actorUuid };
}
