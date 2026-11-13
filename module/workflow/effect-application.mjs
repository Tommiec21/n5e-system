/**
 * Effect-application cards (dnd5e effect-application parity). Each user puts effects only on
 * creatures they own; the GM owns NPCs. When a player's action would place an effect on someone
 * they don't own, the effects are posted on a card and that creature's owner (the GM, for an NPC)
 * presses Apply. Effects tied to the caster's concentration are tagged so they end with it.
 */
import { canModify, ownedRecipients, skippedNotice } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

const MAX_EFFECTS = 10;

/** Effect source data that is safe to copy onto another actor (pure). */
export function cleanEffectData(data) {
  if ( !data || typeof data.name !== "string" ) throw new Error("Invalid effect.");
  const out = structuredClone(data);
  delete out._id;
  out.disabled = false;
  return out;
}

/** Apply now where the user may, otherwise post an Apply card for the owner. Returns {applied, offered}. */
export async function applyOrOffer(source, targets, effects, { concentrationItemId = null, label = null } = {}) {
  const { owned, skipped } = ownedRecipients(targets, game.user);
  for ( const t of owned ) await t.createEmbeddedDocuments("ActiveEffect", effects.map(e => tagDependent(cleanEffectData(e), source, concentrationItemId)));
  if ( skipped.length ) await effectApplicationCard(source, effects, { recipients: skipped, concentrationItemId, label });
  return { applied: owned.map(a => a.name), offered: skipped.map(a => a.name) };
}

/** Mark an effect as depending on the caster's concentration on one jutsu (pure). */
export function tagDependent(data, source, concentrationItemId) {
  if ( !concentrationItemId || !source ) return data;
  data.flags ??= {};
  data.flags.n5e = { ...data.flags.n5e, dependentOn: { actorUuid: source.uuid, itemId: concentrationItemId } };
  return data;
}

/**
 * Post the effects with Apply controls. `recipients` names the intended creatures; with none, the
 * clicking user's controlled or targeted tokens receive the effect.
 */
export async function effectApplicationCard(source, effects, { recipients = [], concentrationItemId = null, label = null } = {}) {
  const list = effects.slice(0, MAX_EFFECTS).map(cleanEffectData);
  const names = recipients.map(a => esc(a.name)).join(", ");
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({
    speaker: ChatMessageCls.getSpeaker({ actor: source }),
    content: `<div class="n5e-roll-card effect-apply"><header><b>${esc(label ?? "Apply effects")}</b></header>
      ${names ? `<div class="note">For: ${names}</div>` : ""}
      <div class="n5e-apply">${list.map((e, i) => `<button type="button" data-n5e-effect-apply="${i}">Apply ${esc(e.name)}</button>`).join("")}</div></div>`,
    flags: { n5e: { effectApplication: { effects: list, recipients: recipients.map(a => a.uuid),
      sourceUuid: source?.uuid ?? null, concentrationItemId } } }
  });
}

/** Apply button: put effect `index` on the recipients this user owns (dnd5e ownership rule). */
export async function applyEffectFromCard(message, index) {
  const card = message.getFlag("n5e", "effectApplication");
  const data = card?.effects?.[Number(index)];
  if ( !data ) return null;
  let targets = (await Promise.all((card.recipients ?? []).map(u => fromUuid(u)))).filter(Boolean);
  if ( !targets.length ) {
    targets = [...(game.user.targets ?? [])].map(t => t.actor).filter(Boolean);
    if ( !targets.length ) targets = (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean);
  }
  const { owned, skipped } = ownedRecipients(targets, game.user);
  if ( !owned.length ) return ui.notifications.info(skippedNotice(skipped) ?? "Select or target the creatures that receive this effect.");
  const source = card.sourceUuid ? await fromUuid(card.sourceUuid) : null;
  if ( card.concentrationItemId && source && !concentrating(source, card.concentrationItemId) ) {
    return ui.notifications.warn("The caster is no longer concentrating on this jutsu.");
  }
  for ( const t of owned ) {
    if ( !canModify(game.user, t) ) continue;
    await t.createEmbeddedDocuments("ActiveEffect", [tagDependent(cleanEffectData(data), source, card.concentrationItemId)]);
  }
  ui.notifications.info(`${data.name}: applied to ${owned.map(a => a.name).join(", ")}.`);
  return owned.length;
}

const concentrating = (actor, itemId) => (actor.system?.combat?.concentrating ?? []).includes(itemId);

/**
 * Active GM: when a caster stops concentrating on a jutsu, delete effects that depend on it
 * (dnd5e: the active GM deletes concentration dependents).
 */
export async function removeDependents(caster) {
  if ( !game.users.activeGM?.isSelf ) return;
  const still = new Set(caster.system?.combat?.concentrating ?? []);
  const actors = [...game.actors, ...game.scenes.contents.flatMap(s => s.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor))];
  for ( const actor of actors ) {
    const ids = actor.effects.filter(e => {
      const dep = e.flags?.n5e?.dependentOn;
      return dep?.actorUuid === caster.uuid && !still.has(dep.itemId);
    }).map(e => e.id);
    if ( ids.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

export function registerEffectApplication() {
  Hooks.on("updateActor", (actor, changes) => {
    if ( foundry.utils.hasProperty(changes, "system.combat.concentrating") ) void removeDependents(actor);
  });
}
