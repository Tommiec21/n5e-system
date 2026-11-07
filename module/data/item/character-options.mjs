/**
 * Advancement item types: class, subclass, clan, background. Plus feat and stance.
 * Source: KB 09, 12, 13.
 */
import * as S from "../fields/shared.mjs";
import { baseFields, activatableFields, grantChoice, poolDefinitions } from "./templates.mjs";
import { maxRankForLevel } from "../../rules/progression.mjs";

const TDM = () => foundry.abstract.TypeDataModel;
const twenty = (element) => S.arr(element);

export class ClassData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      levels: S.int(1, { min: 0, max: 20 }),
      hitDie: S.str({ initial: "d8" }),
      chakraDie: S.str({ initial: "d8" }),
      jutsuTier: S.str({ initial: "medium" }),
      saves: S.set(),
      skills: grantChoice(),
      tools: grantChoice(),
      armorProficiencies: S.set(),
      weaponProficiencies: S.set(),
      /** 20 entries, index 0 = level 1. Empty = system default. */
      jutsuKnown: twenty(S.int(0, { min: 0 })),
      maxRank: twenty(S.str()),
      columns: S.arr(S.obj({ key: S.str(), label: S.str(), values: twenty(S.str()) })),
      resourcePools: poolDefinitions(),
      subclassLevel: S.int(3, { min: 1, max: 20 }),
      subclassFeatureLevels: S.arr(S.int(1)),
      stanceGrant: S.str(),
      advancement: S.advancement()
    };
  }

  /** Highest rank castable at a level (class table, else the shared D1/C5/B9/A13/S17 default). */
  maxRankAt(level) {
    return this.maxRank?.[level - 1] || maxRankForLevel(level);
  }

  /** Column value at a level (e.g. Martial Die count). */
  columnAt(key, level = this.levels) {
    return this.columns.find(c => c.key === key)?.values?.[level - 1] ?? null;
  }

  prepareDerivedData() {
    this.jutsuKnownNow = this.jutsuKnown?.[this.levels - 1] ?? null;
    this.maxRankNow = this.maxRankAt(this.levels || 1);
  }
}

export class SubclassData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      classIdentifier: S.str(),
      resourcePools: poolDefinitions(),
      advancement: S.advancement()
    };
  }
}

export class ClanData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      asi: S.obj({
        mode: S.str({ initial: "choose" }),            // choose: +2 any, +1 different
        plus2: S.str(), plus1: S.str(),
        recommended: S.arr(S.str())
      }),
      speed: S.int(30, { min: 0 }),
      skills: grantChoice(),
      affinities: grantChoice(),
      languages: S.set(),
      hijutsuAbilities: S.set(),                        // Hijutsu Flexibility, e.g. ["int","wis"]
      branches: S.set(),                                // e.g. main, side (Hyuga)
      branch: S.str(),
      resourcePools: poolDefinitions(),
      jutsuList: S.str(),                               // compendium / folder reference for Hijutsu
      /** Clan-scoped conditions (King ruling): same shape as CONFIG.N5E.conditions entries. */
      conditions: S.arr(S.obj({
        key: S.str(), label: S.str(), tags: S.set(), maxRanks: S.num(null, { min: 0 }), persists: S.bool(),
        text: S.str(), icon: S.str({ initial: "icons/svg/aura.svg" }),
        /** Numeric penalties, same keys as core conditions (ac, saveDC, damageTaken, d20Physical...). */
        flat: S.obj({ ac: S.int(0), saveDC: S.int(0), damageTaken: S.int(0) }),
        perRank: S.obj({ ac: S.int(0), saveDC: S.int(0), damageTaken: S.int(0) })
      })),
      keywords: S.set(),                                // unique/branch keywords this clan unlocks
      advancement: S.advancement()
    };
  }
}

export class BackgroundData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      skills: S.set(),
      tool: S.str(),
      equipment: S.str(),
      feature: S.html(),
      feat: S.str(),                                    // uuid
      featCategory: S.str({ initial: "general" }),      // General or Skill
      advancement: S.advancement()
    };
  }
}

export class FeatData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...activatableFields(),
      category: S.str({ initial: "general" }),         // CONFIG.N5E.featCategories
      prerequisites: S.arr(S.str()),
      requirement: S.obj({ level: S.int(0, { min: 0 }), class: S.str(), clan: S.str() }),
      tags: S.set(),                                    // e.g. dojutsu
      asi: S.obj({ options: S.set(), amount: S.int(0, { min: 0 }) }),
      grants: S.obj({
        mastery: S.set(),                               // mastery targets
        proficiencies: S.set(),
        jutsu: S.arr(S.str()),                          // uuids
        keywords: S.set()
      }),
      resourcePools: poolDefinitions(),
      advancement: S.advancement()
    };
  }
}

export class StanceData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...activatableFields(),
      categories: S.set(),                              // taijutsu | bukijutsu | chakra | clan (multi allowed)
      requirement: S.str(),
      unarmedDie: S.str(),
      upgrades: S.obj({ 5: S.html(), 10: S.html() }),
      evocation: S.html(),
      /** Placeholder: "Expertise" was a failed experiment, kept until replaced (King ruling). */
      expertise: S.html()
    };
  }
}
