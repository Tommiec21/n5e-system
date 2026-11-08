/**
 * Phase 6 trackers (pure): Stamina, Chilled movement, Fury, Marks, Branded, Amps, 8-Inner Gates,
 * end-of-turn resaves. Foundry wiring lives in workflow/trackers.mjs.
 *
 * Pattern for a new tracker: put the decision ("what changes, given this actor and this turn") here
 * as a pure function returning an update or a list, test it in tests/trackers.test.mjs, then call it
 * from workflow/trackers.mjs (buttons, turn hooks) and show it from view-models/combat.mjs.
 * Turns are compared as {round, turn} pairs (sameTurn) so "until the end of your next turn" works
 * the same in and out of the round boundary.
 */
import { conditions as coreConditions } from "../config/conditions.mjs";
import { marks as markTable, innerGates, gateAccess } from "../config/combat.mjs";
import { rule } from "../rules-settings.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const plain = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const sameTurn = (a, b) => !!a && !!b && a.round === b.round && a.turn === b.turn;

/* -------------------------------------------- */
/*  Stamina (optional rule, KB 09)              */
/* -------------------------------------------- */

const STAMINA_PER = new Set(["sr", "lr", "rest"]);

/** The Stamina pool definition (max = proficiency bonus; Long Rest full, Short Rest half). */
export const staminaPool = () => ({ label: "Stamina", max: "@prof", recovery: [{ on: "lr", amount: "all" }, { on: "sr", amount: "half" }],
  startsFull: true, stamina: true });

/** Does this item's limited use draw from Stamina instead (rule on, feat with a rest-based use)? */
export function usesStamina(item) {
  if ( !rule("stamina") ) return false;
  const u = item.system?.uses;
  if ( !u?.max ) return false;
  return !!u.staminaEligible || (item.type === "feat" && STAMINA_PER.has(u.per));
}

/* -------------------------------------------- */
/*  Chilled                                     */
/* -------------------------------------------- */

/**
 * Chilled: once per turn, willingly moving more than 5 ft deals 1d10 cold per rank.
 * @param {object} actor
 * @param {object} o
 * @param {number} o.feet          distance of this move
 * @param {boolean} [o.willing]    false for forced movement
 * @param {{round, turn}} [o.now]  current combat turn (null out of combat: every qualifying move counts)
 * @returns {{state: object, hit: {formula, type, ranks}|null}}
 */
export function chilledMove(actor, { feet = 0, willing = true, now = null } = {}, registry = coreConditions) {
  const e = list(actor.effects).find(x => x.type === "condition" && x.system?.key === "chilled" && !x.disabled);
  const prev = actor.flags?.n5e?.chilledMove ?? {};
  const state = sameTurn(prev, now) ? { ...prev } : { round: now?.round ?? null, turn: now?.turn ?? null, feet: 0, triggered: false };
  if ( !e || !willing || !rule("conditionTurnDamage") ) return { state, hit: null };
  state.feet += feet;
  const def = registry.chilled.moveDamage;
  if ( state.triggered || state.feet <= def.thresholdFeet ) return { state, hit: null };
  if ( now ) state.triggered = true;
  else state.feet = 0;
  const ranks = Math.max(1, e.system.ranks ?? 1);
  const [n, faces] = def.die.split("d");
  return { state, hit: { formula: `${Number(n) * ranks}d${faces}`, type: def.type, ranks, name: e.name } };
}

/* -------------------------------------------- */
/*  Fury                                        */
/* -------------------------------------------- */

/** Max Fury: a single state (1) unless an effect raises it (n5e.fury.max, e.g. Power Weapon Adept to 3). */
export const furyMax = actor => 1 + (actor.system.modifiers?.furyMax ?? 0);

/** Gain Fury (refreshes its duration). */
export function gainFury(actor, now = null, amount = 1) {
  const value = Math.min(furyMax(actor), (actor.system.combat?.fury ?? 0) + amount);
  return { "system.combat.fury": value, "flags.n5e.furyGained": now ? { round: now.round, turn: now.turn } : null };
}

/** Spend Fury. */
export function spendFury(actor, amount = 1) {
  return { "system.combat.fury": Math.max(0, (actor.system.combat?.fury ?? 0) - amount) };
}

