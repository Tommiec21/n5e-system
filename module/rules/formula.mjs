/**
 * Deterministic formula evaluation for derived numbers (pool sizes, DCs, scale values).
 * Dice formulas for rolls go through Foundry's Roll class at roll time (Phase 3); this evaluator only
 * resolves numeric formulas like "1 + @prof" or "floor(@level / 2) + @abilities.con.mod".
 *
 * Supported: numbers, + - * / ( ), @path.to.value, floor ceil round min max abs.
 *
 * Two formula layers exist; don't mix them up:
 *   evaluateFormula (here)      numbers only, used while preparing data (pool max, uses max, DCs).
 *   resolveFormula (unarmed.mjs) text substitution before a Roll: lvl(1:1d8,5:2d8), @level,
 *                                @amount, @poolRoll. The result then goes to Foundry's Roll.
 * Security: the expression is checked against a whitelist before it is evaluated, so stored text
 * can never run code.
 */

const FUNCTIONS = { floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max, abs: Math.abs };

/** Read a dotted path from an object. */
export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Replace @references with numbers from data (missing -> 0). */
export function replaceRefs(formula, data = {}) {
  return String(formula).replace(/@([a-zA-Z_][\w.]*)/g, (_, path) => {
    const v = Number(getPath(data, path));
    return Number.isFinite(v) ? `(${v})` : "(0)";
  });
}

/**
 * Evaluate a numeric formula. Returns `fallback` for empty or invalid input (never throws).
 * @param {string|number} formula
 * @param {object} data
 * @param {number} [fallback=0]
 */
export function evaluateFormula(formula, data = {}, fallback = 0) {
  if ( typeof formula === "number" ) return formula;
  if ( formula == null || String(formula).trim() === "" ) return fallback;
  const expr = replaceRefs(formula, data);
  // Only allow digits, operators, whitespace, parentheses, commas, dots, and known function names.
  const stripped = expr.replace(/\b(floor|ceil|round|min|max|abs)\b/g, "");
  if ( /[^\d+\-*/().,\s]/.test(stripped) ) return fallback;
  try {
    const fn = new Function(...Object.keys(FUNCTIONS), `"use strict"; return (${expr});`);
    const result = fn(...Object.values(FUNCTIONS));
    return Number.isFinite(result) ? result : fallback;
  } catch {
    return fallback;
  }
}

/** "d12" | "1d12" | 12 -> 12. Returns 0 if not a die. */
export function dieFaces(die) {
  if ( typeof die === "number" ) return die;
  const m = /^(?:\d*)d(\d+)$/i.exec(String(die ?? "").trim());
  return m ? Number(m[1]) : 0;
}

/** Step a die size up or down the d4-d12 ladder (KB 04 Die Step). */
export function stepDie(faces, steps = 1, ladder = [4, 6, 8, 10, 12]) {
  const i = ladder.indexOf(faces);
  if ( i < 0 ) return faces;
  return ladder[Math.max(0, Math.min(ladder.length - 1, i + steps))];
}
