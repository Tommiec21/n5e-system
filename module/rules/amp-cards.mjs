/**
 * Amp cards, pure rules (AMP1a; docs/AMP1_SPEC.md). The Foundry side (registration, applying,
 * the limit dialogs, endings, starting on initiative) is workflow/amp-cards.mjs.
 *
 * An Amp card packages a buff once: its type, who owns it, how long it lasts, how often it can be
 * used, what it changes, and what ends it. Cards register into CONFIG.N5E.amps; applying one
 * creates the existing `amp` Active Effect (data/effect/effects.mjs AmpEffectData) carrying the
 * card's key, so the Amps tracker, the Amp limits and expiry keep working.
 *
 * King's answers (2026-11-16):
 *   Q-A1  an Amp a clan provides is a Clan Amp, whatever type its box names (kept as namedType).
 *   Q-A2  anyone can apply an Amp, with a confirmation (warnings: not its source, a self-only Amp
 *         given to another creature, no uses left, cooling down).
 *   Q-A3  Singleton: the creature picks which Amp of a type applies.
 *   Q-A4  self-buff states and jutsu Amps can have no type ("Amp: no type") until King types them.
 *         A typeless Amp has no type to clash with under Singleton; it still counts for Rule of 3's.
 *   Q-A5  Amps that end on Staggered, Blinded, 0 chakra... end automatically or at the table:
 *         the GM's "ampEnding" setting.
 */

import { effectFieldCatalog } from "./effect-authoring.mjs";
import { describeChange, describeRule } from "./plain-language.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const escHTML = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const AMP_TYPES = ["battle", "reflex", "fortitude", "will", "clan"];

/** What can end an Amp (the card's endsOn), with labels for chat and the card sheet. */
export const AMP_END_TRIGGERS = {
  staggered: "Staggered", blinded: "Blinded", unconscious: "Unconscious", noChakra: "0 chakra",
  stanceLeave: "Leaving its stance", combatEnd: "End of combat", rest: "A rest"
};

/** The registry key of a card: its identifier, or its name made into one. */
export const ampKey = card => card.system?.identifier || slug(card.name);

/**
 * The type the limits use. King Q-A1: anything a clan provides is a Clan Amp. "" is "no type"
 * (King Q-A4), shown as "Amp: no type" until a type is set.
 */
export function effectiveAmpType(system = {}) {
  if ( system.owner?.kind === "clan" ) return "clan";
  return AMP_TYPES.includes(system.ampType) ? system.ampType : "";
}

/** The label for a type ("" → "No type"). */
export const ampTypeLabel = type => (type ? type[0].toUpperCase() + type.slice(1) : "No type");

/**
 * The registry entry for a card.
 * @param {{name, img, uuid?, system, flags?}} card
 */
export function ampDefinition(card) {
  const s = card.system ?? {};
  const type = effectiveAmpType(s);
  const def = {
    label: card.name, icon: card.img || "icons/svg/upgrade.svg", card: card.uuid ?? null, summary: s.summary ?? "",
    ampType: type, namedType: s.namedType || (s.owner?.kind === "clan" && AMP_TYPES.includes(s.ampType) && s.ampType !== "clan" ? s.ampType : ""),
    owner: { kind: s.owner?.kind || "any", id: s.owner?.id ?? "", subclass: s.owner?.subclass ?? "" },
    activation: s.activation ?? "", giveable: !!s.giveable, startOnInitiative: s.startOnInitiative ?? "",
    duration: { seconds: Number(s.duration?.seconds) || 0, until: s.duration?.until ?? "", concentration: !!s.duration?.concentration },
    uses: { max: String(s.uses?.max ?? ""), per: s.uses?.per ?? "" }, cooldown: Number(s.cooldown) || 0,
    exclusive: s.exclusive ?? "", state: s.state ?? "", tempHp: s.tempHp ?? "",
    endsOn: list(s.endsOn).filter(k => k in AMP_END_TRIGGERS)
  };
  // UX1: the buff can be written on the card (its Changes, its rules) or in the card's own Active
  // Effects (the effect editor); switched-off effects are left out. All of it applies together.
  const effects = list(card.effects).filter(e => e && !e.disabled);
  const changes = [...list(s.changes), ...effects.flatMap(e => list(e.changes))].filter(c => c?.key)
    .map(c => ({ key: c.key, value: String(c.value), mode: Number(c.mode ?? 2) }));
  if ( changes.length ) def.changes = changes;
  if ( s.aura && Object.keys(s.aura).length ) def.aura = structuredClone(s.aura);
  const rules = [...list(card.flags?.n5e?.rules), ...effects.flatMap(e => list(e.flags?.n5e?.rules))];
  if ( rules.length ) def.rules = structuredClone(rules);
  return def;
}

