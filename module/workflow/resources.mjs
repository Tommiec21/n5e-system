/** Shared validated resource payment for activities and feature use. */
import { withActorLock } from "./commands.mjs";
import { resourceChange } from "../rules/resources.mjs";
import { esc } from "../view-models/common.mjs";
import { resolveFormula } from "../rules/unarmed.mjs";
import { stampGain, stampSpend } from "../rules/pool-expiry.mjs";

/**
 * Pay an activity's pool cost; roll the pool's die when asked (Superiority Dice: d8).
 * Pools are system.resources.<id> (class pools such as focus, superiorityDice, pyroclasm, and the
 * optional stamina pool). Warns and returns null when the pool is missing or short.
 * @param {Actor} actor
 * @param {{pool: string, amount?: number, roll?: boolean, choose?: boolean}} cost
 *   choose: ask the player how many to spend (Pyroclasm's Detonate)
 * @returns {Promise<{roll: number|null, amount: number}|null>}  roll: the pool die total, when rolled
 */
export async function payPoolCost(actor, cost, { locked = false } = {}) {
  if ( !locked ) return withActorLock(actor, () => payPoolCost(actor, cost, { locked: true }));
  let pool = actor.system.resources?.[cost.pool];
  let amount = cost.amount ?? 1;
  if ( !pool ) {
    ui.notifications.warn(`No ${cost.pool} pool.`);
    return null;
  }
  // STD6d: an amount by level, or rolled (posted to chat).
  if ( cost.formula ) {
    const f = resolveFormula(cost.formula, actor);
    if ( /d\d/.test(f) ) {
      const r = (await (await import("../dice/advantaged.mjs")).rollFormula(actor, f, { title: `${actor.name}: ${pool.label || cost.pool}`, kind: "dice", type: "dice", key: cost.pool, cancellable: false })).roll;
      await r.toMessage({ speaker: CONFIG.ChatMessage.documentClass.getSpeaker({ actor }), flavor: `<div class="n5e-roll-card"><b>${esc(pool.label || cost.pool)}</b></div>` });
      amount = Math.max(0, Math.trunc(r.total));
    } else amount = Math.max(0, Math.trunc(Number(f) || 0));
  }
  // "Any number" (Pyroclasm Detonate): the player picks how many.
  if ( cost.choose ) {
    const cap = cost.gain ? (pool.maxValue ?? 0) - (pool.value ?? 0) : (pool.value ?? 0);
    const { DialogV2 } = foundry.applications.api;
    const n = await DialogV2.prompt({ window: { title: `Spend ${pool.label || cost.pool}` },
      content: `<label>How many? <input type="number" name="n" value="1" min="1" max="${cap}"></label>`,
      ok: { callback: (event, button) => Number(button.form.elements.n.value) || 0 }, rejectClose: false });
    if ( !n ) return null;
    if ( !Number.isSafeInteger(n) || n < 1 || n > cap ) {
      ui.notifications.warn("Choose a whole number within the available resource limit.");
      return null;
    }
    amount = n;
  }
  pool = actor.system.resources?.[cost.pool];
  let nextValue;
  try { nextValue = resourceChange(pool, amount, { gain: !!cost.gain }); }
  catch (error) { ui.notifications.warn(error.message); return null; }
  // gain: the button adds to the pool instead (Carnage, Momentum, Blight, Mental Refocus...), capped at its max.
  if ( cost.gain ) {
    const value = nextValue;
    // King Q-E6: units that last a while remember when they were gained.
    const stamps = pool.lifetime ? { [`flags.n5e.poolStamps.${cost.pool}`]: stampGain(actor.flags?.n5e?.poolStamps?.[cost.pool], value - (pool.value ?? 0), game.time.worldTime) } : {};
    await actor.update({ [`system.resources.${cost.pool}.value`]: value, ...stamps });
    ui.notifications.info(`${pool.label || cost.pool}: ${value} / ${pool.maxValue ?? 0}`);
    return { roll: null, amount, gained: true };
  }
  if ( (pool.value ?? 0) < amount ) {
    ui.notifications.warn(`Not enough ${pool.label || cost.pool} (${pool.value ?? 0} / ${amount}).`);
    return null;
  }
  const spent = pool.lifetime ? { [`flags.n5e.poolStamps.${cost.pool}`]: stampSpend(actor.flags?.n5e?.poolStamps?.[cost.pool], amount) } : {};
  await actor.update({ [`system.resources.${cost.pool}.value`]: nextValue, ...spent });
  // FIN2b: a chakra-like resource (White Chakra, Calories, Sage Chakra...) ends Suppress Chakra.
  if ( pool.countsAsChakraSpend && amount > 0 ) await (await import("./jutsu-defense.mjs")).endSuppression(actor);
  if ( !cost.roll || !pool.die || !amount ) return { roll: null, amount };
  // The dice dialog (ROLL1); the cost is paid already, so closing it rolls as shown.
  const roll = (await (await import("../dice/advantaged.mjs")).rollFormula(actor, `${amount}${pool.die}`, { title: `${actor.name}: ${pool.label || cost.pool}`, kind: "dice", type: "dice", key: cost.pool, cancellable: false })).roll;
  await roll.toMessage({ speaker: CONFIG.ChatMessage.documentClass.getSpeaker({ actor }),
    flavor: `<div class="n5e-roll-card"><header><b>${esc(pool.label || cost.pool)}</b><span class="bonus">${roll.total}</span></header><div class="note">Spent ${amount}</div></div>` });
  return { roll: roll.total, amount };
}

