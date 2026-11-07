/**
 * Using a feature or class option from the sheet: pay its cost (a use, Focus, Superiority Dice),
 * then post its card. Refuses (with the reason) when the character can't pay.
 */
import { resourceCost, cannotPay } from "../rules/resource-cost.mjs";
import { postItemCard } from "../chat/card.mjs";

export async function useFeature(actor, item) {
  const cost = resourceCost(item);
  const problem = cannotPay(actor, cost, item);
  if ( problem ) {
    ui.notifications.warn(problem);
    return null;
  }
  if ( cost.pool ) {
    const pool = actor.system.resources[cost.pool];
    await actor.update({ [`system.resources.${cost.pool}.value`]: Math.max(0, (pool.value ?? 0) - cost.amount) });
  }
  if ( cost.uses ) await item.update({ "system.uses.spent": (item.system.uses.spent ?? 0) + 1 });
  return postItemCard(item, { spent: cost.pool ? `${cost.amount} ${actor.system.resources[cost.pool]?.label ?? cost.pool}` : cost.uses ? "1 use" : "" });
}
