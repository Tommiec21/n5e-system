/**
 * Privileged requests. Foundry system-socket payloads do not authenticate their sender, so remote
 * requests NEVER authorize themselves by claiming a user id. The active GM reviews each request.
 * Local owned-actor changes execute directly. Replies acknowledge completion before callers proceed.
 */
import { rule } from "./rules-settings.mjs";
import { esc } from "./view-models/common.mjs";
import { withActorLock } from "./workflow/commands.mjs";
import { createReceiptCoordinator, requestFingerprint } from "./automation/receipts.mjs";
const pending = new Map();
const CHANNEL = "system.n5e";
function settleReceipt(id) {
  const request = pending.get(id);
  if ( !request?.acknowledged ) return;
  const ledger = game.settings.get("n5e", "requestReceipts");
  const receipt = ledger?.entries?.find(e => e.id === id);
  if ( (ledger?.epoch ?? 1) !== request.epoch || receipt?.fingerprint !== request.fingerprint || receipt.state !== "committed" ) return;
  pending.delete(id); clearTimeout(request.timer); request.resolve(true);
}
const coordinator = createReceiptCoordinator({
  read: () => game.settings.get("n5e", "requestReceipts") ?? { version: 1, epoch: 1, entries: [] },
  write: data => game.settings.set("n5e", "requestReceipts", data),
  authority: () => !!game.users.activeGM?.isSelf
});

/** Limit effect requests to typed effects and system change keys; never accept arbitrary documents. */
export function validateEffectRequest(data) {
  if ( !data || typeof data.name !== "string" || data.name.length > 200 ) throw new Error("Invalid effect name.");
  if ( !["generic", "condition", "state", "amp"].includes(data.type || "generic") ) throw new Error("Invalid effect type.");
  if ( (data.changes ?? []).length > 30 ) throw new Error("Too many effect changes.");
  for ( const c of data.changes ?? [] ) {
    if ( !/^(system\.|n5e\.)/.test(c.key) || /(?:^|\.)(?:__proto__|prototype|constructor)(?:\.|$)/.test(c.key)
      || !Number.isInteger(c.mode) || c.mode < 0 || c.mode > 5 || String(c.value).length > 200 ) throw new Error("Invalid effect change.");
  }
  const { name, img, origin, system, duration, changes, statuses } = data;
  return { name, img, origin, system, duration, changes, statuses, type: data.type || "generic",
    flags: { n5e: structuredClone(data.flags?.n5e ?? {}) } };
}

/** Validate the target before presenting a remote request to the GM. */
async function prepare(type, payload) {
  if ( type === "createEffects" ) {
    const actor = await fromUuid(payload.actorUuid);
    if ( actor?.documentName !== "Actor" || !Array.isArray(payload.effects) || !payload.effects.length || payload.effects.length > 5 ) throw new Error("Invalid actor effect request.");
    const effects = payload.effects.map(validateEffectRequest);
    return { summary: "Apply effects to " + actor.name + ": " + effects.map(e => e.name).join(", "), details: effects,
      owned: actor.isOwner, run: () => actor.createEmbeddedDocuments("ActiveEffect", effects) };
  }
  if ( type === "spendRations" ) {
    const amount = Number(payload.amount);
    if ( !Number.isSafeInteger(amount) || amount <= 0 ) throw new Error("Ration amount must be a positive integer.");
    return { summary: "Spend " + amount + " party rations", details: { amount }, run: () => withActorLock({ uuid: "world:n5e:rations" }, async () => {
      const current = Number(rule("rationPool"));
      if ( amount > current ) throw new Error("Not enough party rations.");
      await game.settings.set("n5e", "rationPool", current - amount);
    }) };
  }
  // No public remote delete operation: lifecycle cleanup is already performed by the active GM.
  throw new Error("Unknown or unsupported GM request.");
}

export async function asGM(type, payload) {
  const request = await prepare(type, payload);
  if ( game.user.isGM || request.owned ) { await request.run(); return true; }
  if ( !game.users.activeGM ) throw new Error("A GM needs to be connected for this.");
  const requestId = crypto.randomUUID();
  const fingerprint = await requestFingerprint(type, payload);
  const epoch = game.settings.get("n5e", "requestReceipts")?.epoch ?? 1;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error("The GM request timed out; no success was confirmed.")); }, 120000);
    pending.set(requestId, { resolve, reject, timer, fingerprint, epoch });
    game.socket.emit(CHANNEL, { requestId, type, payload, requestEpoch: epoch });
  });
}

export function registerSocket() {
  globalThis.Hooks?.on?.("updateSetting", setting => {
    if ( setting.key === "n5e.requestReceipts" ) for ( const id of pending.keys() ) settleReceipt(id);
  });
  game.socket?.on(CHANNEL, async data => {
    if ( data?.responseTo ) {
      const p = pending.get(data.responseTo);
      if ( !p ) return;
      if ( data.ok ) { p.acknowledged = true; settleReceipt(data.responseTo); }
      else { pending.delete(data.responseTo); clearTimeout(p.timer); p.reject(new Error(data.error || "The GM declined the request.")); }
      return;
    }
    if ( !game.users.activeGM?.isSelf || typeof data?.requestId !== "string" ) return;
    let ok = false, error = "The GM declined the request.";
    try {
      const request = await prepare(data.type, data.payload ?? {});
      const result = await coordinator.execute({ id: data.requestId, type: data.type, payload: data.payload, epoch: data.requestEpoch ?? 1 },
        () => foundry.applications.api.DialogV2.confirm({ window: { title: "Review player request" },
          content: "<p>" + esc(request.summary) + "</p><details><summary>Requested changes</summary><pre>" + esc(JSON.stringify(request.details, null, 2)) + "</pre></details>", rejectClose: false }),
        async () => { const current = await prepare(data.type, data.payload ?? {}); await current.run(); });
      ok = result.ok;
    } catch (err) { error = err.message; ui.notifications.warn(error); }
    game.socket.emit(CHANNEL, { responseTo: data.requestId, ok, error: ok ? null : error });
  });
}
