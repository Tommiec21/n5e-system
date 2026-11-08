/**
 * Using a feature or class option from the sheet: pay its cost (a use, Focus, Superiority Dice),
 * then post its card. Refuses (with the reason) when the character can't pay.
 */
import { resourceCost, cannotPay } from "../rules/resource-cost.mjs";
import { postItemCard } from "../chat/card.mjs";
import { economySlot } from "../rules/turn-start.mjs";

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
