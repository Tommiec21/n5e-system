/**
 * Positioning workflows (POS1). Rules in rules/positioning.mjs.
 *
 *   Opportunity Attack reminder   Active GM, moveToken: hostile creatures whose reach the mover leaves
 *                                 get a whispered card (owners and GM) with an Opportunity Attack
 *                                 button. Nothing is rolled automatically (dnd5e / PF2e parity).
 *   Disengage / Dodge             Using the Action marks it and sets the flag or state.
 *   Engaged                       A melee attack against one target records the round on both.
 */
import { opportunityReminders, isEngaged, surpriseBlocksReaction, surprisedEconomy } from "../rules/positioning.mjs";
import { reachOf } from "../rules/weapon-properties.mjs";
import { equippedWeapons } from "../rules/unarmed.mjs";
import { esc } from "../view-models/common.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;

/** The creature's longest melee reach, and the weapon that has it (null: unarmed, 5 ft). */
export function meleeReach(actor) {
  let best = { reach: 5, weapon: null };
  for ( const w of equippedWeapons(actor) ) {
    if ( w.system.weaponType === "ranged" ) continue;
    const reach = reachOf(w);
    if ( reach > best.reach || (!best.weapon && reach >= best.reach) ) best = { reach, weapon: w };
  }
  return best;
}

/** Centre of a token document placed at a position (top-left x, y in pixels). */
function centreAt(doc, pos) {
  const size = canvas.grid.size;
  return { x: (pos?.x ?? doc.x) + (doc.width * size) / 2, y: (pos?.y ?? doc.y) + (doc.height * size) / 2 };
}

/** Active GM, moveToken hook: whisper Opportunity Attack reminders. */
export async function onMoveForOpportunity(tokenDoc, movement) {
  if ( !game.users.activeGM?.isSelf || !game.combat?.started || movement?.method === "undo" ) return;
  const mover = tokenDoc.actor;
  if ( !mover || !canvas?.grid?.measurePath ) return;
  const waypoints = movement?.passed?.waypoints ?? [];
  const from = centreAt(tokenDoc, movement?.origin);
  const to = centreAt(tokenDoc, movement?.destination);
  const measure = (a, b) => canvas.grid.measurePath([a, b]).distance;
  const side = tokenDoc.disposition;
  const watchers = (canvas.tokens?.placeables ?? []).filter(t => t.document !== tokenDoc && t.actor && side !== 0
    && t.document.disposition !== 0 && t.document.disposition !== side && game.combat.combatants.some(c => c.tokenId === t.id))
    .map(t => {
      const { reach, weapon } = meleeReach(t.actor);
      return { token: t, actor: t.actor, weapon, name: t.name, reach, from: measure(t.center, from), to: measure(t.center, to),
        statuses: t.actor.statuses,
        reactionUsed: !!t.actor.flags?.n5e?.economy?.reaction || surpriseBlocksReaction(t.actor.statuses, t.actor.flags?.n5e?.surpriseDone) };
    });
  const provoked = opportunityReminders(watchers, {
    disengaged: !!mover.flags?.n5e?.economy?.disengaged,
    action: waypoints.at(-1)?.action ?? movement?.destination?.action ?? "",
    forced: waypoints.length > 0 && waypoints.every(w => w.action === "displace")
  });
  for ( const w of provoked ) {
    const whisper = game.users.filter(u => u.isGM || w.actor.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor: w.actor }), whisper,
      content: `<div class="n5e-roll-card"><header><b>Opportunity Attack</b></header>
        <div class="note">${esc(mover.name)} leaves ${esc(w.name)}'s reach (${w.reach} ft). One melee attack with your Reaction, before it leaves.</div>
        <button type="button" data-n5e-oa="${esc(w.actor.uuid)}" data-target="${esc(mover.uuid)}" data-weapon="${esc(w.weapon?.id ?? "")}">
          Opportunity Attack${w.weapon ? `: ${esc(w.weapon.name)}` : " (unarmed)"}</button></div>`,
      flags: { n5e: { opportunity: { attackerUuid: w.actor.uuid, targetUuid: mover.uuid } } } });
  }
}

