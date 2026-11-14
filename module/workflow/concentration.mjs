/**
 * Concentration lifecycle (CONC1; rules/concentration.mjs).
 *   - Active GM: an incapacitated creature's concentration ends at once (statuses, conditions, 0 HP).
 *   - Active GM: a readied jutsu whose concentration ended is lost (chakra stays spent).
 *   - Owner: Release a readied jutsu from its card (uses the Reaction) to post its cast card.
 * Areas, summons and dependent effects of dropped jutsu end through their own updateActor hooks.
 */
import { concentrationBreaker, lostReadied } from "../rules/concentration.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";
import { withActorLock } from "./commands.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;
const busy = new Set();

/** Drop every concentration jutsu (and readied ones), with a short card. */
export async function breakConcentration(actor, reason) {
  const ids = actor.system?.combat?.concentrating ?? [];
  if ( !ids.length ) return null;
  const names = ids.map(id => actor.items.get(id)?.name ?? id);
  const update = { "system.combat.concentrating": [] };
  for ( const id of ids ) update[`flags.n5e.concentrationPaid.-=${id}`] = null;
  await actor.update(update);
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b> loses concentration (${esc(reason)}): ${esc(names.join(", "))} end.</div>` });
}

/** Clear readied jutsu whose concentration ended. */
export async function dropLostReadied(actor, reason = "concentration ended") {
  const lost = lostReadied(actor);
  if ( !lost.length ) return null;
  await actor.update(Object.fromEntries(lost.map(id => [`flags.n5e.readied.-=${id}`, null])));
  const names = lost.map(id => actor.items.get(id)?.name ?? id);
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b>: readied ${esc(names.join(", "))} lost (${esc(reason)}); the chakra stays spent.</div>` });
}

/** Active GM: run both checks for one actor, once at a time. */
export async function checkConcentration(actor) {
  if ( !actor || !game.users.activeGM?.isSelf || busy.has(actor.uuid) ) return;
  busy.add(actor.uuid);
  try {
    const reason = concentrationBreaker(actor);
    if ( reason && (actor.system?.combat?.concentrating ?? []).length ) await breakConcentration(actor, reason);
    await dropLostReadied(actor);
  } finally { busy.delete(actor.uuid); }
}

/** Start of the creature's turn: unreleased readied jutsu are lost (KB 03). */
export async function expireReadied(actor) {
  const ids = Object.keys(actor?.flags?.n5e?.readied ?? {});
  if ( !ids.length ) return [];
  const keep = (actor.system.combat?.concentrating ?? []).filter(id => !ids.includes(id));
  const update = { "system.combat.concentrating": keep };
  for ( const id of ids ) { update[`flags.n5e.readied.-=${id}`] = null; update[`flags.n5e.concentrationPaid.-=${id}`] = null; }
  await actor.update(update);
  return ids.map(id => actor.items.get(id)?.name ?? id);
}

/** Owner: release a readied jutsu (uses the Reaction) and post its cast card. */
export async function releaseReadied(actor, itemId) {
  if ( !canModify(game.user, actor) ) throw new Error("Only the owner can release this jutsu.");
  return withActorLock(actor, async () => {
    const held = actor.flags?.n5e?.readied?.[itemId];
    const item = actor.items.get(itemId);
    if ( !held || !item ) throw new Error("That jutsu is no longer readied.");
    if ( !(actor.system.combat?.concentrating ?? []).includes(itemId) ) throw new Error("Concentration on the readied jutsu was lost.");
    if ( actor.flags?.n5e?.economy?.reaction ) throw new Error("Releasing a readied jutsu uses your Reaction, which is already spent this round.");
    const stays = !!item.system?.duration?.concentration;
    const update = { [`flags.n5e.readied.-=${itemId}`]: null, "flags.n5e.economy.reaction": true };
    if ( !stays ) {
      update["system.combat.concentrating"] = (actor.system.combat?.concentrating ?? []).filter(id => id !== itemId);
      update[`flags.n5e.concentrationPaid.-=${itemId}`] = null;
    }
    await actor.update(update);
    const { postCastCard } = await import("./cast.mjs");
    return postCastCard(actor, item, { rank: held.rank, cost: held.cost, costMode: item.system.cost?.mode, pools: {}, options: [], upcast: 0 });
  });
}

/** The "Readied" card posted instead of the cast card. */
export function postReadyCard(actor, item, plan) {
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-turn-card n5e-ready-card"><b>${esc(actor.name)}</b> readies <b>${esc(item.name)}</b> (${esc(plan.rank)}-Rank, ${plan.cost} CP held).
      ${plan.ready?.trigger ? `<div>Trigger: ${esc(plan.ready.trigger)}</div>` : ""}
      <div><button type="button" data-n5e-release="${esc(item.id)}">Release (Reaction)</button></div></div>`,
    flags: { n5e: { actorUuid: actor.uuid, ready: { itemId: item.id } } } });
}

export function onRenderReadyCard(message, html) {
  for ( const btn of html.querySelectorAll("[data-n5e-release]") ) {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      try {
        const actor = await fromUuid(message.getFlag("n5e", "actorUuid"));
        btn.disabled = true;
        await releaseReadied(actor, btn.dataset.n5eRelease);
      } catch (error) { btn.disabled = false; ui.notifications.warn(error.message); }
    });
  }
}

export function registerConcentrationHooks() {
  const check = actor => void checkConcentration(actor).catch(error => console.warn("n5e | concentration", error));
  Hooks.on("updateActor", actor => check(actor));
  Hooks.on("createActiveEffect", effect => { if ( effect.parent?.documentName === "Actor" ) check(effect.parent); });
  Hooks.on("updateActiveEffect", effect => { if ( effect.parent?.documentName === "Actor" ) check(effect.parent); });
}
