/**
 * NPCs: adversaries, allies, summons, clones and companions.
 *
 * Two builds (details.build):
 *   - "adversary": the Bingo Book's method (NPC1). The profile (level, class, role, rank, Iconic/Epic,
 *     armor type, assigned ability modifiers, party size) gives every number through
 *     rules/adversary.mjs. Adversaries hold ability modifiers, not scores. Any number can be overridden
 *     (system.adversary.overrides, hpMax, cpMax); Active Effects, rule elements and conditions still
 *     apply on top. Equipped armor does not change AC or DR.
 *   - "character": player-style, the formulas characters use, with level, Hit and Chakra Dice typed on
 *     the NPC. Friendly NPCs may use either (the book's Allies section); summons, clones and companions
 *     use this one.
 * Shared: level is typed (details.level); hpMax / cpMax replace the computed pool when set;
 * diesAtZero; allied (player-controlled summons).
 */
import CreatureData from "./creature.mjs";
import * as S from "../fields/shared.mjs";
import { poolMax } from "../../rules/progression.mjs";
import { dieFaces } from "../../rules/formula.mjs";
import { Breakdown } from "../../rules/breakdown.mjs";
import { rule } from "../../rules/settings.mjs";
import {
  ABILITY_KEYS, adversaryProf, adversaryPools, adversaryAC, adversaryDR, adversaryParts, adversarySpeedBonus,
  autoFailsSaves, fullSaves, abilityBudget, statLine, suggestedCounts, adversaryWarnings
} from "../../rules/adversary.mjs";
import { adversaryClasses, rankTable } from "../../config/adversary.mjs";

const numbers = keys => S.obj(Object.fromEntries(keys.map(k => [k, S.num(null)])));
const DISCIPLINE_KEYS = ["nin", "tai", "gen", "freeform"];

