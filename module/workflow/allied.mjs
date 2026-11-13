/**
 * Allied NPCs (King 2026-11-13): summons, clones and companions from jutsu or class features.
 * Players add them to the world and own and control them; they are the one exception to
 * dnd5e/PF2e parity. Tokens are unlinked copies of a world Actor template. The summoner gets
 * OWNER on the token's actor delta and nothing else.
 *
 * Players place them through an owner intent (the GM's client creates the tokens with no dialog);
 * the GM places them directly. Lifetimes (duration, concentration, dismissal) are unchanged.
 */
import { rule } from "../rules-settings.mjs";
import { canModify } from "../automation/authority.mjs";
import { registerIntentHandler, submitIntent } from "../automation/owner-intents.mjs";

/** GM, or the world allows players to summon Allied NPCs (dnd5e allowSummoning equivalent). */
export function canSummonAllied(user) {
  return !!user?.isGM || !!rule("alliedSummoning");
}

/**
 * Token data for Allied NPCs (pure; tested in Node). `base` is the template's token source.
 * @returns {object[]} token sources ready for createEmbeddedDocuments
 */
export function alliedTokenData(base, { count, positions, ownerId, casterUuid, itemId, itemUuid, concentration, expires }) {
  const out = [];
  for ( let i = 0; i < count; i++ ) {
    const source = structuredClone(base);
    delete source._id;
    source.actorLink = false;
    Object.assign(source, positions[i] ?? positions[positions.length - 1] ?? {});
    source.disposition = 1; // friendly
    source.delta ??= {};
    source.delta.ownership = { ...(source.delta.ownership ?? {}), [ownerId]: 3 };
    source.delta.system = { ...(source.delta.system ?? {}), allied: true };
    source.flags ??= {};
    source.flags.n5e = { ...source.flags.n5e,
      summon: { casterUuid, itemId, itemUuid, concentration: !!concentration, expires },
      allied: { ownerId, casterUuid, itemId } };
    out.push(source);
  }
  return out;
}

/** Grid positions in a row beside the origin (pure). */
export function rowPositions({ x, y, width = 1, size, count }) {
  return Array.from({ length: count }, (_, i) => ({ x: x + i * size * width, y }));
}

/**
 * GM side: create the tokens, give the summoner ownership, add them to combat beside the caster.
 * @returns {Promise<string[]>} created token uuids
 */
export async function placeAllied({ caster, item, templateUuid, count = 1, x = null, y = null, sceneId = null,
  seconds = 60, concentration = false, ownerId, initiative = "match" }) {
  if ( !game.user.isGM ) throw new Error("Only the GM's client places tokens for another user.");
  const scene = (sceneId && game.scenes.get(sceneId)) || canvas?.scene;
  if ( !scene || !caster || item?.actor?.uuid !== caster.uuid ) throw new Error("Open a scene and use an item the caster owns.");
  const template = await fromUuid(templateUuid);
  if ( template?.documentName !== "Actor" || template.pack || template.isToken ) throw new Error("Choose a world Actor as the summon template; import compendium actors first.");
  const origin = scene.tokens.find(t => t.actor?.uuid === caster.uuid);
  if ( (!Number.isFinite(x) || !Number.isFinite(y)) && !origin ) throw new Error("Place the caster's token on the scene or give placement coordinates.");
  const size = scene.grid?.size ?? canvas.dimensions.size;
  const base = (await template.getTokenDocument({ actorLink: false })).toObject();
  const positions = rowPositions({ x: Number.isFinite(x) ? x : origin.x + origin.width * size,
    y: Number.isFinite(y) ? y : origin.y, width: template.prototypeToken?.width ?? 1, size, count });
  const data = alliedTokenData(base, { count, positions, ownerId, casterUuid: caster.uuid, itemId: item.id, itemUuid: item.uuid,
    concentration, expires: game.time.worldTime + seconds });
  const tokens = await scene.createEmbeddedDocuments("Token", data);
  await addAlliedCombatants(caster, tokens, initiative);
  Hooks.callAll("n5e.summoned", caster, item, tokens);
  return tokens.map(t => t.uuid);
}

