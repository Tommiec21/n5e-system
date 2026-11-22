/** Apply combat recovery periods (active GM; plan in rules/recovery.mjs). Returns names recovered. */
import { combatRecoveryPlan } from "../rules/recovery.mjs";
import { stampGain } from "../rules/pool-expiry.mjs";

export async function recoverCombatUses(actor, periods) {
  if ( !actor || !game.users.activeGM?.isSelf ) return [];
  const plan = combatRecoveryPlan(actor, periods);
  // King Q-E11: units a pool regains here share its lifetime like the ones from buttons (Magnetic Charges).
  for ( const [key, value] of Object.entries(plan.update) ) {
    const id = key.match(/^system\.resources\.([^.]+)\.value$/)?.[1];
    const pool = id && actor.system.resources?.[id];
    const gained = pool?.lifetime ? Number(value) - (Number(pool.value) || 0) : 0;
    if ( gained > 0 ) plan.update[`flags.n5e.poolStamps.${id}`] = stampGain(actor.flags?.n5e?.poolStamps?.[id], gained, game.time.worldTime);
  }
  if ( Object.keys(plan.update).length ) await actor.update(plan.update);
  if ( plan.itemUpdates.length ) await actor.updateEmbeddedDocuments("Item", plan.itemUpdates);
  return plan.recovered;
}

/** Recover for every distinct actor in a combat. */
export async function recoverForCombat(combat, periods) {
  const actors = new Set([...(combat?.combatants ?? [])].map(c => c.actor).filter(Boolean));
  for ( const actor of actors ) await recoverCombatUses(actor, periods);
}
