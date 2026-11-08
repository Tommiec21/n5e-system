/**
 * Public automation actions. Rule data belongs to the owned item/effect, coatings to the weapon,
 * and summoned-token lifetimes to the token. No actor templates or base weapon data are changed.
 * GM-only summons use a world Actor as a stat block; import compendium actors before using them.
 */
import { activeCoatings, coatingData } from "../rules/coatings.mjs";

/** Attach data-driven rules; ordinary users can change only sources they own. */
export async function setRuleElements(source, rules, toggle = null) {
  if ( !source?.isOwner ) throw new Error("You must own the rule source.");
  if ( !Array.isArray(rules) ) throw new Error("Rules must be an array.");
  for ( const r of rules ) {
    if ( !r || !["modifier", "degreeShift"].includes(r.key) || !Number.isFinite(Number(r.value)) ) throw new Error("Invalid rule element.");
  }
  return source.update({ "flags.n5e.rules": rules,
    "flags.n5e.ruleToggle": toggle ? { label: String(toggle.label || source.name), enabled: toggle.enabled !== false } : null });
}

/** Replace a coating with the same id; other active coatings remain independent. */
export async function coatWeapon(weapon, data) {
  if ( !weapon?.isOwner || weapon.type !== "weapon" ) throw new Error("Select an owned weapon.");
  const now = game.time.worldTime;
  const coating = coatingData(data, now);
  return weapon.update({ "flags.n5e.coatings": [...activeCoatings(weapon, now).filter(c => c.id !== coating.id), coating] });
}

/** Explicitly remove one coating without affecting the weapon's original data. */
export async function removeCoating(weapon, id) {
  if ( !weapon?.isOwner ) throw new Error("You must own the weapon.");
  return weapon.update({ "flags.n5e.coatings": activeCoatings(weapon, game.time.worldTime).filter(c => c.id !== id) });
}

/**
 * Place unlinked summon/clone tokens from an authored world Actor template.
 * Explicit coordinates use scene pixels; otherwise place beside a controlled caster token.
 * Rules-specific clone/summon math belongs in the template, not guessed in this generic workflow.
 */
export async function summonTokens(caster, item, { uuid, count = 1, x, y, seconds = 60, concentration = false } = {}) {
  if ( !game.user.isGM ) throw new Error("The GM places summoned creatures from this card.");
  if ( !canvas?.ready || !caster || item?.actor !== caster ) throw new Error("Open a scene and use an owned item.");
  count = Number(count);
  if ( !Number.isInteger(count) || count < 1 || count > 20 ) throw new Error("Summon count must be between 1 and 20.");
  if ( !Number.isFinite(seconds) || seconds <= 0 ) throw new Error("Summon duration must be positive.");
  const template = await fromUuid(uuid);
  if ( template?.documentName !== "Actor" || template.pack || template.isToken ) throw new Error("Choose a world Actor as the summon template; import compendium actors first.");
  const origin = canvas.tokens.controlled.find(t => t.actor?.uuid === caster.uuid)
    ?? canvas.tokens.placeables.find(t => t.actor?.uuid === caster.uuid);
  if ( (!Number.isFinite(x) || !Number.isFinite(y)) && !origin ) throw new Error("Select the caster's token or provide placement coordinates.");
  const size = canvas.dimensions.size;
  const data = [];
  for ( let i = 0; i < count; i++ ) {
    const token = await template.getTokenDocument({ actorLink: false,
      x: (x ?? origin.document.x + origin.document.width * size) + i * size * (template.prototypeToken?.width ?? 1),
      y: y ?? origin.document.y });
    const source = token.toObject();
    delete source._id;
    source.flags ??= {};
    source.flags.n5e = { ...source.flags.n5e, summon: { casterUuid: caster.uuid, itemId: item.id,
      itemUuid: item.uuid, concentration, expires: game.time.worldTime + seconds } };
    data.push(source);
  }
  const tokens = await canvas.scene.createEmbeddedDocuments("Token", data);
  Hooks.callAll("n5e.summoned", caster, item, tokens);
  return tokens;
}

/** Remove only flagged summon tokens for this caster/item, across all scenes. Templates stay intact. */
export async function dismissSummons(caster, itemId = null) {
  if ( !game.user.isGM ) throw new Error("The GM dismisses summoned creatures.");
  for ( const scene of game.scenes ) {
    const ids = scene.tokens.filter(t => t.flags?.n5e?.summon?.casterUuid === caster.uuid
      && (!itemId || t.flags.n5e.summon.itemId === itemId)).map(t => t.id);
    if ( ids.length ) await scene.deleteEmbeddedDocuments("Token", ids);
  }
}

/** Cleanup uses the active GM only, including elapsed time while no combat is running. */
export async function cleanupSummons() {
  if ( !game.users.activeGM?.isSelf ) return;
  for ( const scene of game.scenes ) {
    const ids = [];
    for ( const token of scene.tokens ) {
      const s = token.flags?.n5e?.summon;
      if ( !s ) continue;
      const caster = s.concentration ? await fromUuid(s.casterUuid) : null;
      if ( s.expires <= game.time.worldTime || (s.concentration && (!caster || !(caster.system?.combat?.concentrating ?? []).includes(s.itemId))) ) ids.push(token.id);
    }
    if ( ids.length ) await scene.deleteEmbeddedDocuments("Token", ids);
  }
}

/** Hook registration is explicit and happens once from the system entry point. */
export function registerAutomationHooks() {
  Hooks.on("updateWorldTime", cleanupSummons);
  Hooks.on("updateActor", (actor, changes) => {
    if ( foundry.utils.hasProperty(changes, "system.combat.concentrating") ) return cleanupSummons();
  });
  Hooks.once("ready", cleanupSummons);
}
