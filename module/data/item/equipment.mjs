/**
 * Physical item types: weapon, armor, consumable, toolkit, container, loot (KB 08).
 *
 * Properties are a key -> rank map (properties.reinforced = 2, properties.finesse = 1); the property
 * list itself is CONFIG.N5E.weaponProperties / armorProperties (module/config/equipment.mjs).
 * Equipped armor, weapons and containers feed the actor's grants (AC, Reinforced DR, Blocking,
 * storage slots) in creature.mjs _collectItemGrants.
 */
import * as S from "../fields/shared.mjs";
import { baseFields, physicalFields, activatableFields, sealFields, propertyMap } from "./templates.mjs";
import { armorCategories, sealSlots, containerTypes, ammoDie } from "../../config/equipment.mjs";
import { toolkitRules } from "../../config/core.mjs";

const TDM = () => foundry.abstract.TypeDataModel;

/** Seal slots: 3 inherent, +1 High Quality (KB 08). Seal charges merge into one shared pool. */
function prepareSeals(sys) {
  sys.sealSlots = {
    max: sealSlots.base + (sys.properties?.highQuality ? sealSlots.highQualityBonus : 0) + (sys.extraSealSlots ?? 0),
    used: sys.seals.reduce((a, s) => a + (s.slots || 0), 0)
  };
  sys.sealCharges = sys.seals.reduce((a, s) => a + (s.charges || 0), 0);
}

/**
 * Weapons. Attacks: workflow/attack.mjs (melee Str, ranged Dex, finesse/thrown the better).
 * ammo.usesDie: the Ammunition Die (d8 → d6 → d4 → 1 → gone), stepping down on a 1-2; `step` is the
 * index into `steps` and is the only part that changes in play.
 */
export class WeaponData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...physicalFields(),
      ...activatableFields(),
      category: S.str({ initial: "simple" }),        // simple | martial | exotic
      weaponType: S.str({ initial: "melee" }),       // melee | ranged
      groups: S.set(),
      damage: S.obj({ die: S.str({ initial: "1d4" }), types: S.set(), versatile: S.str() }),
      properties: propertyMap(),
      range: S.obj({ normal: S.num(null, { min: 0 }), long: S.num(null, { min: 0 }) }),
      ammo: S.obj({ usesDie: S.bool(), ...S.resourcePoolFields({ label: "Ammunition Die" }) }),
      proficient: S.bool(true),
      seals: S.arr(S.obj(sealFields())),
      extraSealSlots: S.int(0, { min: 0 })
    };
  }

  /** @override */
  static migrateData(source) {
    // Ammo die defaults to the d8 -> d6 -> d4 -> 1 -> gone ladder.
    if ( source.ammo?.usesDie && !source.ammo.steps?.length ) source.ammo.steps = [...ammoDie.steps];
    return super.migrateData(source);
  }

  prepareDerivedData() {
    prepareSeals(this);
    this.ammo.current = this.ammo.usesDie ? (this.ammo.steps[this.ammo.step] ?? 0) : null;
  }
}

/** Armor: AC bonus, Dex cap (by category unless set), Strength requirement (Heavyweight X). */
export class ArmorData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...physicalFields(),
      category: S.str({ initial: "light" }),          // light | medium | heavy
      armor: S.obj({ value: S.int(1, { min: 0 }), dexCap: S.num(null, { min: 0 }) }),
      properties: propertyMap(),
      strRequirement: S.num(null, { min: 0 }),
      proficient: S.bool(true),
      seals: S.arr(S.obj(sealFields())),
      extraSealSlots: S.int(0, { min: 0 })
    };
  }

  prepareDerivedData() {
    this.dexCap = this.armor.dexCap ?? armorCategories[this.category]?.dexCap ?? null;
    this.strRequirement ??= this.properties?.heavyweight || null;
    prepareSeals(this);
  }
}

export class ConsumableData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...physicalFields(),
      ...activatableFields(),
      subtype: S.str({ initial: "gear" }),           // CONFIG.N5E.consumableTypes
      perRank: S.arr(S.obj({ rank: S.str(), text: S.str(), formula: S.formula(), dc: S.num(null) })),
      /** e.g. Chakra Pill "twice per rest". */
      limit: S.obj({ max: S.int(0, { min: 0 }), per: S.str() }),
      destroyOnEmpty: S.bool(true)
    };
  }
}

/** Toolkits: charges by kit rank, spent by skill actions that need the kit (KB 08). */
export class ToolkitData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...physicalFields(),
      kit: S.str(),                                    // CONFIG.N5E.toolkits key
      charges: S.resourcePool({ label: "Charges", recoveryOn: "never" }),
      functions: S.activities()
    };
  }

  prepareDerivedData() {
    // Charges by kit rank (D 5, C 6, B 7, A 8); no recovery (King ruling).
    const byRank = toolkitRules.chargesByRank[this.rank];
    this.charges.maxValue = Number(this.charges.max) || byRank || 0;
  }
}

/** Storage (backpacks, scrolls...): one equipped container per type adds its slots. */
export class ContainerData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...physicalFields(),
      containerType: S.str({ initial: "backpack" }),
      slots: S.num(null, { min: 0 }),
      sealsBulk: S.num(null, { min: 0 })
    };
  }

  prepareDerivedData() {
    this.slots ??= containerTypes[this.containerType]?.slots ?? 0;
  }
}

export class LootData extends TDM() {
  static defineSchema() {
    return { ...baseFields(), ...physicalFields() };
  }
}
