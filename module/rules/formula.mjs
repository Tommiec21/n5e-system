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
 * N5e precedence (King 2026-11-09): addition/subtraction before multiplication/division.
 * Parentheses retain explicit grouping. A bounded parser evaluates numbers, never JavaScript.
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
  if ( typeof formula === "number" ) return Number.isFinite(formula) ? formula : fallback;
  if ( formula == null || String(formula).trim() === "" ) return fallback;
  const expr = replaceRefs(formula, data);
  try {
    if ( expr.length > 4096 ) return fallback;
    const tokens = expr.match(/\d+(?:\.\d*)?|\.\d+|[a-zA-Z_]+|[^\s]/g) ?? [];
    let at = 0, depth = 0;
    const primary = () => {
      if ( ++depth > 60 ) throw new Error("Formula nesting limit");
      let result;
      const token = tokens[at++];
      if ( token === "+" || token === "-" ) result = (token === "-" ? -1 : 1) * primary();
      else if ( token === "(" ) { result = product(); if ( tokens[at++] !== ")" ) throw new Error("Missing parenthesis"); }
      else if ( Object.hasOwn(FUNCTIONS, token) ) {
        if ( tokens[at++] !== "(" ) throw new Error("Expected function arguments");
        const args = [product()];
        while ( tokens[at] === "," ) { at++; args.push(product()); }
        if ( tokens[at++] !== ")" || (!["min", "max"].includes(token) && args.length !== 1) ) throw new Error("Invalid function arguments");
        result = FUNCTIONS[token](...args);
      } else if ( /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token ?? "") ) result = Number(token);
      else throw new Error("Invalid formula token");
      depth--; return result;
    };
    const sum = () => {
      let value = primary();
      while ( ["+", "-"].includes(tokens[at]) ) { const op = tokens[at++], next = primary(); value = op === "+" ? value + next : value - next; }
      return value;
    };
    const product = () => {
      let value = sum();
      while ( ["*", "/"].includes(tokens[at]) ) { const op = tokens[at++], next = sum(); value = op === "*" ? value * next : value / next; }
      return value;
    };
    const result = product();
    if ( at !== tokens.length ) return fallback;
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
