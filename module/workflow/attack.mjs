/**
 * Weapon and unarmed attacks (pure spec + Foundry roll).
 *
 * Attack = ability mod + proficiency (if proficient) + weapon/unarmed bonuses, effects and Mastery
 *   (system.weaponBonuses) + condition penalties (once per roll).
 *   Melee: Str; ranged: Dex; Finesse or thrown: the better of Str and Dex (KB 03; King 2026-11-13).
 *   The Unarmed Strike: Str, or the better of Str and Dex when Taijutsu use Dex (rules/unarmed.mjs).
 * Damage = weapon die + the same ability mod + damage bonuses; unarmed = rules/unarmed.mjs.
 * Weapon properties (rules/weapon-properties.mjs, ATK1): Critical X (crit range), Deadly X (crit
 *   dice), Heavy (Str 16 or disadvantage; + half Str mod damage on top), Volatile X (no ability mod;
 *   backfire and jam), Versatile (two-handed die), Reach, Thrown/Range (long range, ranged in melee,
 *   beyond long range refused), Returning, Multiattack (bonus action, no ability mod).
 * A natural roll in the crit range crits; crit damage doubles dice and the ability mod only.
 * The Ammunition Die is rolled on thrown and ranged attacks only: 1-2 steps it down; 0 removes the item.
 */
import { isProficientWith } from "../rules/proficiency.mjs";
import { breakdownTooltip } from "../view-models/common.mjs";
import { Breakdown } from "../rules/breakdown.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { damageButtons } from "./activity-buttons.mjs";
import { rollAmmo } from "./ammo.mjs";
import { unarmedSpec, stepDie, resolveFormula, activeStance, isUnarmedStrike, equippedWeapons } from "../rules/unarmed.mjs";
import { weaponCritBonus, deadlyDice, heavyPenalty, heavyDamage, volatileRank, backfires, attackMode, attackRange,
  rangeSources, rollsAmmo, lightAttackBlock, matchingWeapons, needText, evocationDie, evocationEcho } from "../rules/weapon-properties.mjs";

const signedPart = n => (n ? ` ${n < 0 ? "-" : "+"} ${Math.abs(n)}` : "");

/**
 * Attack spec for a weapon (or null for unarmed): everything rollWithSpec() needs (bonus with its
 * Breakdown for the hover tooltip, crit scope and bonus, extra advantage sources) plus the damage
 * the card's buttons will roll. Pure apart from reading the actor, so it's tested in Node.
 * @param {Actor} actor
 * @param {Item|null} weapon
 * @param {object} [o]
 * @param {string} [o.mode]            "thrown" to throw a melee weapon that can be thrown
 * @param {number|null} [o.distance]   feet to the single target (null: unknown)
 * @param {number} [o.closeHostiles]   hostiles within 5 ft that can see the attacker
 * @param {boolean} [o.twoHanded]      Versatile weapon used with two hands
 * @param {boolean} [o.bonusAction]    Multiattack bonus-action attack (no ability mod on damage)
 * @param {boolean} [o.light]          the Light extra attack (adds the ability mod, King 2026-11-13)
 * @returns {object} spec: {type, key, kind, scope, label, bonus, breakdown, ability, abilityMod, mode,
 *   damage: {formula, die, extra, types, critExtra, flat}, ammo, rollsAmmo, critBonus,
 *   disadvantageSources, refuse, volatile, tooltip}
 */
