/**
 * Roll math for the roll dialog (pure; ROLL1). The dialog shows a roll's parts with ticks, lets the
 * roller add modifiers (a number or dice), and these functions turn the choices into what is rolled.
 *
 *   d20 rolls   d20Parts(spec) -> parts; composeD20(parts, choice) -> {bonus, extra, breakdown, edited}
 *   groups      groupParts(specs) -> one row per label across several creatures (King Q-R2)
 *   dice        diceParts(parts) -> parts; composeDice(parts, choice) -> {parts, crit, edited}
 *   form        readChoice(fields) -> the dialog's choice from its form values
 *
 * A choice is {off: string[] (part ids unticked), added: [{label, value, type?}], mode, crit?}.
 * Any part can be unticked, including ability and proficiency (King Q-R3).
 */

/** A modifier the roller typed: "2", "-1", "1d4", "1d6 + 2", "2d8-1". */
export const ADDED_PATTERN = /^\s*[+-]?\s*(\d+d\d+|\d+)(\s*[+-]\s*(\d+d\d+|\d+))*\s*$/i;

/** Parse an added modifier: {ok, number} for a plain number, {ok, dice} for anything with dice. */
export function parseAdded(text) {
  const raw = String(text ?? "").trim();
  if ( !raw ) return { ok: false, empty: true };
  if ( !ADDED_PATTERN.test(raw) ) return { ok: false };
  const compact = raw.replace(/\s+/g, "");
  if ( /^[+-]?\d+$/.test(compact) ) return { ok: true, number: Number(compact) };
  return { ok: true, dice: compact.replace(/^\+/, "") };
}

/**
 * The parts of a d20 roll's bonus, from its breakdown. If the parts don't add up to the bonus (a
 * penalty added outside the breakdown), the difference is its own part so the dialog's total matches.
 */
export function d20Parts(spec = {}) {
  const src = spec.breakdown?.parts ?? [];
  const parts = src.map((p, i) => ({ id: `p${i}`, label: p.label, value: Number(p.value) || 0, base: !!p.base }));
  const sum = parts.reduce((a, p) => a + p.value, 0);
  const bonus = Number(spec.bonus) || 0;
  if ( !parts.length ) parts.push({ id: "p0", label: "Bonus", value: bonus, base: true });
  else if ( sum !== bonus ) parts.push({ id: `p${parts.length}`, label: spec.penalty && sum + spec.penalty === bonus ? "Skill action penalty" : "Other", value: bonus - sum });
  return parts;
}

/** Situational modifiers known but not applied (NPC situational skill bonuses...): unticked parts. */
export function situationalParts(list = []) {
  return list.map((s, i) => ({ id: `s${i}`, label: s.when ? `${s.label} (${s.when})` : s.label, value: Number(s.value) || 0, situational: true }));
}

/**
 * Turn the choice into what is rolled: the flat bonus (ticked parts and added numbers), any added dice
 * (rolled with the d20), and a breakdown for the card with unticked parts marked removed and added
 * ones marked added.
 */
export function composeD20(parts, { off = [], added = [], on = [] } = {}, label = "") {
  const offSet = new Set(off);
  const onSet = new Set(on);
  const used = p => (p.situational ? onSet.has(p.id) : !offSet.has(p.id));
  const shown = [];
  let bonus = 0;
  for ( const p of parts ) {
    if ( p.situational && !onSet.has(p.id) ) continue;
    const isUsed = used(p);
    if ( isUsed ) bonus += p.value;
    shown.push({ label: p.label, value: p.value, base: p.base, ...(isUsed ? {} : { removed: true }), ...(p.situational ? { added: true } : {}) });
  }
  const dice = [];
  for ( const a of added ) {
    const parsed = parseAdded(a.value);
    if ( !parsed.ok ) continue;
    const name = a.label?.trim() || "Added";
    if ( parsed.number != null ) {
      bonus += parsed.number;
      shown.push({ label: name, value: parsed.number, added: true });
    } else {
      dice.push(parsed.dice);
      shown.push({ label: `${name} (${parsed.dice})`, value: 0, added: true, dice: parsed.dice });
    }
  }
  const edited = shown.some(p => p.removed || p.added);
  return { bonus, extra: dice.join(" + "), edited, breakdown: { label, total: bonus, parts: shown } };
}

