/**
 * Effect editor view model (UX1; docs/UX1_SPEC.md), pure. applications/effect/effect-config.mjs
 * renders templates/effect/changes.hbs from this.
 *
 *   pickerGroups(catalog)          the field picker: plain names grouped by category, with definitions
 *   changeCards(changes, catalog, report)  each change as a card (plain name, a value input shaped to
 *                                  the field, its definition, and Advanced: key, mode, priority)
 *   ruleRows(rules, N5E)           each roll rule as a builder row (plain dropdowns and a sentence)
 */
import { FIELD_CATEGORIES, MODE_LABELS } from "../config/effect-fields.mjs";
import { CONDITION_GROUPS } from "../rules/condition-lifecycle.mjs";
import { describeRule, ruleToRow, RULE_KINDS, selectorBases, WHEN_FACTS, RULE_WHO, RULE_TRIGGERS } from "../rules/plain-language.mjs";

const opts = (choices, selected) => Object.entries(choices).map(([value, label]) => ({ value, label, selected: String(selected ?? "") === value }));

/** The picker: [{category, fields: [{key, name, what, enter, example, stacks, search}]}]. */
export function pickerGroups(catalog) {
  return FIELD_CATEGORIES.map(category => ({
    category,
    fields: catalog.filter(f => f.category === category).map(f => ({ key: f.key, name: f.name, what: f.what, enter: f.enter, example: f.example,
      stacks: f.stacks, search: `${f.name} ${f.category} ${f.words ?? ""} ${f.key}`.toLowerCase() }))
  })).filter(g => g.fields.length);
}

/**
 * The change cards.
 * @param {object[]} changes   draft changes
 * @param {object[]} catalog   effectFieldCatalog(N5E)
 * @param {{rows?: object}} [report]  validateEffectChanges output (per-row problems)
 * @param {object} [N5E]
 */
/** King Q-U1: N5e fields always add, so a stray mode on one is corrected to Add (before validating). */
export function normalizeModes(changes, catalog) {
  return (changes ?? []).map(c => {
    const field = catalog.find(f => f.key === c.key);
    return field?.custom && ![0, 2].includes(Number(c.mode ?? 2)) ? { ...c, mode: 2 } : c;
  });
}

export function changeCards(changes, catalog, report = {}, N5E = {}) {
  return (changes ?? []).map((change, i) => {
    const field = catalog.find(f => f.key === change.key) ?? null;
    const custom = field ? field.custom : String(change.key ?? "").startsWith("n5e.");
    const mode = Number(change.mode ?? 2);
    // King Q-U1: N5e fields always add; their mode is fixed (a stray mode is corrected to Add).
    const fixedMode = custom ? ([0, 2].includes(mode) ? mode : 2) : null;
    const choices = field?.type === "ability" ? Object.fromEntries(Object.entries(N5E.abilities ?? {}).map(([k, v]) => [k, v.label ?? k]))
      : field?.type === "damageType" ? Object.fromEntries(Object.entries(N5E.damageTypes ?? {}).map(([k, v]) => [k, v.label ?? k]))
      : field?.type === "condition" ? { ...Object.fromEntries(Object.entries(CONDITION_GROUPS).map(([k, v]) => [`group:${k}`, `All ${v} conditions`])), ...conditionChoices(N5E) } : null;
    return {
      i, key: change.key ?? "", value: change.value ?? "", priority: change.priority ?? "",
      name: field?.name ?? (change.key ? "Unknown field" : "New change: pick a field under Advanced"),
      category: field?.category ?? "", what: field?.what ?? "N5e doesn't know this field. It is kept only if you leave it unchanged.",
      enter: field?.enter ?? "", example: field?.example ?? "", stacks: field?.stacks ?? "",
      input: choices ? "select" : field?.type === "number" ? "number" : "text",
      // A stored value that isn't one of the choices shows as "Pick one", not as the first choice.
      options: choices ? [...(String(change.value ?? "") in choices ? [] : [{ value: "", label: "— Pick one —", selected: true }]), ...opts(choices, change.value)] : null,
      custom, fixedMode, modes: custom ? null : opts(Object.fromEntries((field?.modes ?? [1, 2, 3, 4, 5]).map(m => [String(m), MODE_LABELS[m]])), String(mode)),
      problem: report.rows?.[i]?.problem ?? "", blocking: !!report.rows?.[i]?.blocking
    };
  });
}

/** Condition choices for "Only when" and "Inflict". */
const conditionChoices = N5E => Object.fromEntries(Object.entries({ ...(N5E.conditions ?? {}), ...(N5E.clanConditions ?? {}) })
  .map(([k, v]) => [k, v.label ?? k]).sort((a, b) => a[1].localeCompare(b[1])));

/** The roll rules builder rows. */
export function ruleRows(rules, N5E = {}) {
  const bases = selectorBases(N5E);
  const conds = conditionChoices(N5E);
  return (Array.isArray(rules) ? rules : []).map((rule, i) => {
    const row = ruleToRow(rule, N5E);
    const kind = RULE_KINDS[row.kind];
    const base = bases[row.base];
    const have = new Set(row.details);
    const detailOptions = base?.details ? [...Object.entries(base.details).map(([value, label]) => ({ value, label, checked: have.has(value) })),
      ...row.details.filter(d => !(d in base.details)).map(d => ({ value: d, label: d, checked: true }))] : null;
    const whenParam = WHEN_FACTS[row.when]?.param ?? null;
    return {
      i, ...row, custom: row.kind === "custom", sentence: describeRule(rule, N5E),
      what: kind?.what ?? "A rule the builder can't show. Edit it as JSON under Advanced.",
      kinds: opts({ ...Object.fromEntries(Object.entries(RULE_KINDS).map(([k, v]) => [k, v.label])), ...(row.kind === "custom" ? { custom: "Custom rule (JSON)" } : {}) }, row.kind),
      bases: opts({ "": "— (no roll)", ...Object.fromEntries(Object.entries(bases).map(([k, v]) => [k, v.label])) }, row.base),
      detailOptions,
      needs: Object.fromEntries((kind?.needs ?? []).map(n => [n, true])),
      damageTypes: opts({ "": "—", ...Object.fromEntries(Object.entries(N5E.damageTypes ?? {}).map(([k, v]) => [k, v.label ?? k])) }, row.damageType),
      rerollModes: opts({ higher: "Keep the higher", lower: "Keep the lower", keep: "Keep the new roll" }, row.mode),
      whoOptions: opts({ target: "The target", self: "You" }, row.who),
      conditionOptions: opts({ "": "—", ...conds }, row.condition),
      whens: opts({ ...Object.fromEntries(Object.entries(WHEN_FACTS).map(([k, v]) => [k, v.label])), ...(row.when === "keep" ? { keep: "Several facts (see JSON)" } : {}) }, row.when),
      whenParam, whenIsCondition: row.when === "self:status" || row.when === "target:status",
      whenConditionOptions: opts({ "": "—", ...conds }, row.whenDetail),
      directions: opts(RULE_WHO, row.direction), triggers: opts(RULE_TRIGGERS, row.on)
    };
  });
}
