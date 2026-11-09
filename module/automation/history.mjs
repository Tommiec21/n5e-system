/** Explicit GM reconciliation/archive. Old-epoch packets remain invalid after pruning. */
import { withActorLock } from "../workflow/commands.mjs";

export function requestHistory() {
  if ( !game.user.isGM ) throw new Error("Only a GM can inspect request history.");
  return structuredClone(game.settings.get("n5e", "requestReceipts"));
}

export async function archiveRequestHistory({ reconciled = false } = {}) {
  if ( !game.users.activeGM?.isSelf || !reconciled ) throw new Error("The active GM must first reconcile uncertain requests and pass reconciled: true.");
  return withActorLock("world:n5e:privileged-requests", async () => {
    if ( !game.users.activeGM?.isSelf ) throw new Error("GM authority changed.");
    const ledger = requestHistory();
    if ( ledger.version !== 1 || !Array.isArray(ledger.entries) ) throw new Error("Unsupported request ledger.");
    const accepted = await foundry.applications.api.DialogV2.confirm({ window: { title: "Archive reviewed request history" },
      content: "<p>Confirm that you checked the targets and reconciled every interrupted request. Export the current receipts and advance the request epoch? Old pending requests will be refused.</p>", rejectClose: false });
    if ( !accepted ) return false;
    if ( !game.users.activeGM?.isSelf ) throw new Error("GM authority changed.");
    globalThis.saveDataToFile(JSON.stringify(ledger, null, 2), "application/json", `n5e-request-receipts-${ledger.epoch ?? 1}.json`);
    await game.settings.set("n5e", "requestReceipts", { version: 1, epoch: (ledger.epoch ?? 1) + 1, entries: [] });
    return true;
  });
}
