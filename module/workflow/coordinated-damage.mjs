/** Opt-in active-GM pilot: persistent damage identity, owner decision, then one validated mutation. */
import { createReceiptCoordinator, requestFingerprint } from "../automation/receipts.mjs";
import { deflectionOffer } from "../rules/deflection.mjs";
import { openReactionWindow, waitForReactionWindow } from "./reactions.mjs";
import { rule } from "../rules-settings.mjs";

export async function coordinateDamage(message, data, mode, targets, apply) {
  if ( !game.users.activeGM?.isSelf ) throw new Error("The active GM applies coordinated damage. Use the manual workflow when no GM is available.");
  if ( !rule("reactionWindows") ) throw new Error("Enable reaction decision windows before using the coordinated damage pilot.");
  if ( !["full", "half", "double"].includes(mode) || !Array.isArray(data.instances) || !data.instances.length
    || data.instances.some(i => !Number.isFinite(i.amount) || i.amount < 0) ) throw new Error("Unsupported coordinated damage data.");
  const service = createReceiptCoordinator({
    read: () => game.settings.get("n5e", "requestReceipts"),
    write: ledger => game.settings.set("n5e", "requestReceipts", ledger),
    authority: () => !!game.users.activeGM?.isSelf
  });
  const results = [];
  for ( const target of new Map(targets.map(a => [a.uuid, a])).values() ) {
    const identity = await requestFingerprint("damage-source", { message: message.uuid, target: target.uuid });
    let accepted = false, originalOffer, stamp;
    const result = await service.execute({ id: `damage-${identity.slice(0, 40)}`, type: "damage", payload: { message: message.uuid, target: target.uuid, data, mode },
      epoch: game.settings.get("n5e", "requestReceipts")?.epoch ?? 1 },
    async () => {
      stamp = game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null;
      originalOffer = deflectionOffer(target, { combat: !!stamp, ...data });
      if ( originalOffer ) {
        const window = await openReactionWindow(target, originalOffer.item, { label: "Deflection", trigger: "Use your reaction and 1 Discipline to reduce this damage?" });
        accepted = await waitForReactionWindow(window) === "accepted";
      }
      return true; // Declining the reaction still permits the damage the GM chose to apply.
    }, async () => {
      const applied = await apply({ ...data, targetUuid: target.uuid }, mode, {
        coordinated: true,
        beforePlan: async actor => {
          if ( !accepted ) return {};
          const currentStamp = game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null;
          const offer = deflectionOffer(actor, { combat: !!currentStamp, ...data });
          if ( !offer || offer.item.id !== originalOffer.item.id || stamp !== currentStamp ) throw new Error("Deflection eligibility changed; reconcile this damage instead of applying it automatically.");
          const revision = actor._stats?.modifiedTime;
          const roll = await new Roll(`${offer.dice}${offer.die}`).evaluate();
          if ( !game.users.activeGM?.isSelf || actor._stats?.modifiedTime !== revision ) throw new Error("Authority or actor changed during the reaction roll; reconcile the request.");
          return { flatReduction: roll.total, update: { "system.resources.discipline.value": actor.system.resources.discipline.value - offer.cost, "flags.n5e.economy.reaction": true },
            roll, label: "Deflection" };
        }
      });
      if ( !applied ) throw new Error("Damage application was cancelled; inspect its receipt before retrying.");
    });
    results.push(result);
    if ( result.replay ) ui.notifications.info("This target already has a stored damage result; no damage or reaction was repeated.");
  }
  return results;
}
