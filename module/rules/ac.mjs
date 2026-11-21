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
export function computeAC({ calc = "default", dexMod, dexLabel = "Dex", prof, armor = null, flat = 10, formula = "", rollData = {},
  blocking = 0, bonus = 0, penalty = 0, baseFloor = null }) {
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
        parts.push(["Base", 10], [armor.name ?? "Armor", armor.bonus], [dexLabel, cappedDex], ["Half proficiency", Math.floor(prof / 2)]);
      } else {
        base = 10 + prof + dexMod;
        parts.push(["Base", 10], ["Proficiency (Martial Technique)", prof], [dexLabel, dexMod]);
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
      parts.push([dexLabel, cappedDex], ["Half proficiency", Math.floor(prof / 2)]);
  }
  // King Q-D28 (Reality Shift): a save DC that can be your AC, when it's higher than the base.
  if ( baseFloor && baseFloor.value > base ) {
    base = baseFloor.value;
    parts.splice(0, parts.length, [baseFloor.label, baseFloor.value]);
  }
  if ( blocking ) parts.push(["Blocking", blocking]);
  if ( bonus ) parts.push(["Bonuses", bonus]);
  return {
    value: base + blocking + bonus + penalty, base, calc: used,
    parts: parts.map(([label, value], i) => ({ label, value, base: i === 0 }))
  };
}

/**
 * Illusory items worn over armor (King Q-D28): what they change in the AC (pure).
 *   ability    replaces Dex: an ability key, or a discipline (nin|tai|gen) for its ability's modifier
 *   fromDC     that discipline's save DC can be the AC (when higher)
 *   whileState only while the wearer is in this named state
 * @param {object[]} overlays  [{name, ability, fromDC, whileState}]
 * @param {{abilityMod, abilityLabel, discipline, disciplineLabel, hasState}} f
 * @returns {{dexMod?: number, dexLabel?: string, baseFloor?: {label, value}}}
 */
export function overlayAC(overlays = [], { abilityMod, abilityLabel = k => k, discipline = () => null, disciplineLabel = d => d, hasState = () => false } = {}) {
  const out = {};
  for ( const o of overlays ?? [] ) {
    if ( o.whileState && !hasState(o.whileState) ) continue;
    if ( o.ability ) {
      const disc = discipline(o.ability);
      const value = disc ? Number(disc.mod) || 0 : abilityMod(o.ability);
      if ( Number.isFinite(value) && (out.dexMod == null || value > out.dexMod) ) {
        out.dexMod = value;
        out.dexLabel = `${disc ? `${disciplineLabel(o.ability)} ability` : abilityLabel(o.ability)} (${o.name})`;
      }
    }
    if ( o.fromDC ) {
      const dc = Number(discipline(o.fromDC)?.dc) || 0;
      if ( dc && (!out.baseFloor || dc > out.baseFloor.value) ) out.baseFloor = { label: `${disciplineLabel(o.fromDC)} save DC (${o.name})`, value: dc };
    }
  }
  return out;
}
