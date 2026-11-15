/**
 * What players see of NPCs (PRESTD1 Part A, King 2026-11-15): optional rules that keep NPC numbers,
 * damage, condition messages and names for the GM.
 *
 *   npcRollBreakdowns  off: players don't see the breakdown of an NPC's roll
 *   hideNpcDamage      damage and healing applied to NPCs: whispered to the GM
 *   hideNpcConditions  condition damage, endings and removal results for NPCs: whispered to the GM
 *   hideNpcNames       an NPC whose token name isn't shown to everyone is "Unknown creature" to players
 *
 * "NPC" here is an NPC no player owns (Allied NPCs and player-owned creatures are never hidden).
 */
import { rule } from "../rules-settings.mjs";

const UNKNOWN = "Unknown creature";

/** An NPC no player owns. */
export function privateNpc(actor) {
  if ( !actor || actor.type !== "npc" ) return false;
  return !(globalThis.game?.users ?? []).some(u => !u.isGM && actor.testUserPermission?.(u, "OWNER"));
}

/** Whisper data for a message about these creatures when the rule is on and all of them are private NPCs. */
export function gmWhisper(actors, ruleKey) {
  const list = (Array.isArray(actors) ? actors : [actors]).filter(Boolean);
  if ( !rule(ruleKey) || !list.length || !list.every(privateNpc) ) return {};
  return { whisper: (globalThis.game?.users ?? []).filter(u => u.isGM).map(u => u.id) };
}

/** Does this token show its name to a user who doesn't own it? (Foundry's token display modes.) */
export function nameShownToAll(tokenDoc) {
  const modes = globalThis.CONST?.TOKEN_DISPLAY_MODES ?? { HOVER: 30, ALWAYS: 50 };
  return [modes.HOVER, modes.ALWAYS].includes(tokenDoc?.displayName);
}

/** Should this user see "Unknown creature" for this actor and token? */
export function hideNameFor(user, actor, tokenDoc) {
  if ( !rule("hideNpcNames") || user?.isGM || !privateNpc(actor) ) return false;
  return !nameShownToAll(tokenDoc ?? actor?.prototypeToken);
}

/** Chat render step: breakdowns and names. */
export function renderPrivacy(message, html) {
  const game = globalThis.game;
  if ( !game?.user || game.user.isGM ) return;
  const speaker = message.speaker ?? {};
  const tokenDoc = speaker.token ? game.scenes?.get(speaker.scene)?.tokens?.get(speaker.token) : null;
  const actor = tokenDoc?.actor ?? (speaker.actor ? game.actors?.get(speaker.actor) : null);
  if ( !actor || !privateNpc(actor) ) return;
  if ( rule("npcRollBreakdowns") === false ) {
    for ( const el of html.querySelectorAll(".n5e-roll-breakdown") ) el.remove();
    for ( const el of html.querySelectorAll("[data-tooltip-html]") ) el.removeAttribute("data-tooltip-html");
  }
  if ( hideNameFor(game.user, actor, tokenDoc) ) {
    const name = tokenDoc?.name ?? actor.name;
    for ( const el of html.querySelectorAll(".message-sender, .message-header .name") ) if ( el.textContent.trim() === name ) el.textContent = UNKNOWN;
    for ( const el of html.querySelectorAll("header b, .n5e-roll-card b") ) if ( el.textContent.includes(name) ) el.textContent = el.textContent.replaceAll(name, UNKNOWN);
  }
}

/** Combat tracker: hidden names for players. */
export function registerPrivacyHooks() {
  Hooks.on("renderCombatTracker", (app, html) => {
    const game = globalThis.game;
    if ( game.user.isGM || !rule("hideNpcNames") ) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const combat = app.viewed ?? game.combat;
    if ( !root || !combat ) return;
    for ( const li of root.querySelectorAll("[data-combatant-id]") ) {
      const c = combat.combatants.get(li.dataset.combatantId);
      if ( !c || !hideNameFor(game.user, c.actor, c.token) ) continue;
      const el = li.querySelector(".token-name h4, .token-name .name, .name");
      if ( el ) el.textContent = UNKNOWN;
      const img = li.querySelector("img");
      if ( img ) img.alt = UNKNOWN;
    }
  });
}
