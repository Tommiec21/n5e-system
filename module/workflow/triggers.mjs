/**
 * Firing trigger elements (STD4; rules/triggers.mjs). Called where the events happen: initiative,
 * the turn pipeline, attack and save results, damage dealt and taken.
 */
import { triggersFor, triggerOutcomes } from "../rules/triggers.mjs";
import { esc } from "../view-models/common.mjs";

const turnKey = () => (game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null);

/** Fire `event` for this actor. Only its owner (or the active GM) changes it. */
export async function fireTriggers(actor, event, { spec = {}, target = null } = {}) {
  if ( !actor?.isOwner ) return null;
  const stamp = turnKey();
  const stored = actor.flags?.n5e?.triggerTurn;
  const firedThisTurn = stored?.stamp === stamp ? stored.keys ?? [] : [];
  const fired = triggersFor(actor, event, { spec, target, firedThisTurn });
  if ( !fired.length ) return null;
  const out = triggerOutcomes(fired);
  const update = {};
  const lines = [];
  for ( const r of out.resources ) {
    if ( r.pool === "fury" ) {
      const { gainFury } = await import("../rules/trackers.mjs");
      Object.assign(update, gainFury(actor, game.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null, r.amount || 1));
      lines.push(`${r.label}: gains Fury.`);
      continue;
    }
    const pool = actor.system.resources?.[r.pool];
    if ( !pool ) continue;
    const value = Math.max(0, Math.min(pool.max ?? Infinity, (pool.value ?? 0) + r.amount));
    update[`system.resources.${r.pool}.value`] = value;
    lines.push(`${r.label}: ${r.pool} ${r.amount >= 0 ? "+" : ""}${r.amount}.`);
  }
  if ( out.onceKeys.length ) update["flags.n5e.triggerTurn"] = { stamp, keys: [...firedThisTurn, ...out.onceKeys] };
  if ( Object.keys(update).length ) await actor.update(update);
  if ( out.resources.some(r => r.pool === "fury") ) await import("./trackers.mjs").then(m => m.syncFurious(actor));
  for ( const i of out.inflict ) {
    const who = i.who === "target" ? target : actor;
    if ( !who?.isOwner && !game.user.isGM ) { lines.push(`${i.label}: apply ${i.condition} to ${who?.name ?? "the target"} (GM).`); continue; }
    await who?.addCondition?.(i.condition, i.ranks);
    lines.push(`${i.label}: ${who?.name} gains ${i.condition}.`);
  }
  lines.push(...out.notes);
  if ( lines.length ) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper: game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id),
    content: `<div class="n5e-roll-card"><div class="note">${lines.map(esc).join("<br>")}</div></div>` });
  return out;
}
