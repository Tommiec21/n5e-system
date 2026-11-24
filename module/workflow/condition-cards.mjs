/**
 * Condition cards, Foundry side (CCOND1; docs/CCOND1_SPEC.md). Rules: rules/condition-cards.mjs.
 *
 *   - Start-up: every card in the "Class & Clan Conditions" compendium and every world condition item
 *     registers into CONFIG.N5E.clanConditions (and the GM's token status list).
 *   - Applying: drag a card onto a token or a sheet, its Apply button on a Features tab, or
 *     game.n5e.api.applyConditionCard. Any player or the GM may apply it (King Q-CC2; a warning
 *     when the applier has no matching class or clan). On a creature the user doesn't own it goes
 *     through the GM's client as an owner intent, with no approval step (King Q-CC4).
 *   - It ends when its applier dies or leaves the combat (King Q-CC5): the active GM removes it.
 *   - AMP1e: lvl() in its changes is read from the applier's character level (King Q-E5); a card with
 *     a choice (Diplomatic Coordinated) asks the bearer's owners to pick one in chat.
 */
import { cardDefinition, cardKey, ownsCondition, cardResave, appliedBy, resolveCardLevels } from "../rules/condition-cards.mjs";
import { effectFormulaData } from "../rules/effect-services.mjs";
import { canModify } from "../automation/authority.mjs";
import { registerIntentHandler, submitIntent } from "../automation/owner-intents.mjs";
import { gmWhisper } from "./npc-privacy.mjs";
import { esc } from "../view-models/common.mjs";

export const CONDITION_PACK = "n5e.conditions";
const registry = () => CONFIG.N5E.clanConditions;

/** Register one card (or re-register an edited one). Returns its key. */
export function registerCard(card) {
  const key = cardKey(card);
  if ( !key ) return null;
  const def = cardDefinition(card);
  registry()[key] = def;
  // The GM's token HUD lists them; players apply them by card so the HUD can't skip the owner warning.
  const status = CONFIG.statusEffects.find(s => s.id === key);
  if ( status ) Object.assign(status, { name: def.label, img: def.icon });
  else if ( game.user?.isGM ) CONFIG.statusEffects.push({ id: key, name: def.label, img: def.icon });
  return key;
}

/** Ready hook: register every card from the compendium and the world. */
export async function loadConditionCards() {
  const pack = game.packs.get(CONDITION_PACK);
  const cards = [...(pack ? await pack.getDocuments() : []), ...game.items.filter(i => i.type === "condition")];
  for ( const card of cards ) registerCard(card);
  Hooks.callAll("n5e.registryChanged", "clanConditions", null, null);
  return cards.length;
}

/** The registry key for a card's uuid (drops carry the uuid). */
export function keyForCard(uuid) {
  return Object.entries(registry()).find(([, def]) => def.card === uuid)?.[0] ?? null;
}

/** Who applies a card: the given actor, else the selected token's, else the user's character. */
export function applierFor(actor = null) {
  return actor ?? canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
}

/**
 * Put a card's condition on a creature.
 * @param {Actor} target
 * @param {string} key          registry key
 * @param {object} [o]
 * @param {Actor|null} [o.applier]
 * @param {number} [o.ranks=1]
 */
export async function applyConditionCard(target, key, { applier = null, ranks = 1 } = {}) {
  const def = registry()[key];
  if ( !def ) throw new Error(`Unknown condition: ${key}`);
  if ( !target ) throw new Error("Drop the card on a creature.");
  if ( applier && !ownsCondition(applier, def) ) {
    ui.notifications.warn(`${applier.name} has no ${def.owner.kind} that grants ${def.label}; applied anyway.`);
  }
  if ( canModify(game.user, target) ) return placeCondition(target, key, { applier, ranks });
  if ( !applier || !canModify(game.user, applier) ) throw new Error("Select a token you own (or assign your character) to apply this.");
  return submitIntent(applier, "applyCondition", { key, targetUuid: target.uuid, ranks });
}

/** Create or refresh the condition (the new duration wins; King Q-CC3), with who applied it. */
export async function placeCondition(target, key, { applier = null, ranks = 1 } = {}) {
  const def = registry()[key];
  const resave = cardResave(def, applier);
  const now = game.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null;
  const levels = resolveCardLevels(def, applier ? effectFormulaData(applier).level : null);
  const effect = await target.addCondition(key, ranks, { manual: true, origin: def.card ?? undefined, changes: levels.changes,
    flags: { appliedBy: applier?.uuid ?? null, ...(resave ? { resave: { ...resave, applied: now } } : {}) } });
  if ( !effect ) return null;
  if ( levels.choose && effect.documentName === "ActiveEffect" ) await postChoice(target, effect, levels.choose);
  const ChatMessage = CONFIG.ChatMessage.documentClass;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: applier ?? undefined }), ...gmWhisper(target, "hideNpcConditions"),
    content: `<div class="n5e-roll-card"><b>${esc(applier?.name ?? game.user.name)}</b> applies <b>${esc(def.label)}</b> to ${esc(target.name)}.</div>` });
  return { applied: target.name, key };
}

/**
 * AMP1e: a card with a choice: the bearer's owners (and the GM) pick one option in chat; it is added
 * to the condition's changes.
 */
