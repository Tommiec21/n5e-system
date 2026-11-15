/**
 * Jutsu scrolls (PRESTD1 Part B; King 2026-11-15, Q-P3, Q-P4, Q-P11). Rules: rules/scrolls.mjs.
 *
 *   Make      the GM makes a scroll of a Ninjutsu or Genjutsu at a rank (right-click a jutsu, or the
 *             API); identified or not. The scroll is a consumable (subtype scroll) holding the jutsu.
 *   Cast      anyone holding it: the Cast Ninjutsu / Genjutsu Scroll check against the rank's identify
 *             DC, within the skill tier's ranks. Success: the jutsu resolves with the scroll's attack
 *             and save DC, no chakra, and the scroll is used up. Failure: nothing happens; the scroll
 *             is kept.
 *   Identify  the matching skill only, against the identify DC; success shows its jutsu.
 * The jutsu is cast through a hidden copy on the caster (flags.n5e.scrollCopy), so the cast card's
 * buttons work as for any jutsu. Copies stay off the Jutsu tab.
 */
import { scrollDiscipline, scrollSkill, scrollNumbers, skillTier, tierAllows, tierMaxRank, scrollName } from "../rules/scrolls.mjs";
import { rankOrder } from "../config/core.mjs";
import { esc } from "../view-models/common.mjs";

const isScroll = item => item?.type === "consumable" && item.system?.subtype === "scroll" && !!item.flags?.n5e?.scroll?.jutsu;
export { isScroll };

/** Item data for a scroll of this jutsu. */
export function scrollData(jutsu, { rank = null, identified = true } = {}) {
  const data = jutsu.toObject ? jutsu.toObject() : structuredClone(jutsu);
  const discipline = scrollDiscipline(data.system);
  if ( !discipline ) throw new Error("Only Ninjutsu and Genjutsu can be put on a scroll.");
  const at = rankOrder.includes(rank) ? rank : data.system.rank;
  delete data._id;
  delete data.folder;
  delete data.sort;
  return {
    name: scrollName({ identified, jutsuName: data.name, rank: at }), type: "consumable", img: "icons/sundries/scrolls/scroll-bound-red.webp",
    system: { subtype: "scroll", quantity: 1, rank: at, description: identified ? data.system.description ?? "" : "<p>A sealed jutsu scroll.</p>" },
    flags: { n5e: { scroll: { jutsu: data, rank: at, discipline, identified } } }
  };
}

/** GM: make a scroll and put it on an actor (or in the world). */
export async function makeScroll(jutsu, { rank = null, identified = true, actor = null } = {}) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM makes scrolls.");
  const data = scrollData(jutsu, { rank, identified });
  const target = actor ?? jutsu.parent;
  if ( target?.documentName === "Actor" ) return (await target.createEmbeddedDocuments("Item", [data]))[0];
  return CONFIG.Item.documentClass.create(data);
}

/** GM dialog for Make scroll: rank and identified. */
export async function promptMakeScroll(jutsu) {
  if ( !scrollDiscipline(jutsu.system) ) return ui.notifications.warn("Only Ninjutsu and Genjutsu can be put on a scroll.");
  const ranks = rankOrder.filter(r => r !== "E" || jutsu.system.rank === "E");
  const picked = await foundry.applications.api.DialogV2.prompt({ window: { title: `Make a scroll: ${jutsu.name}` },
    content: `<label>Rank <select name="rank">${ranks.map(r => `<option value="${r}" ${r === jutsu.system.rank ? "selected" : ""}>${r}-Rank</option>`).join("")}</select></label>
      <label class="check"><input type="checkbox" name="identified" checked> Identified</label>`,
    ok: { label: "Make scroll", callback: (event, button) => ({ rank: button.form.elements.rank.value, identified: button.form.elements.identified.checked }) },
    rejectClose: false });
  return picked ? makeScroll(jutsu, picked) : null;
}

/** The caster's skill tier for a scroll's skill. */
function tierOf(actor, skill) {
  const s = actor.system?.skills?.[skill] ?? {};
  return skillTier({ proficient: !!s.isProficient, mastery: Number(s.mastery) || 0 });
}

async function rollScrollCheck(actor, skill, label, dc) {
  const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
  let outcome = null;
  await rollWithSpec(actor, { ...rollSpec(actor, "skill", skill), label }, { dc, onResult: r => { outcome = r; } });
  return outcome;
}