/** End of the creature's turn: Fury lasts until the end of the turn after gaining it. */
export function furyTurnEnd(actor, now) {
  if ( !(actor.system.combat?.fury > 0) ) return null;
  if ( sameTurn(actor.flags?.n5e?.furyGained, now) ) return null;
  return { "system.combat.fury": 0, "flags.n5e.furyGained": null };
}

/** Binding Fury Stance grants Fury the first time each turn you deal weapon damage. */
export function bindingFuryTrigger(actor, now) {
  const stance = actor.system.combat?.activeStance;
  const item = stance ? (actor.items.get?.(stance) ?? list(actor.items).find(i => i.id === stance)) : null;
  if ( !item || !/binding fury/i.test(item.name) ) return null;
  if ( sameTurn(actor.flags?.n5e?.furyTurnGain, now) ) return null;
  return { ...gainFury(actor, now), "flags.n5e.furyTurnGain": now ? { round: now.round, turn: now.turn } : null };
}

/* -------------------------------------------- */
/*  Marks, Branded, Amps (read from jutsu text) */
/* -------------------------------------------- */

/**
 * What a jutsu can put on creatures: a Mark (Ammunition jutsu), Branded (Flail), an Amp.
 * @param {object} item
 */
export function jutsuTrackers(item) {
  const text = plain(item.system?.description);
  const mark = markTable[item.name] ? { ...markTable[item.name], jutsu: item.name } : null;
  const branded = /\bbranded\b/i.test(text) ? { label: `Branded (${item.name})`, jutsu: item.name } : null;
  const ampMatch = text.match(/\b(battle|reflex|fortitude|will|clan) amp\b/i);
  const amp = ampMatch ? { ampType: ampMatch[1].toLowerCase(), label: `${item.name} (${ampMatch[1][0].toUpperCase()}${ampMatch[1].slice(1).toLowerCase()} Amp)` } : null;
  return { mark, branded, amp };
}

/**
 * Effect data for a Mark or Branded placed on a creature.
 * Marks last until the end of the marker's next turn; Branded lasts 1 minute unless removed.
 */
export function trackerEffectData(kind, def, { sourceUuid, sourceName, now = null, worldTime = 0 } = {}) {
  const isMark = kind === "mark";
  return {
    name: isMark ? `Marked: ${def.label} (${def.jutsu})` : def.label,
    img: isMark ? "icons/svg/target.svg" : "icons/svg/fire-shield.svg",
    description: isMark ? `<p>${def.text}</p><p>Only ${sourceName} sees the mist.</p>` : `<p>Branded by ${sourceName}'s ${def.jutsu}. See the jutsu for what Branded does.</p>`,
    duration: { seconds: isMark ? 12 : 60, rounds: isMark ? 2 : 10, startTime: worldTime, startRound: now?.round ?? null, startTurn: now?.turn ?? null },
    flags: { n5e: { tracker: { kind, jutsu: def.jutsu, sourceUuid, sourceName, placed: now } } }
  };
}

/**
 * End of a creature's turn: Marks it placed expire (unless placed during this same turn).
 * @param {string} sourceUuid
 * @param {object[]} effects   effects on all combatants
 * @param {{round, turn}} now
 * @returns {object[]} effects to delete
 */
export function marksToExpire(sourceUuid, effects, now) {
  return effects.filter(e => {
    const t = e.flags?.n5e?.tracker;
    return t?.kind === "mark" && t.sourceUuid === sourceUuid && !sameTurn(t.placed, now);
  });
}

/**
 * Amp limit (optional rule): which existing Amps to switch off for a new one.
 * @param {object[]} amps     enabled Amps already on the creature, oldest first
 * @param {string} ampType
 * @returns {object[]}
 */
export function ampsToDisable(amps, ampType, mode = rule("ampLimit")) {
  const on = amps.filter(a => !a.disabled);
  if ( mode === "singleton" ) return on.filter(a => a.system?.ampType === ampType);
  if ( mode === "ruleOfThree" ) return on.length >= 3 ? on.slice(0, on.length - 2) : [];
  return [];
}

/* -------------------------------------------- */
/*  8-Inner Gates                               */
/* -------------------------------------------- */

/** Highest gate this character can open (by takes of the feat). Gate 8 also needs the GM. */
export function gateLimit(actor) {
  const takes = list(actor.items).filter(i => i.type === "feat" && /8-inner gates/i.test(i.name)).length;
  return gateAccess[Math.min(takes, 3)] ?? 0;
}

