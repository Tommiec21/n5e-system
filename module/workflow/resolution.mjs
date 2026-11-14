/**
 * Per-target resolution on damage cards (RES1). A damage card knows the card it came from
 * (flags.n5e.damage.originUuid). Attack and save rolls made from that card's buttons record it as
 * their source (flags.n5e.roll.source). Together they give each target its share of the one damage
 * roll (rules/resolution.mjs), shown as rows with their own Apply buttons.
 *
 * Each viewer sees rows only for creatures they may change (the GM sees all), the same rule as the
 * Apply buttons (automation/authority.mjs). Rows are drawn when the card renders and again when a
 * linked attack or save roll is posted.
 */
import { targetOutcomes, pickLinkedRolls } from "../rules/resolution.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

/** Roll flags of the chat messages made from this origin card's buttons, oldest first. */
function linkedRolls(originId) {
  return (globalThis.game?.messages?.contents ?? []).map(m => m.flags?.n5e?.roll).filter(r => r?.source === originId);
}

/** Per-target outcomes for a damage card (empty when it has no linked attack or saves). */
export function linkedOutcomes(damageMessage) {
  const originUuid = damageMessage?.flags?.n5e?.damage?.originUuid;
  const origin = originUuid ? globalThis.fromUuidSync?.(originUuid) : null;
  if ( !origin ) return [];
  return targetOutcomes(pickLinkedRolls(origin.flags?.n5e?.roll ?? null, linkedRolls(origin.id)));
}

const MODE_TEXT = { full: "Apply", half: "Apply half" };

/** Draw the per-target rows on a damage card (synchronous: listeners are bound right after). */
export function renderResolution(message, html) {
  if ( !message?.flags?.n5e?.damage ) return;
  const row = html.querySelector("[data-n5e-apply-row]");
  if ( !row ) return;
  html.querySelector("[data-n5e-resolution]")?.remove();
  const user = globalThis.game?.user;
  const rows = linkedOutcomes(message).filter(r => {
    if ( user?.isGM ) return true;
    const actor = globalThis.fromUuidSync?.(r.uuid);
    return actor && canModify(user, actor);
  });
  if ( !rows.length ) return;
  const box = document.createElement("div");
  box.className = "n5e-resolution";
  box.dataset.n5eResolution = "1";
  box.innerHTML = `<div class="note">Per target</div>${rows.map(r => `<div class="n5e-target-row ${r.mode}"><span>${esc(r.name)}</span>
    <span class="sub">${esc(r.outcome)}</span>${r.mode === "none" ? '<span class="sub">No damage</span>'
    : `<button type="button" data-n5e-apply="${r.mode}" data-target="${esc(r.uuid)}">${MODE_TEXT[r.mode]}</button>`}</div>`).join("")}`;
  row.before(box);
}

/** Re-render damage cards from the same origin when a linked attack or save is posted. */
export function registerResolutionHooks() {
  Hooks.on("createChatMessage", message => {
    const source = message.flags?.n5e?.roll?.source;
    if ( !source ) return;
    for ( const m of game.messages.contents ) {
      const origin = m.flags?.n5e?.damage?.originUuid;
      if ( origin && origin.endsWith(`.${source}`) ) ui.chat?.updateMessage?.(m);
    }
  });
}
