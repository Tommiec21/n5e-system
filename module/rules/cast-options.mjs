/**
 * Cast options that come from features (pure). A feature item carries flags.n5e.castOption:
 *   label            shown in the cast dialog
 *   appliesTo        {discipline, keywords: [any of], activation, requiresDamage}
 *   requiresState    an active effect state ("crash") the caster must be in
 *   requiresChoice   {feature, value}: e.g. Jack of All's Generalization = warfare
 *   blockedByState   a state that forbids it ("flow": no damage boosts)
 *   oncePerTurn
 *   auto             checked by default (Crash's damage: once per casting)
 *   costDelta        "-rank" (Chakra Compression) or a number
 *   cost             {pool, amount, choose}: spend from a pool (choose: the caster picks how many)
 *   damage           {formula, type, halfForArea}: an extra damage button on the cast card
 *   effect           an activity effect for the card (Hellrend: targets' DR −2 per Pyroclasm, @amount)
 *   roll             a die rolled when cast, shown with the note (Devastation: 1d6)
 *   note             text on the cast card
 */
import { rankValue } from "./progression.mjs";
import { resolveFormula } from "./unarmed.mjs";
import { choiceOf } from "./features.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const kwSet = j => (j.system.keywords instanceof Set ? j.system.keywords : new Set(j.system.keywords ?? []));
const sameTurn = (a, b) => !!a && !!b && a.round === b.round && a.turn === b.turn;

/** Named states from active effects (flags.n5e.state). */
export function hasState(actor, state) {
  return list(actor.effects).some(e => !e.disabled && e.flags?.n5e?.state === state);
}

function hasDamage(jutsu, activities) {
  return activities.some(a => a.damage?.parts?.length) || /\d+d\d+[^.]*damage/i.test(String(jutsu.system.description ?? ""));
}

/**
 * Options available for this cast.
 * @param {object} actor
 * @param {object} jutsu
 * @param {object[]} activities   the jutsu's effective activities
 * @param {{round, turn}|null} now
 */
export function availableCastOptions(actor, jutsu, activities = [], now = null) {
  const out = [];
  const entries = list(actor.items).flatMap(f => {
    const n = f.flags?.n5e ?? {};
    const opts = [...(n.castOption ? [n.castOption] : []), ...list(n.castOptions)];
    return opts.map((o, i) => ({ f, o, id: opts.length > 1 ? `${f.id}-${i}` : f.id }));
  });
  for ( const { f, o, id } of entries ) {
    const a = o.appliesTo ?? {};
    if ( a.discipline && jutsu.system.discipline !== a.discipline ) continue;
    if ( a.keywords?.length && !a.keywords.some(k => kwSet(jutsu).has(k)) ) continue;
    if ( a.activation && jutsu.system.activation?.type !== a.activation ) continue;
    if ( a.requiresDamage && !hasDamage(jutsu, activities) ) continue;
    if ( o.requiresState && !hasState(actor, o.requiresState) ) continue;
    if ( o.blockedByState && hasState(actor, o.blockedByState) ) continue;
    if ( o.requiresChoice && choiceOf(actor, o.requiresChoice.feature) !== o.requiresChoice.value ) continue;
    if ( o.minLevel && (actor.system.level ?? 0) < o.minLevel ) continue;
    const used = o.oncePerTurn && sameTurn(actor.flags?.n5e?.optionTurn?.[id], now);
    out.push({ id, name: f.name, label: o.label || f.name, used, auto: !!o.auto, choose: !!o.cost?.choose,
      max: o.cost?.choose ? (actor.system.resources?.[o.cost.pool]?.value ?? 0) : 0, def: o });
  }
  return out;
}

/** Halve the dice of "NdX" terms (rounded up, min 1) for area jutsu. */
export function halveDice(formula) {
  return String(formula).replace(/(\d+)d(\d+)/g, (m, n, f) => `${Math.max(1, Math.ceil(Number(n) / 2))}d${f}`);
}

/**
 * What the chosen options do to the cast.
 * @param {object} actor
 * @param {object} jutsu
 * @param {object[]} chosen     [{id, amount}] from the dialog
 * @param {object[]} available  from availableCastOptions
 * @param {string} rank         cast rank
 */
export function applyCastOptions(actor, jutsu, chosen, available, rank) {
  const res = { subtract: 0, pools: {}, damage: [], effects: [], rolls: [], notes: [], problems: [], update: {}, names: [] };
  const area = !!jutsu.system.target?.area?.shape;
  for ( const c of chosen ) {
    const opt = available.find(o => o.id === c.id);
    if ( !opt ) continue;
    const o = opt.def;
    if ( opt.used ) {
      res.problems.push(`${opt.label}: once per turn`);
      continue;
    }
    const amount = o.cost?.choose ? Math.max(0, Number(c.amount) || 0) : (o.cost?.amount ?? 0);
    if ( o.cost?.choose && !amount ) continue;
    res.names.push(o.cost?.choose ? `${opt.label} ×${amount}` : opt.label);
    if ( o.costDelta === "-rank" ) res.subtract += Math.max(0, rankValue(rank));
    else if ( Number(o.costDelta) ) res.subtract -= Number(o.costDelta);
    if ( o.cost?.pool && amount ) res.pools[o.cost.pool] = (res.pools[o.cost.pool] ?? 0) + amount;
    const sub = v => resolveFormula(String(v ?? "").replace(/@amount/g, String(amount)), actor);
    if ( o.damage?.formula ) {
      const f = sub(o.damage.formula);
      res.damage.push({ label: opt.label, formula: o.damage.halfForArea && area ? halveDice(f) : f, type: o.damage.type ?? "" });
    }
    if ( o.effect ) {
      res.effects.push({ label: o.effect.name || opt.label, effect: { ...o.effect,
        changes: (o.effect.changes ?? []).map(ch => ({ ...ch, value: sub(ch.value) })) } });
    }
    if ( o.roll ) res.rolls.push({ label: opt.label, formula: o.roll, note: o.note ?? "" });
    else if ( o.note ) res.notes.push(`${opt.label}: ${o.note}`);
    if ( o.oncePerTurn ) res.update[`flags.n5e.optionTurn.${opt.id}`] = "@now";
  }
  return res;
}

/** Pyroclasm: once per turn, casting a Fire Release jutsu grants 1 (max 3). */
export function pyroclasmGain(actor, jutsu, now) {
  const pool = actor.system.resources?.pyroclasm;
  if ( !pool || !kwSet(jutsu).has("fireRelease") ) return null;
  if ( sameTurn(actor.flags?.n5e?.pyroTurn, now) ) return null;
  const value = Math.min(pool.maxValue ?? 3, (pool.value ?? 0) + 1);
  return { "system.resources.pyroclasm.value": value, "flags.n5e.pyroTurn": now };
}