/** Cumulative changes for gates 1..n (Pierce: the highest gate's value). */
export function gateChanges(n) {
  const open = innerGates.filter(g => g.n <= n);
  const changes = open.flatMap(g => g.changes.map(c => ({ key: c.key, value: String(c.value), mode: c.mode ?? 0 })));
  const pierce = Math.max(0, ...open.map(g => g.pierce ?? 0));
  if ( pierce ) changes.push({ key: "n5e.pierce", value: String(pierce), mode: 0 });
  return changes;
}

/**
 * Can the next gate open?
 * @returns {{ok: boolean, gate: object|null, reason: string, gm: boolean}}
 */
export function nextGate(actor, current, { worldTime = 0 } = {}) {
  const gate = innerGates.find(g => g.n === current + 1) ?? null;
  if ( !gate ) return { ok: false, gate: null, reason: "Every gate is open.", gm: false };
  const limit = gateLimit(actor);
  if ( gate.n === 8 ) {
    if ( limit < 7 ) return { ok: false, gate, reason: "Gate 8 needs every earlier gate.", gm: false };
  } else if ( gate.n > limit ) return { ok: false, gate, reason: `Your 8-Inner Gates reach Gate ${limit}.`, gm: false };
  if ( gate.minLevel && (actor.system.level ?? 0) < gate.minLevel ) return { ok: false, gate, reason: `Gate ${gate.n} needs level ${gate.minLevel}.`, gm: false };
  const cooldown = actor.flags?.n5e?.gates?.cooldownUntil ?? 0;
  if ( current === 0 && worldTime < cooldown ) return { ok: false, gate, reason: "The gates need 10 minutes out of combat before reuse.", gm: false };
  return { ok: true, gate, reason: "", gm: gate.n === 8 };
}

/** What ending the gates does: cumulative Exhaustion, Bruised after Gate 7, death after Gate 8. */
export function closeGatesPlan(n) {
  const open = innerGates.filter(g => g.n <= n);
  return {
    exhaustion: open.reduce((t, g) => t + (g.fatigue ?? 0), 0),
    bruised: open.some(g => g.bruised),
    death: open.some(g => g.death),
    shortRestRecovery: open.some(g => g.n === 5)
  };
}

/* -------------------------------------------- */
/*  End-of-turn resaves                         */
/* -------------------------------------------- */

/** Does the save text let the target repeat the save at the end of each of its turns? */
export function hasResave(text) {
  return /(repeat the (?:saving throw|save)|make (?:a|another) \w+ saving throw|can (?:make|attempt) a(?:nother)? (?:saving throw|save)) at the end of each of its turns/i.test(plain(text))
    || /at the end of each of its turns,? (?:the (?:target|creature) )?(?:can )?(?:repeats?|makes?) (?:the|a|another) (?:\w+ )?saving throw/i.test(plain(text));
}

/** Conditions (and states) on this creature waiting for a resave at the end of its turn. */
export function resavesDue(actor, now) {
  return list(actor.effects).filter(e => !e.disabled && e.flags?.n5e?.resave && !sameTurn(e.flags.n5e.resave.applied, now))
    .map(e => ({ id: e.id, name: e.name, ...e.flags.n5e.resave }));
}

/* -------------------------------------------- */
/*  Effects that end on the source's turn       */
/* -------------------------------------------- */

/**
 * Effects placed by activities can end at the start or end of the source creature's turn:
 *   turnStart    "until the start (beginning) of your next turn"
 *   turnEnd      "until the end of your turn" (the current one, or the next one if placed off-turn)
 *   nextTurnEnd  "until the end of your next turn"
 * @param {string} sourceUuid
 * @param {object[]} effects
 * @param {"turnStart"|"turnEnd"} when
 * @param {{round, turn}} now
 */
export function expiringEffects(sourceUuid, effects, when, now) {
  return effects.filter(e => {
    const x = e.flags?.n5e?.expires;
    if ( !x || x.sourceUuid !== sourceUuid ) return false;
    if ( when === "turnStart" ) return x.at === "turnStart";
    if ( x.at === "turnEnd" ) return true;
    return x.at === "nextTurnEnd" && !sameTurn(x.placed, now);
  });
}
