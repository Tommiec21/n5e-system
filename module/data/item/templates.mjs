/**
 * Item schema templates, composed into each item type's defineSchema():
 *   base         every item: identifier, description, source
 *   physical     Bulk, price, rank, quantity, equipped, location
 *   activatable  Activation, Range/Area, Duration, Uses, Activities
 */
import * as S from "../fields/shared.mjs";

export function baseFields() {
  return {
    identifier: S.str(),
    description: S.html(),
    source: S.source()
  };
}

export function physicalFields() {
  return {
    quantity: S.int(1, { min: 0 }),
    bulk: S.num(1, { min: 0 }),
    price: S.int(0, { min: 0 }),
    rank: S.str(),                         // "" for unranked gear
    equipped: S.bool(),
    location: S.str({ initial: "carried" }) // carried | stored (sealed in a scroll, left at home)
  };
}

export function activatableFields() {
  return {
    activation: S.activation(),
    target: S.rangeArea(),
    duration: S.duration(),
    uses: S.uses(),
    activities: S.activities(),
    featureType: S.str({ initial: "active" })
  };
}

/** Enhancement Seals: data rows on weapons and armor (not separate items). */
export function sealFields() {
  return {
    name: S.str(),
    rank: S.str({ initial: "D" }),
    slots: S.int(1, { min: 0 }),
    effect: S.str(),
    charges: S.int(0, { min: 0 })
  };
}

/** A key -> rank map for ranked properties (non-ranked properties store 1). */
export function propertyMap() {
  return new (foundry.data.fields.TypedObjectField)(S.int(1, { min: 0 }));
}

/** Skill/tool grant block used by class, clan, background. */
export function grantChoice() {
  return S.obj({ fixed: S.set(), choose: S.int(0, { min: 0 }), from: S.set(), chosen: S.set() });
}

/** Resource pool definitions an item adds to its owner (class/subclass/clan/feat). */
export function poolDefinitions() {
  return S.arr(S.obj({ id: S.str(), ...S.resourcePoolFields() }));
}
