/**
 * Start of a combatant's turn (pure). KB 03/04 and King's rulings:
 *   - Concentration upkeep: half the cost paid at casting (Efficient: none), paid jutsu by jutsu in the
 *     order they were started; a jutsu whose upkeep can't be paid ends.
 *   - Chain resets to 0 unless a Chain jutsu raised or maintained it since the last turn started.
 *   - An armed Combo clears (the Finisher window is the same turn).
 *   - Action economy resets: Action, Bonus Action, Reaction (once per round, back at your turn),
 *     Special Action, free object interaction.
 *   - Recharge X-Y: each spent ability rolls; die size from Y (3-4 d4, 5-6 d6, 7-8 d8, 9-10 d10, 11-12 d12).
 */
import { rule } from "../rules-settings.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const kw = item => (item.system.keywords instanceof Set ? item.system.keywords : new Set(item.system.keywords ?? []));

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
 * @returns {{update: object, paid: object[], ended: object[], upkeep: number, chainReset: boolean,
 *   comboCleared: boolean, recharges: object[]}}
 */
export function turnStartPlan(actor) {
  const sys = actor.system;
  const flags = actor.flags?.n5e ?? {};
  const paidMap = flags.concentrationPaid ?? {};
  const update = { "flags.n5e.economy": { action: false, bonus: false, reaction: false, special: false, object: false } };
  let cp = sys.cp?.value ?? 0;
  const paid = [];
  const ended = [];
  const keep = [];
  for ( const id of rule("concentrationUpkeep") ? list(sys.combat?.concentrating) : [] ) {
    const item = actor.items.get?.(id) ?? list(actor.items).find(i => i.id === id);
    if ( !item ) continue;
    const upkeep = kw(item).has("efficient") ? 0 : Math.floor((paidMap[id] ?? item.system.live?.cost ?? 0) / 2);
    if ( upkeep <= cp ) {
      cp -= upkeep;
      keep.push(id);
      paid.push({ id, name: item.name, upkeep });
    } else {
      ended.push({ id, name: item.name, upkeep });
      update[`flags.n5e.concentrationPaid.-=${id}`] = null;
    }
  }
  const upkeep = paid.reduce((t, p) => t + p.upkeep, 0);
  if ( paid.length || ended.length ) {
    update["system.combat.concentrating"] = keep;
    if ( upkeep ) update["system.cp.value"] = cp;
  }
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
  return { update, paid, ended, upkeep, chainReset, comboCleared, recharges, focusGained };
}

/** Which economy slot an activation uses. */
export function economySlot(activationType) {
  return { action: "action", fullTurn: "action", bonus: "bonus", reaction: "reaction", special: "special" }[activationType] ?? null;
}
