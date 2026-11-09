/**
 * Damage, healing, concentration on damage, and death saves (pure). KB 03 with King's rulings:
 *
 *   1. Interception happens first and changes the target entirely: apply the damage to the interceptor,
 *      whose DR, resistances and effects are the ones that count.
 *   2. DR applies once per resource pool, in the damaged creature’s chosen type order, reduced by Pierce. Damage from
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
 * @param {number} [o.multiplier=1]   0.5 for Half, 2 for Double; after flat subtraction.
 * @param {number} [o.pierce=0]
 * @param {boolean} [o.ignoreDR]      condition/environment damage, or effects that say so
 * @param {boolean} [o.genjutsu]      source is a Genjutsu (its psychic damage ignores DR)
 * @param {boolean} [o.crit]
 * @param {boolean} [o.piercing]      Piercing Ninjutsu: half DR, no resistance, immunity -> resistance
 */
export function damagePlan(target, instances, { multiplier = 1, pierce = 0, ignoreDR = false, genjutsu = false, crit = false, piercing = false, flatReduction = 0, drOrder, reactionMultiplier = 1 } = {}) {
  const sys = target.system;
  const traits = sys.traits ?? {};
  const steps = [];
  let parts = instances.map(i => ({ type: i.type || "", amount: Math.max(0, Math.floor(Number(i.amount) || 0)) }));
  const raw = parts.reduce((t, p) => t + p.amount, 0);

  // Static and rolled DR share the same rules; one budget independently protects HP and CP.
  if ( !Number.isFinite(flatReduction) || flatReduction < 0 ) throw new Error("Invalid rolled DR.");
  const totalDR = (sys.dr ?? 0) + Math.floor(flatReduction);
  const dr = Math.max(0, piercing ? Math.floor((totalDR - pierce) / 2) : totalDR - pierce);
  const eligibleTypes = [...new Set(parts.filter(p => p.amount > 0 && !(genjutsu && p.type === "psychic")).map(p => p.type))];
  const healthTypes = eligibleTypes.filter(t => t !== "chakra");
  const requiresDROrder = !ignoreDR && dr > 0 && healthTypes.length > 1 && drOrder === undefined;
  if ( drOrder && (drOrder.length !== eligibleTypes.length || new Set(drOrder).size !== drOrder.length || eligibleTypes.some(t => !drOrder.includes(t))) ) throw new Error("Choose every eligible damage type exactly once.");
  if ( !ignoreDR && dr > 0 ) {
    const left = { hp: dr, cp: dr }, order = drOrder ?? eligibleTypes;
    const indices = parts.map((p, index) => index).sort((a, b) => order.indexOf(parts[a].type) - order.indexOf(parts[b].type));
    for ( const i of indices ) {
      const p = parts[i];
      if ( genjutsu && p.type === "psychic" ) continue;
      const pool = p.type === "chakra" ? "cp" : "hp", cut = Math.min(left[pool], p.amount);
      left[pool] -= cut; parts[i] = { ...p, amount: p.amount - cut };
    }
    const used = (dr - left.hp) + (dr - left.cp);
    if ( used ) steps.push("DR " + dr + " per pool" + (flatReduction ? " (includes " + flatReduction + " Deflection)" : "") + ": −" + used);
  }

  // Resistance / vulnerability / immunity per type.
  parts = parts.map(p => {
    if ( !p.amount ) return p;
    if ( has(traits.immune, p.type) && !piercing ) {
      steps.push(`Immune to ${p.type}: −${p.amount}`);
      return { ...p, amount: 0 };
    }
    const immunityAsResistance = has(traits.immune, p.type) && piercing;
    const r = (has(traits.resist, p.type) && !piercing) || immunityAsResistance;
    const v = !immunityAsResistance && has(traits.vuln, p.type);
    // Equal sources do not stack; opposite Half/Double sources cancel (King 2026-11-09).
    const factors = new Set([multiplier, reactionMultiplier, ...(r ? [0.5] : []), ...(v ? [2] : [])]);
    const factor = factors.has(0.5) && factors.has(2) ? 1 : factors.has(0.5) ? 0.5 : factors.has(2) ? 2 : multiplier;
    const amount = Math.max(0, Math.floor(p.amount * factor));
    if ( factor !== 1 || factors.has(0.5) && factors.has(2) ) steps.push(`${p.type || "Damage"} multiplier ${factor}${immunityAsResistance ? " (immunity treated as resistance)" : ""}: ${p.amount} → ${amount}`);
    return { ...p, amount };
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
    total: health + chakra, health, chakra, raw, steps, parts, requiresDROrder, eligibleTypes,
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
