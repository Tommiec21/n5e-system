/** Durable, serialized GM receipts. An interrupted application is never retried automatically. */
import { withActorLock } from "../workflow/commands.mjs";

function canonical(value, depth = 0) {
  if ( depth > 30 ) throw new Error("Request nesting is too deep.");
  if ( value === null || ["string", "boolean"].includes(typeof value) ) return JSON.stringify(value);
  if ( typeof value === "number" && Number.isFinite(value) ) return JSON.stringify(value);
  if ( Array.isArray(value) ) return `[${value.map(v => canonical(v, depth + 1)).join(",")}]`;
  if ( value && Object.getPrototypeOf(value) === Object.prototype ) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k], depth + 1)}`).join(",")}}`;
  throw new Error("Requests must contain ordinary JSON data.");
}

export async function requestFingerprint(type, payload) {
  const text = canonical({ type, payload });
  if ( text.length > 30000 ) throw new Error("Request is too large.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

/** Storage and authority are injected so the exact failure/reload boundary can be tested. */
export function createReceiptCoordinator({ read, write, authority, now = () => Date.now(), limit = 200 }) {
  const requireAuthority = () => { if ( !authority() ) throw new Error("Only the active GM can coordinate requests."); };
  return {
    async execute({ id, type, payload, epoch = 1 }, approve, apply) {
      if ( typeof id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(id) ) throw new Error("Invalid request id.");
      const fingerprint = await requestFingerprint(type, payload);
      return withActorLock("world:n5e:privileged-requests", async () => {
        requireAuthority();
        const ledger = structuredClone(await read());
        if ( ledger.version !== 1 || !Array.isArray(ledger.entries) ) throw new Error("Unsupported request ledger; GM review required.");
        if ( epoch !== (ledger.epoch ?? 1) ) throw new Error("Request belongs to an archived authority epoch; submit a new request after reviewing its outcome.");
        const prior = ledger.entries.find(e => e.id === id);
        if ( prior ) {
          if ( prior.fingerprint !== fingerprint ) throw new Error("Request id was reused for different content.");
          if ( !["committed", "declined", "rejected"].includes(prior.state) ) throw new Error("Request completion is uncertain. The GM must inspect the target; do not resubmit it.");
          return { ok: prior.state === "committed", state: prior.state, replay: true };
        }
        // Never evict receipts silently: otherwise an old packet could apply again.
        if ( ledger.entries.length >= limit ) throw new Error("Request history is full. The GM must archive/reconcile it before more remote requests.");
        const receipt = { id, type, fingerprint, state: "reviewing", created: now() };
        ledger.entries.push(receipt);
        const persist = async () => { requireAuthority(); receipt.updated = now(); await write(structuredClone(ledger)); };
        await persist(); // Failure here prevents any prompt or mutation.
        try {
          if ( !await approve() ) { receipt.state = "declined"; await persist(); return { ok: false, state: receipt.state, replay: false }; }
          requireAuthority();
          receipt.state = "applying";
          await persist(); // Write-ahead intent: a crash after this is uncertain, never safe to replay.
          requireAuthority();
          await apply();
          receipt.state = "committed";
          await persist();
          return { ok: true, state: receipt.state, replay: false };
        } catch (error) {
          receipt.state = ["applying", "committed"].includes(receipt.state) ? "uncertain" : "rejected";
          try { await persist(); } catch { /* Retained write-ahead intent blocks retry after handover. */ }
          throw error;
        }
      });
    }
  };
}
