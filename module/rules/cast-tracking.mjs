/**
 * What casting a jutsu does to the Chain and Combo/Finisher trackers (KB 04, King 2026-11-06):
 *   - Chain: an Action Chain Bukijutsu raises the count by 1 (max 3; the player can hold or opt out by
 *     clicking the boxes); a Bonus Action or Reaction one maintains it; any jutsu without Chain resets it.
 *   - Combo/Finisher: a Combo arms Finishers; the Finisher effect needs the Combo immediately before it,
 *     so a Finisher, or any other jutsu, disarms it.
 * Pure: returns the actor update, so the sheet (and Phase 3's cast workflow) can apply it.
 */
const kw = item => (item.system.keywords instanceof Set ? item.system.keywords : new Set(item.system.keywords ?? []));

export function castUpdates(actor, item) {
  if ( item?.type !== "jutsu" ) return null;
  const keys = kw(item);
  const chain = actor.system.combat?.chain ?? { value: 0 };
  const act = item.system.activation?.type;
  const update = {};
  if ( keys.has("chain") ) {
    update["system.combat.chain.active"] = true;
    if ( act === "action" ) update["system.combat.chain.value"] = Math.min(3, (chain.value ?? 0) + 1);
  } else if ( chain.value || chain.active ) {
    update["system.combat.chain.value"] = 0;
    update["system.combat.chain.active"] = false;
  }
  if ( keys.has("combo") ) update["flags.n5e.combo"] = { name: item.name, id: item.id };
  else update["flags.n5e.combo"] = null;
  return update;
}