/** Several creatures' parts as one list (King Q-R2): one row per label, with each creature's value. */
export function groupParts(specs = []) {
  const rows = new Map();
  specs.forEach((spec, n) => {
    for ( const p of d20Parts(spec) ) {
      const row = rows.get(p.label) ?? { id: `g${rows.size}`, label: p.label, values: [] };
      row.values[n] = p.value;
      rows.set(p.label, row);
    }
  });
  return [...rows.values()].map(r => {
    const vals = r.values.filter(v => v !== undefined);
    return { ...r, same: vals.every(v => v === vals[0]) && vals.length === specs.length, value: vals[0] ?? 0 };
  });
}

/** A group choice for one creature: unticking a label removes that part wherever it appears. */
export function choiceForMember(spec, groupRows, choice = {}) {
  const offLabels = new Set(groupRows.filter(r => (choice.off ?? []).includes(r.id)).map(r => r.label));
  const parts = d20Parts(spec);
  return { parts, choice: { off: parts.filter(p => offLabels.has(p.label)).map(p => p.id), added: choice.added ?? [], on: [] } };
}

/**
 * The parts of a dice roll (damage, healing, pool dice): [{formula, type?, label?}] with ids. Flat
 * modifiers from effects are their own parts ({value, label}).
 */
export function diceParts(parts = [], modifiers = []) {
  return [
    ...parts.map((p, i) => ({ id: `d${i}`, label: p.label || p.formula, formula: String(p.formula), type: p.type ?? "", abilityMod: p.abilityMod })),
    ...modifiers.map((m, i) => ({ id: `m${i}`, label: m.label, formula: String(m.value), type: "", flat: true }))
  ];
}

/**
 * What is rolled: the ticked parts (flat modifiers folded into the first rolled part, as before), plus
 * added parts with their own type. Returns {parts: [{formula, type, abilityMod}], crit, edited}.
 */
export function composeDice(parts, { off = [], added = [], crit = false } = {}) {
  const offSet = new Set(off);
  const kept = parts.filter(p => !offSet.has(p.id));
  const rolled = kept.filter(p => !p.flat).map(p => ({ formula: p.formula, type: p.type, abilityMod: p.abilityMod }));
  const flat = kept.filter(p => p.flat).reduce((a, p) => a + (Number(p.formula) || 0), 0);
  for ( const a of added ) {
    const parsed = parseAdded(a.value);
    if ( !parsed.ok ) continue;
    rolled.push({ formula: parsed.dice ?? String(parsed.number), type: a.type ?? "", abilityMod: 0, added: true, label: a.label?.trim() || "Added" });
  }
  if ( flat && rolled.length ) rolled[0] = { ...rolled[0], formula: `(${rolled[0].formula}) + (${flat})` };
  else if ( flat ) rolled.push({ formula: String(flat), type: parts.find(p => !p.flat)?.type ?? "", abilityMod: 0 });
  return { parts: rolled, crit: !!crit, edited: offSet.size > 0 || added.some(a => parseAdded(a.value).ok) };
}

/**
 * The dialog's choice from its form fields: tick boxes named "on_<id>", added rows "addLabel_<n>",
 * "addValue_<n>", "addType_<n>", the mode, and Critical. Ticks absent from `fields` mean unticked.
 */
export function readChoice(fields = {}, parts = [], { mode = null } = {}) {
  const off = [], on = [];
  for ( const p of parts ) {
    const ticked = !!fields[`on_${p.id}`];
    if ( p.situational ) { if ( ticked ) on.push(p.id); } else if ( !ticked ) off.push(p.id);
  }
  const added = [];
  for ( const [k, v] of Object.entries(fields) ) {
    const m = k.match(/^addValue_(\d+)$/);
    if ( !m || !String(v ?? "").trim() ) continue;
    added.push({ label: fields[`addLabel_${m[1]}`] ?? "", value: String(v), type: fields[`addType_${m[1]}`] ?? "" });
  }
  const invalid = added.filter(a => !parseAdded(a.value).ok).map(a => a.value);
  return { off, on, added: added.filter(a => parseAdded(a.value).ok), invalid, mode: fields.mode || mode, crit: !!fields.crit };
}
