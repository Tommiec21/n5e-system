/**
 * Weapon and unarmed attacks (pure spec + Foundry roll).
 *
 * Attack = ability mod + proficiency (if proficient) + condition penalties (once per roll).
 *   Melee: Str; ranged: Dex; finesse or thrown: the better of Str and Dex (KB 03).
 * Damage = weapon die + the same ability mod; unarmed = rules/unarmed.mjs (1, or the Taijutsu stance's
 *   die and type, + Inner Gate dice) + Str.
 * A natural roll in the crit range crits; crit damage doubles dice and the ability mod only.
 * Weapons with an Ammunition Die roll it on each use: 1-2 steps it down; reaching 0 removes the item.
 */
import { breakdownTooltip } from "../view-models/common.mjs";
import { Breakdown } from "../rules/breakdown.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { damageButtons } from "./activity-buttons.mjs";
import { rollAmmo } from "./ammo.mjs";
import { unarmedSpec, stepDie, resolveFormula, activeStance } from "../rules/unarmed.mjs";

/**
 * Attack spec for a weapon (or null for unarmed): everything rollWithSpec() needs (bonus with its
 * Breakdown for the hover tooltip, crit scope) plus the damage parts the card's buttons will roll.
 * Pure apart from reading the actor, so it's tested in Node.
 * @param {Actor} actor
 * @param {Item|null} weapon
 * @returns {object} spec: {type, key, kind, scope, label, bonus, breakdown, ability, abilityMod,
 *   damage: {formula, die, extra, types}, ammo, tooltip}
 */
export function weaponAttackSpec(actor, weapon = null) {
  const sys = actor.system;
  const mod = k => sys.abilities?.[k]?.mod ?? 0;
  const pen = sys.conditionPenalties?.sources ?? {};
  let ability = "str";
  let label = "Unarmed Strike";
  let proficient = true;
  const unarmed = unarmedSpec(actor);
  let die = unarmed.die;
  let extra = unarmed.extra;
  let types = [unarmed.type];
  let scope = "unarmed";
  let isRanged = false;
  if ( weapon ) {
    const w = weapon.system;
    const props = w.properties ?? {};
    const ranged = w.weaponType === "ranged";
    isRanged = ranged;
    ability = ("finesse" in props || "thrown" in props) ? (mod("dex") > mod("str") ? "dex" : "str") : (ranged ? "dex" : "str");
    label = weapon.name;
    proficient = w.proficient !== false;
    die = w.damage?.die || "1d4";
    extra = [];
    // Stance die rules (Great Weapon Stance: reroll 1s and 2s on Heavy weapons' damage die).
    const stanceDie = activeStance(actor)?.flags?.n5e?.weaponDie;
    if ( stanceDie?.mod && (!stanceDie.property || stanceDie.property in props) ) die = `${die}${stanceDie.mod}`;
    types = [...(w.damage?.types ?? [])];
    scope = "weapon";
  }
  const b = new Breakdown(`${label} attack`).base(ability.toUpperCase(), mod(ability))
    .add("Proficiency", proficient ? sys.prof : 0);
  for ( const p of [...(pen.allDice ?? []), ...(pen.d20Physical ?? []), ...(pen.checksAndAttacks ?? [])] ) b.add(p.label, p.value);
  const abilityMod = mod(ability);
  return {
    type: "weaponAttack", key: weapon?.id ?? "unarmed", kind: "attack", scope, label: `${label} attack`, ranged: isRanged,
    bonus: b.total, breakdown: b.toJSON(), ability, abilityMod,
    damage: { formula: `${die}${extra.map(x => ` + ${x}`).join("")}${abilityMod ? ` ${abilityMod < 0 ? "-" : "+"} ${Math.abs(abilityMod)}` : ""}`, die, extra, types },
    ammo: weapon?.system.ammo?.usesDie ? weapon.system.ammo : null,
    tooltip: breakdownTooltip(b)
  };
}

/**
 * The plain Attack: one attack roll card with Damage / Critical buttons, the Action marked used, and
 * the Ammunition Die rolled for weapons that use one.
 * Attack with a weapon (or unarmed when weapon is null): attack card with damage buttons, then the
 * Ammunition Die for weapons that use one.
 */