export function weaponAttackSpec(actor, weapon = null, { mode: requested = "", distance = null, closeHostiles = 0,
  twoHanded = false, bonusAction = false, light = false } = {}) {
  if ( isUnarmedStrike(weapon) ) weapon = null; // the Unarmed Strike item rolls as an unarmed strike
  const sys = actor.system;
  const mod = k => sys.abilities?.[k]?.mod ?? 0;
  const pen = sys.conditionPenalties?.sources ?? {};
  const unarmed = unarmedSpec(actor);
  let ability = unarmed.ability;
  let label = "Unarmed Strike";
  let proficient = true;
  let die = unarmed.die;
  let extra = unarmed.extra;
  let types = [unarmed.type];
  let scope = "unarmed";
  let mode = "melee";
  let critBonus = 0, critExtra = "", flat = 0, noMod = false, refuse = null;
  const disadvantage = [];
  if ( weapon ) {
    const w = weapon.system;
    const props = w.properties ?? {};
    mode = attackMode(weapon, { requested, distance });
    const better = mod("dex") > mod("str") ? "dex" : "str";
    // Finesse or Thrown weapons: the better of Str and Dex (Chapter 8; King 2026-11-13).
    ability = ("finesse" in props || "thrown" in props) ? better : mode === "ranged" ? "dex" : "str";
    label = `${weapon.name}${mode === "thrown" && w.weaponType !== "ranged" ? " (thrown)" : ""}`;
    // Category + group proficiency (DATA1b); a stored false stays a manual override.
    proficient = w.proficient !== false && isProficientWith(sys.grants?.weaponProf ?? [], { ...w, name: weapon.name }, { npc: actor.type === "npc" });
    die = (twoHanded && w.damage?.versatile) || w.damage?.die || "1d4";
    if ( twoHanded && w.damage?.versatile ) label += " (two hands)";
    extra = [];
    // Stance die rules (Great Weapon Stance: reroll 1s and 2s on Heavy weapons' damage die).
    const stanceDie = activeStance(actor)?.flags?.n5e?.weaponDie;
    if ( stanceDie?.mod && (!stanceDie.property || stanceDie.property in props) ) die = `${die}${stanceDie.mod}`;
    types = [...(w.damage?.types ?? [])];
    scope = "weapon";
    critBonus = weaponCritBonus(weapon);
    critExtra = deadlyDice(weapon, die.replace(/r<\d+|min\d+/g, ""));
    const heavy = heavyPenalty(sys.abilities?.str?.value, weapon);
    if ( heavy ) disadvantage.push(heavy);
    flat += heavyDamage(mod("str"), weapon);
    noMod = volatileRank(weapon) > 0;
    const ranged = rangeSources(mode, attackRange(weapon, mode), distance, closeHostiles);
    disadvantage.push(...ranged.disadvantage);
    refuse = ranged.refuse;
  }
  if ( bonusAction ) { noMod = true; label += " (bonus action)"; }
  if ( light ) label += " (Light extra attack)";
  // Evocation (Combat Scrolls): the sealed echo's discipline attack bonus and damage type, no ability
  // modifier, and the die grows with level.
  const echo = weapon ? evocationEcho(weapon) : null;
  if ( weapon && "evocation" in (weapon.system.properties ?? {}) ) {
    if ( !echo ) refuse ??= `Seal an echo into ${weapon.name} first (item sheet, Evocation).`;
    else {
      die = evocationDie(weapon, sys.level);
      types = echo.type ? [echo.type] : [];
      noMod = true;
      critExtra = deadlyDice(weapon, die);
      flat = 0;
    }
  }
  const bonuses = sys.weaponBonuses?.[scope] ?? { attack: [], damage: 0 };
  if ( !echo ) flat += bonuses.damage ?? 0;
  let b;
  if ( echo ) {
    const discLabel = { nin: "Ninjutsu", gen: "Genjutsu", tai: "Taijutsu" }[echo.discipline] ?? echo.discipline;
    b = new Breakdown(`${label} attack`).base(`${discLabel} attack (sealed echo)`, sys.disciplines?.[echo.discipline]?.attack ?? 0);
  } else {
    b = new Breakdown(`${label} attack`).base(ability.toUpperCase(), mod(ability)).add("Proficiency", proficient ? sys.prof : 0);
    for ( const p of bonuses.attack ?? [] ) b.add(p.label, p.value);
    for ( const p of [...(pen.allDice ?? []), ...(pen.d20Physical ?? []), ...(pen.checksAndAttacks ?? [])] ) b.add(p.label, p.value);
  }
  // Volatile and the Multiattack bonus attack add no ability modifier to damage.
  const abilityMod = noMod ? 0 : mod(ability);
  return {
    type: "weaponAttack", key: weapon?.id ?? "unarmed", kind: "attack", scope, label: `${label} attack`,
    ranged: mode !== "melee", mode, bonus: b.total, breakdown: b.toJSON(), ability, abilityMod,
    damage: { formula: `${die}${extra.map(x => ` + ${x}`).join("")}${signedPart(flat)}${signedPart(abilityMod)}`, die, extra, types, critExtra, flat },
    ammo: weapon?.system.ammo?.usesDie ? weapon.system.ammo : null,
    rollsAmmo: weapon ? rollsAmmo(weapon, mode, distance) : false,
    critBonus, disadvantageSources: disadvantage, refuse,
    volatile: weapon ? volatileRank(weapon) : 0,
    note: echo ? "Evocation: no more than 1 attack with it per Attack action." : undefined,
    tooltip: breakdownTooltip(b)
  };
}

/** Shocked: at most one attack or one jutsu per turn (CAST1). Returns a problem or null. */
export function shockedBlock(actor) {
  return actor.system?.conditionPenalties?.flags?.maxAttackOrJutsuPerTurn && actor.flags?.n5e?.economy?.attackOrJutsu
    ? "Shocked: already made an attack or cast a jutsu this turn" : null;
}

/** Statuses that stop a creature from threatening a ranged attacker ("can see you and isn't incapacitated"). */
const NOT_THREATENING = ["incapacitated", "stunned", "unconscious", "petrified", "paralyzed", "blinded", "dead", "dying"];