/** If the caster is in combat, add the summons (dnd5e summons can match the caster's initiative). */
async function addAlliedCombatants(caster, tokens, mode) {
  const combat = game.combats?.find(c => c.combatants.some(cb => cb.actor?.uuid === caster.uuid));
  if ( !combat || mode === "none" ) return;
  const casterInit = combat.combatants.find(cb => cb.actor?.uuid === caster.uuid)?.initiative ?? null;
  const created = await combat.createEmbeddedDocuments("Combatant", tokens.map(t => ({
    tokenId: t.id, sceneId: t.parent.id, actorId: t.actorId, initiative: mode === "match" ? casterInit : null })));
  if ( mode === "roll" && created.length ) await combat.rollInitiative(created.map(c => c.id));
}

/**
 * Card entry point. The GM places directly; a player asks the GM's client through an owner intent.
 * @returns {Promise<string[]>} token uuids
 */
export async function summonAllied(caster, item, { uuid, count = 1, x, y, seconds = 60, concentration = false, initiative = "match" } = {}) {
  if ( !canModify(game.user, caster) ) throw new Error("You must own the summoner.");
  if ( !canSummonAllied(game.user) ) throw new Error("The GM has turned off player summoning.");
  const request = { itemId: item?.id, templateUuid: uuid, count, seconds, concentration, x, y, initiative, sceneId: canvas?.scene?.id };
  if ( game.user.isGM ) return placeAllied({ caster, item, templateUuid: uuid, count, x, y, sceneId: request.sceneId,
    seconds, concentration, initiative, ownerId: game.user.id });
  return submitIntent(caster, "summonAllied", request);
}

/** Remove only this caster's Allied NPCs (for one item, or all), across scenes, with their combatants. */
export async function removeAllied(caster, itemId = null) {
  if ( !game.user.isGM ) throw new Error("Only the GM's client removes tokens for another user.");
  for ( const scene of game.scenes ) {
    const ids = scene.tokens.filter(t => t.flags?.n5e?.summon?.casterUuid === caster.uuid
      && (!itemId || t.flags.n5e.summon.itemId === itemId)).map(t => t.id);
    if ( ids.length ) await deleteSummonTokens(scene, ids);
  }
}

/** Card/sheet entry point for dismissal. */
export async function dismissAllied(caster, itemId = null) {
  if ( !canModify(game.user, caster) ) throw new Error("You must own the summoner.");
  if ( game.user.isGM ) return removeAllied(caster, itemId);
  return submitIntent(caster, "dismissAllied", { itemId });
}

/** Delete summon tokens and any combatants that point at them. */
export async function deleteSummonTokens(scene, ids) {
  for ( const combat of game.combats ?? [] ) {
    const gone = combat.combatants.filter(c => c.sceneId === scene.id && ids.includes(c.tokenId)).map(c => c.id);
    if ( gone.length ) await combat.deleteEmbeddedDocuments("Combatant", gone);
  }
  await scene.deleteEmbeddedDocuments("Token", ids);
}

/** GM-side intent handlers. The verified requesting user becomes the owner. */
export function registerAlliedIntents() {
  registerIntentHandler("summonAllied", async (caster, data, user) => {
    if ( !canSummonAllied(user) ) throw new Error("The GM has turned off player summoning.");
    const item = caster.items.get(data.itemId);
    if ( !item ) throw new Error("The summoning item is not on this actor.");
    return placeAllied({ caster, item, templateUuid: data.templateUuid, count: data.count, x: data.x, y: data.y,
      sceneId: data.sceneId, seconds: data.seconds, concentration: data.concentration, initiative: data.initiative, ownerId: user.id });
  });
  registerIntentHandler("dismissAllied", async (caster, data) => removeAllied(caster, data.itemId).then(() => true));
}
