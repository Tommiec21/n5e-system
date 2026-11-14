/**
 * Concentration upkeep choice (pure). King 2026-11-13: at the start of each turn the owner is asked
 * whether to maintain each concentration jutsu. With chakra for some but not all, the owner chooses;
 * with chakra for none, all end automatically. An unanswered prompt ends at the end of the turn.
 * Upkeep = half the cost paid at casting (Efficient: 0).
 */
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const kw = item => (item.system?.keywords instanceof Set ? item.system.keywords : new Set(item.system?.keywords ?? []));

/** @returns {{jutsu: {id, name, cost}[], cp: number, noneAffordable: boolean}} */
export function upkeepOptions(actor) {
  const paid = actor.flags?.n5e?.concentrationPaid ?? {};
  const jutsu = [];
  for ( const id of list(actor.system?.combat?.concentrating) ) {
    const item = actor.items?.get?.(id) ?? list(actor.items).find(i => i.id === id);
    if ( !item ) continue;
    const cost = kw(item).has("efficient") ? 0 : Math.floor((paid[id] ?? item.system?.live?.cost ?? 0) / 2);
    jutsu.push({ id, name: item.name, cost });
  }
  const cp = actor.system?.cp?.value ?? 0;
  const noneAffordable = jutsu.length > 0 && jutsu.every(j => j.cost > cp);
  return { jutsu, cp, noneAffordable };
}

/** Check the owner's choice; returns the total cost. Throws a readable error. */
export function validateUpkeepChoice(options, keepIds) {
  const ids = [...new Set(list(keepIds))];
  const byId = new Map(options.jutsu.map(j => [j.id, j]));
  for ( const id of ids ) if ( !byId.has(id) ) throw new Error("That jutsu is not waiting for an upkeep decision.");
  const total = ids.reduce((t, id) => t + byId.get(id).cost, 0);
  if ( total > options.cp ) throw new Error(`Not enough chakra: maintaining these costs ${total} CP and you have ${options.cp}.`);
  return total;
}

/**
 * How upkeep is handled for this actor (world rules):
 *   "off"    upkeep rule disabled
 *   "auto"   NPC with npcUpkeep "auto": maintain in listed order while chakra allows
 *   "manual" NPC with npcUpkeep "manual": nothing automatic, the GM tracks it by hand
 *   "prompt" everyone else (players always; NPCs with npcUpkeep "prompt")
 */
export function upkeepMode(actor, { upkeepRule = true, npcUpkeep = "auto" } = {}) {
  if ( !upkeepRule ) return "off";
  if ( actor.type === "npc" && actor.system?.allied !== true ) return ["auto", "manual", "prompt"].includes(npcUpkeep) ? npcUpkeep : "auto";
  return "prompt";
}

/** "auto" mode: keep jutsu in listed order while chakra allows. */
export function autoKeep(options) {
  let cp = options.cp;
  const keep = [];
  for ( const j of options.jutsu ) if ( j.cost <= cp ) { cp -= j.cost; keep.push(j.id); }
  return keep;
}
