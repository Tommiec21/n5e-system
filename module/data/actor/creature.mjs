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
import { staminaPool } from "../../rules/trackers.mjs";
import { featureCritRange } from "../../rules/features.mjs";
import { rule } from "../../rules-settings.mjs";
import { Breakdown } from "../../rules/breakdown.mjs";

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
    /** Statistic breakdowns, filled during prepareDerivedData: {"ac": Breakdown, "skill.ath": Breakdown, ...}. */
    this.breakdowns = {};
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
    // Item-defined pools join the actor's: the definition comes from the item, the current value from
    // system.resources.<id>.value once it has been set (until then: full, or empty for event-built pools).
    for ( const def of grants.pools ) {
      const stored = this.resources[def.id];
      const startsFull = (def.recovery ?? []).some(r => r.on !== "event" && r.on !== "never");
      this.resources[def.id] = {
        ...def, ...(stored ?? {}), label: stored?.label || def.label, max: stored?.max || def.max,
        recovery: stored?.recovery?.length ? stored.recovery : def.recovery,
        value: stored ? stored.value : null, fromItem: def.source, startsFull
      };
    }
    // Optional Stamina pool (= proficiency bonus) shared by limited-use feat abilities.
    if ( rule("stamina") && this.parent?.type === "character" ) {
      const stored = this.resources.stamina;
      this.resources.stamina = { ...staminaPool(), value: stored ? stored.value : null, sort: -1 };
    } else if ( this.resources.stamina && !rule("stamina") ) delete this.resources.stamina;
    for ( const pool of Object.values(this.resources ?? {}) ) {
      pool.maxValue = Math.max(0, Math.floor(evaluateFormula(pool.max, rollData, 0)));
      if ( pool.value == null ) pool.value = pool.startsFull === false ? 0 : pool.maxValue;
      pool.value = Math.min(pool.value, pool.maxValue);
    }
    // Limited uses on owned items ("1 + @prof") resolve against this actor.
    for ( const item of this.parent?.items ?? [] ) {
      const uses = item.system?.uses;
      if ( uses && uses.max ) uses.maxValue = Math.max(0, Math.floor(evaluateFormula(uses.max, rollData, 0)));
    }

    // Step 6 + 7: Mastery (sources from actor, items, and n5e.mastery.* effects).
    this._prepareMastery(grants, mods);

    // Every number below is built through a Breakdown so sheets can show its parts (PF2e-style).
    const B = (key, label) => (this.breakdowns[key] = new Breakdown(label));
    const P = (...keys) => keys.flatMap(k => pen.sources[k] ?? []);
    const d20Parts = abilityKey => P("allDice", abilities[abilityKey]?.category === "physical" ? "d20Physical" : "d20Mental");
    const addMastery = (b, target) => {
      const mm = this.masteryFor(target);
      if ( mm.rank ) b.add(`Mastery ${mm.rank}`, mm.bonus);
      return b;
    };
    const abbr = key => abilities[key]?.abbr ?? key;

    // Saves: mod + prof (or half prof if not proficient) + Mastery.
    for ( const key of Object.keys(abilities) ) {
      const save = this.saves[key];
      save.isProficient = save.proficient || grants.saves.has(key);
      save.mastery = this.masteryFor(`save.${key}`).rank;
      const b = B(`save.${key}`, `${abilities[key].label} save`).base(abbr(key), mod(key))
        .add(save.isProficient ? "Proficiency" : "Half proficiency", save.isProficient ? this.prof : Math.floor(this.prof / 2));
      addMastery(b, `save.${key}`).add("Bonuses", this.bonuses.save).addAll(d20Parts(key));
      save.total = b.total;
    }

    // Ability checks: mod + check bonuses + condition penalties (rolled from the ability strip).
    for ( const key of Object.keys(abilities) ) {
      const b = B(`check.${key}`, `${abilities[key].label} check`).base(abbr(key), mod(key))
        .add("Bonuses", this.bonuses.check).addAll(d20Parts(key)).addAll(P("checksAndAttacks"));
      this.abilities[key].check = b.total;
    }

    // Skills and passives.
    for ( const [key, skill] of Object.entries(this.skills) ) {
      skill.isProficient = skill.proficient || grants.skills.has(key);
      skill.mod = mod(skill.ability);
      skill.mastery = this.masteryFor(`skill.${key}`).rank;
      const b = B(`skill.${key}`, skills[key]?.label ?? key).base(abbr(skill.ability), skill.mod)
        .add("Proficiency", skill.isProficient ? this.prof : 0);
      addMastery(b, `skill.${key}`).add("Skill bonus", evaluateFormula(skill.bonus, rollData, 0))
        .add("Bonuses", this.bonuses.check).addAll(d20Parts(skill.ability)).addAll(P("checksAndAttacks"));
      skill.total = b.total;
      const pb = B(`passive.${key}`, `Passive ${skills[key]?.label ?? key}`).base("Base", 10).add("Skill", skill.total);
      if ( key === "prc" ) pb.addAll(P("perception"));
      skill.passive = pb.total;
    }
    for ( const [key, tool] of Object.entries(this.tools) ) {
      tool.isProficient = tool.proficient || grants.tools.has(key);
      tool.mastery = this.masteryFor(`tool.${key}`).rank;
    }

    // Initiative: Dex + floor(prof / 2) + Mastery.
    const ib = B("initiative", "Initiative").base("Dex", mod("dex")).add("Half proficiency", Math.floor(this.prof / 2));
    addMastery(ib, "initiative").add("Bonuses", this.bonuses.initiative)
      .add("Initiative bonus", evaluateFormula(this.attributes.init.bonus, rollData, 0)).addAll(d20Parts("dex"));
    this.initiative = { total: ib.total };

    // Disciplines: attack = mod + prof; DC = 8 + mod + prof; minus Concussed/Exhaustion on DCs.
    for ( const key of castingDisciplines ) {
      const disc = this.disciplines[key];
      const label = disciplines[key].label;
      disc.ability = mods.disciplineAbility[key] ?? disc.ability;
      disc.mod = mod(disc.ability);
      const ab = B(`${key}.attack`, `${label} attack`).base(abbr(disc.ability), disc.mod).add("Proficiency", this.prof)
        .add("Bonuses", this.bonuses.attack[key]).add("Effects", mods.attack[key] ?? 0);
      addMastery(ab, `attack.${key}`).addAll(P("allDice", "checksAndAttacks"));
      disc.attack = ab.total;
      const db = B(`${key}.dc`, `${label} save DC`).base("Base", dcTables.jutsuSaveBase).add(abbr(disc.ability), disc.mod)
        .add("Proficiency", this.prof).add("Bonuses", this.bonuses.saveDC[key])
        .add("Effects", (mods.saveDC[key] ?? 0) + (mods.saveDC.all ?? 0)).addAll(P("saveDC"));
      disc.dc = db.total;
    }
    this.disciplines.buki = this.disciplines.tai;
    this.breakdowns["buki.attack"] = this.breakdowns["tai.attack"];
    this.breakdowns["buki.dc"] = this.breakdowns["tai.dc"];

    // Step 8: caps and defenses.
    this.critRange = {};
    const fcr = featureCritRange(this.parent ?? { items: [] });
    for ( const scope of new Set([...Object.keys(mods.critRange), ...Object.keys(fcr)]) ) {
      this.critRange[scope] = Math.min(critRangeCap, (mods.critRange[scope] ?? 0) + (fcr[scope] ?? 0));
    }
    // Titan Fist Stance (n5e.reinforced): Reinforced = Taijutsu modifier without it, or armor's +2.
    let reinforced = grants.reinforced;
    if ( mods.reinforced ) reinforced = reinforced > 0 ? reinforced + mods.reinforced : Math.max(0, this.disciplines?.tai?.mod ?? 0);
    const drb = B("dr", "Damage Reduction").base("Base", this.traits.dr).add(grants.reinforced ? "Reinforced armor" : "Reinforced", reinforced)
      .add("Effects", mods.dr).addAll(P("dr"));
    this.dr = Math.max(0, drb.total);
    this.pierce = this.traits.pierce + mods.pierce;
    const ac = computeAC({
      calc: this.attributes.ac.calc, dexMod: mod("dex"), prof: this.prof, armor: grants.armor,
      flat: this.attributes.ac.flat, formula: this.attributes.ac.formula, rollData,
      blocking: grants.blocking, bonus: this.bonuses.ac, penalty: pen.ac
    });
    this.ac = ac;
    const acb = B("ac", "Armor Class");
    acb.parts.push(...ac.parts);
    acb.addAll(P("ac"));
    this.concentration = {
      max: 2 + mods.concentrationMax,
      check: (this.skills.cha?.total ?? mod("con")),
      dcBase: dcTables.concentration.base
    };
    this.saveTierShift = mods.saveTierShift;

    // Step 9: inventory and computed states.
    const slots = inventorySlots(mod("str"), grants.containerSlots + this.bonuses.inventorySlots);
    B("inventory.slots", "Inventory Slots").base("Base", 10).add("2 \u00d7 Str", 2 * mod("str"))
      .add("Storage", grants.containerSlots).add("Bonuses", this.bonuses.inventorySlots);
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
      maxRank: null, subclassItems: [], pools: [], scale: {}, profGrants: []
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
          for ( const t of sys.tools?.chosen ?? [] ) g.tools.add(t);
          g.maxRank = sys.maxRankAt?.(sys.levels) ?? null;
          break;
        case "subclass":
          g.subclassItems.push(item);
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
          g.hijutsuChoice = sys.hijutsuChoice || "";
          break;
        case "background":
          g.backgroundItem ??= item;
          for ( const s of sys.skills ?? [] ) g.skills.add(s);
          if ( sys.tool ) g.tools.add(sys.tool);
          break;
        case "armor":
          if ( sys.equipped ) {
            g.armor = { name: item.name, bonus: sys.armor.value, dexCap: sys.dexCap, category: sys.category,
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
      // Advancement grants at or below the level this item has reached (class levels for classes and
      // their subclasses, character level otherwise): Mastery ranks and trait grants (affinity, skills...).
      const reached = this._advancementLevel(item, items, level);
      for ( const adv of sys.advancement ?? [] ) {
        if ( adv.level > reached ) continue;
        if ( adv.type === "mastery" ) {
          for ( const target of (adv.chosen?.length ? adv.chosen : [adv.key]) ) {
            if ( target ) g.mastery.push({ target, source: `${item.name} ${adv.level}` });
          }
        } else if ( adv.type === "trait" ) {
          const set = { affinity: g.affinities, skills: g.skills, tools: g.tools, saves: g.saves }[adv.key];
          const values = adv.count > 0 ? adv.chosen : adv.uuids;
          for ( const v of values ?? [] ) set?.add(v);
        }
      }
      // Resource pools defined by items (Focus, Superiority Dice, Pyroclasm...).
      for ( const pool of sys.resourcePools ?? [] ) if ( pool.id ) g.pools.push({ ...pool, source: item.name });
      // Class table columns for formulas: @scale.<classCamelCase>.<column>.
      if ( item.type === "class" && sys.identifier ) {
        // Keyed by camel case so formulas can use them: "scout-nin" -> @scale.scoutNin.<column>.
        const key = sys.identifier.replace(/-(\w)/g, (m, c) => c.toUpperCase());
        const col = g.scale[key] = {};
        for ( const c of sys.columns ?? [] ) col[c.key] = Number(c.values?.[Math.max(0, (sys.levels || 1) - 1)]) || 0;
      }
      // Feats/features granting Mastery directly.
      for ( const target of sys.grants?.mastery ?? [] ) g.mastery.push({ target, source: item.name });
      // Feats granting a proficiency ("skill.ill", "tool.disguise"): Mastery instead when already proficient.
      for ( const p of sys.grants?.proficiencies ?? [] ) g.profGrants.push({ target: p, source: item.name });
      // Bulk of carried physical items.
      if ( sys.bulk != null && sys.location !== "stored" ) g.bulk += (sys.bulk || 0) * Math.max(1, sys.quantity ?? 1);
    }
    for ( const a of this.affinities ?? [] ) g.affinities.add(a);
    for ( const k of this.keywordAccess ?? [] ) g.keywordAccess.add(k);
    for ( const { target, source } of g.profGrants ) {
      const [kind, key] = target.split(".");
      const set = kind === "skill" ? g.skills : kind === "tool" ? g.tools : kind === "save" ? g.saves : null;
      if ( !set || !key ) continue;
      const own = kind === "skill" ? this.skills?.[key]?.proficient : kind === "tool" ? this.tools?.[key]?.proficient : this.saves?.[key]?.proficient;
      if ( own || set.has(key) ) g.mastery.push({ target, source });
      else set.add(key);
    }
    return g;
  }

  /** The level an item's advancement has reached: class levels, a subclass's class levels, else character level. */
  _advancementLevel(item, items, level) {
    if ( item.type === "class" ) return item.system.levels ?? 0;
    if ( item.type === "subclass" ) {
      const cls = items.find(i => i.type === "class" && i.system.identifier === item.system.classIdentifier);
      return cls ? cls.system.levels ?? 0 : 0;
    }
    return level;
  }

  /** Step 5: HP/CP. Characters use class dice; NPCs may override (see NPCData). */
  _preparePools({ hitFaces, chakraFaces, conMod }) {
    this.hp.max = poolMax({ level: this.level, dieMax: hitFaces, conMod, bonus: this.bonuses.hpMax,
      perLevelBonus: this.bonuses.hpPerLevel });
    this.cp.max = poolMax({ level: this.level, dieMax: chakraFaces, conMod, bonus: this.bonuses.cpMax,
      perLevelBonus: this.bonuses.cpPerLevel });
    const poolParts = (label, faces, bonus, perLevel) => {
      const b = new Breakdown(label).base("1st level", this.level >= 1 ? 10 : 0)
        .add(`Die max \u00d7 ${this.level}`, this.level * faces).add(`Con \u00d7 ${this.level}`, this.level * conMod)
        .add("Per-level bonus", this.level * perLevel).add("Bonuses", bonus);
      return b;
    };
    this.breakdowns ??= {};
    this.breakdowns["hp.max"] = poolParts("Hit Points", hitFaces, this.bonuses.hpMax, this.bonuses.hpPerLevel);
    this.breakdowns["cp.max"] = poolParts("Chakra Points", chakraFaces, this.bonuses.cpMax, this.bonuses.cpPerLevel);
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
    const asiTargets = globalThis.CONFIG?.N5E?.progression?.asiMasteryTargets ?? ["skill", "tool"];
    const asiAssigned = this.mastery.sources.filter(s => /^ASI\b/i.test(s.source ?? "")
      && asiTargets.some(t => String(s.target).startsWith(`${t}.`))).length;
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
    data.scale = this.grants?.scale ?? {};
    return data;
  }
}
