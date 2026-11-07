/**
 * Item chat cards (dnd5e-style card with PF2e trait chips). Phase 2 posts text and live numbers only;
 * rolls and spending arrive with Phase 3.
 */
import { glyph, keywordChip, componentChips, propertyChips, signed } from "../view-models/common.mjs";

export const CARD_TEMPLATE = "systems/n5e/templates/chat/item-card.hbs";

/** Pure: card data for an item (exported for tests). */
export function itemCardData(item, { rank } = {}) {
  const s = item.system;
  const actorSys = item.actor?.system;
  const N5E = globalThis.CONFIG?.N5E ?? {};
  const g = glyph(s.activation);
  const data = {
    name: item.name, img: item.img, type: item.type,
    glyph: g?.svg ?? "", glyphLabel: g?.label ?? "",
    subtitle: "", chips: [], stats: [], blocks: [], description: s.description ?? ""
  };
  if ( item.type === "jutsu" ) {
    const castRank = rank && s.live?.upcastRanks?.includes(rank) ? rank : s.rank;
    const cost = typeof s.computeCost === "function" && actorSys ? s.computeCost(actorSys, castRank).cost : s.cost.value;
    const types = new Set((s.activities ?? []).map(a => a.type));
    data.subtitle = `${N5E.ranks?.[castRank]?.label ?? castRank} ${N5E.disciplines?.[s.discipline]?.label ?? ""}`
      + (castRank !== s.rank ? ` (upcast from ${s.rank})` : "");
    data.chips = [...[...s.keywords].map(k => keywordChip(k)), ...componentChips(s.components)];
    data.stats.push({ label: "Cost", value: s.cost.mode === "none" ? "None" : `${cost} CP` });
    if ( types.has("attack") && s.live ) data.stats.push({ label: "Attack", value: signed(s.live.attack) });
    if ( types.has("save") && s.live ) data.stats.push({ label: "Save DC", value: String(s.live.dc) });
    if ( g ) data.stats.push({ label: "Time", value: g.label });
    for ( const n of [1, 2, 3] ) if ( s.chainEffects?.[n] ) data.blocks.push({ label: `Chain ${n}`, html: s.chainEffects[n] });
    if ( s.finisher?.text ) data.blocks.push({ label: "Finisher", html: s.finisher.text });
    if ( s.overcharge?.text ) data.blocks.push({ label: "Overcharge", html: s.overcharge.text });
    if ( s.upcast?.text ) data.blocks.push({ label: "At higher ranks", html: s.upcast.text });
  } else if ( item.type === "weapon" ) {
    data.subtitle = `${s.category} ${s.weaponType} weapon`;
    data.chips = propertyChips(s.properties, "weapon");
    data.stats.push({ label: "Damage", value: `${s.damage.die} ${[...s.damage.types].join("/")}` });
  } else if ( item.type === "armor" ) {
    data.subtitle = `${s.category} armor`;
    data.chips = propertyChips(s.properties, "armor");
    data.stats.push({ label: "AC", value: `+${s.armor.value}` });
  } else {
    data.subtitle = globalThis.game?.i18n?.localize?.(`TYPES.Item.${item.type}`) ?? item.type;
  }
  return data;
}

/** Post an item's card to chat. */
export async function postItemCard(item, options = {}) {
  const data = itemCardData(item, options);
  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, data);
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({
    speaker: ChatMessageCls.getSpeaker({ actor: item.actor }),
    content,
    flags: { n5e: { itemUuid: item.uuid, rank: options.rank ?? null } }
  });
}
