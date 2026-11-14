/**
 * Item transfer between actors (Foundry side; FIN1). Rules: rules/transfer.mjs.
 *
 *   Who runs it   A user who owns both actors moves the item on their own client. A user who owns
 *                 only the giver asks the active GM (owner intent "transferItem"), who re-checks and
 *                 moves it with no dialog. With no GM connected nothing moves.
 *   Safety        Remove from the giver first, then add to the receiver; if adding fails the giver's
 *                 item is restored exactly.
 *   Drops         An owned actor's physical item dropped on another actor's sheet or token is a
 *                 transfer, not a copy (sheets call transferFromDrop; dropCanvasData for tokens).
 */
import { transferPlan, transferRefusal, canReceive } from "../rules/transfer.mjs";
import { canModify, isAllied } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

const facts = actor => ({ type: actor?.type, allied: isAllied(actor) });

/** Move the item. Runs on a client that may change both actors. Returns the receiver's item. */
async function move(source, item, target, quantity) {
  const plan = transferPlan(item.toObject(), target.items.map(i => i.toObject()), quantity);
  const before = item.toObject();
  if ( plan.remaining > 0 ) await item.update({ "system.quantity": plan.remaining });
  else await item.delete();
  try {
    if ( plan.mergeInto ) {
      const stack = target.items.get(plan.mergeInto);
      await stack.update({ "system.quantity": plan.mergedQuantity });
      return { received: stack, plan };
    }
    const [created] = await target.createEmbeddedDocuments("Item", [plan.data]);
    return { received: created, plan };
  } catch (error) {
    // Put the giver's item back as it was.
    if ( source.items.get(before._id) ) await source.items.get(before._id).update({ "system.quantity": before.system.quantity });
    else await source.createEmbeddedDocuments("Item", [before], { keepId: true });
    throw error;
  }
}

async function announce(source, target, name, quantity) {
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor: source }),
    content: `<div class="n5e-roll-card"><b>${esc(source.name)}</b> gave ${quantity > 1 ? `${quantity} × ` : ""}<b>${esc(name)}</b> to <b>${esc(target.name)}</b>.</div>` });
}

/** Checks shared by the requesting client and the GM. Throws a readable error. */
function check(user, source, item, target) {
  const refusal = transferRefusal(item);
  if ( refusal ) throw new Error(refusal);
  if ( !source || item.parent !== source ) throw new Error("That item is no longer on its owner.");
  if ( !target || target === source ) throw new Error("Choose another creature to give the item to.");
  if ( !canModify(user, source) ) throw new Error("You can only give items from a creature you own.");
  if ( !canReceive(facts(target), { isGM: !!user?.isGM }) ) throw new Error(`${target.name} can't be given items. Ask the GM.`);
}

/**
 * Give an item (or part of a stack) to another actor.
 * @param {Item} item
 * @param {Actor} target
 * @param {{quantity?: number}} [options]
 */
export async function transferItem(item, target, { quantity } = {}) {
  const game = globalThis.game;
  const source = item?.parent;
  check(game.user, source, item, target);
  const have = Number(item.system.quantity ?? 1);
  const amount = Math.floor(Number(quantity ?? have));
  if ( !Number.isSafeInteger(amount) || amount < 1 || amount > have ) throw new Error(`Choose 1 to ${have}.`);
  const name = item.name;
  if ( canModify(game.user, target) ) {
    const result = await move(source, item, target, amount);
    await announce(source, target, name, amount);
    return result.received;
  }
  const { submitIntent } = await import("../automation/owner-intents.mjs");
  await submitIntent(source, "transferItem", { itemId: item.id, targetUuid: target.uuid, quantity: amount });
  return true;
}

/** Active GM: finish a player's transfer after re-checking it. */
export async function receiveTransfer(source, { itemId, targetUuid, quantity }, user) {
  const item = source.items.get(itemId);
  const target = await fromUuid(targetUuid);
  const actor = target?.actor ?? target;
  check(user, source, item, actor);
  const name = item.name;
  await move(source, item, actor, quantity);
  await announce(source, actor, name, quantity);
  return true;
}

/** "How many?" for a stack. Returns the amount, or null when cancelled. */
async function askQuantity(item, target) {
  const have = Number(item.system.quantity ?? 1);
  if ( have <= 1 ) return 1;
  const { DialogV2 } = foundry.applications.api;
  return DialogV2.prompt({ window: { title: `Give ${item.name} to ${target.name}` },
    content: `<label>How many? <input type="number" name="quantity" min="1" max="${have}" step="1" value="${have}" autofocus></label>`,
    ok: { label: "Give", callback: (event, button) => Math.clamp(Math.floor(Number(button.form.elements.quantity.value) || 0), 1, have) },
    rejectClose: false });
}

/**
 * Is this drop a transfer (an owned actor's physical item dropped on a different actor)?
 * Returns true when it was handled (moved, cancelled or refused with a notice).
 */
export async function transferFromDrop(item, target) {
  const source = item?.parent;
  if ( !(source instanceof Actor) || !target || source === target ) return false;
  if ( transferRefusal(item) ) return false;
  if ( !canModify(globalThis.game.user, source) ) return false;
  try {
    const quantity = await askQuantity(item, target);
    if ( quantity ) await transferItem(item, target, { quantity });
  } catch (error) {
    ui.notifications.warn(error.message);
  }
  return true;
}

/** Register the GM handler and token drops. */
export async function registerTransfer() {
  const { registerIntentHandler } = await import("../automation/owner-intents.mjs");
  registerIntentHandler("transferItem", receiveTransfer);
  Hooks.on("dropCanvasData", (canvas, data) => {
    if ( data?.type !== "Item" || !data.uuid ) return undefined;
    const item = globalThis.fromUuidSync?.(data.uuid);
    if ( !(item?.parent instanceof Actor) ) return undefined;
    const token = canvas.tokens.placeables.filter(t => t.actor && t.bounds.contains(data.x, data.y))
      .sort((a, b) => b.document.sort - a.document.sort)[0];
    if ( !token || token.actor === item.parent || transferRefusal(item) ) return undefined;
    void transferFromDrop(item, token.actor);
    return false;
  });
}
