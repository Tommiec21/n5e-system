/**
 * Turn start (Foundry side). The active GM's client applies the turn-start plan for the combatant
 * whose turn begins: concentration upkeep, Chain/Combo resets, action economy, recharge rolls; then
 * posts one short summary card (with End buttons for each jutsu still concentrated on).
 */
import { turnStartPlan } from "../rules/turn-start.mjs";
import { esc } from "../view-models/common.mjs";
import { rule } from "../rules-settings.mjs";
import { postConditionDamage, processConditionTurnEnd } from "./conditions.mjs";

async function onTurnStart(combat) {
  if ( !game.users.activeGM?.isSelf ) return;
  const actor = combat.combatant?.actor;
  if ( !actor ) return;
  await postConditionDamage(actor);
  const plan = turnStartPlan(actor);
  await actor.update(plan.update);

  const lines = [];
  for ( const r of plan.recharges ) {
    const roll = await new Roll(`1d${r.die}`).evaluate();
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
export async function endConcentration(actor, id) {
  const keep = (actor.system.combat?.concentrating ?? []).filter(x => x !== id);
  return actor.update({ "system.combat.concentrating": keep, [`flags.n5e.concentrationPaid.-=${id}`]: null });
}

export function registerTurnHooks() {
  Hooks.on("combatTurnChange", async (combat, prior) => {
    if ( game.users.activeGM?.isSelf && prior?.combatantId ) {
      const ending = combat.combatants.get(prior.combatantId)?.actor;
      if ( ending ) await processConditionTurnEnd(ending, { round: prior.round, turn: prior.turn });
    }
    return onTurnStart(combat);
  });
  Hooks.on("combatStart", combat => onTurnStart(combat));
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
