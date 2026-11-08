/**
 * Weapon and unarmed attacks (pure spec + Foundry roll).
 *
 * Attack = ability mod + proficiency (if proficient) + condition penalties (once per roll).
 *   Melee: Str; ranged: Dex; finesse or thrown: the better of Str and Dex (KB 03).
 * Damage = weapon die + the same ability mod; unarmed = 1 (or the stance's d6) + Str.
 * A natural roll in the crit range crits; crit damage doubles dice and the ability mod only.
 * Weapons with an Ammunition Die roll it on each use: 1-2 steps it down; reaching 0 removes the item.
 */
import { breakdownTooltip } from "../view-models/common.mjs";
import { Breakdown } from "../rules/breakdown.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { damageButtons } from "./activity-buttons.mjs";
import { rollAmmo } from "./ammo.mjs";

/** Attack spec for a weapon (or null for unarmed). */
export function weaponAttackSpec(actor, weapon = null) {
  const sys = actor.system;
  const mod = k => sys.abilities?.[k]?.mod ?? 0;
  const pen = sys.conditionPenalties?.sources ?? {};
  let ability = "str";
  let label = "Unarmed Strike";
  let proficient = true;
  let die = sys.combat?.activeStance ? "1d6" : "1";
  let types = ["bludgeoning"];
  let scope = "unarmed";
  if ( weapon ) {
    const w = weapon.system;
    const props = w.properties ?? {};
    const ranged = w.weaponType === "ranged";
    ability = ("finesse" in props || "thrown" in props) ? (mod("dex") > mod("str") ? "dex" : "str") : (ranged ? "dex" : "str");
    label = weapon.name;
    proficient = w.proficient !== false;
    die = w.damage?.die || "1d4";
    types = [...(w.damage?.types ?? [])];
    scope = "weapon";
  }
  const b = new Breakdown(`${label} attack`).base(ability.toUpperCase(), mod(ability))
    .add("Proficiency", proficient ? sys.prof : 0);
  for ( const p of [...(pen.allDice ?? []), ...(pen.d20Physical ?? []), ...(pen.checksAndAttacks ?? [])] ) b.add(p.label, p.value);
  const abilityMod = mod(ability);
  return {
    type: "weaponAttack", key: weapon?.id ?? "unarmed", kind: "attack", scope, label: `${label} attack`,
    bonus: b.total, breakdown: b.toJSON(), ability, abilityMod,
    damage: { formula: `${die}${abilityMod ? ` ${abilityMod < 0 ? "-" : "+"} ${Math.abs(abilityMod)}` : ""}`, die, types },
    ammo: weapon?.system.ammo?.usesDie ? weapon.system.ammo : null,
    tooltip: breakdownTooltip(b)
  };
}

/**
 * Attack with a weapon (or unarmed when weapon is null): attack card with damage buttons, then the
 * Ammunition Die for weapons that use one.
 */
export async function attackWithWeapon(actor, weapon = null, { event } = {}) {
  const spec = weaponAttackSpec(actor, weapon);
  spec.footer = `<div class="n5e-acts"><div class="act-row">${damageButtons(
    [{ formula: spec.damage.formula, type: spec.damage.types[0] ?? "" }], { abilityMod: spec.abilityMod, weapon: true })}</div></div>`;
  const message = await rollWithSpec(actor, spec, { event });
  if ( message && actor.isOwner ) await actor.update({ "flags.n5e.economy.action": true });
  if ( message && weapon && spec.ammo ) await rollAmmo(weapon);
  return message;
}
