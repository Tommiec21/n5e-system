/**
 * Armor Class (KB 01, 08, 12).
 *   default            10 + armor bonus + Dex (capped by armor) + floor(prof / 2)
 *   martialTechnique   10 + prof + Dex, only while unarmored (Taijutsu Specialist)
 *   flat               a fixed number (NPCs, summons)
 *   formula            custom formula string (features)
 * Then: + Blocking (highest, once) + bonuses - condition penalties (Exhaustion, Envenomed).
 */
import { evaluateFormula } from "./formula.mjs";

export const AC_FORMULAS = {
  default: { label: "Default (armor)" },
  martialTechnique: { label: "Martial Technique (10 + prof + Dex, unarmored)", unarmoredOnly: true },
  flat: { label: "Flat value" },
  formula: { label: "Custom formula" }
};

/**
 * @param {object} p
 * @param {string} p.calc
 * @param {number} p.dexMod
 * @param {number} p.prof
 * @param {{bonus:number, dexCap:number|null}|null} p.armor  equipped armor, null if unarmored
 * @param {number} [p.flat]
 * @param {string} [p.formula]
 * @param {object} [p.rollData]
 * @param {number} [p.blocking=0]   highest Blocking X among wielded weapons
 * @param {number} [p.bonus=0]
 * @param {number} [p.penalty=0]    negative number from conditions
 */
export function computeAC({ calc = "default", dexMod, prof, armor = null, flat = 10, formula = "", rollData = {},
  blocking = 0, bonus = 0, penalty = 0 }) {
  let base;
  let used = calc;
  const parts = [];
  // Heavy armor (cap 0) ignores Dex entirely; other caps only limit a positive modifier.
  let cappedDex = dexMod;
  if ( armor && armor.dexCap != null ) cappedDex = armor.dexCap === 0 ? 0 : Math.min(dexMod, armor.dexCap);
  switch ( calc ) {
    case "martialTechnique":
      if ( armor ) {
        used = "default";
        base = 10 + armor.bonus + cappedDex + Math.floor(prof / 2);
        parts.push(["Base", 10], [armor.name ?? "Armor", armor.bonus], ["Dex", cappedDex], ["Half proficiency", Math.floor(prof / 2)]);
      } else {
        base = 10 + prof + dexMod;
        parts.push(["Base", 10], ["Proficiency (Martial Technique)", prof], ["Dex", dexMod]);
      }
      break;
    case "flat":
      base = Number(flat) || 0;
      parts.push(["Natural armor", base]);
      break;
    case "formula":
      base = evaluateFormula(formula, rollData, 10);
      parts.push([`Formula (${formula})`, base]);
      break;
    default:
      base = 10 + (armor?.bonus ?? 0) + cappedDex + Math.floor(prof / 2);
      parts.push(["Base", 10]);
      if ( armor ) parts.push([armor.name ?? "Armor", armor.bonus]);
      parts.push(["Dex", cappedDex], ["Half proficiency", Math.floor(prof / 2)]);
  }
  if ( blocking ) parts.push(["Blocking", blocking]);
  if ( bonus ) parts.push(["Bonuses", bonus]);
  return {
    value: base + blocking + bonus + penalty, base, calc: used,
    parts: parts.map(([label, value], i) => ({ label, value, base: i === 0 }))
  };
}
