/**
 * Advantage on any dice roll (King 2026-11-13; ADV2). With advantage the whole roll is made twice
 * and the higher total kept; disadvantage keeps the lower; both cancel. Only dice a source names
 * get it (rule elements: selector "damage", "damage:fire", "healing", "recovery"...; see
 * rules/elements.mjs contextualAdvantage). d20 rolls use the same sources through rollWithSpec.
 */
import { createN5eRoll } from "./n5e-roll.mjs";
import { contextualAdvantage, keptIndex } from "../rules/elements.mjs";
import { resolveMode } from "../rules/advantage.mjs";
import { diceParts, composeDice } from "../rules/roll-math.mjs";
import { dialogs, wantsDialog } from "./roll-dialog.mjs";

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
export async function rollDice(actor, formula, { target = null, data = null, base = "normal", final = null, ...spec } = {}) {
  const sources = diceSources(actor, spec, target);
  // `base` counts as one more source; `final` is the mode picked in the roll dialog (ROLL1), which wins.
  const mode = final && final !== "own" ? final : resolveMode(sources, base);
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

/** The advantage sources for a dice roll (rule elements and the sheet toggle for its group). */
export function diceSources(actor, spec = {}, target = null) {
  const sources = actor ? contextualAdvantage(actor, { type: spec.kind, ...spec }, target) : { advantage: [], disadvantage: [] };
  return addSheetToggle(sources, actor, rollGroup(spec.kind));
}

/**
 * The dice roll dialog (ROLL1b): shows the parts, lets the roller untick them, add modifiers (typed
 * for damage), set Critical and pick the mode. Resolves {parts, crit, mode} ("own" = as worked out)
 * or null when closed. Without the dialog (setting or tests) the parts come back as they are.
 * @param {Actor} actor
 * @param {{title, parts: Array<{formula, type?, label?, abilityMod?}>, modifiers?: Array<{label, value}>,
 *   kind: string, showCrit?: boolean, crit?: boolean, types?: object, cancellable?: boolean, spec?: object, target?: Actor}} o
 */
export async function promptDice(actor, o) {
  const parts = diceParts(o.parts, o.modifiers ?? []);
  const sources = diceSources(actor, { kind: o.kind, ...(o.spec ?? {}) }, o.target ?? null);
  let choice = { off: [], added: [], mode: "own", crit: !!o.crit };
  if ( wantsDialog() ) {
    choice = await dialogs.dice({ title: o.title, parts, sources, crit: !!o.crit, showCrit: !!o.showCrit, types: o.types ?? null,
      cancellable: o.cancellable, mode: "own" });
    if ( !choice ) return null;
  }
  const composed = composeDice(parts, choice);
  return { parts: composed.parts, crit: o.showCrit ? composed.crit : !!o.crit, mode: choice.mode ?? "own", edited: composed.edited };
}

/**
 * One formula through the dice dialog, then rolled (healing, pool dice, recovery dice, feature dice).
 * Added parts join the formula. Resolves rollDice's result or null when the dialog was closed.
 */
export async function rollFormula(actor, formula, { title = "Roll", kind = "dice", cancellable = true, ...spec } = {}) {
  const picked = await promptDice(actor, { title, parts: [{ formula, label: formula }], kind, cancellable, spec });
  if ( !picked ) return null;
  const joined = picked.parts.map(p => `(${p.formula})`).join(" + ") || "0";
  return rollDice(actor, joined, { kind, ...spec, final: picked.mode });
}

