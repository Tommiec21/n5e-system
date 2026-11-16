/**
 * Plain-language effects (UX1; docs/UX1_SPEC.md), pure:
 *   describeChange(change, catalog)   "+2 Damage Reduction", "Unarmed Damage Die: 1d10"
 *   describeRule(rule, N5E)           "Advantage on your attack rolls while you're in a stance (iron-fist)."
 *   ruleToRow / rowToRule              the roll rules builder: a rule element <-> a row of plain dropdowns
 *
 * The builder covers the common rule kinds. Anything it can't express (another key, a predicate with
 * several facts) stays a "custom rule": shown as a sentence, kept intact, edited as JSON.
 */

const list = v => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const signed = n => (Number(n) >= 0 ? `+${Number(n)}` : `−${Math.abs(Number(n))}`);
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* -------------------------------------------- */
/*  Changes                                     */
/* -------------------------------------------- */

/** One change in plain words. catalog: effectFieldCatalog(N5E). */
export function describeChange(change, catalog = [], N5E = {}) {
  const field = catalog.find(f => f.key === change?.key);
  const name = field?.name ?? change?.key ?? "?";
  const v = String(change?.value ?? "").trim();
  if ( !field ) return `${name}: ${v}`;
  if ( field.key.startsWith("n5e.mastery.") ) return `${name}${v ? ` (from ${v})` : ""}`;
  if ( field.type === "state" ) return `${name}: ${N5E.states?.[v]?.label ?? v}`;
  if ( field.type === "condition" ) {
    const label = v.startsWith("group:") ? `all ${cap(v.slice(6))} conditions` : N5E.conditions?.[v]?.label ?? N5E.clanConditions?.[v]?.label ?? v;
    return `${name}: ${label}`;
  }
  if ( field.type === "number" || field.type === "adjustment" ) {
    if ( /^[*/]/.test(v) ) return `${name} ${v.startsWith("*") ? "×" : "÷"}${v.slice(1)}`;
    if ( Number.isFinite(Number(v)) ) {
      const mode = Number(change.mode ?? 2);
      if ( !field.custom && mode === 5 ) return `${name} set to ${v}`;
      if ( !field.custom && mode === 1 ) return `${name} ×${v}`;
      return `${signed(v)} ${name}`;
    }
    return `${name}: ${v}`;
  }
  return `${name}: ${v}`;
}

/* -------------------------------------------- */
/*  Rule vocabulary                             */
/* -------------------------------------------- */

/** The rule kinds the builder offers, with a one-line definition and the inputs they need. */
export const RULE_KINDS = {
  modifier: { label: "Bonus or penalty", needs: ["value"], what: "Adds a number to the roll; use a minus sign for a penalty." },
  advantage: { label: "Advantage", needs: [], what: "Roll twice and keep the higher result." },
  disadvantage: { label: "Disadvantage", needs: [], what: "Roll twice and keep the lower result." },
  noAdvantage: { label: "Can't have advantage", needs: [], what: "Advantage from any source doesn't apply to the roll." },
  autoSucceed: { label: "Automatic success", needs: [], what: "The roll succeeds without rolling." },
  autoFail: { label: "Automatic failure", needs: [], what: "The roll fails without rolling." },
  critRange: { label: "Critical range", needs: ["value"], what: "Scores a critical hit on a lower roll; 1 means 19–20." },
  damage: { label: "Extra damage", needs: ["formula", "damageType"], what: "Adds damage dice of a type to the roll." },
  reroll: { label: "Reroll", needs: ["mode"], what: "Roll again and keep the higher, the lower, or the new result." },
  degreeShift: { label: "Shift the result", needs: ["value"], what: "Moves a four-tier result up (+1) or down (−1) a step." },
  maximizeDice: { label: "Maximize dice", needs: ["value"], what: "This many of the roll's dice count as their highest face." },
  minimumDie: { label: "Minimum die result", needs: ["value"], what: "Dice that roll below this number count as this number." },
  resource: { label: "Gain a resource", needs: ["pool", "amount"], what: "Adds to a resource pool, such as Fury, when the trigger happens." },
  inflict: { label: "Inflict a condition", needs: ["condition", "ranks", "who"], what: "Puts a condition on you or the target when the trigger happens." },
  note: { label: "Reminder note", needs: ["text"], what: "Shows a note on the roll; it changes nothing by itself." }
};

