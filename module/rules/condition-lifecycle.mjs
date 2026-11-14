/**
 * Condition lifecycle (pure). KB 05 with King's rulings.
 *
 * Turn start: Burned (1d8 fire per rank) and Bleed (1d6 necrotic per rank) deal damage; condition damage
 *   ignores DR. Posted as a card with an Apply button.
 * Turn end: Shocked, Shaken and Demoralized lose a rank; Staggered, Dazed, Berserk, Confused and Slowed
 *   end ("at the end of the creature's next turn": a condition gained during this same turn waits for
 *   the next one).
 * Duration: conditions that don't [Persist] and have no other ending last 1 minute (10 rounds).
 * Removal: an Action check against the listed DC; Bleed removes 1 more rank per 2 the check beats the DC
 *   by; a failed check against Sealed raises its DC by 4.
 */
import { n5eConfig } from "./host.mjs";
import { conditions as coreConditions, defaultConditionDuration } from "../config/conditions.mjs";
import { abilities, skills } from "../config/core.mjs";
import { rule } from "./settings.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const active = actor => list(actor.effects).filter(e => e.type === "condition" && !e.disabled);
const defOf = (key, registry) => registry[key] ?? n5eConfig().clanConditions?.[key];

/** Duration data for a newly applied condition (none for [Persists] or turn-end conditions). */
export function defaultDuration(key, registry = coreConditions) {
  const def = defOf(key, registry);
  if ( !rule("conditionDurations") || !def || def.persists || def.endsAt ) return null;
  const seconds = defaultConditionDuration.value * 60;
  return { seconds, rounds: seconds / 6 };
}

/** Damage conditions deal at the start of the turn. */
export function conditionTurnStart(actor, registry = coreConditions) {
  if ( !rule("conditionTurnDamage") ) return [];
  return active(actor).flatMap(e => {
    const dmg = defOf(e.system.key, registry)?.turnStartDamage;
    if ( !dmg ) return [];
    const ranks = Math.max(1, e.system.ranks ?? 1);
    const [n, faces] = dmg.die.split("d");
    const formula = dmg.perRank ? `${Number(n) * ranks}d${faces}` : dmg.die;
    return [{ key: e.system.key, name: e.name, ranks, formula, type: dmg.type }];
  });
}

/**
 * What changes at the end of a creature's turn.
 * @param {object} actor
 * @param {object} [o]
 * @param {{round:number, turn:number}} [o.now]   the turn that is ending
 * @param {(effect) => boolean} [o.isExpired]     Foundry's duration check
 * @returns {{decay: Array<{key, name, ranks}>, end: Array<{key, name, reason}>}}
 */
export function conditionTurnEnd(actor, { now = null, isExpired = () => false } = {}, registry = coreConditions) {
  const decay = [];
  const end = [];
  for ( const e of active(actor) ) {
    const key = e.system.key;
    const def = defOf(key, registry);
    if ( !def ) continue;
    const d = e.duration ?? {};
    const thisTurn = now && d.startRound === now.round && d.startTurn === now.turn;
    if ( rule("conditionDurations") && !def.persists && isExpired(e) ) {
      end.push({ key, name: e.name, reason: "duration ended" });
      continue;
    }
    if ( !rule("conditionDecay") || thisTurn ) continue;
    if ( def.endsAt === "nextTurnEnd" ) end.push({ key, name: e.name, reason: "end of turn" });
    else if ( def.decay?.when === "turnEnd" ) {
      const left = (e.system.ranks ?? 1) - def.decay.amount;
      if ( left <= 0 ) end.push({ key, name: e.name, reason: "last rank wore off" });
      else decay.push({ key, name: e.name, ranks: def.decay.amount });
    }
  }
  return { decay, end };
}

/** Ways to try to end a condition, with the DC after earlier Sealed failures. */
export function removalOptions(effect, registry = coreConditions) {
  const def = defOf(effect.system.key, registry);
  const raised = effect.flags?.n5e?.removalDC ?? 0;
  return list(def?.removal).map(r => ({
    ...r,
    dc: r.dc != null ? r.dc + raised : null,
    checks: list(r.check).map(k => ({ key: k, type: skills[k] ? "skill" : "ability",
      label: skills[k]?.label ?? abilities[k]?.label ?? k }))
  }));
}

/**
 * Outcome of a removal check.
 * @returns {{success:boolean, ranks:number|"all", raiseDC:number}}
 */
export function removalResult(option, total, currentRanks = 1) {
  if ( option.dc == null ) return { success: false, ranks: 0, raiseDC: 0 };
  if ( total < option.dc ) return { success: false, ranks: 0, raiseDC: option.onFail?.dcIncrease ?? 0 };
  if ( option.ranks === "all" ) return { success: true, ranks: "all", raiseDC: 0 };
  let ranks = Number(option.ranks) || 1;
  if ( option.perOver ) ranks += Math.floor((total - option.dc) / option.perOver.every) * option.perOver.ranks;
  return { success: true, ranks: ranks >= currentRanks ? "all" : ranks, raiseDC: 0 };
}

/** Advantage on a save against conditions the saver resists. */
export function resistsAny(actor, keys) {
  if ( !rule("conditionResistance") ) return false;
  const r = actor.system?.traits?.conditionResist;
  return list(keys).some(k => (r instanceof Set ? r.has(k) : list(r).includes(k)));
}
