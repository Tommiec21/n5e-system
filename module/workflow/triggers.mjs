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
  // ENG1a: healing at once; damage as a card for the GM (like condition damage); a save that ends the effect.
  for ( const h of out.heal ) {
    const who = h.who === "target" ? target : actor;
    if ( !who ) continue;
    const roll = await new Roll(h.formula, actor.getRollData?.() ?? {}).evaluate();
    if ( who.isOwner ) {
      const { applyHealing } = await import("./health.mjs");
      const r = await applyHealing(who, roll.total, h.pool);
      lines.push(`${h.label}: ${who.name} ${r?.blocked ? `can't regain it (${r.blocked})` : `regains ${roll.total} ${({ cp: "CP", tempHp: "temporary HP", tempCp: "temporary CP" })[h.pool] ?? "HP"}`}.`);
    } else lines.push(`${h.label}: ${who.name} regains ${roll.total} (GM).`);
  }
  for ( const d of out.damage ) {
    const who = d.who === "target" ? target : actor;
    if ( !who ) continue;
    const roll = await new Roll(d.formula, actor.getRollData?.() ?? {}).evaluate();
    const { applyButtons } = await import("./activity-buttons.mjs");
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: who }), rolls: [roll],
      content: `<div class="n5e-roll-card damage"><header><b>${esc(who.name)}: ${esc(d.label)}</b><span class="bonus">${roll.total}</span></header>
        <div class="note">${esc(`${roll.total} ${d.type}${d.unreducible ? " · can't be reduced or resisted" : ""}`)}</div>${applyButtons()}</div>`,
      flags: { n5e: { damage: { instances: [{ amount: roll.total, type: d.type }], total: roll.total, targetUuid: who.uuid,
        ...(d.unreducible ? { ignoreDR: true, handling: { ignoreResistance: true, immunityAsResistance: false, drMultiplier: 1 } } : {}) }, actorUuid: who.uuid } } });
  }
  for ( const s of out.resave ) {
    const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
    await rollWithSpec(actor, { ...rollSpec(actor, "save", s.ability), label: `${s.label}: save to end it` }, { dc: s.dc, onResult: async r => {
      if ( !r.success || !s.sourceId ) return;
      const effect = actor.effects.get?.(s.sourceId);
      if ( effect ) { await effect.delete(); lines.push(`${s.label} ends.`); }
    } });
  }
  lines.push(...out.notes);
  if ( lines.length ) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper: game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id),
    content: `<div class="n5e-roll-card"><div class="note">${lines.map(esc).join("<br>")}</div></div>` });
  return out;
}