/** Collect the player's quantity before GM dispatch; execution still rechecks the live pool. */
export async function choosePoolCost(actor, cost) {
  const pool = actor.system.resources?.[cost.pool];
  if ( !pool ) throw new Error("That resource pool is unavailable.");
  const cap = cost.gain ? (pool.maxValue ?? 0) - (pool.value ?? 0) : (pool.value ?? 0);
  const amount = await foundry.applications.api.DialogV2.prompt({ window: { title: `Choose ${pool.label || cost.pool}` },
    content: `<label>Amount<input name="amount" type="number" min="1" max="${cap}" step="1" value="1"></label>`,
    ok: { callback: (event, button) => Number(button.form.elements.amount.value) }, rejectClose: false });
  if ( amount == null ) return null;
  if ( !Number.isSafeInteger(amount) || amount < 1 || amount > cap ) throw new Error("Choose a whole amount within the available resource limit.");
  return { ...cost, choose: false, amount };
}

/**
 * King Q-E6: drop pool units older than their pool's lifetime, for every actor (the active GM, when
 * world time moves: combat rounds and time passing).
 */
export async function expirePoolUnits() {
  if ( !game.users?.activeGM?.isSelf ) return;
  const { expireStamps } = await import("../rules/pool-expiry.mjs");
  const now = game.time.worldTime;
  const actors = [...game.actors, ...(canvas?.scene?.tokens ?? []).filter(t => !t.actorLink && t.actor).map(t => t.actor)];
  for ( const actor of actors ) {
    const all = actor.flags?.n5e?.poolStamps;
    if ( !all ) continue;
    const update = {};
    for ( const [id, stamps] of Object.entries(all) ) {
      const pool = actor.system.resources?.[id];
      if ( !pool?.lifetime ) continue;
      const out = expireStamps(stamps, { value: pool.value ?? 0, now, lifetime: pool.lifetime });
      if ( out.stamps.length === (stamps ?? []).length && out.value === (pool.value ?? 0) ) continue;
      update[`flags.n5e.poolStamps.${id}`] = out.stamps;
      if ( out.dropped ) update[`system.resources.${id}.value`] = out.value;
    }
    if ( Object.keys(update).length ) await actor.update(update);
  }
}

