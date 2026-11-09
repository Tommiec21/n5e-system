import { setRuleElements, coatWeapon, removeCoating, summonTokens, dismissSummons } from "./workflow/automation.mjs";
import { requestHistory, archiveRequestHistory } from "./automation/history.mjs";
import { openReactionWindow, resolveReactionWindow } from "./workflow/reactions.mjs";

/** Optional integration check, loaded lazily so normal system startup does not load test UI. */
export async function runSmokeTests() {
  return (await import("./testing/smoke.mjs")).runSmokeTests();
}

/**
 * Public API at game.n5e.api for homebrew modules and macros.
 * Registries are plain objects in CONFIG.N5E; these helpers validate and add entries so the engine
 * picks them up on the next data prepare.
 *
 * Example (a world script or module, after "init"):
 *   game.n5e.api.registerCondition("soaked", { label: "Soaked", maxRanks: 3, perRank: { ac: -1 } });
 *
 * The entry shapes are documented at the top of each registry file in module/config/
 * (conditions.mjs for conditions, jutsu.mjs for keywords, character.mjs for skill actions...).
 */

/**
 * Shared add-to-registry step: refuses unknown registries, bad keys, and silent overwrites.
 * @param {string} registry   a CONFIG.N5E key ("conditions", "keywords"...)
 * @param {string} key        the new entry's id
 * @param {object} data       the entry
 * @param {object} [o]
 * @param {boolean} [o.overwrite=false]  replace an existing entry instead of throwing
 */
function register(registry, key, data, { overwrite = false } = {}) {
  const target = CONFIG.N5E[registry];
  if ( !target ) throw new Error(`N5e | unknown registry "${registry}"`);
  if ( typeof key !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)
    || ["constructor", "prototype", "__proto__"].includes(key) ) throw new Error("N5e | invalid registry key");
  if ( !data || typeof data !== "object" || typeof data.label !== "string" || !data.label.trim() ) throw new Error("N5e | registry entries require a label");
  if ( key in target && !overwrite ) throw new Error(`N5e | ${registry}.${key} already exists (pass overwrite: true)`);
  target[key] = data;
  globalThis.Hooks?.callAll("n5e.registryChanged", registry, key, data);
  return target[key];
}

/** Add a condition. Clan-scoped conditions go in clanConditions (King ruling). */
export function registerCondition(key, data, { scope = "core", overwrite = false } = {}) {
  const registry = scope === "core" ? "conditions" : "clanConditions";
  const entry = register(registry, key, { tags: [], maxRanks: null, ...data, scope }, { overwrite });
  // Make it applicable from the token HUD too (the HUD list is built once at init).
  if ( !CONFIG.statusEffects.find(s => s.id === key) ) {
    CONFIG.statusEffects.push({ id: key, name: entry.label ?? key, img: entry.icon ?? "icons/svg/aura.svg" });
  }
  return entry;
}

/** Add a jutsu keyword. "unique" keywords (clan or one-off) live apart from the core list. */
export function registerKeyword(key, data, { scope = "unique", overwrite = false } = {}) {
  return register(scope === "unique" ? "uniqueKeywords" : "keywords", key, { scope, ...data }, { overwrite });
}

/** Add a skill-based action (shape: module/config/character.mjs, skillActions). */
export function registerSkillAction(key, data, options) {
  return register("skillActions", key, data, options);
}

/** Add a damage type (shape: module/config/combat.mjs, damageTypes). */
export function registerDamageType(key, data, options) {
  return register("damageTypes", key, data, options);
}

/** Add a weapon property (shape: module/config/equipment.mjs, weaponProperties). */
export function registerWeaponProperty(key, data, options) {
  return register("weaponProperties", key, data, options);
}

/**
 * Register the clan conditions and keywords stored on a clan item (world items or compendium).
 * Called at "ready" for world clan items. Entries already defined (core or another clan) are left
 * alone, so a clan can't redefine a core condition by accident.
 */
export function registerClanData(clanItem) {
  if ( clanItem?.type !== "clan" ) return;
  const scope = `clan:${clanItem.system.identifier || clanItem.name.slugify?.() || clanItem.id}`;
  for ( const c of clanItem.system.conditions ?? [] ) {
    if ( !c.key || CONFIG.N5E.conditions[c.key] || CONFIG.N5E.clanConditions[c.key] ) continue;
    // Clan item forms store every penalty field; keep only the ones actually set.
    const nonZero = o => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v));
    registerCondition(c.key, { label: c.label, tags: [...(c.tags ?? [])], maxRanks: c.maxRanks, persists: c.persists,
      text: c.text, icon: c.icon, flat: nonZero(c.flat), perRank: nonZero(c.perRank) }, { scope });
  }
  for ( const k of clanItem.system.keywords ?? [] ) {
    if ( !CONFIG.N5E.keywords[k] && !CONFIG.N5E.uniqueKeywords[k] ) registerKeyword(k, { label: k, clan: scope });
  }
}

export default {
  openReactionWindow, resolveReactionWindow,
  requestHistory, archiveRequestHistory,
  runSmokeTests,
  setRuleElements, coatWeapon, removeCoating, summonTokens, dismissSummons,
  registerCondition, registerKeyword, registerSkillAction, registerDamageType, registerWeaponProperty,
  registerClanData
};
