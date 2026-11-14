/**
 * Start of a combatant's turn (pure). KB 03/04 and King's rulings:
 *   - Concentration upkeep is decided by the owner (rules/upkeep.mjs, workflow/upkeep.mjs; TURN1).
 *   - Per-turn uses and pools recover through rules/recovery.mjs.
 *   - Chain resets to 0 unless a Chain jutsu raised or maintained it since the last turn started.
 *   - An armed Combo clears (the Finisher window is the same turn).
 *   - Action economy resets: Action, Bonus Action, Reaction (once per round, back at your turn),
 *     Special Action, free object interaction.
 *   - Recharge X-Y: each spent ability rolls; die size from Y (3-4 d4, 5-6 d6, 7-8 d8, 9-10 d10, 11-12 d12).
 *   - Chakra Surge, Flow: +1 Focus.
 * The plan is pure; workflow/turn.mjs applies it on the active GM's client when a turn begins and
 * posts the start-of-turn card. Other turn-start work (condition damage, effects that end at the
 * start of the creature's turn) is done by workflow/conditions.mjs and workflow/trackers.mjs.
 * Each part checks its optional rule, so turning a rule off in N5e Rules only skips that part.
 */
import { rule } from "../rules-settings.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);

/** "5-6" -> {min: 5, die: 6}; "6" -> {min: 6, die: 6}. */
export function parseRecharge(text) {
  const m = String(text ?? "").match(/(\d+)\s*(?:[-–]\s*(\d+))?/);
  if ( !m ) return null;
  const min = Number(m[1]);
  const top = Number(m[2] ?? m[1]);
  const die = [4, 6, 8, 10, 12].find(d => top <= d) ?? 12;
  return { min, die };
}

/**
 * @param {object} actor
 * @returns {{update: object, chainReset: boolean, comboCleared: boolean, recharges: object[], focusGained: number}}
 */
export function turnStartPlan(actor) {
  const sys = actor.system;
  const flags = actor.flags?.n5e ?? {};
  const update = { "flags.n5e.economy": { action: false, bonus: false, reaction: false, special: false, object: false, attackOrJutsu: false } };
  const chain = sys.combat?.chain ?? {};
  const chainReset = rule("chainReset") && (chain.value > 0 || chain.active) && !flags.chainTouched;
  if ( chainReset ) {
    update["system.combat.chain.value"] = 0;
    update["system.combat.chain.active"] = false;
  }
  update["flags.n5e.chainTouched"] = false;
  const comboCleared = rule("comboClear") && !!flags.combo;
  if ( comboCleared ) update["flags.n5e.combo"] = null;
  // Chakra Surge, Flow: regain 1 Focus at the start of the turn.
  const flow = list(actor.effects).some(e => !e.disabled && e.flags?.n5e?.state === "flow");
  const focus = sys.resources?.focus;
  let focusGained = 0;
  if ( flow && focus && (focus.value ?? 0) < (focus.maxValue ?? 0) ) {
    update["system.resources.focus.value"] = (focus.value ?? 0) + 1;
    focusGained = 1;
  }
  const recharges = list(actor.items).filter(i => i.system.uses?.per === "recharge" && (i.system.uses.spent ?? 0) > 0)
    .map(i => ({ id: i.id, name: i.name, ...parseRecharge(i.system.uses.recharge || "6") }));
  return { update, chainReset, comboCleared, recharges, focusGained };
}

/** Which economy slot an activation uses. */
export function economySlot(activationType) {
  return { action: "action", fullTurn: "action", bonus: "bonus", reaction: "reaction", special: "special" }[activationType] ?? null;
}