/** The identifiers an actor has: its classes, subclasses, clan and feats. */
function identities(actor) {
  const ids = { class: new Set(), subclass: new Set(), clan: new Set(), feat: new Set() };
  for ( const i of list(actor?.items) ) {
    if ( !ids[i.type] ) continue;
    if ( i.system?.identifier ) ids[i.type].add(i.system.identifier);
    if ( i.type === "feat" ) ids.feat.add(slug(i.name));
  }
  return ids;
}

/** Does the actor have what grants this Amp? Owner "any" (or none): everyone has it. */
export function ownsAmp(actor, def) {
  const o = def?.owner ?? {};
  if ( !o.kind || o.kind === "any" || !o.id ) return true;
  const ids = identities(actor);
  if ( o.kind === "clan" ) return ids.clan.has(o.id);
  if ( o.kind === "feat" ) return ids.feat.has(o.id);
  if ( o.kind === "subclass" ) return ids.subclass.has(o.id);
  return ids.class.has(o.id) && (!o.subclass || ids.subclass.has(o.subclass));
}

/**
 * Uses of a card left for an actor (null: unlimited). The max is a number or a formula the caller
 * resolves (resolve(max) → number).
 */
export function ampUsesLeft(actor, key, def, resolve = v => Number(v)) {
  if ( !def?.uses?.max ) return null;
  const max = Math.max(0, Number(resolve(def.uses.max)) || 0);
  const spent = Number(actor?.flags?.n5e?.ampUses?.[key]?.spent) || 0;
  return { max, left: Math.max(0, max - spent), spent };
}

/** Seconds of cooldown left (0: ready). */
export function ampCooldownLeft(actor, key, worldTime = 0) {
  const until = Number(actor?.flags?.n5e?.ampUses?.[key]?.cooldownUntil) || 0;
  return Math.max(0, until - worldTime);
}

/** The active Amp effects on an actor made from cards: {key → effect}. */
export function activeAmpCards(actor) {
  const out = {};
  for ( const e of list(actor?.effects) ) if ( e.type === "amp" && e.system?.key ) out[e.system.key] = e;
  return out;
}

/**
 * The Amps an actor can start (its Amps panel), with uses, cooldown and whether it is on now.
 * @returns {{key, label, icon, summary, card, type, typeLabel, namedType, uses, cooldown, active, giveable}[]}
 */
