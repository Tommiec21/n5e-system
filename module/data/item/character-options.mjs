/**
 * Advancement item types: class, subclass, clan, background. Plus feat and stance.
 * Source: KB 09, 12, 13.
 *
 * How level-ups use these: each item's `advancement` array lists what it grants at which level
 * (features, choices, ASIs, Mastery, pools, traits). The level-up dialog (applications/level-up.mjs)
 * walks those entries for the new level; advancement/manager.mjs applies the choices and records
 * them so "Remove level" can undo exactly that level. The derived-data pipeline also reads Mastery
 * and trait entries directly (creature.mjs _collectItemGrants), so editing an advancement entry on
 * an owned item takes effect at once.
 *
 * Automation data (activities, effects, feature choices, cast options) for imported features and
 * stances comes from tools/content/automation.py; see docs/DEVELOPER.md, "Automating content".
 */
import * as S from "../fields/shared.mjs";
import { baseFields, activatableFields, grantChoice, poolDefinitions } from "./templates.mjs";
import { maxRankForLevel } from "../../rules/progression.mjs";

const TDM = () => foundry.abstract.TypeDataModel;
const twenty = (element) => S.arr(element);

/**
 * A class (one per character in v1). `levels` is the class level; the character's level is the sum
 * over class items. Class table columns (Superiority Dice, Maneuvers Known...) are `columns`, and
 * formulas read the current level's value as @scale.<classCamelCase>.<column key>.
 */
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
      /** Subclass uuids offered at subclassLevel. */
      subclasses: S.arr(S.str()),
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

  /** Current-level values for the sheet and level-up checks. */
  prepareDerivedData() {
    this.jutsuKnownNow = this.jutsuKnown?.[this.levels - 1] ?? null;
    this.maxRankNow = this.maxRankAt(this.levels || 1);
  }
}

/** A subclass (Assault Scout, Blaze Walker...). Its advancement levels follow the class's levels. */
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

/** A clan: ASI, speed, skills, affinities, Hijutsu, clan-only conditions and keywords. */
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
      hijutsuChoice: S.str(),                           // player's pick; "" = use the higher (default)
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

/**
 * Feats AND class/clan features (category says which: "classFeature", "classOption", "clanFeature",
 * or a feat category like "skill", "taijutsu"). Tags group class options (nin-molding,
 * assault-maneuver, scout-path, scout-generalization) and drive costs (rules/resource-cost.mjs).
 *   grants.mastery         Mastery targets ("skill.nin")
 *   grants.proficiencies   "skill.ill" / "tool.disguise": proficiency, or Mastery if already proficient
 *   identifier             stable id code looks for (rules/features.mjs: "extra-attack", "switch-hitter"...)
 * Optional flags.n5e: choice {label, options, value} (a picker on the Features tab), castOption /
 * castOptions (cast-dialog options; rules/cast-options.mjs).
 */
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

/**
 * A Fighting Stance. Only one is active (system.combat.activeStance holds its item id).
 * While active: its transfer effects apply (documents/active-effect.mjs isSuppressed), its Unarmed
 * die/type rules apply (rules/unarmed.mjs), and its activities (strikes) appear on the Combat tab.
 * Taijutsu stances make the Unarmed die a d6 unless unarmedDie says otherwise.
 * Optional flags.n5e.weaponDie {mod, property}: a modifier on weapon damage dice (Great Weapon: "r<3").
 */
export class StanceData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ...activatableFields(),
      categories: S.set(),                              // taijutsu | bukijutsu | chakra | clan (multi allowed)
      requirement: S.str(),
      unarmedDie: S.str(),
      unarmedType: S.str(),
      /** A better die with an item ("Combat Bracers") and, optionally, an ability requirement. */
      unarmedAlt: S.obj({ die: S.str(), item: S.str(), ability: S.str() }),
      upgrades: S.obj({ 5: S.html(), 10: S.html() }),
      evocation: S.html(),
      /** Placeholder: "Expertise" was a failed experiment, kept until replaced (King ruling). */
      expertise: S.html()
    };
  }
}
