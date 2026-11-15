/**
 * Loot piles, merchants and the party stash (PRESTD1 Part C; King 2026-11-15, Q-F2, Q-P5).
 * Rules: rules/loot.mjs. Item moves reuse FIN1's transfer (remove first, restore on failure).
 *
 *   Take   from a pile (or the stash): the active GM moves it to the user's character.
 *   Buy    from a merchant: the price (times its buy rate) leaves the buyer's ryo, goes to the
 *          merchant, and the item moves.
 *   Sell   drop your item on a merchant: it pays the price times its sell rate.
 *   Leave  the GM turns a defeated NPC's items into a loot pile beside it (players never take from an
 *          NPC's own sheet, King Q-F2).
 * Each request a player can't do on their own client goes to the GM as an owner intent.
 */
import { canTake, purchase, saleValue, priceOf } from "../rules/loot.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

const physical = ["weapon", "armor", "consumable", "toolkit", "container", "loot"];
const unitPrice = item => Number(item?.system?.price ?? 0);
const ryoOf = actor => Number(actor?.system?.currency?.ryo ?? 0);
const say = (actor, html) => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="n5e-roll-card">${html}</div>` });

/** The character a user takes and buys for: their assigned character, else a controlled token they own. */
export function receiverFor(user = game.user) {
  if ( user.character ) return user.character;
  return canvas?.tokens?.controlled?.map(t => t.actor).find(a => a && a.type !== "loot" && canModify(user, a)) ?? null;
}

async function intent(actor, type, data) {
  const { submitIntent } = await import("../automation/owner-intents.mjs");
  return submitIntent(actor, type, data);
}

function amount(item, quantity) {
  const have = Number(item.system.quantity ?? 1);
  const n = Math.floor(Number(quantity ?? 1));
  if ( !Number.isSafeInteger(n) || n < 1 || n > have ) throw new Error(`Choose 1 to ${have}.`);
  return n;
}

/* ---- Take ---- */

async function doTake(loot, item, target, quantity, user) {
  if ( loot?.type !== "loot" || !canTake(loot.system.mode) ) throw new Error("Items can only be taken from a loot pile or the party stash.");
  if ( !canModify(user, target) ) throw new Error("Take items for a creature you own.");
  const { moveItem } = await import("./transfer.mjs");
  const n = amount(item, quantity);
  const name = item.name;
  await moveItem(loot, item, target, n);
  await say(target, `<b>${esc(target.name)}</b> took ${n > 1 ? `${n} × ` : ""}<b>${esc(name)}</b> from <b>${esc(loot.name)}</b>.`);
  return true;
}

/** Take an item from a pile or the stash. */
export async function takeFromLoot(item, { quantity = 1, target = receiverFor() } = {}) {
  const loot = item?.parent;
  if ( !target ) return ui.notifications.warn("Assign yourself a character (or select your token) to take items.");
  try {
    if ( game.user.isGM || canModify(game.user, loot) ) return await doTake(loot, item, target, quantity, game.user);
    return await intent(target, "lootTake", { lootUuid: loot.uuid, itemId: item.id, quantity: amount(item, quantity) });
  } catch (error) { return ui.notifications.warn(error.message); }
}

/* ---- Buy ---- */

async function doBuy(merchant, item, buyer, quantity, user) {
  if ( merchant?.type !== "loot" || merchant.system.mode !== "merchant" ) throw new Error("You can only buy from a merchant.");
  if ( !canModify(user, buyer) ) throw new Error("Buy for a creature you own.");
  const n = amount(item, quantity);
  const deal = purchase({ unitPrice: unitPrice(item), quantity: n, buyRate: merchant.system.buyRate, ryo: ryoOf(buyer) });
  if ( deal.error ) throw new Error(deal.error);
  const { moveItem } = await import("./transfer.mjs");
  const name = item.name;
  await buyer.update({ "system.currency.ryo": deal.buyerLeft });
  try { await moveItem(merchant, item, buyer, n); } catch (error) {
    await buyer.update({ "system.currency.ryo": deal.buyerLeft + deal.price });
    throw error;
  }
  await merchant.update({ "system.currency.ryo": ryoOf(merchant) + deal.price });
  await say(buyer, `<b>${esc(buyer.name)}</b> bought ${n > 1 ? `${n} × ` : ""}<b>${esc(name)}</b> from <b>${esc(merchant.name)}</b> for ${deal.price} ryo.`);
  return true;
}

export async function buyFromMerchant(item, { quantity = 1, buyer = receiverFor() } = {}) {
  const merchant = item?.parent;
  if ( !buyer ) return ui.notifications.warn("Assign yourself a character (or select your token) to buy.");
  try {
    if ( game.user.isGM ) return await doBuy(merchant, item, buyer, quantity, game.user);
    return await intent(buyer, "lootBuy", { lootUuid: merchant.uuid, itemId: item.id, quantity: amount(item, quantity) });
  } catch (error) { return ui.notifications.warn(error.message); }
}

/* ---- Sell ---- */

async function doSell(merchant, item, seller, quantity, user) {
  if ( merchant?.type !== "loot" || merchant.system.mode !== "merchant" ) throw new Error("You can only sell to a merchant.");
  if ( !canModify(user, seller) || item.parent !== seller ) throw new Error("Sell items from a creature you own.");
  if ( !physical.includes(item.type) ) throw new Error("Only physical items can be sold.");
  const n = amount(item, quantity);
  const value = saleValue({ unitPrice: unitPrice(item), quantity: n, sellRate: merchant.system.sellRate });
  const { moveItem } = await import("./transfer.mjs");
  const name = item.name;
  await moveItem(seller, item, merchant, n);
  await seller.update({ "system.currency.ryo": ryoOf(seller) + value });
  await merchant.update({ "system.currency.ryo": Math.max(0, ryoOf(merchant) - value) });
  await say(seller, `<b>${esc(seller.name)}</b> sold ${n > 1 ? `${n} × ` : ""}<b>${esc(name)}</b> to <b>${esc(merchant.name)}</b> for ${value} ryo.`);
  return true;
}

export async function sellToMerchant(item, merchant, { quantity = 1 } = {}) {
  const seller = item?.parent;
  try {
    if ( game.user.isGM ) return await doSell(merchant, item, seller, quantity, game.user);
    return await intent(seller, "lootSell", { lootUuid: merchant.uuid, itemId: item.id, quantity: amount(item, quantity) });
  } catch (error) { return ui.notifications.warn(error.message); }
}

/* ---- GM handlers ---- */

async function lootFrom(uuid) {
  const doc = await fromUuid(uuid);
  return doc?.actor ?? doc;
}

async function receiveTake(target, { lootUuid, itemId, quantity }, user) {
  const loot = await lootFrom(lootUuid);
  return doTake(loot, loot?.items.get(itemId), target, quantity, user);
}
async function receiveBuy(buyer, { lootUuid, itemId, quantity }, user) {
  const merchant = await lootFrom(lootUuid);
  return doBuy(merchant, merchant?.items.get(itemId), buyer, quantity, user);
}
async function receiveSell(seller, { lootUuid, itemId, quantity }, user) {
  return doSell(await lootFrom(lootUuid), seller.items.get(itemId), seller, quantity, user);
}

/* ---- Leave loot (GM) ---- */

/** GM: a loot pile with the NPC's physical items, placed beside its token. */
export async function leaveLoot(npc, token = npc?.token ?? npc?.getActiveTokens?.()[0]?.document) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can leave loot.");
  const items = npc.items.filter(i => physical.includes(i.type) && i.system?.identifier !== "unarmedStrike");
  if ( !items.length ) return ui.notifications.info(`${npc.name} has nothing to loot.`);
  const pile = await CONFIG.Actor.documentClass.create({ name: `${npc.name}: loot`, type: "loot", img: "icons/containers/bags/pack-leather-brown.webp",
    system: { mode: "pile" }, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
    items: items.map(i => { const d = i.toObject(); delete d._id; d.system.equipped = false; return d; }) });
  await npc.deleteEmbeddedDocuments("Item", items.map(i => i.id));
  if ( token?.parent && canvas?.scene?.id === token.parent.id ) {
    const size = canvas.grid.size;
    await canvas.scene.createEmbeddedDocuments("Token", [{ ...(await pile.getTokenDocument({ x: token.x + size, y: token.y })).toObject() }]);
  }
  await say(npc, `<b>${esc(npc.name)}</b> left ${items.length} item${items.length > 1 ? "s" : ""} as loot.`);
  return pile;
}

export { priceOf, unitPrice };

export async function registerLoot() {
  const { registerIntentHandler } = await import("../automation/owner-intents.mjs");
  registerIntentHandler("lootTake", receiveTake);
  registerIntentHandler("lootBuy", receiveBuy);
  registerIntentHandler("lootSell", receiveSell);
}
