/**
 * Using a feature or class option from the sheet: pay its cost (a use, Focus, Superiority Dice),
 * then post its card. Refuses (with the reason) when the character can't pay.
 */
import { resourceCost, cannotPay } from "../rules/resource-cost.mjs";
import { postItemCard } from "../chat/card.mjs";
import { economySlot } from "../rules/turn-start.mjs";

/**
 * "Use" on a feature (sheet button or Combat tab pill).
 *   - Features whose activities carry their own cost just post their card: the buttons pay.
 *   - Otherwise pay the feature's cost (rules/resource-cost.mjs: a Molding's Focus, a Maneuver's
 *     Superiority Dice, Stamina when that rule is on, else a limited use), roll the spent dice when the
 *     pool has a die, mark the action slot used, and post the card.
 * @param {Actor} actor
 * @param {Item} item  a feat-type item (class feature, option, feat)
 */
export async function useFeature(actor, item) {
  // Features whose activities carry their own cost (Relentless Durability, Detonate...) pay on those buttons.
  if ( (item.system.activities ?? []).some(a => a.cost?.pool) ) return postItemCard(item);
  const cost = resourceCost(item);
  const problem = cannotPay(actor, cost, item);
  if ( problem ) {
    ui.notifications.warn(problem);
    return null;
  }
  let rolled = "";
  if ( cost.pool ) {
    const pool = actor.system.resources[cost.pool];
    await actor.update({ [`system.resources.${cost.pool}.value`]: Math.max(0, (pool.value ?? 0) - cost.amount) });
    // Pools with a die (Superiority Dice d8): roll what was spent, since most maneuvers use the result.
    if ( pool.die ) {
      const roll = await new Roll(`${cost.amount}${pool.die}`).evaluate();
      rolled = ` (rolled ${roll.total})`;
    }
  }
  if ( cost.uses ) await item.update({ "system.uses.spent": (item.system.uses.spent ?? 0) + 1 });
  const slot = economySlot(item.system.activation?.type);
  if ( slot ) await actor.update({ [`flags.n5e.economy.${slot}`]: true });
  return postItemCard(item, { spent: cost.pool ? `${cost.amount} ${actor.system.resources[cost.pool]?.label ?? cost.pool}${rolled}` : cost.uses ? "1 use" : "" });
}
