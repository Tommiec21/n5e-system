/**
 * Damage, healing, concentration on damage, and death saves (pure). KB 03 with King's rulings:
 *
 *   1. Interception happens first and changes the target entirely: apply the damage to the interceptor,
 *      whose DR, resistances and effects are the ones that count.
 *   2. DR applies ONCE to the whole damage calculation (not per type), reduced by Pierce. Damage from
 *      conditions or hostile environments ignores DR. Genjutsu psychic damage ignores DR.
 *   3. Resistance halves (round down), vulnerability doubles; both on the same type cancel.
 *   4. Immunity: no damage of that type.
 *   5. Temporary pool absorbs first, then the pool: Chakra damage hits temp CP then CP; all else HP.
 *   Reducing damage to 0 still applies riders.
 *
 * 0 HP: characters fall Dying (unconscious); remaining damage >= max HP is instant death. Damage while
 * at 0 HP = 1 death save failure (crit: 2). Most NPCs die at 0 (diesAtZero).
 */

import { rule } from "../rules-settings.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const has = (set, k) => (set instanceof Set ? set.has(k) : list(set).includes(k));

/**
 * @param {object} target       prepared actor
 * @param {Array<{amount:number, type:string}>} instances
 * @param {object} [o]
 * @param {number} [o.multiplier=1]   0.5 for Half, 2 for Double (applied before DR; rounded down)
 * @param {number} [o.pierce=0]
 * @param {boolean} [o.ignoreDR]      condition/environment damage, or effects that say so
 * @param {boolean} [o.genjutsu]      source is a Genjutsu (its psychic damage ignores DR)
 * @param {boolean} [o.crit]
 * @param {boolean} [o.piercing]      Piercing Ninjutsu: half DR, no resistance, immunity -> resistance
 */
export function damagePlan(target, instances, { multiplier = 1, pierce = 0, ignoreDR = false, genjutsu = false, crit = false, piercing = false } = {}) {
  const sys = target.system;
  const traits = sys.traits ?? {};
  const steps = [];
  let parts = instances.map(i => ({ type: i.type || "", amount: Math.max(0, Math.floor((Number(i.amount) || 0) * multiplier)) }));
  const raw = parts.reduce((t, p) => t + p.amount, 0);
  if ( multiplier !== 1 ) steps.push(`${multiplier === 0.5 ? "Half" : `×${multiplier}`}: ${raw}`);

  // DR once for the whole calculation, minus Pierce; exempt instances don't use it up.
  // Piercing Ninjutsu (Molding): half of the target's DR (after Pierce), resistance ignored, immunity
  // treated as resistance.
  const dr = Math.max(0, piercing ? Math.floor(((sys.dr ?? 0) - pierce) / 2) : (sys.dr ?? 0) - pierce);
  if ( !ignoreDR && dr > 0 ) {
    let left = dr;
    parts = parts.map(p => {
      if ( genjutsu && p.type === "psychic" ) return p;
      const cut = Math.min(left, p.amount);
      left -= cut;
      return { ...p, amount: p.amount - cut };
    });
    const used = dr - left;
    if ( used ) steps.push(`DR ${dr}${pierce ? ` (Pierce ${pierce})` : ""}: −${used}`);
  }

  // Resistance / vulnerability / immunity per type.
  parts = parts.map(p => {
    if ( !p.type || !p.amount ) return p;
    if ( has(traits.immune, p.type) && piercing ) {
      const half = Math.floor(p.amount / 2);
      steps.push(`Immune to ${p.type}, Piercing: ${p.amount} → ${half}`);
      return { ...p, amount: half };
    }
    if ( has(traits.immune, p.type) ) {
      steps.push(`Immune to ${p.type}: −${p.amount}`);
      return { ...p, amount: 0 };
    }
    const r = has(traits.resist, p.type) && !piercing;
    const v = has(traits.vuln, p.type);
    if ( r && !v ) {
      const half = Math.floor(p.amount / 2);
      steps.push(`Resists ${p.type}: ${p.amount} → ${half}`);
      return { ...p, amount: half };
    }
    if ( v && !r ) {
      steps.push(`Vulnerable to ${p.type}: ${p.amount} → ${p.amount * 2}`);
      return { ...p, amount: p.amount * 2 };
    }
    return p;
  });

  const chakra = parts.filter(p => p.type === "chakra").reduce((t, p) => t + p.amount, 0);
  const health = parts.filter(p => p.type !== "chakra").reduce((t, p) => t + p.amount, 0);

  const pool = (cur, temp, amount) => {
    const fromTemp = Math.min(temp, amount);
    const rest = amount - fromTemp;
    return { temp: temp - fromTemp, value: Math.max(0, cur - rest), overflow: Math.max(0, rest - cur), fromTemp, taken: rest };
  };
  const hp = pool(sys.hp?.value ?? 0, sys.hp?.temp ?? 0, health);
  const cp = pool(sys.cp?.value ?? 0, sys.cp?.temp ?? 0, chakra);
  const wasAtZero = (sys.hp?.value ?? 0) <= 0;
  const update = {};
  if ( health ) Object.assign(update, { "system.hp.value": hp.value, "system.hp.temp": hp.temp });
  if ( chakra ) Object.assign(update, { "system.cp.value": cp.value, "system.cp.temp": cp.temp });

  // 0 HP consequences.
  const hpMax = sys.hp?.max ?? 0;
  const instantDeath = rule("instantDeath") && health > 0 && !wasAtZero && hp.value === 0 && hp.overflow >= hpMax && hpMax > 0;
  const deathFromDamageAtZero = wasAtZero && health > 0 && hp.taken + hp.fromTemp > 0;
  let deathFailures = 0;
  if ( deathFromDamageAtZero ) deathFailures = (health >= hpMax ? 3 : (crit ? 2 : 1));
  const dropsToZero = health > 0 && !wasAtZero && hp.value === 0;
  return {
    total: health + chakra, health, chakra, raw, steps, parts,
    hpLost: health ? (sys.hp.value - hp.value) : 0, tempHpLost: hp.fromTemp, cpLost: chakra ? (sys.cp.value - cp.value) : 0,
    tempCpLost: cp.fromTemp, update, dropsToZero, instantDeath, deathFailures, wasAtZero
  };
}