export function ampCardsFor(actor, registry = {}, { worldTime = 0, resolve } = {}) {
  const active = activeAmpCards(actor);
  return Object.entries(registry).filter(([, def]) => def.owner?.kind !== "any" && def.owner?.id && ownsAmp(actor, def))
    .map(([key, def]) => {
      const uses = ampUsesLeft(actor, key, def, resolve);
      return { key, label: def.label, icon: def.icon, summary: def.summary, card: def.card, type: def.ampType,
        typeLabel: ampTypeLabel(def.ampType), namedType: def.namedType, giveable: def.giveable,
        uses, pips: uses ? Array.from({ length: Math.min(uses.max, 10) }, (_, i) => i < uses.left) : [],
        cooldown: ampCooldownLeft(actor, key, worldTime), active: !!active[key] };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * King Q-A2: what the confirmation before applying should warn about (empty: nothing to confirm).
 * @param {object} def
 * @param {object} o
 * @param {object|null} o.applier
 * @param {object} o.target
 * @param {number} [o.worldTime]
 * @param {string} [o.key]
 * @param {Function} [o.resolve]
 */
export function ampWarnings(def, { applier = null, target, worldTime = 0, key = "", resolve } = {}) {
  const warnings = [];
  const who = applier ?? target;
  const owns = ownsAmp(who, def);
  if ( !owns ) warnings.push(`${who?.name ?? "This creature"} has no ${def.owner.kind} that grants ${def.label}.`);
  if ( applier && target && applier !== target && (applier.uuid == null || applier.uuid !== target.uuid) && !def.giveable ) {
    warnings.push(`${def.label} is normally used on yourself; giving it to ${target.name}.`);
  }
  if ( owns ) {
    const uses = ampUsesLeft(who, key, def, resolve);
    if ( uses && uses.left <= 0 ) warnings.push(`No uses of ${def.label} left (${uses.max} per ${def.uses.per || "use"}).`);
    const cd = ampCooldownLeft(who, key, worldTime);
    if ( cd > 0 ) warnings.push(`${def.label} is cooling down (${Math.ceil(cd / 60)} min left).`);
  }
  return warnings;
}

/**
 * The flag update spending one use and starting the cooldown, or null when the card has neither.
 */
export function ampSpendUpdate(actor, key, def, worldTime = 0) {
  if ( !def?.uses?.max && !def?.cooldown ) return null;
  const prev = actor?.flags?.n5e?.ampUses?.[key] ?? {};
  const next = { ...prev };
  if ( def.uses?.max ) Object.assign(next, { spent: (Number(prev.spent) || 0) + 1, per: def.uses.per });
  return { [`flags.n5e.ampUses.${key}`]: next };
}

/** The cooldown starts when the Amp ends ("10 minutes before re-entry"). */
export function ampCooldownUpdate(key, def, worldTime = 0, prev = {}) {
  if ( !def?.cooldown ) return null;
  return { [`flags.n5e.ampUses.${key}`]: { ...prev, cooldownUntil: worldTime + def.cooldown } };
}

/**
 * The activity-effect shape (workflow/trackers.mjs applyActivityEffect) a card applies as. The
 * effect is an Amp of the card's type ("" for no type) carrying the card key.
 */
export function ampEffectPlan(key, def) {
  const d = def.duration ?? {};
  const turnBased = ["turnStart", "turnEnd", "nextTurnEnd"].includes(d.until);
  return {
    name: def.label, target: "self", changes: def.changes ?? [], rules: def.rules ?? [], aura: def.aura,
    // AMP1d: "dismissed" has no time limit (Crimson Pact, Caloric Ignition): it ends when ended.
    seconds: d.until === "dismissed" ? 0 : d.seconds || (turnBased ? 0 : d.until ? 86400 : 60), expires: turnBased ? d.until : "",
    permanent: d.until === "dismissed",
    tempHp: def.tempHp ?? "", state: def.state ?? "", exclusive: def.exclusive ?? "",
    ampType: def.ampType ?? "", ampKey: key, img: def.icon, endsOn: def.endsOn ?? [], until: turnBased || d.until === "dismissed" ? "" : d.until ?? "",
    concentration: !!d.concentration
  };
}

/**
 * King Q-A3 and the optional limits: does a new Amp clash with the active ones?
 * @param {object[]} amps   enabled Amp effects already on the creature (not the new one)
 * @param {object} added    the new Amp effect (system.ampType)
 * @param {string} mode     none | singleton | ruleOfThree
 * @returns {null | {kind: "singleton"|"ruleOfThree", candidates: object[], keep: number}}
 *   candidates: the Amps to choose among (the new one last); keep: how many of them stay on.
 */
export function ampLimitConflict(amps, added, mode) {
  const on = list(amps).filter(a => !a.disabled && a !== added && (a.id == null || a.id !== added.id));
  if ( mode === "singleton" ) {
    const type = added.system?.ampType;
    if ( !type ) return null;
    const same = on.filter(a => a.system?.ampType === type);
    return same.length ? { kind: "singleton", candidates: [...same, added], keep: 1 } : null;
  }
  if ( mode === "ruleOfThree" ) {
    return on.length >= 3 ? { kind: "ruleOfThree", candidates: [...on, added], keep: 3 } : null;
  }
  return null;
}

/**
 * Which active Amps end on an event (King Q-A5): Staggered, Blinded, Unconscious, 0 chakra,
 * leaving a stance, the end of combat, a rest.
 * @param {object} actor
 * @param {string} trigger  a key of AMP_END_TRIGGERS
 * @returns {object[]} effects
 */
export function ampsEndingOn(actor, trigger) {
  return list(actor?.effects).filter(e => e.type === "amp" && !e.disabled && list(e.flags?.n5e?.ampEnds).includes(trigger));
}

/** Rest: uses that come back (by the card's per), as a flags update, or null. */
export function ampUsesAfterRest(actor, recovers) {
  const uses = actor?.flags?.n5e?.ampUses ?? {};
  const out = {};
  for ( const [key, u] of Object.entries(uses) ) {
    if ( (Number(u?.spent) || 0) > 0 && recovers.has(u.per) ) out[`flags.n5e.ampUses.${key}.spent`] = 0;
  }
  return Object.keys(out).length ? out : null;
}

/* -------------------------------------------- */
/*  What an active Amp shows (King 2026-11-16)  */
/* -------------------------------------------- */

/** The registry entry an Amp effect came from: by its card key, else by the card it was made from. */
export function ampDefFor(effect, registry = {}) {
  const key = effect?.system?.key;
  const byCard = effect?.origin ? Object.values(registry).find(d => d.card && d.card === effect.origin) : null;
  return byCard ?? (key ? registry[key] : null) ?? null;
}

/**
 * The plain lines of what an effect changes: its changes and its roll rules.
 * @param {object} effect
 * @param {object} N5E   config (catalog, conditions, states)
 */
export function effectLines(effect, N5E = {}) {
  const catalog = effectFieldCatalog(N5E);
  return [...list(effect?.changes).filter(c => c?.key).map(c => describeChange(c, catalog, N5E)),
    ...list(effect?.flags?.n5e?.rules).map(r => describeRule(r, N5E))];
}

/**
 * An active Amp's name (its card's current name) and hover text: type, time left, summary, and
 * every change and roll rule in plain words.
 * @returns {{name: string, tip: string}}
 */
export function ampEffectView(effect, registry = {}, N5E = {}) {
  const def = ampDefFor(effect, registry);
  const name = def?.label || effect?.name || "Amp";
  const type = ampTypeLabel(effect?.system?.ampType ?? def?.ampType ?? "");
  const lines = effectLines(effect, N5E);
  const time = effect?.duration?.label ? ` · ${effect.duration.label}` : "";
  const tip = [`<b>${escHTML(name)}</b> <span class="sub">(${escHTML(type)} Amp${escHTML(time)})</span>`,
    def?.summary ? `<div>${escHTML(def.summary)}</div>` : "",
    lines.length ? `<ul>${lines.map(l => `<li>${escHTML(l)}</li>`).join("")}</ul>` : "<div><i>Changes nothing by itself; see the card.</i></div>",
    effect?.disabled ? "<div><i>Switched off (Amp limit).</i></div>" : ""].filter(Boolean).join("");
  return { name, tip };
}