/** What a rule applies to: a base, and optional details (checkboxes). */
export function selectorBases(N5E = {}) {
  const pairs = obj => Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [k, v?.label ?? k]));
  const damageTypes = pairs(N5E.damageTypes);
  return {
    all: { label: "Every roll", details: null },
    attack: { label: "Attack rolls", details: { weapon: "Weapon", unarmed: "Unarmed" } },
    damage: { label: "Damage rolls", details: { weapon: "Weapon", unarmed: "Unarmed", ...damageTypes } },
    save: { label: "Saving throws", details: pairs(N5E.abilities) },
    check: { label: "Ability and skill checks", details: null },
    skill: { label: "Skill checks", details: pairs(N5E.skills) },
    ability: { label: "Ability checks", details: pairs(N5E.abilities) },
    initiative: { label: "Initiative", details: null },
    healing: { label: "Healing rolls", details: null },
    cast: { label: "Jutsu casting", details: null }
  };
}

/** "Only when": the facts a rule can depend on. param: what the detail box holds. */
export const WHEN_FACTS = {
  "": { label: "Always", param: null },
  "self:stance": { label: "You're in a stance", param: "stance identifier (blank: any)" },
  "self:state": { label: "You're in a state", param: "state, such as crash or furious" },
  "self:status": { label: "You have a condition", param: "condition" },
  "target:status": { label: "The target has a condition", param: "condition" },
  "self:bloodied": { label: "You're at half HP or less", param: null },
  "attack:ranged": { label: "It's a ranged attack", param: null },
  custom: { label: "Another fact", param: "fact, such as range:melee" }
};

export const RULE_WHO = { self: "Your own rolls", imposed: "Rolls made against your action", against: "Rolls that target you" };
export const RULE_TRIGGERS = { "": "Whenever it applies", initiative: "When you roll initiative", turnStart: "At the start of your turn",
  turnEnd: "At the end of your turn", hit: "When you hit", miss: "When you miss", criticalHit: "When you score a critical hit",
  failedSave: "When a target fails its save", succeededSave: "When a target succeeds on its save", damageDealt: "When you deal damage",
  damageTaken: "When you take damage", zeroHP: "When you drop to 0 HP" };

/* -------------------------------------------- */
/*  Describe                                    */
/* -------------------------------------------- */

const whenText = (predicate, N5E) => {
  const one = typeof predicate === "string" ? predicate : null;
  const not = predicate && !Array.isArray(predicate) && typeof predicate === "object" && Object.keys(predicate).length === 1
    && Array.isArray(predicate.not) && predicate.not.length === 1 && typeof predicate.not[0] === "string" ? predicate.not[0] : null;
  const fact = one ?? not;
  if ( !predicate ) return "";
  if ( !fact ) return " in some situations (see the rule's JSON)";
  const [who, kind, ...rest] = fact.split(":");
  const param = rest.join(":");
  const cond = key => N5E.conditions?.[key]?.label ?? N5E.clanConditions?.[key]?.label ?? key;
  let text;
  if ( `${who}:${kind}` === "self:stance" ) text = param ? `you're in the ${param} stance` : "you're in a stance";
  else if ( `${who}:${kind}` === "self:state" ) text = `you're ${param || "in a state"}`;
  else if ( `${who}:${kind}` === "self:status" ) text = `you're ${cond(param)}`;
  else if ( `${who}:${kind}` === "target:status" ) text = `the target is ${cond(param)}`;
  else if ( fact === "self:bloodied" ) text = "you're at half HP or less";
  else if ( fact === "attack:ranged" ) text = "the attack is ranged";
  else text = fact;
  return not ? ` unless ${text}` : ` while ${text}`;
};

const appliesText = (selector, N5E) => {
  const bases = selectorBases(N5E);
  const parts = list(selector).map(s => {
    const [base, detail] = String(s).split(":");
    const b = bases[base];
    if ( !b ) return s;
    if ( !detail ) return b.label.toLowerCase();
    const d = b.details?.[detail] ?? detail;
    return base === "save" ? `${d} saves` : base === "skill" ? `${d} checks` : base === "ability" ? `${d} checks`
      : `${String(d).toLowerCase()} ${base === "damage" ? "damage" : "attacks"}`;
  });
  return parts.length ? parts.join(" and ") : "";
};