export default class NPCData extends CreatureData {

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.details = S.obj({
      biography: S.html(),
      /** One line under the name. */
      blurb: S.str(),
      /** The builder's Step 1: what this adversary does in a fight (GM only; NPC2). */
      concept: S.str(),
      publicNotes: S.html(),
      /** Shown to GMs only. */
      privateNotes: S.html(),
      build: S.str({ initial: "adversary" }),      // CONFIG.N5E.adversaryBuilds; saved NPCs without it stay "character" (migrateData)
      level: S.int(1, { min: 0, max: 30 }),
      rank: S.str({ initial: "D" }),
      class: S.str({ initial: "standard" }),       // CONFIG.N5E.adversaryClasses
      role: S.str({ initial: "none" }),            // CONFIG.N5E.adversaryRoles
      clan: S.str(),                               // clan or species
      affiliation: S.str(),
      iconic: S.bool(false),
      epic: S.bool(false),
      template: S.str({ initial: "none" }),       // none|summon|clone|companion
      summoner: S.str(),                          // actor uuid
      summonRole: S.str(),
      tribe: S.str(),
      creatureType: S.str({ initial: "humanoid" })
    });
    /** The adversary build's inputs. Ignored by the player-style build. */
    schema.adversary = S.obj({
      mods: S.obj(Object.fromEntries(ABILITY_KEYS.map(k => [k, S.int(0, { min: -5, max: 20 })]))),
      /** Fully proficient saves the GM picked; empty = the highest modifiers. */
      fullSaves: S.arr(S.str()),
      armor: S.str({ initial: "light" }),
      hpSource: S.str({ initial: "formula" }),     // CONFIG.N5E.hpSources
      partySize: S.int(4, { min: 0, max: 12 }),
      /** Suggested ability points equal to Rank; optional and off to start (King Q-N17). */
      rankBonus: S.bool(false),
      /** The ability of the Weapon/Freeform line. */
      freeformAbility: S.str({ initial: "str" }),
      /** A number here replaces the computed one for that statistic only. */
      overrides: S.obj({
        prof: S.num(null), ac: S.num(null), dr: S.num(null), initiative: S.num(null), speed: S.num(null), passivePerception: S.num(null),
        saves: numbers(ABILITY_KEYS), attack: numbers(DISCIPLINE_KEYS), dc: numbers(DISCIPLINE_KEYS),
        skills: new (globalThis.foundry.data.fields.TypedObjectField)(S.num(null))
      })
    });
    /** Situational skill bonuses (NPC1c C3): listed unticked in the roll dialog for that skill. */
    schema.situational = S.arr(S.obj({ skill: S.str(), value: S.int(0), when: S.str() }));
    /**
     * What the players can learn (NPC1c C4-C6; King Q-N21-Q-N24). entries: what the GM put in the
     * list (an item on this NPC, a statistic, or a note); learned: the entry ids the party knows.
     */
    schema.knowledge = S.obj({
      entries: S.arr(S.obj({ id: S.str(), kind: S.str({ initial: "text" }), ref: S.str(), label: S.str(), note: S.str() })),
      learned: S.arr(S.str())
    });
    schema.hitDie = S.str({ initial: "d8" });
    schema.chakraDie = S.str({ initial: "d8" });
    /** Stated pool maximums; null = computed (the adversary formula, or the level formula). */
    schema.hpMax = S.num(null, { min: 0 });
    schema.cpMax = S.num(null, { min: 0 });
    schema.jutsuSlots = S.resourcePool({ label: "Jutsu Slots", recoveryOn: "lr" });
    schema.diesAtZero = S.bool(true);
    /** Allied NPC (King 2026-11-13): player-summoned and player-controlled. Set on the summon's token delta. */
    schema.allied = S.bool(false);
    return schema;
  }

  /**
   * @override
   * Before NPC1 details.role held the class (minion...solo). It moves to details.class, and NPCs
   * saved before the adversary build existed stay player-style.
   */
  static migrateData(source) {
    const d = source?.details;
    if ( d && typeof d === "object" ) {
      if ( d.role in adversaryClasses ) {
        if ( d.class === undefined ) d.class = d.role;
        d.role = "none";
      }
      if ( d.build === undefined ) d.build = "character";
    }
    return super.migrateData(source);
  }

  get isAdversary() {
    return this.details.build === "adversary";
  }

  /** The profile rules/adversary.mjs reads. */
  get adversaryProfile() {
    const a = this.adversary;
    const players = rule("adversaryPartySize") === "manual" ? a.partySize
      : (globalThis.game?.users?.filter?.(u => !u.isGM && u.character).length || a.partySize);
    return { level: this.details.level, class: this.details.class, role: this.details.role, rank: this.details.rank,
      iconic: this.details.iconic, epic: this.details.epic, armor: a.armor, mods: a.mods, fullSaves: a.fullSaves,
      hpSource: a.hpSource, rankBonus: a.rankBonus, players };
  }

  /** @override */
  _computeLevel() {
    return Math.max(0, this.details.level ?? 1);
  }

  /**
   * @override
   * Adversaries: scores follow the assigned modifiers (10 + 2 x modifier, so everything that reads a
   * score or a modifier agrees), proficiency comes from the adversary table, and saves are fully or
   * half proficient by level. Runs before Active Effects, so effects still change these.
   */
  prepareBaseData() {
    super.prepareBaseData();
    this.autoFailSaves = false;
    this.adversaryBuild = null;
    if ( !this.isAdversary ) return;
    const p = this.adversaryProfile;
    const o = this.adversary.overrides;
    this.prof = o.prof ?? adversaryProf(p.level);
    for ( const key of ABILITY_KEYS ) this.abilities[key].value = 10 + 2 * (p.mods[key] ?? 0);
    const full = fullSaves(p);
    for ( const key of ABILITY_KEYS ) this.saves[key].proficient = full.includes(key);
    this.bonuses.speed += adversarySpeedBonus(p);
    this.autoFailSaves = autoFailsSaves(p.class);
    /** What the sheet shows beside the numbers: baseline line, budget, suggested counts, notes. */
    this.adversaryBuild = { profile: p, statLine: statLine(p.level, p.class), budget: abilityBudget(p), fullSaves: full,
      suggested: suggestedCounts(p), warnings: adversaryWarnings(p), baselines: {}, freeform: null };
  }

  /** @override  Equipped armor, Reinforced and Blocking don't change an adversary's AC or DR (King Q-N8). */
  _collectItemGrants(items) {
    const g = super._collectItemGrants(items);
    if ( this.isAdversary ) Object.assign(g, { armor: null, reinforced: 0, blocking: 0 });
    return g;
  }

  /** @override */
  _statParts(kind) {
    if ( !this.isAdversary ) return [];
    if ( kind === "dr" ) return adversaryDR(this.adversaryProfile);
    return adversaryParts(kind, this.adversaryProfile);
  }

  /** @override */
  _statOverride(key) {
    if ( !this.isAdversary ) return null;
    const o = this.adversary.overrides;
    const [group, id] = key.split(".");
    if ( group === "save" ) return o.saves[id];
    if ( group === "attack" || group === "dc" ) return o[group][id];
    if ( group === "skill" ) return o.skills?.[id] ?? null;
    if ( group === "passive" ) return id === "prc" ? o.passivePerception : null;
    return o[group] ?? null;
  }

  /** @override  The table AC by level and armor type, or the stated AC; effects and conditions on top. */
  _baseAC({ bonus = 0, penalty = 0 } = {}) {
    if ( !this.isAdversary ) return null;
    const b = new Breakdown("Armor Class");
    b.parts.push(...adversaryAC(this.adversaryProfile));
    b.override(this.adversary.overrides.ac);
    if ( b.baseline != null ) this.adversaryBuild.baselines.ac = b.baseline;
    const base = b.total;
    b.add("Bonuses", bonus);
    return { value: base + bonus + penalty, base, calc: "adversary", parts: b.parts.map(x => ({ ...x })) };
  }

  /**
   * @override
   * Adversary: the book's formula or Lazy GM table (Hit and Chakra Points are the same value; a Minion
   * has no Chakra). Player-style: the NPC's own dice and level. hpMax / cpMax replace either.
   */
  _preparePools({ conMod }) {
    if ( this.isAdversary ) {
      const pools = adversaryPools({ ...this.adversaryProfile, mods: { ...this.adversary.mods, con: conMod } });
      for ( const [key, label] of [["hp", "Hit Points"], ["cp", "Chakra Points"]] ) {
        const b = new Breakdown(label);
        if ( key === "cp" && !pools.cp ) b.base("No Chakra pool", 0);
        else b.parts.push(...pools.parts.map((x, i) => ({ ...x, base: i === 0 })));
        b.override(this[`${key}Max`], "Stated");
        this.adversaryBuild.baselines[key] = pools[key];
        b.add("Bonuses", this.bonuses[`${key}Max`]);
        this[key].max = Math.max(0, b.total);
        this.breakdowns[`${key}.max`] = b;
      }
      // Hit and Chakra Dice by Rank (Adversary Rank Modifications).
      const die = rankTable[this.details.rank]?.die ?? "d6";
      for ( const dice of [this.hitDice, this.chakraDice] ) Object.assign(dice, { max: this.level, die, value: Math.max(0, this.level - dice.spent) });
      return;
    }
    const hitFaces = dieFaces(this.hitDie);
    const chakraFaces = dieFaces(this.chakraDie);
    super._preparePools({ hitFaces, chakraFaces, conMod });
    if ( this.hpMax != null ) {
      this.hp.max = this.hpMax + this.bonuses.hpMax;
      this.breakdowns["hp.max"] = new Breakdown("Hit Points").base("Stat block", this.hpMax).add("Bonuses", this.bonuses.hpMax);
    }
    if ( this.cpMax != null ) {
      this.cp.max = this.cpMax + this.bonuses.cpMax;
      this.breakdowns["cp.max"] = new Breakdown("Chakra Points").base("Stat block", this.cpMax).add("Bonuses", this.bonuses.cpMax);
    }
    if ( !this.level && this.hpMax == null ) this.hp.max = poolMax({ level: 0 });
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.jutsuSlots.maxValue = Number(this.jutsuSlots.max) || 0;
    if ( !this.isAdversary ) return;
    // The Weapon/Freeform line: proficiency + any ability the GM picks; DC 8 + proficiency + that ability.
    const o = this.adversary.overrides;
    const key = ABILITY_KEYS.includes(this.adversary.freeformAbility) ? this.adversary.freeformAbility : "str";
    const mod = this.abilities[key]?.mod ?? 0;
    const label = key.toUpperCase();
    const attack = (this.breakdowns["freeform.attack"] = new Breakdown("Weapon/Freeform attack")).base(label, mod).add("Proficiency", this.prof)
      .addAll(adversaryParts("attack", this.adversaryProfile)).override(o.attack.freeform)
      .addAll(this.conditionPenalties?.sources?.allDice ?? []).addAll(this.conditionPenalties?.sources?.checksAndAttacks ?? []);
    const dc = (this.breakdowns["freeform.dc"] = new Breakdown("Freeform save DC")).base("Base", 8).add(label, mod).add("Proficiency", this.prof)
      .addAll(adversaryParts("dc", this.adversaryProfile)).override(o.dc.freeform)
      .add("Effects", this.modifiers?.saveDC?.all ?? 0).addAll(this.conditionPenalties?.sources?.saveDC ?? []);
    this.adversaryBuild.freeform = { ability: key, attack: attack.total, dc: dc.total };
    // What each overridden number would be without the override.
    for ( const [k, b] of Object.entries(this.breakdowns) ) if ( b.baseline != null ) this.adversaryBuild.baselines[k] = b.baseline;
  }
}