/**
 * Healing or chakra recovery. Envenomed creatures can't regain HP. Healing at 0 HP ends Dying and
 * resets death save successes (failures persist until a short rest).
 */
export function healPlan(target, amount, pool = "hp") {
  const sys = target.system;
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if ( pool === "hp" ) {
    const envenomed = rule("envenomedBlocksHealing") && list(target.effects).some(e => e.type === "condition" && e.system?.key === "envenomed" && !e.disabled);
    if ( envenomed ) return { blocked: "Envenomed: can't regain hit points", update: {} };
    const value = Math.min(sys.hp.max, sys.hp.value + n);
    const revived = sys.hp.value <= 0 && value > 0;
    const update = { "system.hp.value": value };
    if ( revived ) update["system.deathSaves.success"] = 0;
    return { gained: value - sys.hp.value, update, revived };
  }
  if ( pool === "cp" ) {
    const value = Math.min(sys.cp.max, sys.cp.value + n);
    return { gained: value - sys.cp.value, update: { "system.cp.value": value } };
  }
  const key = pool === "tempCp" ? "cp" : "hp";
  const temp = Math.max(sys[key].temp ?? 0, n);
  return { gained: temp - (sys[key].temp ?? 0), update: { [`system.${key}.temp`]: temp } };
}

/**
 * Concentration check after damage (KB 04): Con (Chakra Control), DC = max(15 + ranks of all
 * concentrated jutsu, half the damage taken). Stable jutsu can't be lost to damage.
 * @param {object} target
 * @param {number} damage   damage taken (after reductions)
 * @returns {{dc:number, atRisk: Array<{id,name}>}|null}
 */
export function concentrationOnDamage(target, damage, { rankValue = r => ["E", "D", "C", "B", "A", "S"].indexOf(r) } = {}) {
  if ( damage <= 0 || !rule("concentrationOnDamage") ) return null;
  const ids = list(target.system.combat?.concentrating);
  const items = ids.map(id => target.items.get?.(id) ?? list(target.items).find(i => i.id === id)).filter(Boolean);
  const kw = i => (i.system.keywords instanceof Set ? i.system.keywords : new Set(i.system.keywords ?? []));
  const atRisk = items.filter(i => !kw(i).has("stable"));
  if ( !atRisk.length ) return null;
  const ranks = items.reduce((t, i) => t + Math.max(0, rankValue(i.system.rank)), 0);
  return { dc: Math.max(15 + ranks, Math.floor(damage / 2)), atRisk: atRisk.map(i => ({ id: i.id, name: i.name })) };
}

/**
 * A death save (no bonuses unless an effect names death saves). d20 >= 10 succeeds;
 * nat 1 = two failures; nat 20 = regain 1 HP and remove two failures; 3 successes = stable;
 * 3 failures = dead.
 */
export function deathSaveResult(current, natural, bonus = 0) {
  let { success = 0, failure = 0 } = current ?? {};
  const total = natural + bonus;
  if ( natural === 20 ) {
    failure = Math.max(0, failure - 2);
    return { success: 0, failure, regain: 1, outcome: "revive" };
  }
  if ( natural === 1 ) failure += 2;
  else if ( total >= 10 ) success += 1;
  else failure += 1;
  failure = Math.min(3, failure);
  success = Math.min(3, success);
  return { success, failure, outcome: failure >= 3 ? "dead" : success >= 3 ? "stable" : "continue" };
}
