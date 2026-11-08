/**
 * Ammunition Die (KB 03): d8 > d6 > d4 > 1 > 0. Roll it each use; a 1-2 steps it down. Recovering ammo
 * steps it up. Reaching 0 removes the item (King 2026-11-07).
 * The ladder is weapon.system.ammo.steps (config/equipment.mjs ammoDie.steps by default); `step` is
 * the index, so "down" is +1. The sheet's Ammunition Die control: left click down, right click up.
 */

/** Move the die along its ladder: +1 = down a step, -1 = up a step. */
export async function stepAmmo(item, delta) {
  const { steps = [], step = 0 } = item.system.ammo ?? {};
  const next = Math.max(0, Math.min(steps.length - 1, step + delta));
  if ( (steps[next] ?? 0) <= 0 ) {
    ui.notifications.info(`${item.name}: Ammunition Die reached 0, removed from inventory.`);
    return item.delete();
  }
  if ( next !== step ) return item.update({ "system.ammo.step": next });
  return item;
}

/** Roll the Ammunition Die for one use; steps down on 1-2 (KB 08 ammoDie.stepDownOn). */
export async function rollAmmo(item) {
  const { steps = [], step = 0 } = item.system.ammo ?? {};
  const face = steps[step] ?? 0;
  if ( face <= 1 ) {
    // A "1" die always steps down (to 0) when used.
    const ChatMessageCls = CONFIG.ChatMessage.documentClass;
    await ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor: item.actor }),
      content: `<div class="n5e-roll-card"><b>${item.name}</b>: last of the ammunition used.</div>` });
    return stepAmmo(item, 1);
  }
  const roll = await new Roll(`1d${face}`).evaluate();
  const down = (CONFIG.N5E.ammoDie?.stepDownOn ?? [1, 2]).includes(roll.total);
  await roll.toMessage({ speaker: CONFIG.ChatMessage.documentClass.getSpeaker({ actor: item.actor }),
    flavor: `<div class="n5e-roll-card"><header><b>${item.name}: Ammunition Die</b><span class="mode">d${face}</span></header>
      <div class="note">${down ? `Rolled ${roll.total}: the die steps down.` : "Ammunition holds."}</div></div>` });
  if ( down ) return stepAmmo(item, 1);
  return item;
}
