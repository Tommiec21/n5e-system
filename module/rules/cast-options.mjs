/**
 * Cast options that come from features (pure). A feature item carries flags.n5e.castOption:
 *   label            shown in the cast dialog
 *   appliesTo        {discipline, keywords: [any of], activation, requiresDamage, requiresHealing,
 *                    stance: a stance category the caster must be in}
 *   requiresState    an active effect state ("crash") the caster must be in
 *   requiresChoice   {feature, value}: e.g. Jack of All's Generalization = warfare
 *   blockedByState   a state that forbids it ("flow": no damage boosts)
 *   oncePerTurn
 *   auto             checked by default (Crash's damage: once per casting)
 *   costDelta        "-rank" (Chakra Compression), "zero" (cast at 0 cost: not a reduction) or a number
 *   cost             {pool, amount, choose}: spend from a pool (choose: the caster picks how many)
 *   damage           {formula, type, halfForArea}: an extra damage button on the cast card
 *   heal             {formula, pool}: an extra healing button on the cast card
 *   effect           an activity effect for the card (Hellrend: targets' DR −2 per Pyroclasm, @amount)
 *   roll             a die rolled when cast, shown with the note (Devastation: 1d6)
 *   note             text on the cast card (@amount and @rankValue are filled in)
 *   rider            a CARD1d rider armed by this option (rules/riders.mjs): it goes onto the action card
 *   appliesTo also takes natureRelease (any nature release keyword), inflictsCondition (the jutsu can
 *   inflict a condition) and inflictsTag (one of its conditions has this tag, e.g. "elemental").
 *   castAs           "bonus" | "reaction": a 1-Action casting becomes a Bonus Action or Reaction (STD6d)
 *   actionEffect     the name of the feature's action effect this option brings (STD6d; without it,
 *                    choosing any option of the feature brings all its action effects)
 *   appliesTo also takes (STD6d) maxRank (a rank or lvl(level:rank,...): the highest rank it applies
 *   to) and namePrefix (the jutsu's name starts with it: "Grim").
 *   Formulas may use @amount (pool spent), @rankValue (cast rank: D 1 ... S 5), lvl(...) and @level.
 */
import { rankValue } from "./progression.mjs";
import { resolveFormula } from "./unarmed.mjs";
import { choiceOf } from "./features.mjs";
import { activeStance } from "./unarmed.mjs";
import { NATURE_RELEASES } from "./riders.mjs";
import { conditions as CONDITIONS } from "../config/conditions.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const kwSet = j => (j.system.keywords instanceof Set ? j.system.keywords : new Set(j.system.keywords ?? []));
const sameTurn = (a, b) => !!a && !!b && a.round === b.round && a.turn === b.turn;

/** Named states from active effects (flags.n5e.state). */
export function hasState(actor, state) {
  return list(actor.effects).some(e => !e.disabled && e.flags?.n5e?.state === state);
}

/** Does this jutsu heal (a heal activity, or "regain(s) ... hit points" in its text)? */
function hasHealing(jutsu, activities) {
  return activities.some(a => a.type === "heal") || /regains?\b[^.]*hit points/i.test(String(jutsu.system.description ?? ""));
}

/** Is the actor's active stance of this category (taijutsu, bukijutsu, chakra)? */
export function stanceIs(actor, category) {
  const st = activeStance(actor);
  const cats = st?.system?.categories;
  return !!st && (cats instanceof Set ? cats.has(category) : list(cats).includes(category));
}

/**
 * King 2026-11-16: a cast option's added damage (Crash's +Nd10) joins the jutsu's own damage roll,
 * in the jutsu's damage type when the option names none. Damage with nowhere to go (the jutsu has no
 * damage roll) stays a separate button.
 * @returns {{activities: object[], leftover: object[]}}
 */
export function mergeExtraDamage(activities, extra = []) {
  const out = activities.map(a => a);
  const leftover = [];
  for ( const d of extra ) {
    const i = out.findIndex(a => a?.damage?.parts?.length);
    if ( i < 0 ) { leftover.push(d); continue; }
    const a = out[i];
    const type = d.type || a.damage.parts[0]?.type || "";
    out[i] = { ...a, damage: { ...a.damage, parts: [...a.damage.parts, { formula: d.formula, type }] } };
  }
  return { activities: out, leftover };
}

