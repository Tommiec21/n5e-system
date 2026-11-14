/**
 * Item transfer between actors (pure; FIN1, King 2026-11-14; PF2e parity, no dialogs beyond "how many").
 *
 *   What moves      Physical items only (weapon, armor, consumable, toolkit, container, loot). Never
 *                   the Unarmed Strike.
 *   Who receives    A player character or an Allied NPC; the GM can transfer to anything. Loot piles,
 *                   merchants, taking from actors you don't own and ryo wait on King (Q-F1–Q-F3).
 *   Stacks          The moved copy merges into a matching stack on the target (same type, identifier
 *                   and data); otherwise it becomes a new item.
 *   Resets          The copy arrives unequipped and carried.
 */
export const PHYSICAL_TYPES = Object.freeze(["weapon", "armor", "consumable", "toolkit", "container", "loot"]);
const IGNORED = ["quantity", "equipped", "location"];

const stripped = system => {
  const s = { ...(system ?? {}) };
  for ( const k of IGNORED ) delete s[k];
  return JSON.stringify(s, Object.keys(s).sort());
};
const isUnarmed = item => item?.system?.identifier === "unarmedStrike" || !!item?.flags?.n5e?.unarmedStrike;

/** Can this item be transferred at all? Returns a reason, or "" when it can. */
export function transferRefusal(item) {
  if ( !item ) return "That item no longer exists.";
  if ( !PHYSICAL_TYPES.includes(item.type) ) return "Only physical items can be given to another creature.";
  if ( isUnarmed(item) ) return "The Unarmed Strike can't be given away.";
  return "";
}

/**
 * May this target receive items from this user?
 * @param {{type: string, allied: boolean, hasPlayerOwner: boolean}} target
 * @param {{isGM: boolean}} user
 */
export function canReceive(target, user = {}) {
  if ( !target ) return false;
  if ( user.isGM ) return true;
  if ( target.type === "character" ) return true;
  return target.type === "npc" && !!target.allied;
}

/**
 * Plan a transfer.
 * @param {object} item            the source item (plain data: _id, name, type, system, flags)
 * @param {object[]} targetItems   the target's items (plain data)
 * @param {number} [quantity]      how many to move (default: all)
 * @returns {{quantity: number, remaining: number, mergeInto: string|null, mergedQuantity: number|null, data: object|null}}
 */
export function transferPlan(item, targetItems = [], quantity = undefined) {
  const refusal = transferRefusal(item);
  if ( refusal ) throw new Error(refusal);
  const have = Math.max(0, Math.floor(Number(item.system?.quantity ?? 1)));
  const want = quantity == null ? have : Math.floor(Number(quantity));
  if ( !Number.isSafeInteger(want) || want < 1 ) throw new Error("Choose how many to give.");
  if ( want > have ) throw new Error(`Only ${have} ${item.name} left to give.`);
  const key = item.system?.identifier || item.name;
  const match = targetItems.find(t => t.type === item.type && (t.system?.identifier || t.name) === key
    && stripped(t.system) === stripped(item.system) && t.name === item.name);
  if ( match ) {
    return { quantity: want, remaining: have - want, mergeInto: match._id, mergedQuantity: Math.floor(Number(match.system?.quantity ?? 1)) + want, data: null };
  }
  const data = structuredClone({ name: item.name, type: item.type, img: item.img, system: item.system, flags: item.flags ?? {}, effects: item.effects ?? [] });
  data.system.quantity = want;
  if ( "equipped" in data.system ) data.system.equipped = false;
  if ( "location" in data.system ) data.system.location = "carried";
  // Grant links belong to the giver's class, clan or background, not the receiver's.
  if ( data.flags?.n5e ) for ( const k of ["clanOrigin", "clanLevel", "backgroundOrigin", "advancement"] ) delete data.flags.n5e[k];
  return { quantity: want, remaining: have - want, mergeInto: null, mergedQuantity: null, data };
}
