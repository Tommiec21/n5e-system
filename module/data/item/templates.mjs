/**
 * Item schema templates, composed into each item type's defineSchema():
 *   base         every item: identifier, description, source
 *   physical     Bulk, price, rank, quantity, equipped, location
 *   activatable  Activation, Range/Area, Duration, Uses, Activities
 *
 * A new field that several item types need goes here, so every type that composes the template gets
 * it. A field for one type goes in that type's own defineSchema. Field builders (S.*) are in
 * module/data/fields/shared.mjs.
 */
import * as S from "../fields/shared.mjs";

/**
 * Fields every item type has: identifier (stable slug other data refers to, e.g. "superior-assault"
 * in rules/features.mjs, "scout-nin" for @scale formulas), description (rich text), source (book, page).
 */
export function baseFields() {
  return {
    identifier: S.str(),
    description: S.html(),
    source: S.source()
  };
}

/** Fields every physical item has: quantity, Bulk, location (carried/stored), equipped, value... */
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

/**
 * Anything that can be used: jutsu, features, stances, consumables, weapons.
 *   activities   what pressing its buttons does (attack, save, damage, strike, effect...; see
 *                activityFields in fields/shared.mjs). When empty, the text is parsed instead
 *                (rules/activity-parse.mjs). Authored activities always win over parsing.
 *   featureType  "passive" hides the Use button.
 */
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
