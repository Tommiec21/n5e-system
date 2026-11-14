/**
 * Public automation actions. Rule data belongs to the owned item/effect, coatings to the weapon,
 * and summoned-token lifetimes to the token. No actor templates or base weapon data are changed.
 * Summons use a world Actor as a stat block; import compendium actors before using them.
 */
import { activeCoatings, coatingData } from "../rules/coatings.mjs";
import { summonAllied, dismissAllied, deleteSummonTokens } from "./allied.mjs";

/** Attach data-driven rules; ordinary users can change only sources they own. */
export async function setRuleElements(source, rules, toggle = null) {
  if ( !source?.isOwner ) throw new Error("You must own the rule source.");
  if ( !Array.isArray(rules) ) throw new Error("Rules must be an array.");
  for ( const r of rules ) {
    if ( !r || !(["advantage", "disadvantage"].includes(r.key) || (["modifier", "degreeShift"].includes(r.key) && Number.isFinite(Number(r.value)))) ) throw new Error("Invalid rule element.");
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
 * Summons are Allied NPCs (King 2026-11-13): the summoning player owns and controls them.
 * Kept under the old API names; see workflow/allied.mjs.
 */
export async function summonTokens(caster, item, options = {}) {
  return summonAllied(caster, item, options);
}

/** Remove only flagged summon tokens for this caster/item, across all scenes. Templates stay intact. */
export async function dismissSummons(caster, itemId = null) {
  return dismissAllied(caster, itemId);
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
    if ( ids.length ) await deleteSummonTokens(scene, ids);
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
