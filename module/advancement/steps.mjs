/**
 * Level-up steps (pure). Given a class (and its subclass, if chosen) and the level being gained,
 * list everything that level grants or asks for, in book order. The level-up dialog renders these;
 * the manager applies them. Modelled on dnd5e's Advancement, with N5e's rules:
 *   - HP/CP are fixed: 10 + die max + Con at 1st, die max + Con after (King's ruling).
 *   - ASI levels (4/8/12/16/19) give +1 ability, a feat, and a Mastery rank (skill or toolkit).
 *   - Jutsu Known increases are learned from the jutsu list, up to the class's highest rank.
 */
import { skills, toolkits, abilities, progression, castingDisciplines, disciplines } from "../config/core.mjs";

const dieMax = die => Number(String(die ?? "").replace(/^\D*/, "")) || 0;
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);

/** Steps that come from an item's advancement array at one level. */
export function advancementSteps(item, level, origin) {
  const out = [];
  for ( const adv of list(item.system.advancement) ) {
    if ( adv.level !== level ) continue;
    const base = { id: `${origin}:${adv.id}`, advId: adv.id, origin, ownerName: item.name, title: adv.title };
    switch ( adv.type ) {
      case "feature":
        out.push({ ...base, type: "feature", uuids: list(adv.uuids) });
        break;
      case "itemChoice":
        out.push({ ...base, type: "itemChoice", uuids: list(adv.uuids), count: adv.count || 1, key: adv.key });
        break;
      case "option":
        out.push({ ...base, type: "option", count: adv.count || 1, key: adv.key,
          options: list(adv.uuids).map(v => ({ value: v, label: disciplines[v]?.label ?? v })) });
        break;
      case "trait":
        if ( adv.count > 0 ) {
          out.push({ ...base, type: "trait", key: adv.key, count: adv.count, options: list(adv.uuids).map(v => ({ value: v, label: v })) });
        } else {
          out.push({ ...base, type: "grant", key: adv.key, values: list(adv.uuids) });
        }
        break;
      case "mastery":
        out.push({ ...base, type: "grant", key: "mastery", values: [adv.key] });
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * Everything gaining `level` in `cls` grants.
 * @param {object} o
 * @param {object} o.actor          prepared actor (system.abilities, system.items via o.owned)
 * @param {object} o.cls            the class item (its levels may still be level - 1)
 * @param {object} [o.subclass]     the subclass item, if the character already has one
 * @param {number} o.level          class level being gained
 * @returns {object[]} steps
 */
export function stepsForLevel({ actor, cls, subclass = null, level }) {
  const sys = cls.system;
  const con = actor.system.abilities?.con?.mod ?? 0;
  const steps = [];

  // Hit and Chakra Points (informational: derived from level, never rolled).
  const first = level === 1 && (actor.system.level ?? 0) <= 1;
  steps.push({ id: "pools", type: "pools", title: "Hit Points and Chakra",
    hp: (first ? 10 : 0) + dieMax(sys.hitDie) + con, cp: (first ? 10 : 0) + dieMax(sys.chakraDie) + con,
    hitDie: sys.hitDie, chakraDie: sys.chakraDie });

  // 1st level: proficiencies the class asks you to pick.
  if ( level === 1 ) {
    const fixedSkills = list(sys.skills?.fixed);
    if ( sys.skills?.choose ) {
      const from = list(sys.skills.from).length ? list(sys.skills.from) : Object.keys(skills);
      steps.push({ id: "class:skills", type: "trait", key: "skills", title: "Skill proficiencies", count: sys.skills.choose,
        fixed: fixedSkills.map(k => skills[k]?.label ?? k),
        options: from.filter(k => !fixedSkills.includes(k)).map(k => ({ value: k, label: skills[k]?.label ?? k })) });
    }
    if ( sys.tools?.choose ) {
      const fixed = list(sys.tools.fixed);
      const from = list(sys.tools.from).length ? list(sys.tools.from) : Object.keys(toolkits);
      steps.push({ id: "class:tools", type: "trait", key: "tools", title: "Toolkit proficiencies", count: sys.tools.choose,
        fixed: fixed.map(k => toolkits[k]?.label ?? k),
        options: from.filter(k => !fixed.includes(k)).map(k => ({ value: k, label: toolkits[k]?.label ?? k })) });
    }
  }

  steps.push(...advancementSteps(cls, level, "class"));

  // Subclass: chosen at subclassLevel; its own steps follow (the dialog adds them once one is picked).
  if ( level === sys.subclassLevel && !subclass ) {
    steps.push({ id: "class:subclass", type: "subclass", title: "Subclass", uuids: list(sys.subclasses), count: 1 });
  } else if ( subclass ) {
    steps.push(...advancementSteps(subclass, level, "subclass"));
  }

  // Ability Score Improvement / Feat / Mastery.
  if ( (progression.asiLevels ?? [4, 8, 12, 16, 19]).includes(level) ) {
    steps.push({ id: "class:asi", type: "asi", title: "Ability Score Improvement / Feat",
      abilities: Object.entries(abilities).map(([k, a]) => ({ value: k, label: a.label,
        score: actor.system.abilities?.[k]?.value ?? 10, capped: (actor.system.abilities?.[k]?.value ?? 10) >= 20 })) });
  }

  // Jutsu Known.
  const known = list(sys.jutsuKnown);
  const gain = (known[level - 1] ?? 0) - (level > 1 ? known[level - 2] ?? 0 : 0);
  if ( gain > 0 ) {
    steps.push({ id: "class:jutsu", type: "jutsu", title: "Learn jutsu", count: gain,
      maxRank: sys.maxRank?.[level - 1] || null });
  }
  return steps;
}

/** Steps a subclass adds when it is picked during this same level-up. */
export function subclassSteps(subclass, level) {
  return advancementSteps(subclass, level, "subclass");
}

/* -------------------------------------------- */
/*  Choice pools                                */
/* -------------------------------------------- */

const RANKS = ["E", "D", "C", "B", "A", "S"];

/**
 * Jutsu the character may learn now: at or below maxRank, keyword access satisfied (affinities, Hijutsu,
 * Kinjutsu excluded), not already known.
 * @param {object[]} jutsu       candidate jutsu documents
 * @param {object} o
 * @param {string} o.maxRank
 * @param {Set<string>} o.affinities   the character's affinities, including any gained this level
 * @param {Set<string>} o.known        names (lowercase) already known
 * @param {object} o.keywords          CONFIG.N5E.keywords
 */
export function learnableJutsu(jutsu, { maxRank, affinities, known, keywords }) {
  const max = RANKS.indexOf(maxRank ?? "D");
  return jutsu.filter(j => {
    const s = j.system;
    if ( RANKS.indexOf(s.rank) > max ) return false;
    if ( known.has(j.name.toLowerCase()) ) return false;
    for ( const kw of list(s.keywords) ) {
      const def = keywords?.[kw];
      if ( !def ) continue;
      if ( def.affinity && !affinities.has(def.affinity) ) return false;
      if ( kw === "hijutsu" || kw === "kinjutsu" ) return false;
    }
    return true;
  }).sort((a, b) => (RANKS.indexOf(a.system.rank) - RANKS.indexOf(b.system.rank)) || a.name.localeCompare(b.name));
}

/** Feats a character may take at this level (level requirement only; prerequisites are shown to the player). */
export function eligibleFeats(feats, { level, owned }) {
  return feats.filter(f => (f.system.requirement?.level ?? 0) <= level && !owned.has(f.name.toLowerCase())
    && !["classFeature", "classOption", "clanFeature", "npcFeature"].includes(f.system.category))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Mastery targets for the ASI rank: proficient skills and toolkits (KB: ASI Mastery goes to skills or toolkits only). */
export function masteryTargets(actor) {
  const out = [];
  for ( const [k, s] of Object.entries(actor.system.skills ?? {}) ) {
    if ( s.isProficient ) out.push({ value: `skill.${k}`, label: skills[k]?.label ?? k, rank: s.mastery ?? 0 });
  }
  for ( const [k, t] of Object.entries(actor.system.tools ?? {}) ) {
    if ( t.isProficient ) out.push({ value: `tool.${k}`, label: toolkits[k]?.label ?? k, rank: t.mastery ?? 0 });
  }
  return out;
}

/**
 * Is a set of selections complete? Returns a list of problems (empty = ready).
 * @param {object[]} steps
 * @param {Record<string, string[]|object>} sel
 * @param {Record<string, number>} [poolSizes]  how many options a step actually has (caps the count)
 */
export function validate(steps, sel, poolSizes = {}) {
  const problems = [];
  for ( const st of steps ) {
    const need = Math.min(st.count ?? 0, poolSizes[st.id] ?? Infinity);
    if ( ["itemChoice", "option", "trait", "jutsu", "subclass"].includes(st.type) ) {
      const got = list(sel[st.id]).length;
      if ( got < need ) problems.push(`${st.title}: choose ${need - got} more`);
      if ( got > (st.count ?? 0) ) problems.push(`${st.title}: too many chosen`);
    } else if ( st.type === "asi" ) {
      const a = sel[st.id] ?? {};
      if ( !a.ability ) problems.push("Ability Score Improvement: pick an ability");
      if ( !a.mastery && (poolSizes[`${st.id}:mastery`] ?? 1) > 0 ) problems.push("Ability Score Improvement: pick a Mastery target");
      if ( !a.feat && (poolSizes[`${st.id}:feat`] ?? 0) > 0 ) problems.push("Ability Score Improvement: pick a feat");
    }
  }
  return problems;
}

export { castingDisciplines };
