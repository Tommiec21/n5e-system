/** Persistent per-target damage commands with extensible, revalidated reaction adapters. */
import { requestFingerprint } from "../automation/receipts.mjs";
import { coordinateCommand } from "../automation/commands.mjs";
import { chooseReaction, resolveReactionChain } from "./reaction-adapters.mjs";
import { rule } from "../rules-settings.mjs";
import { retireReactionWindows } from "./reactions.mjs";

export async function coordinateDamage(message, data, mode, targets, apply, { resumeReview = false } = {}) {
  if ( !game.users.activeGM?.isSelf ) throw new Error("The active GM applies coordinated damage. Use the manual workflow when no GM is available.");
  if ( !rule("reactionWindows") ) throw new Error("Enable reaction decision windows before using the coordinated damage pilot.");
  if ( !["full", "half", "double"].includes(mode) || !Array.isArray(data.instances) || !data.instances.length
    || data.instances.some(i => !Number.isFinite(i.amount) || i.amount < 0) ) throw new Error("Unsupported coordinated damage data.");
  const results = [];
  for ( const target of new Map(targets.map(a => [a.uuid, a])).values() ) {
    const identity = await requestFingerprint("damage-source", { message: message.uuid, target: target.uuid });
    const requestId = `damage-${identity.slice(0, 40)}`;
    let selection;
    const result = await coordinateCommand({ id: requestId, type: "damage", resumeReview, payload: { message: message.uuid, target: target.uuid, data, mode } }, {
      approve: async () => {
        if ( resumeReview ) await retireReactionWindows(requestId);
        selection = await chooseReaction(target, "beforeDamage", { data, message, requestId });
        return true; // Declining a reaction does not decline the GM's damage command.
      },
      apply: async () => {
        await resolveReactionChain(target, "beforeDamage", { data, message, mode }, async ({ actor, event, context, selection }) => {
          if ( event !== "beforeDamage" || !Array.isArray(context.data?.instances) || !context.data.instances.length
            || context.data.instances.some(i => !Number.isFinite(i.amount) || i.amount < 0)
            || !["full", "half", "double"].includes(context.mode ?? mode) ) throw new Error("Damage interruptions must supply a valid beforeDamage context.");
          const applied = await apply({ ...context.data, targetUuid: actor.uuid }, context.mode ?? mode, {
            coordinated: true, beforePlan: current => selection ? selection.prepare(current) : {}
          });
          if ( !applied ) throw new Error("Damage application was cancelled; inspect its receipt before retrying.");
          return applied;
        }, { selection });
      }
    });
    results.push(result);
    if ( result.replay ) ui.notifications.info("This target already has a stored damage result; no damage or reaction was repeated.");
  }
  return results;
}