/** One rule element as a sentence (at most a couple of clauses). */
export function describeRule(rule, N5E = {}) {
  if ( !rule || typeof rule !== "object" ) return "An empty rule.";
  const on = list(rule.selector).length ? appliesText(rule.selector, N5E) : "";
  const whose = { imposed: "rolls made against your action: ", against: "rolls that target you: " }[rule.direction] ?? "";
  const target = on ? `${whose ? "" : "your "}${on}` : "the roll";
  const when = whenText(rule.predicate, N5E);
  const trig = rule.on ? `${RULE_TRIGGERS[rule.on] ?? rule.on}: ` : "";
  const limits = [rule.oncePerTurn ? "once per turn" : "", rule.uses ? `${rule.uses} use${Number(rule.uses) > 1 ? "s" : ""}` : "", rule.endsOnUse ? "ends when used" : ""].filter(Boolean);
  const tail = `${when}${limits.length ? ` (${limits.join(", ")})` : ""}.`;
  const lead = whose ? cap(whose) : "";
  switch ( rule.key ) {
    case "modifier": return `${lead}${trig}${signed(rule.value ?? 0)} to ${target}${tail}`;
    case "advantage": case "disadvantage": return `${lead}${trig}${cap(rule.key)} on ${target}${tail}`;
    case "noAdvantage": return `${lead}${trig}No advantage on ${target}${tail}`;
    case "autoSucceed": return `${lead}${trig}${cap(target)} succeed automatically${tail}`;
    case "autoFail": return `${lead}${trig}${cap(target)} fail automatically${tail}`;
    case "critRange": return `${lead}${trig}Critical range ${signed(rule.value ?? 1)} on ${target}${tail}`;
    case "damage": return `${lead}${trig}+${rule.formula ?? "?"}${rule.damageType ? ` ${rule.damageType}` : ""} damage${on ? ` on ${target}` : ""}${tail}`;
    case "reroll": return `${lead}${trig}Reroll ${target}, keeping the ${rule.mode === "keep" ? "new" : rule.mode ?? "higher"} result${tail}`;
    case "degreeShift": return `${lead}${trig}${target} results shift ${Number(rule.value) >= 0 ? "up" : "down"} ${Math.abs(Number(rule.value ?? 1))}${tail}`;
    case "maximizeDice": return `${lead}${trig}${rule.value ?? 1} dice of ${target} count as their highest face${tail}`;
    case "minimumDie": return `${lead}${trig}Dice of ${target} count as at least ${rule.value}${tail}`;
    case "resource": return `${trig}${signed(rule.amount ?? 1)} ${rule.pool ?? "resource"}${tail}`;
    case "inflict": return `${trig}${rule.who === "self" ? "You gain" : "The target gains"} ${N5E.conditions?.[rule.condition]?.label ?? N5E.clanConditions?.[rule.condition]?.label ?? rule.condition}${rule.ranks ? ` (${rule.ranks})` : ""}${tail}`;
    case "note": return `Note${rule.on ? ` (${(RULE_TRIGGERS[rule.on] ?? rule.on).toLowerCase()})` : ""}: ${rule.text ?? ""}`;
    default: return `A custom rule (${rule.key})${on ? ` on ${target}` : ""}${tail}`;
  }
}

/* -------------------------------------------- */
/*  Builder rows                                */
/* -------------------------------------------- */

/** Split a predicate into the builder's "Only when" (or "keep" when it is too complex). */
function whenOf(predicate) {
  if ( predicate === undefined || predicate === null ) return { when: "", detail: "", not: false };
  let fact = null, not = false;
  if ( typeof predicate === "string" ) fact = predicate;
  else if ( predicate && typeof predicate === "object" && !Array.isArray(predicate) ) {
    const keys = Object.keys(predicate);
    if ( keys.length === 1 && Array.isArray(predicate[keys[0]]) && predicate[keys[0]].length === 1 && typeof predicate[keys[0]][0] === "string"
      && ["all", "any", "not"].includes(keys[0]) ) { fact = predicate[keys[0]][0]; not = keys[0] === "not"; }
  }
  if ( fact === null ) return { when: "keep", detail: "", not: false };
  for ( const k of ["self:stance", "self:state", "self:status", "target:status"] ) {
    if ( fact === k ) return { when: k, detail: "", not };
    if ( fact.startsWith(`${k}:`) ) return { when: k, detail: fact.slice(k.length + 1), not };
  }
  if ( fact === "self:bloodied" || fact === "attack:ranged" ) return { when: fact, detail: "", not };
  return { when: "custom", detail: fact, not };
}

/** The predicate a row's "Only when" builds (undefined: always). */
function predicateOf(row) {
  const w = row.when ?? "";
  if ( !w ) return undefined;
  let fact;
  if ( WHEN_FACTS[w]?.param && w !== "custom" ) fact = row.whenDetail ? `${w}:${row.whenDetail}` : w;
  else if ( w === "custom" ) fact = String(row.whenDetail ?? "").trim();
  else fact = w;
  if ( !fact ) return undefined;
  return row.whenNot ? { not: [fact] } : fact;
}

