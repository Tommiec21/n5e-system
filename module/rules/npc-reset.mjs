/**
 * Batch reset for NPCs (pure; NPC1c C2). What resetting one creature changes, per option:
 *   hp       Hit Points to max, temporary HP to 0, death saves cleared
 *   cp       Chakra Points to max, temporary CP to 0
 *   conditions  every condition and status effect removed
 *   uses     limited uses on items restored, Hit and Chakra Dice restored
 *   pools    resource pools to full
 * Returns {update, deleteEffects: ids, items: [{_id, ...}]} for the Foundry side to apply.
 */
export const RESET_OPTIONS = Object.freeze({
  hp: "Hit Points to full (and death saves cleared)",
  cp: "Chakra Points to full",
  conditions: "Remove conditions and status effects",
  uses: "Restore limited uses and Hit and Chakra Dice",
  pools: "Resource pools to full"
});

export function resetPlan(actor, options = {}) {
  const sys = actor.system ?? {};
  const update = {};
  const on = k => options[k] !== false;
  if ( on("hp") ) Object.assign(update, { "system.hp.value": sys.hp?.max ?? 0, "system.hp.temp": 0,
    "system.deathSaves.success": 0, "system.deathSaves.failure": 0 });
  if ( on("cp") ) Object.assign(update, { "system.cp.value": sys.cp?.max ?? 0, "system.cp.temp": 0 });
  if ( on("uses") ) Object.assign(update, { "system.hitDice.spent": 0, "system.chakraDice.spent": 0 });
  if ( on("pools") ) for ( const [id, pool] of Object.entries(sys.resources ?? {}) ) {
    if ( pool?.maxValue != null ) update[`system.resources.${id}.value`] = pool.maxValue;
  }
  const deleteEffects = on("conditions")
    ? [...(actor.effects ?? [])].filter(e => e.type === "condition" || (e.statuses?.size ?? 0) > 0).map(e => e.id) : [];
  const items = on("uses") ? [...(actor.items ?? [])].filter(i => Number(i.system?.uses?.spent) > 0).map(i => ({ _id: i.id, "system.uses.spent": 0 })) : [];
  return { update, deleteEffects, items };
}
