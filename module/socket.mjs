/**
 * GM relay for changes a player can't make themselves (world settings, effects on creatures they
 * don't own). The active GM's client runs the handler; a GM runs it directly.
 *
 * How it works: Foundry gives each system one socket channel ("system.n5e", enabled by
 * "socket": true in system.json). A player's client emits { type, payload }; every connected client
 * receives it, and only the active GM's client acts, so the change happens exactly once.
 *
 * To add a GM action: add a handler to HANDLERS below, then call asGM("yourType", payload) wherever
 * a player needs it. Keep payloads to plain data (uuids, numbers, effect data), never documents.
 */
import { rule } from "./rules-settings.mjs";

const HANDLERS = {
  /** Ration Pool (Phase 5): the pool is a world setting, which only a GM can write. */
  async spendRations({ amount }) {
    await game.settings.set("n5e", "rationPool", Math.max(0, rule("rationPool") - (Number(amount) || 0)));
  },
  /** Marks, Branded, Amps and activity effects placed on creatures the player doesn't own. */
  async createEffects({ actorUuid, effects }) {
    const actor = await fromUuid(actorUuid);
    if ( actor ) await actor.createEmbeddedDocuments("ActiveEffect", effects);
  },
  async deleteEffects({ uuids }) {
    for ( const uuid of uuids ?? [] ) await (await fromUuid(uuid))?.delete();
  }
};

/** Run an action as the GM (directly when this user is a GM; otherwise over the socket). */
export async function asGM(type, payload) {
  if ( game.user.isGM ) return HANDLERS[type]?.(payload);
  if ( !game.users.activeGM ) return ui.notifications.warn("A GM needs to be connected for this.");
  game.socket.emit("system.n5e", { type, payload });
}

/** Called at "ready". game.socket is absent in the Node tests, hence the optional chaining. */
export function registerSocket() {
  game.socket?.on("system.n5e", async data => {
    if ( !game.users.activeGM?.isSelf ) return;
    // data.payload for current messages; data itself for the Phase 5 ration format.
    await HANDLERS[data?.type]?.(data.payload ?? data);
  });
}
