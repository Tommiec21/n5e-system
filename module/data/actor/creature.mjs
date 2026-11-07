/**
 * Shared creature model for characters and NPCs: stored schema + the fixed derived-data pipeline.
 *
 * Derived-data order (Phase 1 plan, section 10):
 *   1  base data: level, proficiency                                  prepareBaseData
 *   2  item contributions: class/clan/background grants, armor, containers
 *   3  effects pass 1: core Active Effects on stored fields (Foundry applies these between
 *      prepareBaseData and prepareDerivedData)
 *   4  abilities: modifiers
 *   5  pools: HP/CP max, dice, resource pool maxes
 *   6  proficiency-based numbers: saves, skills, passives, initiative, disciplines, Mastery
 *   7  effects pass 2: n5e.* change keys + condition rank penalties
 *   8  final caps: crit range, Mastery cap, AC/DC penalties
 *   9  computed states: Bloodied, Drained, Encumbered, In Combat
 *  10  item-side derived: each jutsu's live cost, DC, attack, upcast range
 * Steps 7 and 8 values are gathered first (they are pure lookups) and applied where each number is built,
 * so every modifier lands at a predictable point.
 */
import * as S from "../fields/shared.mjs";
import { abilities, skills, toolkits, castingDisciplines, disciplines, dcTables } from "../../config/core.mjs";
import { critRangeCap } from "../../config/combat.mjs";
import { containerTypes } from "../../config/equipment.mjs";
import {
  abilityMod, proficiencyForLevel, masteryRank, masteryBonus, poolMax, inventorySlots, asiCount, masteryCap
} from "../../rules/progression.mjs";
import { aggregatePenalties } from "../../rules/conditions.mjs";
import { computeAC } from "../../rules/ac.mjs";
import { evaluateFormula, dieFaces } from "../../rules/formula.mjs";
import { parseN5eChanges } from "../../rules/change-keys.mjs";

const F = () => foundry.data.fields;