async function postChoice(target, effect, choose) {
  const ChatMessage = CONFIG.ChatMessage.documentClass;
  const owners = game.users.filter(u => u.isGM || target.testUserPermission(u, "OWNER")).map(u => u.id);
  const buttons = choose.options.map((o, i) => `<button type="button" data-n5e-cond-choose="${i}">${esc(o.label)}</button>`).join("");
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: target }), whisper: owners,
    content: `<div class="n5e-roll-card"><b>${esc(target.name)}</b>: ${esc(choose.prompt)}<div class="card-buttons">${buttons}</div></div>`,
    flags: { n5e: { conditionChoice: { effectUuid: effect.uuid, options: choose.options } } } });
}

/** A choice button: add the picked change to the condition (once). */
async function choose(message, index) {
  const data = message.flags?.n5e?.conditionChoice;
  const option = data?.options?.[index];
  const effect = data?.effectUuid ? await fromUuid(data.effectUuid) : null;
  if ( !option || !effect ) throw new Error("That condition has ended.");
  if ( effect.flags?.n5e?.chosen != null ) throw new Error(`Already chosen: ${data.options[effect.flags.n5e.chosen]?.label ?? ""}.`);
  if ( !canModify(game.user, effect.parent) ) throw new Error("Only the creature's owner or the GM can choose.");
  await effect.update({ changes: [...effect.changes, { key: option.key, value: option.value, mode: option.mode ?? 2 }], "flags.n5e.chosen": index });
  const ChatMessage = CONFIG.ChatMessage.documentClass;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: effect.parent }), whisper: message.whisper,
    content: `<div class="n5e-turn-card"><b>${esc(effect.parent.name)}</b>: ${esc(effect.name)}, ${esc(option.label)}.</div>` });
}

/** King Q-CC5: remove every card condition this applier put on anyone (active GM only). */
export async function endConditionsOf(applierUuid) {
  if ( !applierUuid || !game.users.activeGM?.isSelf ) return 0;
  const actors = new Set(game.actors);
  for ( const scene of game.scenes ) for ( const t of scene.tokens ) if ( t.actor && !t.actorLink ) actors.add(t.actor);
  let n = 0;
  for ( const actor of actors ) {
    for ( const { effect } of appliedBy(actor, applierUuid) ) { await effect.delete(); n++; }
  }
  return n;
}

/** Hooks: drops on the canvas, the GM's intent handler, cards edited in the world, Q-CC5 endings. */
export function registerConditionCards() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    if ( !message.flags?.n5e?.conditionChoice ) return;
    for ( const button of html.querySelectorAll("[data-n5e-cond-choose]") ) {
      button.addEventListener("click", () => choose(message, Number(button.dataset.n5eCondChoose)).catch(e => ui.notifications.warn(e.message)));
    }
  });
  Hooks.on("dropCanvasData", (cnv, data) => {
    if ( data?.type !== "Item" || !data.uuid ) return undefined;
    const key = keyForCard(data.uuid) ?? (globalThis.fromUuidSync?.(data.uuid)?.type === "condition" ? cardKey(fromUuidSync(data.uuid)) : null);
    if ( !key ) return undefined;
    const token = cnv.tokens.placeables.filter(t => t.actor && t.bounds.contains(data.x, data.y))
      .sort((a, b) => b.document.sort - a.document.sort)[0];
    if ( !token ) return undefined;
    void applyConditionCard(token.actor, key, { applier: applierFor() }).catch(e => ui.notifications.warn(e.message));
    return false;
  });
  // STD6f F-D3: an effect activity's conditions and states with no save, on a creature the user doesn't own.
  registerIntentHandler("inflictConditions", async (actor, data) => {
    const doc = await fromUuid(data.targetUuid);
    const target = doc?.actor ?? doc;
    if ( !(target instanceof Actor) ) throw new Error("That creature no longer exists.");
    const { inflictOn } = await import("./trackers.mjs");
    return inflictOn(target, data.inflicts);
  });
  registerIntentHandler("applyCondition", async (actor, data) => {
    const doc = await fromUuid(data.targetUuid);
    const target = doc?.actor ?? doc;
    if ( !(target instanceof Actor) ) throw new Error("That creature no longer exists.");
    return placeCondition(target, data.key, { applier: actor, ranks: data.ranks });
  });
  for ( const hook of ["createItem", "updateItem"] ) {
    Hooks.on(hook, item => { if ( item.type === "condition" && !item.parent ) registerCard(item); });
  }
  const gm = () => game.users.activeGM?.isSelf;
  // Dies: the Dead status, or an NPC at 0 HP.
  Hooks.on("createActiveEffect", effect => {
    if ( gm() && effect.parent instanceof Actor && effect.statuses?.has?.("dead") ) void endConditionsOf(effect.parent.uuid);
  });
  Hooks.on("updateActor", (actor, change) => {
    const hp = change?.system?.hp?.value;
    if ( gm() && hp != null && hp <= 0 && actor.type !== "character" ) void endConditionsOf(actor.uuid);
  });
  // Leaves the fight: its combatant is removed, or the combat ends.
  Hooks.on("deleteCombatant", c => { if ( gm() && c.actor ) void endConditionsOf(c.actor.uuid); });
  Hooks.on("deleteCombat", combat => {
    if ( !gm() ) return;
    for ( const c of combat.combatants ) if ( c.actor ) void endConditionsOf(c.actor.uuid);
  });
}
