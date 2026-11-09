import { createN5eRoll } from "../dice/n5e-roll.mjs";
/** Shared validated resource payment for activities and feature use. */
import { withActorLock } from "./commands.mjs";
import { resourceChange } from "../rules/resources.mjs";
import { esc } from "../view-models/common.mjs";

/**
 * Pay an activity's pool cost; roll the pool's die when asked (Superiority Dice: d8).
 * Pools are system.resources.<id> (class pools such as focus, superiorityDice, pyroclasm, and the
 * optional stamina pool). Warns and returns null when the pool is missing or short.
 * @param {Actor} actor
 * @param {{pool: string, amount?: number, roll?: boolean, choose?: boolean}} cost
 *   choose: ask the player how many to spend (Pyroclasm's Detonate)
 * @returns {Promise<{roll: number|null, amount: number}|null>}  roll: the pool die total, when rolled
 */
export async function payPoolCost(actor, cost, { locked = false } = {}) {
  if ( !locked ) return withActorLock(actor, () => payPoolCost(actor, cost, { locked: true }));
  let pool = actor.system.resources?.[cost.pool];
  let amount = cost.amount ?? 1;
  if ( !pool ) {
    ui.notifications.warn(`No ${cost.pool} pool.`);
    return null;
  }
  // "Any number" (Pyroclasm Detonate): the player picks how many.
  if ( cost.choose ) {
    const cap = cost.gain ? (pool.maxValue ?? 0) - (pool.value ?? 0) : (pool.value ?? 0);
    const { DialogV2 } = foundry.applications.api;
    const n = await DialogV2.prompt({ window: { title: `Spend ${pool.label || cost.pool}` },
      content: `<label>How many? <input type="number" name="n" value="1" min="1" max="${cap}"></label>`,
      ok: { callback: (event, button) => Number(button.form.elements.n.value) || 0 }, rejectClose: false });
    if ( !n ) return null;
    if ( !Number.isSafeInteger(n) || n < 1 || n > cap ) {
      ui.notifications.warn("Choose a whole number within the available resource limit.");
      return null;
    }
    amount = n;
  }
  pool = actor.system.resources?.[cost.pool];
  let nextValue;
  try { nextValue = resourceChange(pool, amount, { gain: !!cost.gain }); }
  catch (error) { ui.notifications.warn(error.message); return null; }
  // gain: the button adds to the pool instead (Carnage, Momentum, Blight, Mental Refocus...), capped at its max.
  if ( cost.gain ) {
    const value = nextValue;
    await actor.update({ [`system.resources.${cost.pool}.value`]: value });
    ui.notifications.info(`${pool.label || cost.pool}: ${value} / ${pool.maxValue ?? 0}`);
    return { roll: null, amount, gained: true };
  }
  if ( (pool.value ?? 0) < amount ) {
    ui.notifications.warn(`Not enough ${pool.label || cost.pool} (${pool.value ?? 0} / ${amount}).`);
    return null;
  }
  await actor.update({ [`system.resources.${cost.pool}.value`]: nextValue });
  if ( !cost.roll || !pool.die || !amount ) return { roll: null, amount };
  const roll = await createN5eRoll(`${amount}${pool.die}`).evaluate();
  await roll.toMessage({ speaker: CONFIG.ChatMessage.documentClass.getSpeaker({ actor }),
    flavor: `<div class="n5e-roll-card"><header><b>${esc(pool.label || cost.pool)}</b><span class="bonus">${roll.total}</span></header><div class="note">Spent ${amount}</div></div>` });
  return { roll: roll.total, amount };
}

