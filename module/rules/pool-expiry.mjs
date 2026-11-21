/**
 * Pool units that last a while (King Q-E6, 2026-11-21: Primes and Pressure "1 minute cleanse unless
 * spent"). A pool with `lifetime` (seconds) remembers when each unit was gained (the actor's
 * flags.n5e.poolStamps.<id>: world times, oldest first). Spending uses the oldest; units older than
 * the lifetime are lost. Pure.
 */

/** Stamps after gaining n units at `now`. */
export function stampGain(stamps = [], n = 1, now = 0) {
  return [...(stamps ?? []), ...Array.from({ length: Math.max(0, n) }, () => now)];
}

/** Stamps after spending n units (the oldest first). */
export function stampSpend(stamps = [], n = 1) {
  return (stamps ?? []).slice(Math.max(0, n));
}

/**
 * Units past their lifetime at `now`. The stamps are first trimmed to the pool's value (a value
 * lowered by hand drops the oldest stamps).
 * @returns {{stamps: number[], dropped: number, value: number}}
 */
export function expireStamps(stamps = [], { value = 0, now = 0, lifetime = 0 } = {}) {
  let list = [...(stamps ?? [])];
  if ( list.length > value ) list = list.slice(list.length - value);
  if ( !(lifetime > 0) ) return { stamps: list, dropped: 0, value };
  const kept = list.filter(t => now - t < lifetime);
  const dropped = list.length - kept.length;
  return { stamps: kept, dropped, value: Math.max(0, value - dropped) };
}