/**
 * A rule element as a builder row. Rules the builder can't express are kind "custom".
 * @returns {{kind, base, details: string[], value, formula, damageType, mode, pool, amount, condition, ranks, who,
 *   text, when, whenDetail, whenNot, direction, on, oncePerTurn, uses, endsOnUse, label, raw}}
 */
export function ruleToRow(rule, N5E = {}) {
  const raw = JSON.stringify(rule ?? {});
  const sels = list(rule?.selector);
  const bases = [...new Set(sels.map(s => String(s).split(":")[0]))];
  const known = RULE_KINDS[rule?.key] && bases.length <= 1 && (!bases[0] || selectorBases(N5E)[bases[0]]);
  const when = whenOf(rule?.predicate);
  const row = {
    kind: known ? rule.key : "custom", base: bases[0] ?? "", details: sels.map(s => String(s).split(":").slice(1).join(":")).filter(Boolean),
    value: rule?.value ?? "", formula: rule?.formula ?? "", damageType: rule?.damageType ?? "", mode: rule?.mode ?? "higher",
    pool: rule?.pool ?? "", amount: rule?.amount ?? "", condition: rule?.condition ?? "", ranks: rule?.ranks ?? "", who: rule?.who ?? "target",
    text: rule?.text ?? "", when: when.when, whenDetail: when.detail, whenNot: when.not,
    direction: rule?.direction ?? "self", on: rule?.on ?? "", oncePerTurn: !!rule?.oncePerTurn, uses: rule?.uses ?? "", endsOnUse: !!rule?.endsOnUse,
    label: rule?.label ?? "", raw
  };
  return row;
}

const BUILDER_KEYS = ["key", "selector", "value", "formula", "damageType", "mode", "pool", "amount", "condition", "ranks", "who", "text",
  "direction", "on", "oncePerTurn", "uses", "endsOnUse", "label"];

/**
 * A builder row back into a rule element. Fields the builder doesn't show are kept from the
 * original (row.orig). A custom row, or a row whose JSON was edited (raw differs from orig), is
 * taken from its JSON.
 */
export function rowToRule(row) {
  const parse = text => { try { return JSON.parse(text || "{}"); } catch { throw new Error("A rule's JSON isn't valid. Check it under Advanced."); } };
  if ( row.kind === "custom" || (row.raw != null && row.orig != null && row.raw !== row.orig) ) return parse(row.raw);
  const base = row.orig ? parse(row.orig) : {};
  const out = Object.fromEntries(Object.entries(base).filter(([k]) => !BUILDER_KEYS.includes(k) && (k !== "predicate" || row.when === "keep")));
  out.key = row.kind;
  const details = list(row.details).filter(Boolean);
  const selector = !row.base ? undefined : details.length ? details.map(d => `${row.base}:${d}`) : row.base;
  if ( selector !== undefined ) out.selector = Array.isArray(selector) && selector.length === 1 ? selector[0] : selector;
  const needs = RULE_KINDS[row.kind]?.needs ?? [];
  const numeric = v => (v === "" || v == null ? v : /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? Number(v) : String(v).trim());
  if ( needs.includes("value") ) out.value = numeric(row.value);
  if ( needs.includes("formula") ) out.formula = String(row.formula ?? "").trim();
  if ( needs.includes("damageType") && row.damageType ) out.damageType = row.damageType;
  if ( needs.includes("mode") ) out.mode = row.mode || "higher";
  if ( needs.includes("pool") ) out.pool = String(row.pool ?? "").trim();
  if ( needs.includes("amount") ) out.amount = numeric(row.amount === "" ? 1 : row.amount);
  if ( needs.includes("condition") ) out.condition = String(row.condition ?? "").trim();
  if ( needs.includes("ranks") && row.ranks !== "" && row.ranks != null ) out.ranks = numeric(row.ranks);
  if ( needs.includes("who") ) out.who = row.who === "self" ? "self" : "target";
  if ( needs.includes("text") ) out.text = String(row.text ?? "");
  if ( row.when !== "keep" ) {
    const p = predicateOf(row);
    if ( p !== undefined ) out.predicate = p;
  }
  if ( row.direction && (row.direction !== "self" || "direction" in base) ) out.direction = row.direction;
  if ( row.on ) out.on = row.on;
  if ( row.oncePerTurn ) out.oncePerTurn = true;
  if ( row.uses !== "" && row.uses != null && Number(row.uses) > 0 ) out.uses = Number(row.uses);
  if ( row.endsOnUse ) out.endsOnUse = true;
  if ( row.label ) out.label = String(row.label);
  return out;
}

/** A new rule for "Add rule". */
export const NEW_RULE = { key: "modifier", selector: "attack", value: 1 };
