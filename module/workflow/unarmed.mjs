/**
 * The Unarmed Strike item (DATA2). New characters and NPCs get it in N5eActor#_preCreate; this adds
 * it to creatures that existed before (world migration 5). GM side.
 */
import { isUnarmedStrike } from "../rules/unarmed.mjs";

/** Add the Unarmed Strike item to a character or NPC that lacks one. Returns true when added. */
export async function ensureUnarmedStrike(actor) {
  if ( !["character", "npc"].includes(actor?.type) ) return false;
  if ( actor.items.some(i => isUnarmedStrike(i)) ) return false;
  await actor.createEmbeddedDocuments("Item", [foundry.utils.deepClone(CONFIG.N5E.unarmedStrike)], { n5eMigration: true });
  return true;
}
