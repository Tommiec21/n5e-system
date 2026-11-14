/**
 * Advantage / disadvantage sources (pure; ADV1). dnd5e AdvantageModeField pattern: every source is
 * counted; any advantage and any disadvantage cancel; never more than one extra d20 (KB 01).
 *
 * Inputs are plain facts so the rules stay Foundry-free:
 *   roller / target: { flags (conditionPenalties.flags), statuses: Set, senses: {key: range} }
 *   kind: "attack" | "save" | "check"; ability: str|dex|con|int|wis|cha; ranged: boolean
 * Rules (KB 03 and 05, N5e text):
 *   Attacks by a Blinded (unless Blindsight/Tremor Sense/Chakra Sensing), Restrained or Prone
 *     creature: disadvantage. Invisible attacker: advantage unless the target has True Sight or
 *     Chakra Sight. Staggered: disadvantage on Str/Dex/Con attacks, saves and checks. Dazzled: can't
 *     gain advantage on attacks. Helped: advantage on the next attack or check (consumed).
 *   Attacks against a Petrified, Blinded, Stunned, Unconscious or Restrained creature: advantage.
 *     Prone target: melee advantage, ranged disadvantage. Invisible target: disadvantage unless the
 *     attacker has True Sight or Chakra Sight. Dodging target: disadvantage (lost while
 *     incapacitated or at speed 0: Grappled, Restrained).
 *   Saves: Petrified and Stunned auto-fail Str/Dex; Unconscious auto-fails all. Blinded: disadvantage
 *     on Dex/Int/Wis. Dodging: advantage on Dex saves.
 */

const PHYSICAL = new Set(["str", "dex", "con"]);
const has = (who, status) => !!who?.statuses?.has?.(status);
const flag = (who, key) => who?.flags?.[key];
const senses = (who, keys) => keys.some(k => (who?.senses?.[k] ?? 0) > 0);
const incapacitated = who => has(who, "incapacitated") || has(who, "stunned") || has(who, "unconscious") || !!flag(who, "incapacitated");
// Dodge is lost while incapacitated or at speed 0 (Grappled, Restrained) (KB 03; POS1).
const dodgeLost = who => incapacitated(who) || has(who, "grappled") || has(who, "restrained");

/**
 * @returns {{advantage: string[], disadvantage: string[], autoFail: string|null, consume: string[]}}
 */
export function advantageSources({ roller, target = null, kind, ability = null, ranged = false }) {
  const adv = [], dis = [], consume = [];
  let autoFail = null;
  const physical = ability && PHYSICAL.has(ability);

  if ( flag(roller, "disadvantagePhysical") && physical ) dis.push("Staggered");

  if ( kind === "attack" ) {
    if ( flag(roller, "attacksWithDisadvantage") && !senses(roller, ["blindsight", "tremorSense", "chakraSensing"]) ) dis.push("Blinded");
    if ( has(roller, "restrained") ) dis.push("Restrained");
    if ( has(roller, "prone") ) dis.push("Prone");
    if ( flag(roller, "attacksWithAdvantage") && !senses(target, ["trueSight", "chakraSight"]) ) adv.push("Invisible");
    if ( has(roller, "helped") ) { adv.push("Helped"); consume.push("helped"); }
    if ( target ) {
      if ( flag(target, "attackedWithAdvantage") ) adv.push(flag(target, "autoFailSaves") ? "Target Petrified" : "Target Blinded");
      if ( has(target, "stunned") ) adv.push("Target Stunned");
      if ( has(target, "unconscious") ) adv.push("Target Unconscious");
      if ( has(target, "restrained") ) adv.push("Target Restrained");
      if ( has(target, "prone") ) (ranged ? dis : adv).push("Target Prone");
      if ( flag(target, "attackedWithDisadvantage") && !senses(roller, ["trueSight", "chakraSight"]) ) dis.push("Target Invisible");
      if ( has(target, "dodging") && !dodgeLost(target) ) dis.push("Target Dodging");
    }
    // Dazzled: can't gain advantage on attacks (removes the sources rather than cancelling).
    if ( flag(roller, "noAttackAdvantage") && adv.length ) adv.length = 0;
  }

  if ( kind === "save" ) {
    const fails = flag(roller, "autoFailSaves") ?? [];
    if ( has(roller, "unconscious") ) autoFail = "Unconscious";
    else if ( has(roller, "stunned") && PHYSICAL.has(ability) && ability !== "con" ) autoFail = "Stunned";
    else if ( fails.includes(ability) ) autoFail = "Petrified";
    if ( (flag(roller, "disadvantageSaves") ?? []).includes(ability) ) dis.push("Blinded");
    if ( has(roller, "dodging") && ability === "dex" && !dodgeLost(roller) ) adv.push("Dodging");
  }

  if ( kind === "check" && has(roller, "helped") ) { adv.push("Helped"); consume.push("helped"); }

  return { advantage: adv, disadvantage: dis, autoFail, consume };
}

/**
 * Final mode from counted sources plus the click/forced mode (which counts as one source).
 * @param {{advantage: string[], disadvantage: string[]}} sources
 * @param {"normal"|"advantage"|"disadvantage"} [base]
 */
export function resolveMode(sources, base = "normal") {
  const a = sources.advantage.length + (base === "advantage" ? 1 : 0);
  const d = sources.disadvantage.length + (base === "disadvantage" ? 1 : 0);
  if ( a && d ) return "normal";
  if ( a ) return "advantage";
  if ( d ) return "disadvantage";
  return "normal";
}

/** Short note for the card: "Advantage: Target Prone · Disadvantage: Staggered (cancel)". */
export function sourcesNote(sources) {
  const parts = [];
  if ( sources.advantage.length ) parts.push(`Advantage: ${sources.advantage.join(", ")}`);
  if ( sources.disadvantage.length ) parts.push(`Disadvantage: ${sources.disadvantage.join(", ")}`);
  if ( sources.advantage.length && sources.disadvantage.length ) parts.push("they cancel");
  return parts.join(" · ");
}
