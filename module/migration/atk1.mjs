/**
 * ATK1 migration (pure, used by the world runner and tools/migrate-packs.mjs): a Thrown weapon
 * without the Ammunition property carries a d4 Ammunition Die (Chapter 5, Thrown).
 */
import { thrownAmmo } from "../rules/weapon-properties.mjs";

/** @returns {object|null} the updated source, or null when nothing changes */
export function migrateThrownAmmo(source) {
  if ( source?.type !== "weapon" ) return null;
  const ammo = thrownAmmo(source);
  if ( !ammo ) return null;
  const next = structuredClone(source);
  next.system.ammo = { ...(next.system.ammo ?? {}), ...ammo };
  return next;
}
