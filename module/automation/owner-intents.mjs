/**
 * Owner intents: the few N5e actions a player starts that must finish on the GM's client (Allied
 * NPC placement, party rations, reaction decisions on GM-authored windows, item transfer).
 *
 * The player writes the request into a flag on an actor they own. Only owners can write that flag,
 * and Foundry tells the GM which user made the change, so the request is authenticated. The active
 * GM's updateActor hook runs it once, with no dialog, and writes the result back to the actor.
 */
import { canModify } from "./authority.mjs";

export const INTENT_TYPES = Object.freeze(["summonAllied", "dismissAllied", "spendRations", "reactionDecision", "transferItem"]);

const handlers = new Map();
const processed = new Set();
const isUuid = v => typeof v === "string" && v.length > 0 && v.length < 300;
const isId = v => typeof v === "string" && /^[A-Za-z0-9]{1,64}$/.test(v);

/** Register the GM-side handler for one intent type: (actor, data, user) => result. */
export function registerIntentHandler(type, handler) {
  if ( !INTENT_TYPES.includes(type) ) throw new Error(`Unknown intent type: ${type}`);
  handlers.set(type, handler);
}

/** Shape and bounds per type. Throws on anything unexpected; returns a clean copy. */
export function validateIntent(type, data = {}) {
  if ( !INTENT_TYPES.includes(type) ) throw new Error("Unknown request type.");
  switch ( type ) {
    case "summonAllied": {
      const count = Number(data.count ?? 1), seconds = Number(data.seconds ?? 60);
      if ( !isId(data.itemId) || !isUuid(data.templateUuid) ) throw new Error("Invalid summon request.");
      if ( !Number.isInteger(count) || count < 1 || count > 20 ) throw new Error("Summon count must be between 1 and 20.");
      if ( !Number.isFinite(seconds) || seconds <= 0 ) throw new Error("Summon duration must be positive.");
      const num = v => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
      return { itemId: data.itemId, templateUuid: data.templateUuid, count, seconds, concentration: !!data.concentration,
        x: num(data.x), y: num(data.y), sceneId: isId(data.sceneId) ? data.sceneId : null,
        initiative: ["match", "roll", "none"].includes(data.initiative) ? data.initiative : "match" };
    }
    case "dismissAllied":
      if ( data.itemId != null && !isId(data.itemId) ) throw new Error("Invalid dismiss request.");
      return { itemId: data.itemId ?? null };
    case "spendRations": {
      const amount = Number(data.amount);
      if ( !Number.isSafeInteger(amount) || amount <= 0 || amount > 1000 ) throw new Error("Ration amount must be a positive integer.");
      return { amount };
    }
    case "reactionDecision":
      if ( !isId(data.messageId) || typeof data.decision !== "string" || data.decision.length > 100 ) throw new Error("Invalid reaction decision.");
      return { messageId: data.messageId, decision: data.decision };
    case "transferItem": {
      const quantity = Number(data.quantity ?? 1);
      if ( !isId(data.itemId) || !isUuid(data.targetUuid) || !Number.isSafeInteger(quantity) || quantity < 1 ) throw new Error("Invalid item transfer.");
      return { itemId: data.itemId, targetUuid: data.targetUuid, quantity };
    }
  }
  return data;
}

/** Active GM: run one intent once, then write its result and clear the request. No dialog. */
export async function processIntent(actor, id, intent, userId) {
  const key = `${actor.uuid}:${id}`;
  if ( processed.has(key) ) return null;
  processed.add(key);
  const user = globalThis.game?.users?.get(userId);
  let outcome;
  try {
    if ( !user || !actor.testUserPermission(user, "OWNER") ) throw new Error("Only an owner of this actor can make this request.");
    const handler = handlers.get(intent?.type);
    if ( !handler ) throw new Error("Unknown request type.");
    const result = await handler(actor, validateIntent(intent.type, intent.data), user);
    outcome = { ok: true, result: result ?? null };
  } catch (error) {
    outcome = { ok: false, error: error.message };
  }
  await actor.update({ [`flags.n5e.intents.-=${id}`]: null, [`flags.n5e.intentResults.${id}`]: outcome });
  return outcome;
}

/**
 * Ask the GM's client to finish an action on an actor this user owns. The GM runs it directly.
 * Resolves with the handler's result, rejects with its error, or times out without a GM.
 */
export async function submitIntent(actor, type, data, { timeout = 30000 } = {}) {
  const game = globalThis.game;
  if ( !canModify(game.user, actor) ) throw new Error("You must own this actor.");
  const clean = validateIntent(type, data);
  if ( game.users.activeGM?.isSelf ) {
    const handler = handlers.get(type);
    if ( !handler ) throw new Error("Unknown request type.");
    return handler(actor, clean, game.user);
  }
  if ( !game.users.activeGM ) throw new Error("A GM must be connected for this.");
  const id = foundry.utils.randomID();
  const done = new Promise((resolve, reject) => {
    const finish = (fn, value) => { clearTimeout(timer); Hooks.off("updateActor", hook); fn(value); };
    const hook = Hooks.on("updateActor", doc => {
      if ( doc.uuid !== actor.uuid ) return;
      const outcome = doc.flags?.n5e?.intentResults?.[id];
      if ( !outcome ) return;
      void pruneIntentResults(doc, [id]);
      if ( outcome.ok ) finish(resolve, outcome.result); else finish(reject, new Error(outcome.error));
    });
    const timer = setTimeout(() => finish(reject, new Error("A GM must be connected for this.")), timeout);
  });
  await actor.update({ [`flags.n5e.intents.${id}`]: { type, data: clean, at: Date.now() } });
  return done;
}

/** The requester removes its read results so actor flags stay small. */
export async function pruneIntentResults(actor, ids = null) {
  const results = actor.flags?.n5e?.intentResults ?? {};
  const keys = (ids ?? Object.keys(results)).filter(k => k in results);
  if ( !keys.length || !canModify(globalThis.game?.user, actor) ) return;
  await actor.update(Object.fromEntries(keys.map(k => [`flags.n5e.intentResults.-=${k}`, null])));
}

/** New intent ids written by this change. */
export function newIntents(change) {
  const intents = change?.flags?.n5e?.intents;
  if ( !intents || typeof intents !== "object" ) return [];
  return Object.entries(intents).filter(([k, v]) => !k.startsWith("-=") && v && typeof v === "object");
}

/** Active GM processes intents as they arrive (called from the ready hook), and clears stale ones. */
export function registerOwnerIntents() {
  const game = globalThis.game;
  Hooks.on("updateActor", (actor, change, options, userId) => {
    if ( !game?.users?.activeGM?.isSelf ) return;
    for ( const [id, intent] of newIntents(change) ) void processIntent(actor, id, intent, userId);
  });
  clearStaleIntents();
}

/** Requests left from before a reload have no verified author: refuse them rather than guess. */
export function clearStaleIntents() {
  const game = globalThis.game;
  if ( !game?.users?.activeGM?.isSelf ) return;
  const unlinked = game.scenes.contents.flatMap(s => s.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor));
  for ( const actor of [...game.actors, ...unlinked] ) {
    for ( const id of Object.keys(actor.flags?.n5e?.intents ?? {}) ) {
      void actor.update({ [`flags.n5e.intents.-=${id}`]: null,
        [`flags.n5e.intentResults.${id}`]: { ok: false, error: "The request was interrupted by a reload; try again." } });
    }
  }
}
