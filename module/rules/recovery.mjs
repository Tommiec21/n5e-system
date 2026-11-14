/**
 * Combat recovery periods (pure; dnd5e Combat5e._recoverUses pattern). King 2026-11-13 (TURN1):
 *   turn       start of the creature's own turn
 *   round      start of each round
 *   encounter  combat start and combat end
 * Item uses whose `per` matches reset `spent` to 0; resource pools with a matching `recovery.on`
 * refill to their maximum. A recovery that requires a feature only applies when the actor has it.
 */
import { recoveryAllowed } from "./features.mjs";

export const COMBAT_PERIODS = Object.freeze(["turn", "round", "encounter"]);
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);

/**
 * @param {Actor} actor
 * @param {string[]} periods  some of COMBAT_PERIODS
 * @returns {{update: object, itemUpdates: {_id: string, "system.uses.spent": 0}[], recovered: string[]}}
 */
export function combatRecoveryPlan(actor, periods) {
  const wanted = new Set(list(periods).filter(p => COMBAT_PERIODS.includes(p)));
  const update = {}, itemUpdates = [], recovered = [];
  if ( !wanted.size ) return { update, itemUpdates, recovered };
  for ( const [id, pool] of Object.entries(actor.system?.resources ?? {}) ) {
    const r = list(pool.recovery).find(x => wanted.has(x.on) && recoveryAllowed(actor, x));
    if ( !r || (pool.value ?? 0) === (pool.maxValue ?? 0) ) continue;
    update[`system.resources.${id}.value`] = pool.maxValue ?? 0;
    recovered.push(pool.label || id);
  }
  for ( const item of list(actor.items) ) {
    const uses = item.system?.uses;
    if ( !uses || !wanted.has(uses.per) || !(uses.spent > 0) ) continue;
    itemUpdates.push({ _id: item.id, "system.uses.spent": 0 });
    recovered.push(item.name);
  }
  return { update, itemUpdates, recovered };
}
