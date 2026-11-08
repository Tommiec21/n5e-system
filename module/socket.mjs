/**
 * GM relay for changes a player can't make themselves (world settings, effects on creatures they
 * don't own). The active GM's client runs the handler; a GM runs it directly.
 */
import { rule } from "./rules-settings.mjs";

const HANDLERS = {
  async spendRations({ amount }) {
    await game.settings.set("n5e", "rationPool", Math.max(0, rule("rationPool") - (Number(amount) || 0)));
  },
  async createEffects({ actorUuid, effects }) {
    const actor = await fromUuid(actorUuid);
    if ( actor ) await actor.createEmbeddedDocuments("ActiveEffect", effects);
  },
  async deleteEffects({ uuids }) {
    for ( const uuid of uuids ?? [] ) await (await fromUuid(uuid))?.delete();
  }
};

/** Run an action as the GM. */
export async function asGM(type, payload) {
  if ( game.user.isGM ) return HANDLERS[type]?.(payload);
  if ( !game.users.activeGM ) return ui.notifications.warn("A GM needs to be connected for this.");
  game.socket.emit("system.n5e", { type, payload });
}

export function registerSocket() {
  game.socket?.on("system.n5e", async data => {
    if ( !game.users.activeGM?.isSelf ) return;
    await HANDLERS[data?.type]?.(data.payload ?? data);
  });
}