/** Does this jutsu deal damage (activity damage parts, or "XdY ... damage" in its text)? */
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
export function availableCastOptions(actor, jutsu, activities = [], now = null, { discipline = "" } = {}) {
  const out = [];
  const entries = list(actor.items).flatMap(f => {
    const n = f.flags?.n5e ?? {};
    const opts = [...(n.castOption ? [n.castOption] : []), ...list(n.castOptions)];
    return opts.map((o, i) => ({ f, o, id: opts.length > 1 ? `${f.id}-${i}` : f.id }));
  });
  for ( const { f, o, id } of entries ) {
    const a = o.appliesTo ?? {};
    // Cast as one discipline (MDISC1): options for a discipline apply when cast as it (or its group).
    const castAs = discipline ? [discipline, jutsu.system.group] : [jutsu.system.discipline, jutsu.system.group, ...(jutsu.system.disciplines ?? [])];
    if ( a.discipline && !castAs.includes(a.discipline) ) continue;
    if ( a.keywords?.length && !a.keywords.some(k => kwSet(jutsu).has(k)) ) continue;
    if ( a.activation && jutsu.system.activation?.type !== a.activation ) continue;
    if ( a.namePrefix && !String(jutsu.name ?? "").toLowerCase().startsWith(String(a.namePrefix).toLowerCase()) ) continue;
    if ( a.maxRank ) {
      // The jutsu's own rank (options are offered before an upcast is chosen).
      const top = /^[DCBAS]$/.test(a.maxRank) ? a.maxRank : levelRank(a.maxRank, actor.system.level ?? 0);
      if ( !top || rankValue(jutsu.system.rank) > rankValue(top) ) continue;
    }
    if ( a.requiresDamage && !hasDamage(jutsu, activities) ) continue;
    if ( a.requiresHealing && !hasHealing(jutsu, activities) ) continue;
    // CARD1d rider filters.
    if ( a.natureRelease && !NATURE_RELEASES.some(k => kwSet(jutsu).has(k)) ) continue;
    const inflicted = activities.flatMap(x => x.inflicts ?? []).filter(x => x?.kind === "condition");
    if ( a.inflictsCondition && !inflicted.length ) continue;
    if ( a.inflictsTag && !inflicted.some(x => (CONDITIONS[x.key]?.tags ?? []).includes(a.inflictsTag)) ) continue;
    // Only while in a stance of this category (Paths of Perfection: "while you are in a Taijutsu stance").
    if ( a.stance && !stanceIs(actor, a.stance) ) continue;
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

/**
 * Which action effects each chosen feature option brings (STD6d `actionEffect`): Map itemId → [names].
 * @param {object[]} chosen     [{id, def?}]
 * @param {object[]} available  from availableCastOptions
 */
export function namedActionEffects(chosen = [], available = []) {
  const named = new Map();
  for ( const o of chosen ) {
    const def = o.def ?? available.find(f => f.id === o.id)?.def;
    if ( !def?.actionEffect ) continue;
    const itemId = String(o.id).split("-")[0];
    named.set(itemId, [...(named.get(itemId) ?? []), def.actionEffect]);
  }
  return named;
}

/** The rank a "lvl(level:rank,...)" table gives at this level ("lvl(2:D,10:C,18:B)"). */
export function levelRank(table, level) {
  let out = "";
  for ( const [, l, r] of String(table).matchAll(/(\d+)\s*:\s*([DCBAS])/g) ) if ( level >= Number(l) ) out = r;
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
  const res = { subtract: 0, pools: {}, damage: [], heals: [], effects: [], rolls: [], notes: [], problems: [], update: {}, names: [], riders: [], castAs: [] };
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
    else if ( o.costDelta === "zero" ) res.zeroCost = true;
    else if ( Number(o.costDelta) ) res.subtract -= Number(o.costDelta);
    if ( o.cost?.pool && amount ) res.pools[o.cost.pool] = (res.pools[o.cost.pool] ?? 0) + amount;
    // @amount: how many of the pool were spent; @rankValue: the cast rank as a number (D 1 ... S 5).
    const sub = v => resolveFormula(String(v ?? "").replace(/@amount/g, String(amount))
      .replace(/@rankValue/g, String(Math.max(0, rankValue(rank)))), actor);
    if ( o.damage?.formula ) {
      const f = sub(o.damage.formula);
      res.damage.push({ label: opt.label, formula: o.damage.halfForArea && area ? halveDice(f) : f, type: o.damage.type ?? "" });
    }
    if ( o.heal?.formula ) res.heals.push({ label: opt.label, formula: sub(o.heal.formula), pool: o.heal.pool || "hp" });
    if ( o.effect ) {
      res.effects.push({ label: o.effect.name || opt.label, effect: { ...o.effect,
        changes: (o.effect.changes ?? []).map(ch => ({ ...ch, value: sub(ch.value) })) } });
    }
    // CARD1d: a rider armed in the cast dialog goes onto the action card (its die is rolled there).
    if ( o.rider ) res.riders.push({ id: opt.id, label: opt.label, rider: o.rider, cost: o.cost ?? null, amount });
    if ( o.roll ) res.rolls.push({ label: opt.label, formula: o.roll, note: o.note ?? "" });
    else if ( o.note ) res.notes.push(`${opt.label}: ${sub(o.note)}`);
    if ( o.castAs ) res.castAs.push(o.castAs);
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
