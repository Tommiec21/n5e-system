import { shouldCoordinate, submitWorkflow } from "../automation/multiplayer.mjs";
/**
 * Using a feature or class option from the sheet: pay its cost (a use, Focus, Superiority Dice),
 * then post its card. Refuses (with the reason) when the character can't pay.
 */
import { resourceCost, cannotPay } from "../rules/resource-cost.mjs";
import { postItemCard } from "../chat/card.mjs";
import { withActorLock, activityTurnStamp } from "./commands.mjs";
import { payPoolCost } from "./resources.mjs";
import { rule } from "../rules-settings.mjs";
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
async function executeFeature(actor, item) {
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the owner can use this feature.");
  // Save-only features are initiated by their owner here; defender save buttons must remain
  // usable by each defender and must not charge or consume the caster's allowance repeatedly.
  const saveInitiation = item.system.activities?.some(a => a.oncePerTurn && a.type === "save");
  const stamp = activityTurnStamp();
  if ( saveInitiation && stamp && actor.flags?.n5e?.activityUsage?.[item.id] === stamp ) return ui.notifications.warn("This feature was already used this turn.");
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
    const paid = await payPoolCost(actor, { ...cost, roll: true }, { locked: true });
    if ( !paid ) return null;
    if ( paid.roll != null ) rolled = ` (rolled ${paid.roll})`;
  }
  if ( cost.uses ) await item.update({ "system.uses.spent": (item.system.uses.spent ?? 0) + 1 });
  const slot = economySlot(item.system.activation?.type);
  if ( slot && rule("actionEconomy") ) await actor.update({ [`flags.n5e.economy.${slot}`]: true });
  if ( saveInitiation && stamp ) await actor.update({ [`flags.n5e.activityUsage.${item.id}`]: stamp });
  return postItemCard(item, { spent: cost.pool ? `${cost.amount} ${actor.system.resources[cost.pool]?.label ?? cost.pool}${rolled}` : cost.uses ? "1 use" : "" });
}

/** Features re-read costs after earlier actions finish. */
export function useFeature(actor, item, { authoritative = false } = {}) {
  if ( shouldCoordinate(authoritative) ) return submitWorkflow("feature", { actorUuid: actor.uuid, itemId: item.id });
  return withActorLock(actor, () => executeFeature(actor, item));
}
