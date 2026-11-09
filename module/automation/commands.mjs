import { createReceiptCoordinator } from "./receipts.mjs";
const active = new Map();

/** GM-local extension boundary, never a socket endpoint or authorization from a claimed user ID. */
export async function coordinateCommand({ id, type, payload, epoch, resumeReview = false }, { approve, apply }) {
  if ( typeof type !== "string" || !/^[a-z][a-zA-Z0-9-]{0,79}$/.test(type)
    || !payload || typeof payload !== "object" || Array.isArray(payload)
    || typeof approve !== "function" || typeof apply !== "function" ) throw new Error("Invalid coordinated command contract.");
  const coordinator = createReceiptCoordinator({
    read: () => game.settings.get("n5e", "requestReceipts"),
    write: ledger => game.settings.set("n5e", "requestReceipts", ledger),
    authority: () => !!game.users.activeGM?.isSelf
  });
  if ( resumeReview && active.has(id) ) throw new Error("This command is still running on this client; resolve its existing prompt.");
  active.set(id, (active.get(id) ?? 0) + 1);
  try {
    return await coordinator.execute({ id, type, payload, resumeReview, epoch: epoch ?? game.settings.get("n5e", "requestReceipts")?.epoch ?? 1 }, approve, apply);
  } finally {
    const remaining = active.get(id) - 1;
    if ( remaining ) active.set(id, remaining); else active.delete(id);
  }
}
