/**
 * Wands (PRESTD1 Part D; King Q-PF4: emulating PF2e for now). A wand holds one Ninjutsu or Genjutsu at a
 * rank. Once a day its holder casts it with their own attack and DC and no chakra. A second use that
 * day overcharges it: the jutsu is cast, then a flat check (d20, DC 10) or the wand breaks. Overcharging
 * a wand already overcharged today destroys it and casts nothing. A Long or Full Rest recharges it
 * (broken wands stay broken). Rules: rules/pf2e-emulation.mjs.
 */
import { wandAction, overchargeHolds } from "../rules/pf2e-emulation.mjs";
import { scrollDiscipline } from "../rules/scrolls.mjs";
import { rankOrder } from "../config/core.mjs";
import { esc } from "../view-models/common.mjs";

export const isWand = item => item?.type === "consumable" && item.system?.subtype === "wand" && !!item.flags?.n5e?.wand?.jutsu;

/** Item data for a wand of this jutsu. */
export function wandData(jutsu, { rank = null } = {}) {
  const data = jutsu.toObject ? jutsu.toObject() : structuredClone(jutsu);
  if ( !scrollDiscipline(data.system) ) throw new Error("Only Ninjutsu and Genjutsu can be put in a wand.");
  const at = rankOrder.includes(rank) ? rank : data.system.rank;
  delete data._id;
  return { name: `Wand: ${data.name} (${at})`, type: "consumable", img: "icons/weapons/wands/wand-gem-violet.webp",
    system: { subtype: "wand", quantity: 1, destroyOnEmpty: false, description: data.system.description ?? "" },
    flags: { n5e: { wand: { jutsu: data, rank: at, used: false, overcharged: false, broken: false } } } };
}

export async function makeWand(jutsu, { rank = null, actor = null } = {}) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM makes wands.");
  const data = wandData(jutsu, { rank });
  const target = actor ?? jutsu.parent;
  if ( target?.documentName === "Actor" ) return (await target.createEmbeddedDocuments("Item", [data]))[0];
  return CONFIG.Item.documentClass.create(data);
}

async function wandCopy(actor, wand) {
  const w = wand.flags.n5e.wand;
  const found = actor.items.find(i => i.flags?.n5e?.wandCopy?.wandId === wand.id);
  if ( found ) return found;
  const data = structuredClone(w.jutsu);
  data.system.rank = w.rank;
  data.flags = foundry.utils.mergeObject(data.flags ?? {}, { n5e: { wandCopy: { wandId: wand.id } } });
  return (await actor.createEmbeddedDocuments("Item", [data]))[0];
}

const say = (actor, text) => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="n5e-roll-card"><div class="note">${esc(text)}</div></div>` });

/** Use the wand: cast, overcharge, or destroy it. */
export async function useWand(wand) {
  const actor = wand?.parent;
  if ( !isWand(wand) || !actor?.isOwner ) return ui.notifications.warn("Only the wand's owner can use it.");
  const w = wand.flags.n5e.wand;
  const action = wandAction(w);
  if ( action === "destroy" ) {
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: wand.name },
      content: `<p>${w.broken ? "This wand is broken." : "This wand was already overcharged today."} Overcharging it again destroys it and casts nothing. Go ahead?</p>`, rejectClose: false });
    if ( !ok ) return null;
    await say(actor, `${actor.name} overcharges ${wand.name} again: it is destroyed and nothing is cast.`);
    return wand.delete();
  }
  const copy = await wandCopy(actor, wand);
  const { executeCast } = await import("./cast.mjs");
  // The holder's own numbers, no chakra (the wand pays), within the holder's own limits.
  const message = await executeCast(actor, copy, { scroll: true, wand: true, rank: w.rank });
  if ( !message ) return null;
  if ( action === "cast" ) return wand.update({ "flags.n5e.wand.used": true });
  const roll = await new Roll("1d20").evaluate();
  const holds = overchargeHolds(roll.total);
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${wand.name}: overcharge flat check (DC 10): ${holds ? "it holds" : "it breaks"}` });
  return wand.update(holds ? { "flags.n5e.wand.overcharged": true } : { "flags.n5e.wand.overcharged": true, "flags.n5e.wand.broken": true });
}

/** A Long or Full Rest recharges the actor's wands. */
export async function rechargeWands(actor) {
  const updates = actor.items.filter(i => isWand(i) && (i.flags.n5e.wand.used || i.flags.n5e.wand.overcharged))
    .map(i => ({ _id: i.id, "flags.n5e.wand.used": false, "flags.n5e.wand.overcharged": false }));
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

export function wandContextOptions(itemOf, owner) {
  return [
    { name: "Use wand", icon: "<i class=\"fa-solid fa-wand-magic\"></i>", condition: li => owner() && isWand(itemOf(li)),
      callback: li => useWand(itemOf(li)) },
    { name: "Make a wand", icon: "<i class=\"fa-solid fa-wand-sparkles\"></i>",
      condition: li => game.user.isGM && itemOf(li)?.type === "jutsu" && !itemOf(li).flags?.n5e?.scrollCopy && !itemOf(li).flags?.n5e?.wandCopy && !!scrollDiscipline(itemOf(li).system),
      callback: li => makeWand(itemOf(li)) }
  ];
}
