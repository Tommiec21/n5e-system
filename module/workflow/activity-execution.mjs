import { withActorLocks, activityTurnStamp } from "./commands.mjs";
import { economySlot } from "../rules/turn-start.mjs";
import { rule } from "../rules-settings.mjs";

/** Serialize actor activities and enforce declared turn limits before any resource is spent.
 * Alternative buttons on one feature share its once-per-turn allowance (e.g. Lethal Attack).
 * Save rolls belong to the defenders and therefore never consume the caster's action here.
 */
export async function executeActivity(message, button, event, execute, targetsFor) {
  if ( button.disabled ) return null;
  button.disabled = true;
  try {
    const uuid = message.getFlag("n5e", "cast")?.actorUuid ?? message.getFlag("n5e", "roll")?.actorUuid ?? message.getFlag("n5e", "actorUuid");
    const actor = uuid ? await fromUuid(uuid) : message.speakerActor;
    if ( !actor ) return execute(message, button, event);
    const healingTargets = button.dataset.n5eAct === "heal" ? targetsFor(actor) : [];
    return await withActorLocks([actor, ...healingTargets], async () => {
      const d = button.dataset;
      const item = d.item ? actor.items.get?.(d.item) : null;
      const authored = item?.system.activities?.find(a => (a.id || a.label || a.type) === d.activity);
      // Saves are rolled by defenders: the once-per-turn allowance is checked and stamped when the
      // feature is used (use-feature.mjs), not on each save click.
      const once = d.n5eAct !== "save" && (authored?.oncePerTurn ?? !!d.once);
      const stamp = activityTurnStamp();
      const key = item?.id;
      if ( once && stamp && key && actor.flags?.n5e?.activityUsage?.[key] === stamp ) {
        return ui.notifications.warn("This feature was already used this turn.");
      }
      if ( (once || d.cost || d.activation) && !actor.isOwner ) return ui.notifications.warn("Only the owner can use this activity.");
      if ( globalThis.Hooks?.call?.("n5e.preActivity", actor, item, authored, d) === false ) return null;
      const cost = d.cost ? JSON.parse(d.cost) : null;
      const poolBefore = cost?.pool ? actor.system.resources?.[cost.pool]?.value : undefined;
      let result;
      const refund = async () => {
        if ( poolBefore !== undefined && actor.system.resources[cost.pool].value !== poolBefore ) await actor.update({ [`system.resources.${cost.pool}.value`]: poolBefore });
      };
      try { result = await execute(message, button, event, { healingTargets }); }
      catch (error) { await refund(); throw error; }
      if ( result == null ) await refund();
      // Failed/cancelled operations return null/undefined; successful plain resource rolls return a receipt.
      if ( result == null ) return result;
      const update = {};
      if ( once && stamp && key ) update["flags.n5e.activityUsage." + key] = stamp;
      const slot = economySlot(authored?.activation || d.activation);
      if ( slot && rule("actionEconomy") && d.n5eAct !== "save" ) update["flags.n5e.economy." + slot] = true;
      if ( Object.keys(update).length ) await actor.update(update);
      globalThis.Hooks?.callAll("n5e.activityComplete", actor, item, authored, result);
      return result;
    });
  } finally { button.disabled = false; }
}