/** Distance and close-hostile facts for an attack from the actor's token at one target (canvas). */
export function attackGeometry(actor, targetToken) {
  const token = actor.getActiveTokens?.()[0] ?? null;
  const grid = globalThis.canvas?.grid;
  if ( !token || !grid?.measurePath ) return { distance: null, closeHostiles: 0 };
  const measure = other => grid.measurePath([token.center, other.center]).distance;
  const distance = targetToken ? measure(targetToken) : null;
  const hostile = token.document.disposition;
  const closeHostiles = (canvas.tokens?.placeables ?? []).filter(t => t !== token && t.actor
    && t.document.disposition !== hostile && t.document.disposition !== 0 && hostile !== 0
    && !NOT_THREATENING.some(s => t.actor.statuses?.has(s)) && measure(t) <= 5).length;
  return { distance, closeHostiles };
}

/**
 * Attack with a weapon (or unarmed when weapon is null): one attack roll card with Damage / Critical
 * buttons, the Action (or Bonus Action) marked used, the Ammunition Die on thrown and ranged attacks,
 * and Volatile backfires (the weapon jams until an Action unjams it).
 * @param {object} [o]
 * @param {string} [o.mode]         "thrown", "twoHanded", "bonus", "light" (Combat tab) or "opportunity" (Reaction, POS1)
 */
export async function attackWithWeapon(actor, weapon = null, { event, targetActors, mode = "" } = {}) {
  if ( isUnarmedStrike(weapon) ) weapon = null;
  const shocked = shockedBlock(actor);
  if ( shocked ) return ui.notifications.warn(shocked);
  if ( weapon?.getFlag?.("n5e", "jammed") ) return ui.notifications.warn(`${weapon.name} is jammed. Spend an Action to unjam it.`);
  const targets = targetActors ? targetActors.map(a => a.getActiveTokens?.()[0]).filter(Boolean)
    : Array.from(game.user?.targets ?? []);
  if ( mode === "light" ) {
    const block = lightAttackBlock({ inCombat: inActiveCombat(actor), economy: actor.flags?.n5e?.economy ?? {} });
    if ( block ) return ui.notifications.warn(block);
  }
  // An Opportunity Attack happens before the target leaves reach: no range check from where it ended.
  const geometry = mode === "opportunity" ? { distance: null, closeHostiles: 0 } : attackGeometry(actor, targets.length === 1 ? targets[0] : null);
  const spec = weaponAttackSpec(actor, weapon, { mode: mode === "thrown" ? "thrown" : "", twoHanded: mode === "twoHanded",
    bonusAction: mode === "bonus", light: mode === "light", ...geometry });
  if ( spec.refuse ) return ui.notifications.warn(spec.refuse);
  spec.footer = `<div class="n5e-acts"><div class="act-row">${damageButtons(
    [{ formula: spec.damage.formula, type: spec.damage.types[0] ?? "" }],
    { abilityMod: spec.abilityMod, weapon: true, weaponId: weapon?.id, critExtra: spec.damage.critExtra })}</div></div>`;
  let natural = null;
  const message = await rollWithSpec(actor, spec, { event, onResult: r => { natural = r.natural; },
    ...(targetActors ? { target: targetActors.length === 1 ? targetActors[0] : null } : {}) });
  if ( !message ) return message;
  if ( actor.isOwner ) {
    // Attack action (marks it for the Light extra attack), the Bonus Action (Multiattack), or the
    // Light extra attack itself (no action of its own).
    const used = mode === "bonus" ? { "flags.n5e.economy.bonus": true }
      : mode === "light" ? { "flags.n5e.economy.lightAttack": true }
        : mode === "opportunity" ? { "flags.n5e.economy.reaction": true }
        : { "flags.n5e.economy.action": true, "flags.n5e.economy.attackAction": true };
    await actor.update({ ...used, "flags.n5e.economy.attackOrJutsu": true });
  }
  if ( weapon && backfires(weapon, natural) ) {
    await weapon.setFlag("n5e", "jammed", true);
    const ChatMessageCls = CONFIG.ChatMessage.documentClass;
    await ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }),
      content: `<div class="n5e-roll-card"><b>${weapon.name} backfires</b> (natural ${natural}, Volatile ${spec.volatile}). The attack is interrupted: no damage. The weapon is jammed until you spend an Action to unjam it.</div>` });
    await message.setFlag("n5e", "backfired", true);
    return message;
  }
  if ( weapon && spec.rollsAmmo ) await rollAmmo(weapon);
  // Engaged (POS1): a melee attack against one creature engages both.
  const single = targetActors?.length === 1 ? targetActors[0] : targets.length === 1 ? targets[0].actor : null;
  if ( spec.mode === "melee" && single ) await import("./positioning.mjs").then(m => m.recordEngagement(actor, single));
  return message;
}

