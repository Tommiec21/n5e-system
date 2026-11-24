/**
 * Auras and zones (ENG1d; docs/ENG1_SPEC.md). An Active Effect with flags.n5e.aura on a creature
 * gives its child effect to the creatures within its radius:
 *   aura {radius (ft), who: "hostile" | "friendly" | "all", includeSelf, effect: {name, changes, rules}}
 *   also [{who, effect}]  AMP1f batch 4 (King Q-F15): more creatures the same aura gives another effect to
 *               (Aura of Power: allies get the Amp, hostile creatures a −2 penalty); never the bearer
 * The child carries flags.n5e.auraFrom = the aura effect's uuid; it is added when a creature is in
 * range and removed when it leaves or the aura ends. Pure: what should change, from plain data.
 */

/** Does a creature of this disposition count for the aura (token dispositions: 1 friendly, -1 hostile, 0 neutral)? */
export function auraCounts(who, sourceDisposition, otherDisposition) {
  if ( who === "all" ) return true;
  const same = sourceDisposition === otherDisposition;
  if ( who === "friendly" ) return same;
  return !same && otherDisposition !== 0 && sourceDisposition !== 0;
}

/**
 * AMP1f batch 4: an aura's `also` groups as auras of their own ("<uuid>#also<i>"), so the plan below
 * handles each like any aura. Pure.
 */
export function expandAuras(auras) {
  return auras.flatMap(a => [a, ...(Array.isArray(a.aura?.also) ? a.aura.also : []).map((x, i) => ({
    ...a, uuid: `${a.uuid}#also${i}`, aura: { radius: a.aura.radius, who: x.who ?? "hostile", includeSelf: false, effect: x.effect ?? {} } }))]);
}

/**
 * @param {{uuid, actorUuid, disposition, aura}[]} auras        active aura effects with their token's facts
 * @param {{actorUuid, disposition, distanceTo: (actorUuid) => number, children: {auraFrom, effectId}[]}[]} creatures
 * @returns {{add: {actorUuid, auraUuid}[], remove: {actorUuid, effectId}[]}}
 */
export function auraPlan(auras, creatures) {
  const add = [], remove = [];
  const live = new Set(auras.map(a => a.uuid));
  for ( const c of creatures ) {
    const want = new Set();
    for ( const a of auras ) {
      const self = a.actorUuid === c.actorUuid;
      if ( self && !a.aura.includeSelf ) continue;
      if ( !self && !auraCounts(a.aura.who ?? "hostile", a.disposition, c.disposition) ) continue;
      if ( !self && !(c.distanceTo(a.actorUuid) <= Number(a.aura.radius)) ) continue;
      want.add(a.uuid);
    }
    const have = new Set(c.children.map(ch => ch.auraFrom));
    for ( const uuid of want ) if ( !have.has(uuid) ) add.push({ actorUuid: c.actorUuid, auraUuid: uuid });
    for ( const ch of c.children ) if ( !want.has(ch.auraFrom) || !live.has(ch.auraFrom) ) remove.push({ actorUuid: c.actorUuid, effectId: ch.effectId });
  }
  return { add, remove };
}