/** The card button: the attacker's owner makes the attack with their Reaction. */
export async function onOpportunityClick(button, event) {
  const attacker = await fromUuid(button.dataset.n5eOa);
  const target = await fromUuid(button.dataset.target);
  if ( !attacker?.isOwner ) return ui.notifications.warn("Only the attacker's owner can make this attack.");
  if ( attacker.flags?.n5e?.economy?.reaction ) return ui.notifications.warn(`${attacker.name} has already used its Reaction.`);
  const weapon = button.dataset.weapon ? attacker.items.get(button.dataset.weapon) : null;
  const { attackWithWeapon } = await import("./attack.mjs");
  const message = await attackWithWeapon(attacker, weapon, { event, targetActors: target ? [target] : undefined, mode: "opportunity" });
  if ( message ) button.disabled = true;
  return message;
}

/** Using Disengage or Dodge from the Actions list (KB 03): the Action is spent and the effect set. */
export async function onCoreAction(actor, key) {
  if ( !actor?.isOwner ) return;
  if ( key === "disengage" ) await actor.update({ "flags.n5e.economy.action": true, "flags.n5e.economy.disengaged": true });
  if ( key === "dodge" ) {
    await actor.update({ "flags.n5e.economy.action": true });
    if ( !actor.statuses?.has("dodging") ) await actor.toggleStatusEffect("dodging", { active: true });
  }
}

/** Engaged (KB 05): record a melee attack between two creatures on both (the round it happened). */
export async function recordEngagement(attacker, target) {
  const round = game.combat?.started ? game.combat.round : null;
  if ( round == null || !attacker || !target || attacker === target ) return;
  if ( attacker.isOwner ) await attacker.update({ [`flags.n5e.engaged.${target.id}`]: round });
  if ( target.isOwner ) await target.update({ [`flags.n5e.engaged.${attacker.id}`]: round });
}

/** Is this actor Engaged with the other right now? */
export function engagedWith(actor, other) {
  const round = game.combat?.started ? game.combat.round : null;
  return isEngaged(actor?.flags?.n5e?.engaged?.[other?.id], round);
}

/**
 * Surprised (KB 05), turn start: in round 1 its move, Action and Bonus Action are spent.
 * @returns {string|null} a turn-card line
 */
export async function surprisedTurnStart(actor, round) {
  const spent = surprisedEconomy(actor.statuses, round);
  if ( !spent ) return null;
  await actor.update({ "flags.n5e.economy.action": true, "flags.n5e.economy.bonus": true });
  return "Surprised: no movement, Action or Bonus Action this turn; no Reactions until it ends";
}

/** Surprised, turn end: Reactions are allowed again (the state lasts until the end of round 1). */
export async function surprisedTurnEnd(actor) {
  if ( actor.statuses?.has("surprised") && !actor.flags?.n5e?.surpriseDone ) await actor.update({ "flags.n5e.surpriseDone": true });
}

/** Start of round 2 and later: Surprised ends for every combatant. */
export async function endSurprise(combat) {
  if ( combat.round < 2 ) return;
  for ( const c of combat.combatants ) {
    const actor = c.actor;
    if ( !actor ) continue;
    if ( actor.statuses?.has("surprised") ) await actor.toggleStatusEffect("surprised", { active: false });
    if ( actor.flags?.n5e?.surpriseDone ) await actor.update({ "flags.n5e.-=surpriseDone": null });
  }
}

export function registerPositioningHooks() {
  // FIN2a: holds end past 5 ft.
  Hooks.on("moveToken", token => void import("./skill-actions.mjs").then(m => m.onMoveForHolds(token)).catch(error => console.warn("n5e | holds", error)));
  Hooks.on("moveToken", (token, movement) => void onMoveForOpportunity(token, movement)
    .catch(error => console.warn("n5e | opportunity attacks", error)));
}
