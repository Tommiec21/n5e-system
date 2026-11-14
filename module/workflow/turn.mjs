import { createN5eRoll } from "../dice/n5e-roll.mjs";
/**
 * Turn start (Foundry side). The active GM's client applies the turn-start plan for the combatant
 * whose turn begins: concentration upkeep, Chain/Combo resets, action economy, recharge rolls; then
 * posts one short summary card (with End buttons for each jutsu still concentrated on).
 *
 * Turn events come from N5eCombat (documents/combat.mjs): Foundry calls them only when combat moves
 * forward, on the active GM's client, so rewinding a turn re-runs nothing (TURN1).
 * Order when the turn passes from A to B:
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
import { recoverCombatUses } from "./recovery.mjs";
import { beginUpkeep, finishUpkeep, renderUpkeep } from "./upkeep.mjs";
import { emitEffectEvent } from "../automation/effect-services.mjs";

const effectEvent = (actor, event, combat, suffix) => actor && emitEffectEvent(actor, event, { id: `${combat.id}:${combat.round}:${combat.turn}:${suffix}` })
  .catch(error => console.warn("n5e | effect event", error));

/** Start of a combatant's turn (N5eCombat._onStartTurn; active GM, forward only). */
export async function turnStartPipeline(combat, combatant) {
  if ( !game.users.activeGM?.isSelf ) return;
  const actor = combatant?.actor;
  if ( !actor ) return;
  await expireSourceEffects(combat, actor, "turnStart", { round: combat.round, turn: combat.turn });
  // Jutsu areas: timed ones that ran out go; lasting ones this creature starts in get a GM card.
  await areasTurnStart(combat, actor);
  await postConditionDamage(actor);
  const plan = turnStartPlan(actor);
  await actor.update(plan.update);
  const recovered = await recoverCombatUses(actor, ["turn"]);
  const lines = [];
  for ( const r of plan.recharges ) {
    const roll = await createN5eRoll(`1d${r.die}`).evaluate();
    const ok = roll.total >= r.min;
    if ( ok ) await actor.items.get(r.id)?.update({ "system.uses.spent": 0 });
    lines.push(`${esc(r.name)}: recharge d${r.die} rolled ${roll.total}${ok ? " (recharged)" : ""}`);
  }
  if ( plan.chainReset ) lines.push("Chain resets to 0 (not raised or maintained)");
  if ( plan.focusGained ) lines.push("Flow: +1 Focus");
  if ( recovered.length ) lines.push(`Recovered: ${esc(recovered.join(", "))}`);
  lines.push(...await beginUpkeep(actor, combat));
  for ( const id of actor.system.combat?.concentrating ?? [] ) {
    if ( actor.flags?.n5e?.upkeepPending?.ids?.includes(id) ) continue;
    const item = actor.items.get(id);
    if ( item ) lines.push(`<span class="conc">${esc(item.name)} <button type="button" data-n5e-end-conc="${id}">End</button></span>`);
  }
  // Death saves at the start of the turn while at 0 HP (characters; not stable or dead).
  const statuses = actor.statuses ?? new Set();
  if ( rule("deathSaves") && actor.type === "character" && actor.system.hp.value <= 0 && !statuses.has("dead") && !statuses.has("stabilized") ) {
    lines.push(`<span class="conc warn">At 0 HP: roll a death save <button type="button" data-n5e-deathsave="${actor.uuid}">Death save</button></span>`);
  }
  effectEvent(actor, "turnStart", combat, combatant.id);
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

/** End of a combatant's turn (N5eCombat._onEndTurn; active GM, forward only). */
export async function turnEndPipeline(combat, combatant) {
  if ( !game.users.activeGM?.isSelf ) return;
  const actor = combatant?.actor;
  if ( !actor ) return;
  const now = { round: combat.round, turn: combat.turn };
  await processConditionTurnEnd(actor, now);
  await trackersTurnEnd(combat, actor, now);
  await areasTurnEnd(combat, actor);
  effectEvent(actor, "turnEnd", combat, combatant.id);
  const ended = await finishUpkeep(actor);
  if ( ended?.length ) {
    const names = ended.map(id => actor.items.get(id)?.name ?? id).join(", ");
    const ChatMessageCls = CONFIG.ChatMessage.documentClass;
    await ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }),
      content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b>: no upkeep decision; ${esc(names)} end.</div>`, flags: { n5e: { actorUuid: actor.uuid } } });
  }
}

/** Combat deleted (N5eCombat._onDelete): Combat Rival ends, encounter uses recover, combatEnd effect events. */
export async function combatEndPipeline(combat) {
  if ( !game.users.activeGM?.isSelf ) return;
  const actors = new Set([...combat.combatants].map(c => c.actor).filter(Boolean));
  for ( const actor of actors ) {
    const ids = actor.effects.filter(e => e.flags?.n5e?.state === "combatRival").map(e => e.id);
    if ( ids.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    if ( actor.flags?.n5e?.upkeepPending ) await actor.update({ "flags.n5e.-=upkeepPending": null });
    await recoverCombatUses(actor, ["encounter"]);
    void emitEffectEvent(actor, "combatEnd", { id: `${combat.id}:${actor.uuid}:combatEnd` }).catch(error => console.warn("n5e | effect event", error));
  }
}

/**
 * Hooks this module still listens to (registered once from n5e.mjs). Turn start/end, round start
 * and combat end are N5eCombat methods (documents/combat.mjs), not hooks.
 *   moveToken(token, movement)       Chilled movement damage (workflow/trackers.mjs onTokenMove)
 *   createActiveEffect(effect)       Amp limit enforcement (workflow/trackers.mjs onAmpCreated)
 */
export function registerTurnHooks() {
  // Chilled: damage when a Chilled creature moves (trackers.mjs onTokenMove).
  Hooks.on("moveToken", (token, movement) => onTokenMove(token, movement));
  // Optional Amp limit: a new Amp may switch older ones off.
  Hooks.on("createActiveEffect", (effect, options, userId) => onAmpCreated(effect, options, userId));
}

/** Chat buttons on turn cards. */
export function onRenderTurnCard(message, html) {
  if ( html.querySelector("[data-n5e-upkeep]") ) void renderUpkeep(message, html).catch(error => ui.notifications.warn(error.message));
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
