/**
 * d20 roll rules (pure). What a click rolls, how advantage is chosen, the crit threshold, and the
 * natural-1/20 Will of Fire trigger. The Foundry side (Roll, chat) lives in dice/roll.mjs.
 *
 * Totals already include condition penalties once (Exhaustion −1 per roll, not per die), because the
 * actor's breakdowns add them; the roll is always 1d20 (or 2d20 keep high/low) + that total.
 */
import { abilities, skills, toolkits, disciplines } from "../config/core.mjs";
import { critRangeCap } from "../config/combat.mjs";
import { skillActions, skillActionTiers } from "../config/character.mjs";
import { skillActionPenalty } from "../rules/skill-actions.mjs";

export const MODES = { normal: "1d20", advantage: "2d20kh", disadvantage: "2d20kl" };

/**
 * Click modifiers (dnd5e convention): Shift opens the dialog, Alt = advantage, Ctrl/Meta = disadvantage.
 * @param {{shiftKey?, altKey?, ctrlKey?, metaKey?}} [event]
 */
export function clickMode(event = {}) {
  if ( event.altKey ) return { mode: "advantage", dialog: false };
  if ( event.ctrlKey || event.metaKey ) return { mode: "disadvantage", dialog: false };
  return { mode: "normal", dialog: !!event.shiftKey };
}

/** Lowest natural d20 that crits for a scope (all + scope bonuses, capped at +3: 17-20). */
export function critThreshold(actor, scope = "") {
  const cr = actor.system.critRange ?? {};
  const bonus = Math.min(critRangeCap, (cr.all ?? 0) + (scope ? cr[scope] ?? 0 : 0));
  return 20 - bonus;
}

/**
 * What a roll request means for this actor.
 * @param {object} actor
 * @param {"ability"|"save"|"skill"|"tool"|"initiative"|"attack"|"skillAction"} type
 * @param {string} [key]
 * @returns {{label, bonus, breakdown, scope, type, key, kind, note?, penalty?, outcome?}|null}
 */
export function rollSpec(actor, type, key) {
  const sys = actor.system;
  const bd = sys.breakdowns ?? {};
  switch ( type ) {
    case "ability":
      return { type, key, kind: "check", label: `${abilities[key]?.label ?? key} check`,
        bonus: sys.abilities[key]?.check ?? sys.abilities[key]?.mod ?? 0, breakdown: bd[`check.${key}`] };
    case "save":
      return { type, key, kind: "save", label: `${abilities[key]?.label ?? key} save`,
        bonus: sys.saves[key]?.total ?? 0, breakdown: bd[`save.${key}`] };
    case "skill":
      return { type, key, kind: "check", label: `${skills[key]?.label ?? key} check`,
        bonus: sys.skills[key]?.total ?? 0, breakdown: bd[`skill.${key}`] };
    case "tool": {
      const t = sys.tools?.[key] ?? {};
      // Toolkit checks: Int + proficiency + the kit's Mastery (KB 08; the action's skill may override the ability).
      const mod = sys.abilities?.[t.ability ?? "int"]?.mod ?? 0;
      const mastery = typeof sys.masteryFor === "function" ? sys.masteryFor(`tool.${key}`).bonus ?? 0 : 0;
      const bonus = mod + (t.isProficient ? sys.prof : 0) + mastery;
      return { type, key, kind: "check", label: `${toolkits[key]?.label ?? key} check`, bonus };
    }
    case "initiative":
      return { type, key: "", kind: "initiative", label: "Initiative", bonus: sys.initiative?.total ?? 0, breakdown: bd.initiative };
    case "attack": {
      const disc = sys.disciplines?.[key];
      return { type, key, kind: "attack", label: `${disciplines[key]?.label ?? key} attack`, scope: key,
        bonus: disc?.attack ?? 0, breakdown: bd[`${key}.attack`] };
    }
    case "skillAction": {
      const a = skillActions[key];
      if ( !a ) return null;
      const sk = sys.skills?.[a.skill] ?? {};
      const penalty = a.tier === "kit" ? 0
        : skillActionPenalty(a.tier, { proficient: !!sk.isProficient, masteryRank: sk.mastery ?? 0 });
      return { type, key, kind: "check", label: a.label, bonus: (sk.total ?? 0) + penalty, penalty,
        breakdown: bd[`skill.${a.skill}`], skill: a.skill,
        note: `${skills[a.skill]?.label ?? a.skill} · ${skillActionTiers[a.tier]?.label ?? a.tier}${penalty ? ` · ${penalty} (${penalty === -5 ? "no Mastery" : "not proficient"})` : ""}`,
        roll: a.roll ?? "", outcome: a.text ?? "" };
    }
    default:
      return null;
  }
}

/**
 * Read a finished d20 roll: the kept natural face, crit/fumble, and whether it can award Will of Fire.
 * @param {{dice: Array<{faces:number, results: Array<{result:number, active?:boolean, discarded?:boolean}>}>, total:number}} roll
 * @param {number} threshold
 */
export function readD20(roll, threshold = 20) {
  const die = roll.dice?.find(d => d.faces === 20);
  const kept = die?.results?.filter(r => r.active !== false && !r.discarded) ?? [];
  const natural = kept[0]?.result ?? null;
  return {
    natural, total: roll.total,
    crit: natural != null && natural >= threshold,
    fumble: natural === 1,
    willOfFireTrigger: natural === 1 || natural === 20
  };
}

/**
 * Will of Fire from a natural 1 or 20: the first one each encounter, max 3 (KB 09).
 * @param {object} actor
 * @param {{natural:number}} result
 * @param {string|null} combatId   the active combat (no award outside an encounter)
 * @returns {{award: boolean, value?: number}}
 */
export function willOfFireAward(actor, result, combatId) {
  if ( !combatId || !(result.natural === 1 || result.natural === 20) ) return { award: false };
  const flag = actor.flags?.n5e?.wofEncounter;
  const current = actor.system.willOfFire?.value ?? 0;
  if ( flag === combatId || current >= 3 ) return { award: false };
  return { award: true, value: current + 1 };
}
