/**
 * Shared execution boundary for actor mutations. Queue per actor on this client, re-read state
 * inside the queue, and release it after failures. It prevents overlapping local clicks; Foundry's
 * document API does not provide a cross-client compare-and-swap transaction. Avoid controlling
 * the same actor from two clients at once. Nested operations must use their unlocked helpers.
 */
const queues = new Map();
export async function withActorLock(actor, operation) {
  const key = actor?.uuid ?? actor;
  const prior = queues.get(key) ?? Promise.resolve();
  const next = prior.catch(() => {}).then(operation);
  queues.set(key, next);
  try { return await next; }
  finally { if ( queues.get(key) === next ) queues.delete(key); }
}

/** Lock multi-actor commands in a consistent order so opposing healing actions cannot deadlock. */
export function withActorLocks(actors, operation) {
  const ordered = [...new Map(actors.filter(Boolean).map(a => [a.uuid ?? a, a])).values()]
    .sort((a, b) => String(a.uuid ?? "").localeCompare(String(b.uuid ?? "")));
  const lock = i => i === ordered.length ? operation() : withActorLock(ordered[i], () => lock(i + 1));
  return lock(0);
}

export { resourceChange } from "../rules/resources.mjs";

/** A stable encounter/round/turn stamp; no once-per-turn restriction outside an active combat. */
export function activityTurnStamp(combat = globalThis.game?.combat) {
  return combat?.started ? `${combat.id}:${combat.round}:${combat.turn}` : null;
}
