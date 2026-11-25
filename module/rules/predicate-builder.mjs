/**
 * LEFT1 P2 (King Q-L2, 2026-11-25): the click-to-build editor for conditions ("Only when"). Pure.
 *
 * A predicate (rules/elements.mjs testPredicate) is a fact string, an array (all of), or
 * {all, any, not} of facts. The builder shows it as a list of clauses {group, fact, detail}:
 *   group "all" = must be true, "any" = at least one of these, "not" = must not be true.
 * Nested predicates (a group holding another object) can't be shown as clauses: `keep` is true and the
 * rule keeps them as they are (JSON under Advanced).
 */

/** The facts the builder offers. param: what the detail holds (null: none); options: a fixed list. */
export const PREDICATE_FACTS = {
  "self:stance": { label: "You're in a stance", param: "stance identifier (blank: any)" },
  "self:state": { label: "You're in a state", param: "state, such as crash or furious" },
  "self:status": { label: "You have a condition", param: "condition", conditions: true },
  "target:status": { label: "The target has a condition", param: "condition", conditions: true },
  "self:bloodied": { label: "You're at half HP or less", param: null },
  "range:melee": { label: "It's a melee attack", param: null },
  "attack:ranged": { label: "It's a ranged attack", param: null },
  "ability": { label: "The roll uses an ability", param: "ability",
    options: { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" } },
  "self:sense": { label: "You have a sense", param: "sense, such as blindsight" },
  "target:sense": { label: "The target has a sense", param: "sense, such as trueSight" },
  "option": { label: "You chose a class option", param: "option, such as weaponFocus:blade" },
  custom: { label: "Another fact", param: "fact, such as self:keyword:fire" }
};

export const PREDICATE_GROUPS = { all: "Only when", any: "Or when (any of these)", not: "Unless" };

const KEYED = Object.keys(PREDICATE_FACTS).filter(k => k !== "custom" && PREDICATE_FACTS[k].param);

/** One fact string as a clause's fact and detail. */
export function splitFact(fact) {
  const f = String(fact ?? "");
  for ( const k of KEYED ) {
    if ( f === k ) return { fact: k, detail: "" };
    if ( f.startsWith(`${k}:`) ) return { fact: k, detail: f.slice(k.length + 1) };
  }
  if ( PREDICATE_FACTS[f] ) return { fact: f, detail: "" };
  return { fact: "custom", detail: f };
}

/** A clause back into a fact string ("" when incomplete). */
export function joinFact({ fact, detail } = {}) {
  if ( !fact ) return "";
  const d = String(detail ?? "").trim();
  if ( fact === "custom" ) return d;
  // A fact still missing its detail is kept bare (it never matches) so the row survives a re-render.
  return d ? `${fact}:${d}` : fact;
}

/**
 * A predicate as clauses.
 * @returns {{clauses: {group: string, fact: string, detail: string}[], keep: boolean}}
 */
export function predicateToClauses(predicate) {
  if ( predicate === undefined || predicate === null || predicate === "" ) return { clauses: [], keep: false };
  const out = [];
  const push = (group, facts) => {
    for ( const f of facts ) {
      if ( typeof f !== "string" ) return false;
      out.push({ group, ...splitFact(f) });
    }
    return true;
  };
  if ( typeof predicate === "string" ) return { clauses: [{ group: "all", ...splitFact(predicate) }], keep: false };
  if ( Array.isArray(predicate) ) return push("all", predicate) ? { clauses: out, keep: false } : { clauses: [], keep: true };
  if ( typeof predicate !== "object" ) return { clauses: [], keep: true };
  for ( const [k, v] of Object.entries(predicate) ) {
    if ( !["all", "any", "not"].includes(k) ) return { clauses: [], keep: true };
    const facts = Array.isArray(v) ? v : [v];
    if ( !push(k, facts) ) return { clauses: [], keep: true };
  }
  return { clauses: out, keep: false };
}

/** Clauses back into a predicate (undefined: always). One "only when" fact stays a plain string. */
export function clausesToPredicate(clauses = []) {
  const groups = { all: [], any: [], not: [] };
  for ( const c of clauses ) {
    const f = joinFact(c);
    if ( f && groups[c.group ?? "all"] && !groups[c.group ?? "all"].includes(f) ) groups[c.group ?? "all"].push(f);
  }
  const used = Object.entries(groups).filter(([, v]) => v.length);
  if ( !used.length ) return undefined;
  if ( used.length === 1 && used[0][0] === "all" && used[0][1].length === 1 ) return used[0][1][0];
  return Object.fromEntries(used);
}

/** The builder's rows for a template: each clause plus a blank row to add another. */
export function clauseRows(clauses = [], { conditions = {}, editable = true } = {}) {
  const opts = (choices, selected) => Object.entries(choices).map(([value, label]) => ({ value, label, selected: value === selected }));
  const rows = clauses.map((c, j) => ({ j, ...c, blank: false }));
  if ( editable ) rows.push({ j: clauses.length, group: "all", fact: "", detail: "", blank: true });
  return rows.map(r => {
    const def = PREDICATE_FACTS[r.fact];
    const list = def?.conditions ? conditions : def?.options ?? null;
    return { ...r, groups: opts(PREDICATE_GROUPS, r.group),
      facts: opts({ "": r.blank ? "+ Add a condition…" : "—", ...Object.fromEntries(Object.entries(PREDICATE_FACTS).map(([k, v]) => [k, v.label])) }, r.fact),
      param: def?.param ?? null, choices: list ? opts({ "": "—", ...list }, r.detail) : null };
  });
}

/** Form rows ({0: {group, fact, detail}, ...}) as clauses, skipping blanks. */
export function readClauses(formRows) {
  return Object.values(formRows ?? {}).filter(r => r && r.fact).map(r => ({ group: r.group || "all", fact: r.fact, detail: r.detail ?? "" }));
}
