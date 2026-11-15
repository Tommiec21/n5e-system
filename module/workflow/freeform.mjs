/**
 * Freeform Jutsu follow the adversary (NPC3 C4): when an NPC's level, class or role (Striker) changes, each Freeform
 * Jutsu is rebuilt from its choices. Strikes are set when built (King Q-N35) and stay as they are.
 * A jutsu whose damage was edited by hand since it was built is kept and marked (flags.n5e.freeform.handEdited).
 */
import { recalculate, adversaryOf } from "../rules/freeform.mjs";

/** @returns {Promise<{updated: number, kept: string[]}>} */
export async function recalculateFreeform(actor) {
  const adv = adversaryOf(actor);
  const updates = [];
  const kept = [];
  for ( const item of actor.items ) {
    const { data, handEdited } = recalculate(item, adv);
    if ( handEdited ) {
      kept.push(item.name);
      if ( !item.flags.n5e.freeform.handEdited ) updates.push({ _id: item.id, "flags.n5e.freeform.handEdited": true });
    } else if ( data ) updates.push({ _id: item.id, system: data.system, flags: data.flags });
  }
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
  if ( kept.length ) ui.notifications?.info(`${actor.name}: ${kept.join(", ")} kept their hand-edited damage. Open them in the Freeform window to rebuild.`);
  return { updated: updates.length, kept };
}

export function registerFreeformHooks() {
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ( actor.type !== "npc" || userId !== game.user.id ) return;
    if ( !["level", "class", "role"].some(k => foundry.utils.hasProperty(changes, `system.details.${k}`)) ) return;
    recalculateFreeform(actor).catch(error => console.warn("n5e | freeform recalculation", error));
  });
}
