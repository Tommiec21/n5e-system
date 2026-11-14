/**
 * Item chat cards (dnd5e-style card with PF2e trait chips). Features and consumables show what was
 * spent and buttons for their rollable parts (attack, damage, save, healing) read from their text.
 * Jutsu use the cast card (workflow/cast.mjs); weapons the attack card (workflow/attack.mjs).
 */
import { unarmedSpec } from "../rules/unarmed.mjs";
import { glyph, keywordChip, componentChips, propertyChips, signed } from "../view-models/common.mjs";

export const CARD_TEMPLATE = "systems/n5e/templates/chat/item-card.hbs";

/**
 * Pure: card data for an item (exported for tests). Builds what templates/chat/item-card.hbs prints:
 * name, image, glyph (action type), subtitle, chips (keywords, components, properties), stats rows
 * (cost, DC, damage...), extra text blocks, and the description.
 * @param {Item} item
 * @param {{rank?: string}} [o]  for jutsu: show the cost at this cast rank
 */
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
    data.subtitle = `${N5E.ranks?.[castRank]?.label ?? castRank} ${N5E.disciplines?.[s.group ?? s.discipline]?.label ?? ""}`
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

/**
 * Post an item's card to chat, with its activity buttons when the item is owned (the buttons need the
 * owner's DCs and bonuses). The message flags (itemUuid, actorUuid) let button clicks find the source.
 * @param {Item} item
 * @param {{rank?: string, spent?: string}} [options]  spent: "1 Superiority Dice (rolled 6)" stat row
 */
export async function postItemCard(item, options = {}) {
  const data = itemCardData(item, options);
  if ( options.spent ) data.stats.unshift({ label: "Spent", value: options.spent });
  if ( item.actor ) {
    const { effectiveActivities } = await import("../rules/activity-parse.mjs");
    const { activityButtons } = await import("../workflow/activity-buttons.mjs");
    const acts = effectiveActivities(item);
    data.acts = acts.length ? activityButtons(item.actor, item, acts) : "";
  }
  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, data);
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({
    speaker: ChatMessageCls.getSpeaker({ actor: item.actor }),
    content,
    flags: { n5e: { itemUuid: item.uuid, rank: options.rank ?? null, actorUuid: item.actor?.uuid ?? null } }
  });
}

/**
 * Pure: card data for a core combat action or a skill action (no item behind it).
 * @param {"core"|"skill"} kind
 * @param {string} key
 * @param {object} [actor]
 */
export function actionCardData(kind, key, actor) {
  const N5E = globalThis.CONFIG?.N5E ?? {};
  const unarmed = key === "unarmed";
  const def = kind === "skill" ? N5E.skillActions?.[key] : (unarmed ? null : N5E.coreActions?.[key]);
  if ( !def && !unarmed ) return null;
  const activation = unarmed ? "action" : def.activation;
  const g = glyph(activation === "move" ? "free" : activation);
  const data = { name: unarmed ? "Unarmed Strike" : def.label, img: "icons/svg/combat.svg", type: kind,
    glyph: g?.svg ?? "", glyphLabel: g?.label ?? "", subtitle: "", chips: [], stats: [], blocks: [], description: "" };
  if ( unarmed ) {
    const u = actor ? unarmedSpec(actor) : { formula: "1", type: "bludgeoning" };
    data.subtitle = "Attack · always proficient";
    data.stats.push({ label: "Damage", value: `${u.formula} ${u.type}` });
  } else if ( kind === "skill" ) {
    const skill = N5E.skills?.[def.skill]?.label ?? def.skill;
    data.subtitle = `${skill} · ${N5E.skillActionTiers?.[def.tier]?.label ?? def.tier} skill action`;
    data.stats.push({ label: "Roll", value: def.roll ?? "" });
    data.description = `<p>${def.text ?? ""}</p>`;
  } else {
    data.subtitle = "Combat action";
    data.description = `<p>${def.text}</p>`;
  }
  if ( g ) data.stats.push({ label: "Time", value: g.label });
  return data;
}

/** Post a core or skill action's card to chat. */
export async function postActionCard(actor, kind, key) {
  const data = actionCardData(kind, key, actor);
  if ( !data ) return null;
  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, data);
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }), content,
    flags: { n5e: { action: `${kind}.${key}` } } });
}
