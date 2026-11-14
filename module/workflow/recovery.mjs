/** Apply combat recovery periods (active GM; plan in rules/recovery.mjs). Returns names recovered. */
import { combatRecoveryPlan } from "../rules/recovery.mjs";

export async function recoverCombatUses(actor, periods) {
  if ( !actor || !game.users.activeGM?.isSelf ) return [];
  const plan = combatRecoveryPlan(actor, periods);
  if ( Object.keys(plan.update).length ) await actor.update(plan.update);
  if ( plan.itemUpdates.length ) await actor.updateEmbeddedDocuments("Item", plan.itemUpdates);
  return plan.recovered;
}

/** Recover for every distinct actor in a combat. */
export async function recoverForCombat(combat, periods) {
  const actors = new Set([...(combat?.combatants ?? [])].map(c => c.actor).filter(Boolean));
  for ( const actor of actors ) await recoverCombatUses(actor, periods);
}
