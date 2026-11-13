import { createN5eRoll } from "../dice/n5e-roll.mjs";
/**
 * Turn start (Foundry side). The active GM's client applies the turn-start plan for the combatant
 * whose turn begins: concentration upkeep, Chain/Combo resets, action economy, recharge rolls; then
 * posts one short summary card (with End buttons for each jutsu still concentrated on).
 *
 * Order when the turn passes from A to B (combatTurnChange):
 *   1. end of A's turn: condition decay/endings (conditions.mjs), Fury and Mark expiry, effects that
 *      end at the end of A's turn, resave prompts (trackers.mjs);
 *   2. start of B's turn: effects that end at the start of B's turn, Burned/Bleed damage card, then
 *      the turn-start plan (upkeep, resets, economy, recharge, Flow Focus) and B's summary card.
 * A new start- or end-of-turn automation: add it to the matching step below (or inside the
 * functions it calls), behind its rule("...") toggle.
 *
 * Workflow conventions (all of module/workflow/):
 *   - The rules decision is a pure function in module/rules/ (tested in Node); this folder does the
 *     Foundry part: dialogs, rolls, document updates, chat cards.
 *   - Combat automation (turn hooks, token movement) runs once, on the active GM's client
 *     (game.users.activeGM?.isSelf), so every change happens exactly once.
 *   - Buttons check ownership (actor.isOwner) before changing an actor; changes to creatures the
 *     user doesn't own are applied by their owner (the GM for NPCs) from an Apply card, as in dnd5e.
 *   - Chat cards carry what their buttons need in flags.n5e (damage instances, actor uuids).
 */
import { turnStartPlan } from "../rules/turn-start.mjs";
import { esc } from "../view-models/common.mjs";
import { rule } from "../rules-settings.mjs";
import { postConditionDamage, processConditionTurnEnd } from "./conditions.mjs";
import { trackersTurnEnd, onTokenMove, onAmpCreated, expireSourceEffects } from "./trackers.mjs";
import { areasTurnStart, areasTurnEnd } from "./areas.mjs";

/** Start of the current combatant's turn (also called when combat starts, for the first combatant). */
async function onTurnStart(combat) {
  if ( !game.users.activeGM?.isSelf ) return;
  const actor = combat.combatant?.actor;
  if ( !actor ) return;
  await expireSourceEffects(combat, actor, "turnStart", { round: combat.round, turn: combat.turn });
  // Jutsu areas: timed ones that ran out go; lasting ones this creature starts in get a GM card.
  await areasTurnStart(combat, actor);
  await postConditionDamage(actor);
  const plan = turnStartPlan(actor);
  await actor.update(plan.update);

  const lines = [];
  for ( const r of plan.recharges ) {
    const roll = await createN5eRoll(`1d${r.die}`).evaluate();
    const ok = roll.total >= r.min;
    if ( ok ) await actor.items.get(r.id)?.update({ "system.uses.spent": 0 });
    lines.push(`${esc(r.name)}: recharge d${r.die} rolled ${roll.total}${ok ? " (recharged)" : ""}`);
  }
  if ( plan.paid.length ) {
    lines.push(`Upkeep paid: <b>${plan.upkeep} CP</b>`);
    for ( const p of plan.paid ) {
      lines.push(`<span class="conc">${esc(p.name)} (${p.upkeep} CP) <button type="button" data-n5e-end-conc="${p.id}">End</button></span>`);
    }
  }
  for ( const e of plan.ended ) lines.push(`<span class="warn">${esc(e.name)} ends: couldn't pay ${e.upkeep} CP upkeep</span>`);
  if ( plan.chainReset ) lines.push("Chain resets to 0 (not raised or maintained)");
  if ( plan.focusGained ) lines.push("Flow: +1 Focus");
  if ( plan.refilled?.length ) lines.push(`Refilled: ${plan.refilled.join(", ")}`);
  // Death saves at the start of the turn while at 0 HP (characters; not stable or dead).
  const statuses = actor.statuses ?? new Set();
  if ( rule("deathSaves") && actor.type === "character" && actor.system.hp.value <= 0 && !statuses.has("dead") && !statuses.has("stabilized") ) {
    lines.push(`<span class="conc warn">At 0 HP: roll a death save <button type="button" data-n5e-deathsave="${actor.uuid}">Death save</button></span>`);
  }
  if ( !lines.length ) return;
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  await ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }),
    content: `<div class="n5e-turn-card"><b>${esc(actor.name)}: start of turn</b>${lines.map(l => `<div>${l}</div>`).join("")}</div>`,
    flags: { n5e: { actorUuid: actor.uuid, turnStart: true } }, whisper: [] });
}

/** End concentration from a turn card (free). */
/** End concentration from a turn card (free): drop the jutsu id and its recorded paid cost. */
export async function endConcentration(actor, id) {
  const keep = (actor.system.combat?.concentrating ?? []).filter(x => x !== id);
  return actor.update({ "system.combat.concentrating": keep, [`flags.n5e.concentrationPaid.-=${id}`]: null });
}

/** Called once at module load (n5e.mjs). Every combat-related hook the system uses is here. */
/**
 * Hooks this module listens to (registered once from n5e.mjs):
 *   combatTurnChange(combat, prior)  end of the prior combatant's turn, then start of the new one
 *   combatStart(combat)              start of the first combatant's turn
 *   moveToken(token, movement)       Chilled movement damage (workflow/trackers.mjs onTokenMove)
 *   createActiveEffect(effect)       Amp limit enforcement (workflow/trackers.mjs onAmpCreated)
 *   deleteCombat(combat)             Combat Rival markers end with the combat
 * Each handler returns early unless this client is the active GM (createActiveEffect: the creating user).
 */
export function registerTurnHooks() {
  // prior = {round, turn, combatantId} of the turn that just ended.
  Hooks.on("combatTurnChange", async (combat, prior) => {
    if ( game.users.activeGM?.isSelf && prior?.combatantId ) {
      const ending = combat.combatants.get(prior.combatantId)?.actor;
      if ( ending ) {
        await processConditionTurnEnd(ending, { round: prior.round, turn: prior.turn });
        await trackersTurnEnd(combat, ending, { round: prior.round, turn: prior.turn });
        await areasTurnEnd(combat, ending);
      }
    }
    return onTurnStart(combat);
  });
  Hooks.on("combatStart", combat => onTurnStart(combat));
  // Chilled: damage when a Chilled creature moves (trackers.mjs onTokenMove).
  Hooks.on("moveToken", (token, movement) => onTokenMove(token, movement));
  // Combat Rival (Brutish Momentum) lasts until combat ends.
  Hooks.on("deleteCombat", async combat => {
    if ( !game.users.activeGM?.isSelf ) return;
    for ( const c of combat.combatants ) {
      const ids = c.actor?.effects.filter(e => e.flags?.n5e?.state === "combatRival").map(e => e.id) ?? [];
      if ( ids.length ) await c.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  });
  // Optional Amp limit: a new Amp may switch older ones off.
  Hooks.on("createActiveEffect", (effect, options, userId) => onAmpCreated(effect, options, userId));
}

/** Chat buttons on turn cards. */
export function onRenderTurnCard(message, html) {
  for ( const btn of html.querySelectorAll("[data-n5e-end-conc]") ) {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const actor = await fromUuid(message.getFlag("n5e", "actorUuid"));
      if ( !actor?.isOwner ) return ui.notifications.warn("Only the owner can end this concentration.");
      btn.disabled = true;
      await endConcentration(actor, btn.dataset.n5eEndConc);
    });
  }
}
