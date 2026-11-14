/**
 * Advantage on any dice roll (King 2026-11-13; ADV2). With advantage the whole roll is made twice
 * and the higher total kept; disadvantage keeps the lower; both cancel. Only dice a source names
 * get it (rule elements: selector "damage", "damage:fire", "healing", "recovery"...; see
 * rules/elements.mjs contextualAdvantage). d20 rolls use the same sources through rollWithSpec.
 */
import { createN5eRoll } from "./n5e-roll.mjs";
import { contextualAdvantage, keptIndex } from "../rules/elements.mjs";
import { resolveMode } from "../rules/advantage.mjs";

/**
 * Roll a formula with a mode. Returns the kept roll, the discarded one (or null) and the mode.
 * @returns {Promise<{roll: Roll, discarded: Roll|null, mode: string}>}
 */
export async function rollAdvantaged(formula, data = {}, mode = "normal") {
  const first = await createN5eRoll(formula, data).evaluate();
  if ( mode !== "advantage" && mode !== "disadvantage" ) return { roll: first, discarded: null, mode: "normal" };
  const second = await createN5eRoll(formula, data).evaluate();
  const keep = keptIndex([first.total, second.total], mode);
  return { roll: keep ? second : first, discarded: keep ? first : second, mode };
}

/**
 * Any non-d20 dice roll for an actor: sources come from the actor's rule elements for this roll.
 * @param {Actor} actor
 * @param {string} formula
 * @param {{kind: string, type?: string, key?: string, scope?: string, damageType?: string, target?: Actor, data?: object}} spec
 * @returns {Promise<{roll, discarded, mode, sources}>}
 */
export async function rollDice(actor, formula, { target = null, data = null, base = "normal", ...spec } = {}) {
  const sources = actor ? contextualAdvantage(actor, { type: spec.kind, ...spec }, target) : { advantage: [], disadvantage: [] };
  addSheetToggle(sources, actor, rollGroup(spec.kind));
  // `base` is this roll's own choice (the card's Adv/Dis buttons, or Alt/Ctrl); it counts as one source.
  const mode = resolveMode(sources, base);
  const result = await rollAdvantaged(formula, data ?? actor?.getRollData?.() ?? {}, mode);
  return { ...result, sources };
}

/** Sheet roll-mode groups (King 2026-11-13), set in each sheet's Effects tab. */
export const ROLL_GROUPS = Object.freeze({ d20: "D20 rolls", damage: "Damage", healing: "Healing", other: "Other dice" });

/** Which group a roll belongs to. */
export function rollGroup(kind) {
  if ( !kind || ["attack", "save", "check", "d20"].includes(kind) ) return "d20";
  if ( kind === "damage" ) return "damage";
  if ( kind === "healing" ) return "healing";
  return "other";
}

/** The sheet toggle for one group: "normal" | "advantage" | "disadvantage". A legacy single value covers every group. */
export function sheetRollMode(actor, group) {
  const stored = actor?.flags?.n5e?.rollMode;
  const mode = typeof stored === "string" ? stored : stored?.[group];
  return ["advantage", "disadvantage"].includes(mode) ? mode : "normal";
}

/**
 * The sheet's roll-mode toggle for this roll's group (King 2026-11-13): Advantage or Disadvantage on
 * every roll of that group until switched back to Normal. Counts as one source.
 */
export function addSheetToggle(sources, actor, group = "d20") {
  const mode = sheetRollMode(actor, group);
  if ( mode === "advantage" ) sources.advantage.push("Sheet toggle");
  else if ( mode === "disadvantage" ) sources.disadvantage.push("Sheet toggle");
  return sources;
}

/** One-line note for a card: "Advantage (Burning Will): kept 9, not 4". */
export function advantageNote(result, label = "") {
  if ( !result?.discarded ) return "";
  const who = [...result.sources?.advantage ?? [], ...result.sources?.disadvantage ?? []].join(", ");
  return `${label ? `${label}: ` : ""}${result.mode === "advantage" ? "Advantage" : "Disadvantage"}${who ? ` (${who})` : ""}: kept ${result.roll.total}, not ${result.discarded.total}`;
}