export default class CreatureData extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    const abilityFields = {};
    for ( const key of Object.keys(abilities) ) abilityFields[key] = S.obj({ value: S.int(10, { min: 0, max: 30 }) });
    const saveFields = {};
    for ( const key of Object.keys(abilities) ) saveFields[key] = S.obj({ proficient: S.bool() });
    const skillFields = {};
    for ( const [key, cfg] of Object.entries(skills) ) {
      skillFields[key] = S.obj({ proficient: S.bool(), ability: S.str({ initial: cfg.ability }), bonus: S.formula() });
    }
    const toolFields = {};
    for ( const key of Object.keys(toolkits) ) toolFields[key] = S.obj({ proficient: S.bool() });
    const disciplineFields = {};
    for ( const key of castingDisciplines ) {
      disciplineFields[key] = S.obj({ ability: S.str({ initial: disciplines[key].ability }) });
    }
    const senseFields = {};
    for ( const key of ["blindsight", "chakraSensing", "chakraSight", "darkvision", "tremorSense", "trueSight",
      "heatSense", "waterSense"] ) senseFields[key] = S.int(0, { min: 0 });
    const discNumbers = () => S.obj({ nin: S.int(0), tai: S.int(0), gen: S.int(0) });

    return {
      abilities: S.obj(abilityFields),
      saves: S.obj(saveFields),
      skills: S.obj(skillFields),
      tools: S.obj(toolFields),
      mastery: S.obj({ sources: S.masterySources() }),
      hp: S.obj({ value: S.int(10, { min: 0 }), temp: S.int(0, { min: 0 }) }),
      cp: S.obj({ value: S.int(10, { min: 0 }), temp: S.int(0, { min: 0 }) }),
      hitDice: S.obj({ spent: S.int(0, { min: 0 }) }),
      chakraDice: S.obj({ spent: S.int(0, { min: 0 }) }),
      deathSaves: S.obj({ success: S.int(0, { min: 0, max: 3 }), failure: S.int(0, { min: 0, max: 3 }) }),
      disciplines: S.obj(disciplineFields),
      affinities: S.set(),
      keywordAccess: S.set(),
      attributes: S.obj({
        ac: S.obj({ calc: S.str({ initial: "default" }), flat: S.int(10), formula: S.formula() }),
        init: S.obj({ bonus: S.formula() })
      }),
      traits: S.obj({
        size: S.str({ initial: "medium" }),
        dr: S.int(0, { min: 0 }),
        pierce: S.int(0, { min: 0 }),
        resist: S.set(), vuln: S.set(), immune: S.set(),
        conditionResist: S.set(), conditionImmune: S.set(),
        senses: S.obj(senseFields),
        speed: S.obj({ walk: S.int(30, { min: 0 }), climb: S.int(0, { min: 0 }), swim: S.int(0, { min: 0 }),
          fly: S.int(0, { min: 0 }), burrow: S.int(0, { min: 0 }), hover: S.bool() }),
        languages: S.set()
      }),
      combat: S.obj({
        chain: S.obj({ value: S.int(0, { min: 0, max: 3 }), active: S.bool(), used: S.arr(S.str()) }),
        comboTargets: S.set(),
        fury: S.int(0, { min: 0 }),
        activeStance: S.str(),
        concentrating: S.arr(S.str())
      }),
      resources: new (F().TypedObjectField)(S.resourcePool()),
      willOfFire: S.obj({ value: S.int(1, { min: 0, max: 3 }) }),
      /** Flat bonuses Active Effects can target with ADD (derived numbers can't be targeted directly). */
      bonuses: S.obj({
        ac: S.int(0), initiative: S.int(0), hpMax: S.int(0), cpMax: S.int(0),
        hpPerLevel: S.int(0), cpPerLevel: S.int(0), inventorySlots: S.int(0), speed: S.int(0),
        attack: discNumbers(), saveDC: discNumbers(), save: S.int(0), check: S.int(0)
      }),
      details: S.obj({ biography: S.html() })
    };
  }

  /* -------------------------------------------- */
  /*  Step 1: base data                           */
  /* -------------------------------------------- */

  /** @override */
  prepareBaseData() {
    this.level = this._computeLevel();
    this.prof = proficiencyForLevel(this.level);
    this.derived = { notes: [] };
  }

  /** Overridden by character (class levels) and NPC (stored level). */
  _computeLevel() {
    return 1;
  }

  /* -------------------------------------------- */
  /*  Steps 2-10                                  */
  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    const actor = this.parent;
    const items = actor?.items ?? [];
    const N5E = globalThis.CONFIG?.N5E;

    // Gather step 7 inputs up front (pure lookups).
    const mods = parseN5eChanges(actor?._n5eChanges ?? []);
    const conditionRegistry = { ...(N5E?.conditions ?? {}), ...(N5E?.clanConditions ?? {}) };
    const activeConditions = this._activeConditions();
    const pen = aggregatePenalties(activeConditions, conditionRegistry);
    this.conditionPenalties = pen;
    this.modifiers = mods;
    this.exhaustion = activeConditions.find(c => c.key === "exhaustion")?.ranks ?? 0;

    // Step 2: item contributions.
    const grants = this._collectItemGrants(items);
    this.grants = grants;

    // Step 4: abilities.
    for ( const [key, ability] of Object.entries(this.abilities) ) {
      ability.mod = abilityMod(ability.value);
      ability.category = abilities[key]?.category;
    }
    const mod = key => this.abilities[key]?.mod ?? 0;

    // Roll data used by formulas below.
    const rollData = this.getRollData();

    // Step 5: pools.
    const hitFaces = dieFaces(grants.hitDie);
    const chakraFaces = dieFaces(grants.chakraDie);
    this._preparePools({ hitFaces, chakraFaces, conMod: mod("con") });
    for ( const pool of Object.values(this.resources ?? {}) ) {
      pool.maxValue = Math.max(0, Math.floor(evaluateFormula(pool.max, rollData, 0)));
    }

    // Step 6 + 7: Mastery (sources from actor, items, and n5e.mastery.* effects).
    this._prepareMastery(grants, mods);
    const m = target => this.masteryFor(target).bonus;

    const d20Penalty = abilityKey => {
      const cat = abilities[abilityKey]?.category;
      return pen.allDice + (cat === "physical" ? pen.d20Physical : pen.d20Mental);
    };

    // Saves: mod + prof (or half prof if not proficient) + Mastery.
    for ( const key of Object.keys(abilities) ) {
      const save = this.saves[key];
      save.isProficient = save.proficient || grants.saves.has(key);
      const profPart = save.isProficient ? this.prof : Math.floor(this.prof / 2);
      save.mastery = this.masteryFor(`save.${key}`).rank;
      save.total = mod(key) + profPart + m(`save.${key}`) + this.bonuses.save + d20Penalty(key);
    }

    // Skills and passives.
    for ( const [key, skill] of Object.entries(this.skills) ) {
      skill.isProficient = skill.proficient || grants.skills.has(key);
      skill.mod = mod(skill.ability);
      skill.mastery = this.masteryFor(`skill.${key}`).rank;
      skill.total = skill.mod + (skill.isProficient ? this.prof : 0) + m(`skill.${key}`)
        + evaluateFormula(skill.bonus, rollData, 0) + this.bonuses.check + d20Penalty(skill.ability)
        + pen.checksAndAttacks;
      skill.passive = 10 + skill.total + (key === "prc" ? pen.perception : 0);
    }
    for ( const [key, tool] of Object.entries(this.tools) ) {
      tool.isProficient = tool.proficient || grants.tools.has(key);
      tool.mastery = this.masteryFor(`tool.${key}`).rank;
    }

    // Initiative: Dex + floor(prof / 2) + Mastery.
    this.initiative = {
      total: mod("dex") + Math.floor(this.prof / 2) + m("initiative") + this.bonuses.initiative
        + evaluateFormula(this.attributes.init.bonus, rollData, 0) + d20Penalty("dex")
    };

    // Disciplines: attack = mod + prof; DC = 8 + mod + prof; minus Concussed/Exhaustion on DCs.
    for ( const key of castingDisciplines ) {
      const disc = this.disciplines[key];
      disc.ability = mods.disciplineAbility[key] ?? disc.ability;
      disc.mod = mod(disc.ability);
      disc.attack = disc.mod + this.prof + this.bonuses.attack[key] + (mods.attack[key] ?? 0) + m(`attack.${key}`)
        + pen.allDice + pen.checksAndAttacks;
      disc.dc = dcTables.jutsuSaveBase + disc.mod + this.prof + this.bonuses.saveDC[key]
        + (mods.saveDC[key] ?? 0) + (mods.saveDC.all ?? 0) + pen.saveDC;
    }
    this.disciplines.buki = this.disciplines.tai;

    // Step 8: caps and defenses.
    this.critRange = {};
    for ( const [scope, v] of Object.entries(mods.critRange) ) this.critRange[scope] = Math.min(critRangeCap, v);
    this.dr = Math.max(0, this.traits.dr + grants.reinforced + mods.dr + pen.dr);
    this.pierce = this.traits.pierce + mods.pierce;
    const ac = computeAC({
      calc: this.attributes.ac.calc, dexMod: mod("dex"), prof: this.prof, armor: grants.armor,
      flat: this.attributes.ac.flat, formula: this.attributes.ac.formula, rollData,
      blocking: grants.blocking, bonus: this.bonuses.ac, penalty: pen.ac
    });
    this.ac = ac;
    this.concentration = {
      max: 2 + mods.concentrationMax,
      check: (this.skills.cha?.total ?? mod("con")),
      dcBase: dcTables.concentration.base
    };
    this.saveTierShift = mods.saveTierShift;

    // Step 9: inventory and computed states.
    const slots = inventorySlots(mod("str"), grants.containerSlots + this.bonuses.inventorySlots);
    // Encumbered: carried Bulk over slots, or armor whose Heavyweight (X) Strength isn't met (King 2026-11-07).
    const req = grants.armor?.strRequirement;
    const encumberedBy = [];
    if ( grants.bulk > slots ) encumberedBy.push("bulk");
    if ( req && (this.abilities.str?.value ?? 0) < req ) encumberedBy.push("heavyweight");
    this.inventory = { slots, used: grants.bulk, encumbered: encumberedBy.length > 0, encumberedBy };
    const speedMult = Math.min(1, this.inventory.encumbered ? 0.5 : 1, pen.flags.speedMultiplier ?? 1);
    this.speed = {};
    for ( const [k, v] of Object.entries(this.traits.speed) ) {
      if ( k === "hover" ) continue;
      const base = (k === "walk" && grants.speed) ? grants.speed : v;
      this.speed[k] = Math.floor((base + (base ? this.bonuses.speed : 0)) * speedMult);
    }
    this.states = {
      bloodied: this.hp.max > 0 && this.hp.value <= this.hp.max / 2,
      drained: this.cp.max > 0 && this.cp.value <= this.cp.max / 2,
      encumbered: this.inventory.encumbered,
      inCombat: !!globalThis.game?.combats?.some?.(c => c.active && c.combatants.some(t => t.actor === actor))
    };
    this.asi = { earned: asiCount(this.level), masteryCap: masteryCap(this.level) };

    // Step 10: item-side derived numbers.
    for ( const item of items ) item.system.prepareActorDerived?.(actor);
  }

  /* -------------------------------------------- */

  /** Active conditions with ranks, from condition-type effects. */
  _activeConditions() {
    const out = [];
    const effects = this.parent?.appliedEffects ?? [];
    for ( const e of effects ) {
      if ( e.type !== "condition" ) continue;
      out.push({ key: e.system.key, ranks: e.system.ranks || 1, sourceRank: e.system.sourceRank || undefined });
    }
    return out;
  }

  /** Step 2: what items grant. */
  _collectItemGrants(items) {
    const g = {
      saves: new Set(), skills: new Set(), tools: new Set(), affinities: new Set(), keywordAccess: new Set(),
      mastery: [], hitDie: "", chakraDie: "", speed: 0, hijutsuAbilities: [], armor: null, reinforced: 0,
      blocking: 0, containerSlots: 0, bulk: 0, classItem: null, clanItem: null, backgroundItem: null,
      maxRank: null
    };
    const containersSeen = new Set();
    const level = this.level;
    for ( const item of items ) {
      const sys = item.system;
      switch ( item.type ) {
        case "class":
          g.classItem ??= item;
          g.hitDie ||= sys.hitDie;
          g.chakraDie ||= sys.chakraDie;
          for ( const s of sys.saves ?? [] ) g.saves.add(s);
          for ( const s of sys.skills?.chosen ?? [] ) g.skills.add(s);
          for ( const s of sys.skills?.fixed ?? [] ) g.skills.add(s);
          for ( const t of sys.tools?.fixed ?? [] ) g.tools.add(t);
          g.maxRank = sys.maxRankAt?.(sys.levels) ?? null;
          break;
        case "subclass":
          break;
        case "clan":
          g.clanItem ??= item;
          if ( sys.speed ) g.speed = sys.speed;
          for ( const s of sys.skills?.fixed ?? [] ) g.skills.add(s);
          for ( const s of sys.skills?.chosen ?? [] ) g.skills.add(s);
          for ( const a of sys.affinities?.fixed ?? [] ) g.affinities.add(a);
          for ( const a of sys.affinities?.chosen ?? [] ) g.affinities.add(a);
          for ( const k of sys.keywords ?? [] ) g.keywordAccess.add(k);
          g.hijutsuAbilities = [...(sys.hijutsuAbilities ?? [])];
          break;
        case "background":
          g.backgroundItem ??= item;
          for ( const s of sys.skills ?? [] ) g.skills.add(s);
          if ( sys.tool ) g.tools.add(sys.tool);
          break;
        case "armor":
          if ( sys.equipped ) {
            g.armor = { bonus: sys.armor.value, dexCap: sys.dexCap, category: sys.category,
              strRequirement: sys.strRequirement || sys.properties?.heavyweight || null, item };
            g.reinforced = Math.max(g.reinforced, sys.properties?.reinforced ?? 0);
          }
          break;
        case "weapon":
          if ( sys.equipped ) g.blocking = Math.max(g.blocking, sys.properties?.blocking ?? 0);
          break;
        case "container":
          if ( sys.equipped && !containersSeen.has(sys.containerType) ) {
            containersSeen.add(sys.containerType);
            g.containerSlots += sys.slots ?? containerTypes[sys.containerType]?.slots ?? 0;
          }
          break;
      }
      // Advancement-granted Mastery at or below the actor's level.
      for ( const adv of sys.advancement ?? [] ) {
        if ( adv.type !== "mastery" || adv.level > (item.type === "class" ? sys.levels : level) ) continue;
        for ( const target of (adv.chosen?.length ? adv.chosen : [adv.key]) ) {
          if ( target ) g.mastery.push({ target, source: `${item.name} ${adv.level}` });
        }
      }
      // Feats/features granting Mastery directly.
      for ( const target of sys.grants?.mastery ?? [] ) g.mastery.push({ target, source: item.name });
      // Bulk of carried physical items.
      if ( sys.bulk != null && sys.location !== "stored" ) g.bulk += (sys.bulk || 0) * Math.max(1, sys.quantity ?? 1);
    }
    for ( const a of this.affinities ?? [] ) g.affinities.add(a);
    for ( const k of this.keywordAccess ?? [] ) g.keywordAccess.add(k);
    return g;
  }

  /** Step 5: HP/CP. Characters use class dice; NPCs may override (see NPCData). */
  _preparePools({ hitFaces, chakraFaces, conMod }) {
    this.hp.max = poolMax({ level: this.level, dieMax: hitFaces, conMod, bonus: this.bonuses.hpMax,
      perLevelBonus: this.bonuses.hpPerLevel });
    this.cp.max = poolMax({ level: this.level, dieMax: chakraFaces, conMod, bonus: this.bonuses.cpMax,
      perLevelBonus: this.bonuses.cpPerLevel });
    this.hitDice.max = this.level;
    this.hitDice.die = hitFaces ? `d${hitFaces}` : "";
    this.hitDice.value = Math.max(0, this.level - this.hitDice.spent);
    this.chakraDice.max = this.level;
    this.chakraDice.die = chakraFaces ? `d${chakraFaces}` : "";
    this.chakraDice.value = Math.max(0, this.level - this.chakraDice.spent);
  }

  /** Step 6/7: Mastery map {target: {rank, bonus, sources[]}} with the level cap. */
  _prepareMastery(grants, mods) {
    const map = new Map();
    const add = (target, source) => {
      if ( !target ) return;
      if ( !map.has(target) ) map.set(target, new Set());
      map.get(target).add(source || "unnamed");
    };
    for ( const s of this.mastery.sources ) add(s.target, s.source);
    for ( const s of grants.mastery ) add(s.target, s.source);
    for ( const s of mods.mastery ) add(s.target, s.source);
    this.masteryMap = {};
    for ( const [target, sources] of map ) {
      const rank = masteryRank(sources.size, this.level);
      this.masteryMap[target] = { rank, bonus: masteryBonus(rank), sources: [...sources], uncapped: sources.size };
    }
    // ASI levels each grant one Mastery rank; count those the player has assigned (source "ASI <level>").
    const asiAssigned = this.mastery.sources.filter(s => /^ASI\b/i.test(s.source ?? "")).length;
    this.mastery.asiAvailable = Math.max(0, asiCount(this.level) - asiAssigned);
  }

  /** Mastery lookup for any target key. */
  masteryFor(target) {
    return this.masteryMap?.[target] ?? { rank: 0, bonus: 0, sources: [] };
  }

  /* -------------------------------------------- */

  /** Data for formulas: @prof, @level, @abilities.str.mod, @mod.nin, @rank... */
  getRollData() {
    const data = { prof: this.prof, level: this.level, abilities: {}, mod: {} };
    for ( const [k, a] of Object.entries(this.abilities) ) {
      data.abilities[k] = { value: a.value, mod: a.mod ?? abilityMod(a.value) };
      data[k] = data.abilities[k].mod;
    }
    for ( const k of castingDisciplines ) {
      const ability = this.disciplines?.[k]?.ability;
      data.mod[k] = ability ? data.abilities[ability]?.mod ?? 0 : 0;
    }
    data.mod.buki = data.mod.tai;
    data.init = this.initiative?.total ?? data.dex;
    return data;
  }
}
