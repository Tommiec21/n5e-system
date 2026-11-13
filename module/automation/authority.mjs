/**
 * Who may change what (dnd5e/PF2e parity, King 2026-11-13). Every user changes only documents they
 * own; the GM owns NPCs. No relay and no approval dialogs. Pure: tested in Node.
 */

/** GM, or OWNER permission on the document. The single test every apply/remove control uses. */
export function canModify(user, doc) {
  if ( !doc ) return false;
  if ( user?.isGM ) return true;
  if ( user && typeof doc.testUserPermission === "function" ) return !!doc.testUserPermission(user, "OWNER");
  // Document#isOwner answers for the current user only.
  return !!doc.isOwner && (!user || user === globalThis.game?.user);
}

/**
 * Split recipients into those the user may change and those the GM applies (dnd5e
 * damage-application lists only owned actors). Duplicates by uuid are dropped.
 * @returns {{owned: object[], skipped: object[]}}
 */
export function ownedRecipients(actors, user) {
  const seen = new Set(), owned = [], skipped = [];
  for ( const actor of actors ?? [] ) {
    if ( !actor || seen.has(actor.uuid) ) continue;
    seen.add(actor.uuid);
    (canModify(user, actor) ? owned : skipped).push(actor);
  }
  return { owned, skipped };
}

/** Notice for recipients the clicking user does not own; null when nothing was skipped. */
export function skippedNotice(skipped) {
  if ( !skipped?.length ) return null;
  return `The GM applies this to: ${skipped.map(a => a.name).join(", ")}.`;
}

/** Allied NPC: player-controlled NPC (summons from jutsu or class features). */
export function isAllied(actor) {
  return actor?.type === "npc" && actor.system?.allied === true;
}

/** The user who summoned (and owns) this Allied NPC, or null. */
export function alliedOwnerId(actor) {
  return actor?.flags?.n5e?.allied?.ownerId ?? actor?.token?.flags?.n5e?.allied?.ownerId ?? null;
}
