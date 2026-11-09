/** Group N5e arithmetic before passing dice/modifiers to Foundry. Never patch the global Roll. */
import { getPath } from "../rules/formula.mjs";

export function n5eRollFormula(input, data = {}, depth = 0) {
  if ( depth > 40 || typeof input !== "string" || input.length > 8192 ) throw new Error("Unsupported or oversized N5e roll expression.");
  const source = input.replace(/@([a-zA-Z_][\w.]*)/g, (match, key) => {
    const value = getPath(data, key);
    return typeof value === "string" && value.trim() && !Number.isFinite(Number(value)) ? `(${n5eRollFormula(value, {}, depth + 1)})` : match;
  });
  if ( /["';`]|\*\*|%/.test(source.replace(/\[[^\]]*\]/g, "")) ) throw new Error("This roll syntax is outside the supported N5e arithmetic profile.");
  let at = 0, changed = source !== input, unaryDepth = 0;
  const skip = () => { while ( /\s/.test(source[at] ?? "") && at < source.length ) at++; };
  function group(open) {
    const close = { "(": ")", "{": "}", "[": "]" }[open], start = ++at;
    const stack = [close];
    while ( at < source.length && stack.length ) {
      const ch = source[at];
      if ( "({[".includes(ch) ) stack.push({ "(": ")", "{": "}", "[": "]" }[ch]);
      else if ( ")}]".includes(ch) && ch !== stack.pop() ) throw new Error("Mismatched roll grouping.");
      if ( stack.length ) at++;
    }
    if ( stack.length ) throw new Error("Missing roll grouping.");
    const body = source.slice(start, at++);
    if ( open === "[" ) return `[${body}]`; // Flavor annotations are not arithmetic.
    let nesting = 0, beginning = 0;
    const expressions = [];
    for ( let i = 0; i <= body.length; i++ ) {
      if ( "({[".includes(body[i]) && i < body.length ) nesting++;
      if ( ")}]".includes(body[i]) && i < body.length ) nesting--;
      if ( i === body.length || body[i] === "," && !nesting ) { expressions.push(body.slice(beginning, i)); beginning = i + 1; }
    }
    const compiled = expressions.map(part => n5eRollFormula(part, data, depth + 1));
    if ( compiled.some((part, i) => part !== expressions[i]) ) changed = true;
    return `${open}${compiled.join(",")}${close}`;
  }
  function primary() {
    skip();
    if ( source[at] === "+" || source[at] === "-" ) {
      if ( ++unaryDepth > 100 ) throw new Error("Unary roll nesting limit.");
      const sign = source[at++], text = sign + primary().text;
      unaryDepth--; return { text, kind: "atom" };
    }
    let text = "";
    while ( at < source.length ) {
      const ch = source[at];
      if ( "({[".includes(ch) ) { text += group(ch); continue; }
      if ( ")}]".includes(ch) ) throw new Error("Unexpected roll grouping.");
      if ( "+-*/".includes(ch) ) {
        if ( ch === "-" && /[<>=]\s*$/.test(text) ) { text += ch; at++; continue; }
        break;
      }
      text += ch; at++;
    }
    if ( !text.trim() ) throw new Error("Missing roll term.");
    return { text: text.trim(), kind: "atom" };
  }
  function sum() {
    let node = primary(); skip();
    while ( source[at] === "+" || source[at] === "-" ) {
      const op = source[at++], right = primary(); node = { text: `${node.text}${op}${right.text}`, kind: "sum" }; skip();
    }
    return node;
  }
  let node = sum(); skip();
  while ( source[at] === "*" || source[at] === "/" ) {
    const op = source[at++], right = sum();
    const wrap = n => n.kind === "sum" ? `(${n.text})` : n.text;
    if ( node.kind === "sum" || right.kind === "sum" ) changed = true;
    node = { text: `${wrap(node)}${op}${wrap(right)}`, kind: "product" }; skip();
  }
  if ( at !== source.length ) throw new Error("Unsupported N5e roll expression.");
  return changed ? node.text : source;
}

/** Only N5e-owned call sites use this factory; external modules keep their own roll semantics. */
export function createN5eRoll(formula, data = {}, options = {}) {
  return new Roll(n5eRollFormula(String(formula), data), data, options);
}
