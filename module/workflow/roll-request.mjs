/**
 * GM roll requests (dnd5e parity: the GM posts a request; each player rolls only for creatures
 * they own). A request names a save, ability check or skill check, an optional DC and, optionally,
 * the creatures asked to roll. With no creatures listed, each viewer rolls for their own selected
 * tokens or assigned character.
 */
import { esc } from "../view-models/common.mjs";
import { visibleRequestEntries } from "../rules/parity.mjs";
import { canModify } from "../automation/authority.mjs";

const TYPES = { save: "save", check: "ability", skill: "skill", tool: "tool" };

/** GM only: post the request card. */
export async function postRollRequest({ type, key, dc = null, label = null, actors = [] }) {
  if ( !game.user.isGM ) throw new Error("Only the GM posts roll requests.");
  if ( !TYPES[type] || typeof key !== "string" || !key ) throw new Error("Choose a save, check or skill to request.");
  const entries = actors.slice(0, 30).map(a => ({ uuid: a.uuid, name: a.name }));
  const title = label ?? `${type === "save" ? "Saving throw" : "Check"}: ${key}`;
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({
    speaker: ChatMessageCls.getSpeaker({ alias: game.user.name }),
    content: `<div class="n5e-roll-card roll-request"><header><b>${esc(title)}</b></header><div class="n5e-request-entries" data-n5e-request></div></div>`,
    flags: { n5e: { rollRequest: { type, key, dc: Number.isFinite(Number(dc)) && dc !== null ? Number(dc) : null, label: title, entries } } }
  });
}

/** Per viewer: buttons for the entries this user owns (or one "Roll for my creature" button). */
export function renderRollRequest(message, html) {
  const box = html.querySelector("[data-n5e-request]");
  const request = message.getFlag?.("n5e", "rollRequest");
  if ( !box || !request ) return;
  const owns = uuid => { const actor = fromUuidSync(uuid); return canModify(game.user, actor); };
  const entries = request.entries?.length ? visibleRequestEntries(request.entries, owns, game.user.isGM) : [{ uuid: "", name: "Roll for my creature" }];
  box.innerHTML = entries.map(e => `<button type="button" data-n5e-request-roll="${esc(e.uuid)}">${esc(e.name)}</button>`).join("");
  import("../dice/roll.mjs").then(m => m.addRollModeButtons(box));
  for ( const button of box.querySelectorAll("[data-n5e-request-roll]") ) {
    button.addEventListener("click", event => {
      event.preventDefault();
      rollForRequest(message, button.dataset.n5eRequestRoll, event).catch(error => ui.notifications.warn(error.message));
    });
  }
}

/** Roll the requested save or check for one owned actor (or the viewer's own creatures). */
export async function rollForRequest(message, uuid, event) {
  const request = message.getFlag("n5e", "rollRequest");
  let actors;
  if ( uuid ) actors = [await fromUuid(uuid)].filter(Boolean);
  else {
    actors = (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean);
    if ( !actors.length && game.user.character ) actors = [game.user.character];
  }
  actors = actors.filter(a => canModify(game.user, a));
  if ( !actors.length ) return ui.notifications.info("Select a creature you own to roll for.");
  const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
  for ( const actor of actors ) {
    const spec = rollSpec(actor, TYPES[request.type], request.key);
    await rollWithSpec(actor, { ...spec, label: request.label ?? spec.label }, { event, dc: request.dc });
  }
  return actors.length;
}