/** True when the actor is a combatant in a started combat (turn economy is tracked). */
export function inActiveCombat(actor) {
  const combat = globalThis.game?.combat;
  return !!combat?.started && combat.combatants.some(c => c.actorId === actor.id || c.actor === actor);
}

/**
 * The weapon for a strike (ATK1b): equipped weapons that meet the strike's need ({keywords, groups,
 * properties}). One match is used; several open a chooser; none warns with what's needed.
 * @returns {Promise<Item|null>}
 */
export async function pickWeapon(actor, need = null) {
  const candidates = matchingWeapons(equippedWeapons(actor), need);
  if ( !candidates.length ) {
    ui.notifications.warn(`Equip ${needText(need)} for this strike.`);
    return null;
  }
  if ( candidates.length === 1 ) return candidates[0];
  const buttons = candidates.map((w, i) => ({ action: w.id, label: w.name, default: i === 0 }));
  const choice = await foundry.applications.api.DialogV2.wait({ window: { title: "Strike with which weapon?" },
    content: `<p>${actor.name}: choose the weapon for this strike.</p>`, buttons, rejectClose: false });
  return candidates.find(w => w.id === choice) ?? null;
}

/** Spend an Action to unjam a Volatile weapon (Chapter 5). */
export async function unjamWeapon(actor, weapon) {
  if ( !weapon?.getFlag?.("n5e", "jammed") ) return null;
  if ( actor.isOwner ) await actor.update({ "flags.n5e.economy.action": true });
  await weapon.unsetFlag("n5e", "jammed");
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }),
    content: `<div class="n5e-roll-card"><b>${weapon.name}</b> unjammed (Action).</div>` });
}

/**
 * A stance or feature strike (Bleeding Edge, Wolf Fang Fist, Raiding Strike...): an unarmed or weapon
 * attack with a stepped die, extra dice, Pierce, a maximized die, or several attacks.
 * @param {Actor} actor
 * @param {{kind, dieSteps, extraDice, pierce, maximize, attacks, weapon}} s   weapon: optional need
 *   {keywords, groups, properties} used to choose the weapon (pickWeapon)
 */
export async function strikeAttack(actor, s, { event, label = "Strike", poolRoll = null, targetActors = null } = {}) {
  // The strike's weapon need, if it names one (s.weapon = {keywords, groups, properties}).
  const weapon = s.kind === "weapon" ? await pickWeapon(actor, s.weapon ?? null) : null;
  if ( s.kind === "weapon" && !weapon ) return undefined; // nothing rolled: the caller refunds the cost
  const shocked = shockedBlock(actor);
  if ( shocked ) return ui.notifications.warn(shocked);
  if ( weapon?.getFlag?.("n5e", "jammed") ) return ui.notifications.warn(`${weapon.name} is jammed. Spend an Action to unjam it.`);
  const spec = weaponAttackSpec(actor, weapon);
  let die = stepDie(spec.damage.die, s.dieSteps || 0);
  if ( s.maximize ) die = die.replace(/^(\d*)d(\d+)$/, (m, n, f) => `${n || 1}d${f}min${f}`);
  const extra = resolveFormula(String(s.extraDice || "").replace(/@poolRoll/g, String(poolRoll ?? 0))
    .replace(/@wdie/g, spec.damage.die.replace(/min\d+|r<\d+/g, "")), actor);
  const mod = spec.abilityMod;
  const formula = `${die}${spec.damage.extra.map(x => ` + ${x}`).join("")}${extra ? ` + ${extra}` : ""}${signedPart(spec.damage.flat)}${signedPart(mod)}`;
  // Shocked limits a multi-attack strike to one attack.
  const n = actor.system?.conditionPenalties?.flags?.maxAttackOrJutsuPerTurn ? 1 : Math.max(1, Number(resolveFormula(s.attacks || "1", actor)) || 1);
  let last = null;
  for ( let i = 0; i < n; i++ ) {
    const one = { ...spec, label: `${label}${n > 1 ? ` (${i + 1}/${n})` : ""}` };
    one.footer = `<div class="n5e-acts"><div class="act-row">${damageButtons([{ formula, type: spec.damage.types[0] ?? "" }],
      { abilityMod: mod, weapon: true, weaponId: weapon?.id, pierce: s.pierce || 0, critExtra: spec.damage.critExtra })}</div></div>`;
    last = await rollWithSpec(actor, one, { event, ...(targetActors ? { target: targetActors.length === 1 ? targetActors[0] : null } : {}) });
    if ( !last ) return null;
    if ( weapon && spec.rollsAmmo ) await rollAmmo(weapon);
  }
  if ( last && actor.isOwner ) await actor.update({ "flags.n5e.economy.attackOrJutsu": true });
  return last;
}
