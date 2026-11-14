/**
 * Remove expired timed effects (EXPIRE1; rules/expiry.mjs). Runs on the active GM's client:
 * each turn start for every combatant (turnStartPipeline), and on world-time changes for actors not
 * in a running combat. Lists what ended on one short card.
 */
import { expiredEffects } from "../rules/expiry.mjs";
import { esc } from "../view-models/common.mjs";

/** Delete expired effects on one actor; returns their names. */
export async function expireEffects(actor, { includeConditions = false } = {}) {
  if ( !actor || !game.users.activeGM?.isSelf ) return [];
  const gone = expiredEffects(actor, { includeConditions });
  if ( gone.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", gone.map(e => e.id));
  return gone.map(e => e.name);
}

/** Post one card listing what ended, per actor. */
export async function postExpiryCard(results) {
  const rows = results.filter(r => r.names.length);
  if ( !rows.length ) return null;
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ content: `<div class="n5e-turn-card"><b>Effects ended</b>${rows.map(r =>
    `<div>${esc(r.actor.name)}: ${esc(r.names.join(", "))}</div>`).join("")}</div>`,
    whisper: game.users.filter(u => u.isGM).map(u => u.id) });
}

/** In combat: every combatant's timed effects (conditions keep their turn-end processing). */
export async function expireInCombat(combat) {
  const actors = new Set([...(combat?.combatants ?? [])].map(c => c.actor).filter(Boolean));
  const results = [];
  for ( const actor of actors ) results.push({ actor, names: await expireEffects(actor) });
  return postExpiryCard(results);
}

/** Actors outside any started combat: world actors and unlinked tokens on scenes. */
function actorsOutOfCombat() {
  const inCombat = new Set();
  for ( const combat of game.combats ?? [] ) {
    if ( !combat.started ) continue;
    for ( const c of combat.combatants ) if ( c.actor ) inCombat.add(c.actor.uuid);
  }
  const unlinked = game.scenes.contents.flatMap(s => s.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor));
  return [...game.actors, ...unlinked].filter(a => !inCombat.has(a.uuid));
}

/** World time moved (rests, travel, the GM's clock): expire effects and conditions outside combat. */
export async function expireOutOfCombat() {
  if ( !game.users.activeGM?.isSelf ) return null;
  const results = [];
  for ( const actor of actorsOutOfCombat() ) results.push({ actor, names: await expireEffects(actor, { includeConditions: true }) });
  return postExpiryCard(results);
}

export function registerExpiryHooks() {
  Hooks.on("updateWorldTime", () => { void expireOutOfCombat().catch(error => console.warn("n5e | effect expiry", error)); });
}
