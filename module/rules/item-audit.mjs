/**
 * Item integrity (pure; FIN1, King 2026-11-14). The duplicate-item and missing-item reports could not
 * be reproduced, so this finds the damage on any actor and the grant paths refuse to cause it.
 *
 *   Duplicates   Two items of a type an actor holds once (class, clan, background, feature, feat,
 *                jutsu, stance, and the Unarmed Strike) with the same identifier. Stackable gear is
 *                never a duplicate. A feat marked repeatable is skipped.
 *   Keep         The copy that carries choices or spent uses; else the oldest.
 *   Missing      A character or NPC with no Unarmed Strike.
 */
export const SINGLE_TYPES = Object.freeze(["class", "clan", "background", "feature", "feat", "jutsu", "stance"]);
const list = v => (Array.isArray(v) ? v : v == null ? [] : [...v]);
const isUnarmed = item => item?.type === "weapon" && (item.system?.identifier === "unarmedStrike" || !!item.flags?.n5e?.unarmedStrike);

/** The key two items share when they are the same thing, or null for items that may repeat. */
export function identityKey(item) {
  if ( isUnarmed(item) ) return "weapon:unarmedStrike";
  if ( !SINGLE_TYPES.includes(item?.type) ) return null;
  if ( item.flags?.n5e?.repeatable ) return null;
  const id = item.system?.identifier || String(item.name ?? "").trim().toLowerCase();
  return id ? `${item.type}:${id}` : null;
}

/** How much play state an item carries (higher is kept). */
function weight(item) {
  const n = item.flags?.n5e ?? {};
  const s = item.system ?? {};
  let w = 0;
  if ( n.choice?.selected || n.selection || n.backgroundSelection || n.asi ) w += 4;
  if ( list(s.advancement).some(a => a?.chosen && Object.keys(a.chosen).length) ) w += 4;
  if ( Number(s.uses?.spent) > 0 || Number(s.levels) > 1 ) w += 2;
  if ( list(item.effects).length ) w += 1;
  return w;
}

/** Would adding this item duplicate one the actor already has? Returns the existing item or null. */
export function existingCopy(items, candidate) {
  const key = identityKey(candidate);
  if ( !key ) return null;
  return list(items).find(i => identityKey(i) === key) ?? null;
}

/**
 * Audit one actor's items.
 * @param {{type: string, items: object[]}} actor   plain data; items carry _id, name, type, system, flags, _stats
 * @returns {{duplicates: {key, name, keep: string, remove: string[]}[], missingUnarmed: boolean}}
 */
export function itemAudit(actor) {
  const groups = new Map();
  for ( const item of list(actor?.items) ) {
    const key = identityKey(item);
    if ( !key ) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const duplicates = [];
  for ( const [key, group] of groups ) {
    if ( group.length < 2 ) continue;
    const ranked = [...group].sort((a, b) => weight(b) - weight(a) || (a._stats?.createdTime ?? 0) - (b._stats?.createdTime ?? 0));
    duplicates.push({ key, name: ranked[0].name, keep: ranked[0]._id, remove: ranked.slice(1).map(i => i._id) });
  }
  const creature = ["character", "npc"].includes(actor?.type);
  return { duplicates, missingUnarmed: creature && !list(actor?.items).some(isUnarmed) };
}
