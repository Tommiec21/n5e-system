/**
 * CARD2 (docs/CARD2_SPEC.md; King 2026-11-16: combat cards laid out like his SW5e card), pure parts.
 * The Foundry side is workflow/card-layout.mjs.
 *
 *   MULTIPLIERS          the Apply panel's buttons: −1 (heals), 0, ¼, ½, 1, 2 (King Q-C2)
 *   defaultMultiplier    the button picked first for a creature: its damage share (half on a successful
 *                        save, none when immune or missed)
 *   diceSummary          a roll's dice as "2d6: 3, 5" lines, for a tile's expand arrow
 *   saveTile             one creature's save as a tile ("Dex 14 ✓", King Q-C4)
 *   chunk                a list in groups (the save boxes hold 3 creatures each)
 *   shortSaveLabel       "DC 12 DEX Save" (King 2026-11-16)
 */

const list = v => (Array.isArray(v) ? v : v == null ? [] : [...v]);

export const MULTIPLIERS = [
  { mode: "heal", label: "−1", tip: "Heal by this amount" },
  { mode: "none", label: "0", tip: "No damage" },
  { mode: "quarter", label: "¼", tip: "Quarter damage" },
  { mode: "half", label: "½", tip: "Half damage" },
  { mode: "full", label: "1", tip: "Full damage" },
  { mode: "double", label: "2", tip: "Double damage" }
];

/** The multiplier picked first for a creature, from its damage share. */
export function defaultMultiplier(share) {
  return { half: "half", none: "none" }[share] ?? "full";
}

/** The amount after a multiplier (rounded down, like the damage rules; −1 heals the full amount). */
export function multiplied(amount, mode) {
  const n = Number(amount) || 0;
  if ( mode === "heal" ) return -n;
  return Math.floor(n * ({ none: 0, quarter: 0.25, half: 0.5, full: 1, double: 2 }[mode] ?? 1));
}

/**
 * A roll's dice for the expand arrow.
 * @param {{dice?: object[], terms?: object[]}} roll  a Foundry Roll (or its JSON)
 * @returns {{formula: string, results: number[]}[]}
 */
export function diceSummary(roll) {
  const dice = list(roll?.dice).length ? list(roll.dice) : list(roll?.terms).filter(t => t?.faces);
  return dice.map(d => ({ formula: `${d.number ?? 1}d${d.faces}`, results: list(d.results).filter(r => r.active !== false).map(r => r.result) }));
}

/**
 * One creature's save as a tile.
 * @param {{name: string, label?: string, total?: number|null, degree: number, visible: boolean}} s
 */
export function saveTile({ name, label = "", total = null, degree, visible }) {
  if ( !visible ) return { name, label, total: "?", mark: "", outcome: "hidden" };
  const saved = degree >= 2;
  return { name, label, total: total ?? "", mark: saved ? "✓" : "✗", outcome: saved ? "saved" : "failed" };
}

/** A list in groups of n. */
export function chunk(items, n) {
  const out = [];
  for ( let i = 0; i < items.length; i += n ) out.push(items.slice(i, i + n));
  return out;
}

/** The save button's label: "DC 12 DEX Save". */
export function shortSaveLabel(dc, ability, abilities = {}) {
  const abbr = String(abilities?.[ability]?.abbr ?? ability ?? "").toUpperCase();
  return `DC ${dc ?? "?"} ${abbr} Save`.replace(/\s+/g, " ");
}