/** The hidden jutsu copy a scroll casts through (one per scroll item). */
async function scrollCopy(actor, scroll) {
  const s = scroll.flags.n5e.scroll;
  const found = actor.items.find(i => i.flags?.n5e?.scrollCopy?.scrollId === scroll.id);
  const numbers = scrollNumbers(s.rank);
  if ( found ) return found;
  const data = structuredClone(s.jutsu);
  data.system.rank = s.rank;
  data.flags = foundry.utils.mergeObject(data.flags ?? {}, { n5e: { scrollCopy: { scrollId: scroll.id, numbers: { attack: numbers.attack, dc: numbers.dc } } } });
  return (await actor.createEmbeddedDocuments("Item", [data]))[0];
}

/** Use one scroll (delete at 0). */
async function useUp(scroll) {
  const q = Number(scroll.system.quantity ?? 1);
  if ( q > 1 ) return scroll.update({ "system.quantity": q - 1 });
  return scroll.delete();
}

/** Cast from a scroll. */
export async function castFromScroll(scroll) {
  const actor = scroll?.parent;
  if ( !isScroll(scroll) || !actor?.isOwner ) return ui.notifications.warn("Only the scroll's owner can cast from it.");
  const s = scroll.flags.n5e.scroll;
  const skill = scrollSkill(s.discipline);
  const tier = tierOf(actor, skill);
  if ( !tierAllows(tier, s.rank) ) {
    return ui.notifications.warn(`${s.rank}-Rank needs ${s.rank === "S" || s.rank === "A" ? "Mastery" : "proficiency"} in ${CONFIG.N5E.skills[skill]?.label ?? skill} (you can cast up to ${tierMaxRank(tier)}-Rank).`);
  }
  const numbers = scrollNumbers(s.rank);
  const label = s.discipline === "gen" ? "Cast Genjutsu Scroll" : "Cast Ninjutsu Scroll";
  const result = await rollScrollCheck(actor, skill, label, numbers.castDC);
  if ( !result ) return null;
  if ( !result.success ) {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="n5e-roll-card"><div class="note">${esc(actor.name)} fails to cast the scroll. Nothing happens; the scroll is kept.</div></div>` });
    return null;
  }
  const copy = await scrollCopy(actor, scroll);
  const { executeCast } = await import("./cast.mjs");
  const message = await executeCast(actor, copy, { scroll: true, rank: s.rank, discipline: s.discipline });
  if ( message ) await useUp(scroll);
  return message;
}

/** Identify a scroll with the matching skill (Q-P4). */
export async function identifyScroll(scroll) {
  const actor = scroll?.parent;
  if ( !isScroll(scroll) || !actor?.isOwner ) return ui.notifications.warn("Only the scroll's owner can identify it.");
  const s = scroll.flags.n5e.scroll;
  if ( s.identified ) return ui.notifications.info("This scroll is already identified.");
  const skill = scrollSkill(s.discipline);
  const result = await rollScrollCheck(actor, skill, `Identify scroll (${CONFIG.N5E.skills[skill]?.label ?? skill})`, scrollNumbers(s.rank).identify);
  if ( !result?.success ) return null;
  return scroll.update({ name: scrollName({ identified: true, jutsuName: s.jutsu.name, rank: s.rank }), "system.description": s.jutsu.system?.description ?? "",
    "flags.n5e.scroll.identified": true });
}

/** Context menu entries for scrolls and jutsu (appended by the actor sheets). */
export function scrollContextOptions(itemOf, owner) {
  return [
    { name: "Cast from scroll", icon: "<i class=\"fa-solid fa-scroll\"></i>", condition: li => owner() && isScroll(itemOf(li)),
      callback: li => castFromScroll(itemOf(li)) },
    { name: "Identify scroll", icon: "<i class=\"fa-solid fa-magnifying-glass\"></i>",
      condition: li => owner() && isScroll(itemOf(li)) && !itemOf(li).flags.n5e.scroll.identified, callback: li => identifyScroll(itemOf(li)) },
    { name: "Make a scroll", icon: "<i class=\"fa-solid fa-feather\"></i>",
      condition: li => game.user.isGM && itemOf(li)?.type === "jutsu" && !itemOf(li).flags?.n5e?.scrollCopy && !!scrollDiscipline(itemOf(li).system),
      callback: li => promptMakeScroll(itemOf(li)) }
  ];
}
