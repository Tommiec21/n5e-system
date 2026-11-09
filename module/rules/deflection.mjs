/** Base Deflection. Owning an advanced option does not remove the ordinary paid reaction. */
export function deflectionOffer(actor, { combat = false, instances = [], ignoreDR = false, genjutsu = false } = {}) {
  if ( !combat || ignoreDR || !instances.some(i => i.amount > 0 && !(genjutsu && i.type === "psychic")) ) return null;
  if ( actor.flags?.n5e?.economy?.reaction ) return null;
  const statuses = actor.statuses ?? new Set();
  if ( ["dead", "unconscious", "incapacitated", "stunned"].some(s => statuses.has(s)) ) return null;
  const item = actor.items.find(i => i.system?.identifier === "discipline");
  if ( !item || (actor.system.resources?.discipline?.value ?? 0) < 1 ) return null;
  const cls = actor.items.find(i => i.type === "class" && i.system.identifier === "weapon-specialist");
  const level = cls?.system.levels ?? 0;
  return { item, dice: level >= 20 ? 3 : level >= 11 ? 2 : 1, die: "d12", cost: 1 };
}