/** Shocked: at most one attack or one jutsu per turn (CAST1). Returns a problem or null. */
export function shockedBlock(actor) {
  return actor.system?.conditionPenalties?.flags?.maxAttackOrJutsuPerTurn && actor.flags?.n5e?.economy?.attackOrJutsu
    ? "Shocked: already made an attack or cast a jutsu this turn" : null;
}

export async function attackWithWeapon(actor, weapon = null, { event, targetActors } = {}) {
  const shocked = shockedBlock(actor);
  if ( shocked ) return ui.notifications.warn(shocked);
  const spec = weaponAttackSpec(actor, weapon);
  spec.footer = `<div class="n5e-acts"><div class="act-row">${damageButtons(
    [{ formula: spec.damage.formula, type: spec.damage.types[0] ?? "" }], { abilityMod: spec.abilityMod, weapon: true, weaponId: weapon?.id })}</div></div>`;
  const message = await rollWithSpec(actor, spec, { event, ...(targetActors ? { target: targetActors.length === 1 ? targetActors[0] : null } : {}) });
  if ( message && actor.isOwner ) await actor.update({ "flags.n5e.economy.action": true, "flags.n5e.economy.attackOrJutsu": true });
  if ( message && weapon && spec.ammo ) await rollAmmo(weapon);
  return message;
}

/**
 * A stance or feature strike (Bleeding Edge, Wolf Fang Fist, Raiding Strike...): an unarmed or weapon
 * attack with a stepped die, extra dice, Pierce, a maximized die, or several attacks.
 * @param {Actor} actor
 * @param {{kind, dieSteps, extraDice, pierce, maximize, attacks}} s
 */
export async function strikeAttack(actor, s, { event, label = "Strike", poolRoll = null, targetActors = null } = {}) {
  const weapon = s.kind === "weapon" ? actor.items.find(i => i.type === "weapon" && i.system.equipped) ?? null : null;
  if ( s.kind === "weapon" && !weapon ) return ui.notifications.warn("Equip a weapon for this strike.");
  const shocked = shockedBlock(actor);
  if ( shocked ) return ui.notifications.warn(shocked);
  const spec = weaponAttackSpec(actor, weapon);
  let die = stepDie(spec.damage.die, s.dieSteps || 0);
  if ( s.maximize ) die = die.replace(/^(\d*)d(\d+)$/, (m, n, f) => `${n || 1}d${f}min${f}`);
  const extra = resolveFormula(String(s.extraDice || "").replace(/@poolRoll/g, String(poolRoll ?? 0))
    .replace(/@wdie/g, spec.damage.die.replace(/min\d+|r<\d+/g, "")), actor);
  const mod = spec.abilityMod;
  const formula = `${die}${spec.damage.extra.map(x => ` + ${x}`).join("")}${extra ? ` + ${extra}` : ""}${mod ? ` ${mod < 0 ? "-" : "+"} ${Math.abs(mod)}` : ""}`;
  // Shocked limits a multi-attack strike to one attack.
  const n = actor.system?.conditionPenalties?.flags?.maxAttackOrJutsuPerTurn ? 1 : Math.max(1, Number(resolveFormula(s.attacks || "1", actor)) || 1);
  let last = null;
  for ( let i = 0; i < n; i++ ) {
    const one = { ...spec, label: `${label}${n > 1 ? ` (${i + 1}/${n})` : ""}` };
    one.footer = `<div class="n5e-acts"><div class="act-row">${damageButtons([{ formula, type: spec.damage.types[0] ?? "" }],
      { abilityMod: mod, weapon: true, weaponId: weapon?.id, pierce: s.pierce || 0 })}</div></div>`;
    last = await rollWithSpec(actor, one, { event, ...(targetActors ? { target: targetActors.length === 1 ? targetActors[0] : null } : {}) });
    if ( !last ) return null;
    if ( weapon && spec.ammo ) await rollAmmo(weapon);
  }
  if ( last && actor.isOwner ) await actor.update({ "flags.n5e.economy.attackOrJutsu": true });
  return last;
}
