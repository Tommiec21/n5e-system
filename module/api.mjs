/**
 * Public API at game.n5e.api for homebrew modules and macros.
 * Registries are plain objects in CONFIG.N5E; these helpers validate and add entries so the engine
 * picks them up on the next data prepare.
 */
function register(registry, key, data, { overwrite = false } = {}) {
  const target = CONFIG.N5E[registry];
  if ( !target ) throw new Error(`N5e | unknown registry "${registry}"`);
  if ( !key || typeof key !== "string" ) throw new Error("N5e | registry key must be a string");
  if ( key in target && !overwrite ) throw new Error(`N5e | ${registry}.${key} already exists (pass overwrite: true)`);
  target[key] = data;
  return target[key];
}

/** Add a condition. Clan-scoped conditions go in clanConditions (King ruling). */
export function registerCondition(key, data, { scope = "core", overwrite = false } = {}) {
  const registry = scope === "core" ? "conditions" : "clanConditions";
  const entry = register(registry, key, { tags: [], maxRanks: null, ...data, scope }, { overwrite });
  if ( !CONFIG.statusEffects.find(s => s.id === key) ) {
    CONFIG.statusEffects.push({ id: key, name: entry.label ?? key, img: entry.icon ?? "icons/svg/aura.svg" });
  }
  return entry;
}

export function registerKeyword(key, data, { scope = "unique", overwrite = false } = {}) {
  return register(scope === "unique" ? "uniqueKeywords" : "keywords", key, { scope, ...data }, { overwrite });
}

export function registerSkillAction(key, data, options) {
  return register("skillActions", key, data, options);
}

export function registerDamageType(key, data, options) {
  return register("damageTypes", key, data, options);
}

export function registerWeaponProperty(key, data, options) {
  return register("weaponProperties", key, data, options);
}

/** Register the clan conditions and keywords stored on a clan item (world items or compendium). */
export function registerClanData(clanItem) {
  if ( clanItem?.type !== "clan" ) return;
  const scope = `clan:${clanItem.system.identifier || clanItem.name.slugify?.() || clanItem.id}`;
  for ( const c of clanItem.system.conditions ?? [] ) {
    if ( !c.key || CONFIG.N5E.conditions[c.key] || CONFIG.N5E.clanConditions[c.key] ) continue;
    const nonZero = o => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v));
    registerCondition(c.key, { label: c.label, tags: [...(c.tags ?? [])], maxRanks: c.maxRanks, persists: c.persists,
      text: c.text, icon: c.icon, flat: nonZero(c.flat), perRank: nonZero(c.perRank) }, { scope });
  }
  for ( const k of clanItem.system.keywords ?? [] ) {
    if ( !CONFIG.N5E.keywords[k] && !CONFIG.N5E.uniqueKeywords[k] ) registerKeyword(k, { label: k, clan: scope });
  }
}

export default {
  registerCondition, registerKeyword, registerSkillAction, registerDamageType, registerWeaponProperty,
  registerClanData
};
