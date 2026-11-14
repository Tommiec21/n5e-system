/**
 * Weapon proficiency by category + group pairs (pure; DATA1b, King 2026-11-13).
 *   - Classes and feats grant pairs ("simple:blade", "martial:power") or base weapons ("katana").
 *     A whole category ("simple") is written out as every group of that category (King: no
 *     whole-category grants; every group is listed).
 *   - A weapon matches a pair when its category matches and ANY one of its groups matches.
 *   - Everyone is proficient with Kunai, Shuriken and Senbon; the Unarmed Strike is always proficient.
 *   - A weapon with no groups yet (homebrew, older worlds) matches on its category alone.
 *   - NPCs are proficient with their weapons (stat blocks include it).
 */
export const WEAPON_GROUPS = Object.freeze(["blade", "flail", "polearm", "power", "ammunition", "thrown", "unarmed"]);
export const WEAPON_CATEGORIES = Object.freeze(["simple", "martial", "exotic"]);
export const UNIVERSAL_WEAPONS = Object.freeze(["kunai", "shuriken", "senbon"]);
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);

/** Base weapon keyword from a name or identifier: "Battle Wire" → "battleWire", "fuma-shuriken" → "fumaShuriken". */
export function baseWeaponKey(name) {
  const raw = String(name ?? "").trim();
  if ( /^[a-z][a-zA-Z0-9]*$/.test(raw) ) return raw;  // already a key
  const words = raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  return words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("");
}

/**
 * Normalize one granted entry: a category → every group pair; "category:group" kept; anything
 * else is a base weapon key. Free-text choices ("one exotic") are kept as text for the player.
 */
export function expandGrant(entry) {
  const raw = String(entry ?? "").trim();
  const lower = raw.toLowerCase();
  if ( WEAPON_CATEGORIES.includes(lower) ) return WEAPON_GROUPS.map(g => `${lower}:${g}`);
  if ( /^(simple|martial|exotic):[a-z]+$/.test(lower) ) return [lower];
  if ( /^(one|two|any)\s/.test(lower) ) return [raw];
  return raw ? [baseWeaponKey(raw)] : [];
}
export const expandGrants = entries => [...new Set(list(entries).flatMap(expandGrant))];

/**
 * @param {Set<string>|string[]} granted  expanded pairs and base keys (see expandGrants)
 * @param {{category, groups, identifier, name, keywords}} weapon  weapon system data (+ name)
 * @param {{npc?: boolean}} [o]
 */
export function isProficientWith(granted, weapon, { npc = false } = {}) {
  if ( npc ) return true;
  const have = new Set(list(granted));
  const base = baseWeaponKey(weapon.identifier || weapon.name);
  const groups = list(weapon.groups).map(g => String(g).toLowerCase());
  if ( groups.includes("unarmed") && base === "unarmedStrike" ) return true;
  if ( UNIVERSAL_WEAPONS.includes(base) || have.has(base) ) return true;
  const category = String(weapon.category || "").toLowerCase();
  if ( !groups.length ) return [...have].some(p => p.startsWith(`${category}:`));
  return groups.some(g => have.has(`${category}:${g}`));
}
