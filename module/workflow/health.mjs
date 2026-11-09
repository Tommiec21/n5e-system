import { shouldCoordinate, submitWorkflow } from "../automation/multiplayer.mjs";
/** Every HP/CP healing source uses the same rules and revival cleanup. */
import { healPlan } from "../rules/damage.mjs";
import { withActorLock } from "./commands.mjs";

export async function applyHealing(actor, amount, pool = "hp", { locked = false, authoritative = false } = {}) {
  if ( !locked && shouldCoordinate(authoritative) ) return submitWorkflow("healing", { actorUuid: actor.uuid, amount, pool });
  if ( !actor?.isOwner ) throw new Error("Only the owner or GM can heal this actor.");
  if ( !["hp", "cp", "tempHp", "tempCp"].includes(pool) ) throw new Error("Unknown healing pool.");
  const execute = async () => {
    const plan = healPlan(actor, amount, pool);
    if ( plan.blocked ) return plan;
    await actor.update(plan.update);
    if ( plan.revived ) {
      for ( const status of ["dying", "unconscious", "stabilized"] ) await actor.toggleStatusEffect(status, { active: false });
    }
    return plan;
  };
  return locked ? execute() : withActorLock(actor, execute);
}
