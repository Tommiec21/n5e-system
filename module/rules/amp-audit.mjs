/**
 * The Amp audit (AMP1b; docs/AMP1_SPEC.md §8), pure. It suggests which features, jutsu and stances are
 * Amps; it decides nothing. King's definition: an Amp is a bonus to a statistic, a unique ability or an
 * action that lasts longer than one round; a bonus that happens once on use is not an Amp.
 *
 * Statuses (one per document; null: not an Amp and not a candidate):
 *   typed      an Amp card with a type (Battle, Reflex, Fortitude, Will, Clan)
 *   untyped    an Amp card with no type ("Amp: no type", King Q-A4: King's queue to assign)
 *   linked     an item whose button already starts an Amp (an activity naming a card, or an ampType)
 *   candidate  its text gives a lasting bonus, names an Amp type, or it is a stance
 *   dismissed  a candidate the GM marked "not an Amp"
 */
import { effectiveAmpType, ampTypeLabel, AMP_TYPES } from "./amp-cards.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const plain = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

export const AMP_AUDIT_STATUSES = {
  typed: "Amp card", untyped: "Amp: no type", linked: "Starts an Amp", candidate: "Candidate", dismissed: "Not an Amp"
};

/** "Battle Amp", "a Will Amp": the type a text names, or "". */
export function namedAmpType(text) {
  const m = String(text ?? "").match(/\b(battle|reflex|fortitude|will|clan)\s+amp\b/i);
  return m ? m[1].toLowerCase() : "";
}

// Lasts longer than one round: minutes, hours, days, several rounds, concentration, a rest, the fight.
const LASTING = /\b(?:for|lasts?|up to|during)\s+(?:the next\s+)?(?:1|one|ten|\d+)\s+(?:minutes?|hours?|days?|rounds)\b|\buntil (?:you (?:finish|take|complete) a (?:short|long|full) rest|the end of (?:the )?(?:combat|encounter|fight))\b|\bconcentration\b/i;
// Gives the creature (or allies) something: a bonus, advantage, resistance, speed, temporary HP...
const BUFF = /\b(?:you|your|yourself|an ally|allies|ally|each friendly|friendly creatures?|creatures? of your choice)\b[^.]{0,100}?\b(?:gains? (?:a |an )?(?:\+\s?\d+|bonus|advantage|resistance|immunity|temporary hit points|\d+ (?:feet|ft)|extra|additional)|ha(?:ve|s) advantage on|bonus (?:to|on)\b|\+\s?\d+ (?:bonus )?to|(?:speed|AC|armor class|damage reduction|DR) (?:increases|is increased)|increase your (?:speed|AC|armor class|damage reduction|DR)|resistance to|immun(?:e|ity) to|temporary hit points|reduce the (?:chakra )?cost|doubles?)/i;
// Upcasting lines ("when you cast this jutsu above B-Rank, increase…") are not lasting bonuses.
const UPCAST = /[^.]*\b(?:cast (?:this|it)(?: jutsu)? (?:above|at) [A-S][- ]?rank|at higher ranks)[^.]*\./gi;

/** Does an item's own duration last longer than one round? */
function lastingDuration(sys) {
  const d = sys?.duration ?? {};
  if ( d.concentration ) return true;
  if ( ["minute", "hour", "day", "week", "month", "year", "permanent"].includes(d.unit) ) return true;
  return d.unit === "round" && Number(d.value) > 1;
}

/** Does an item's button already start an Amp? */
function startsAmp(sys) {
  return list(sys?.activities).some(a => a?.effect?.amp || a?.effect?.ampType);
}

/**
 * The audit row for one document.
 * @param {{uuid?, name, type, system, flags?}} doc
 * @param {{dismissed?: Set<string>}} [o]
 * @returns {{status: string, label: string, ampType: string, typeLabel: string, namedType: string, reason: string}|null}
 */
export function ampAuditOf(doc, { dismissed = new Set() } = {}) {
  const sys = doc?.system ?? {};
  const row = (status, extra = {}) => ({ status, label: AMP_AUDIT_STATUSES[status], ampType: "", typeLabel: "", namedType: "", reason: "", ...extra });
  if ( doc?.type === "amp" ) {
    const type = effectiveAmpType(sys);
    return row(type ? "typed" : "untyped", { ampType: type, typeLabel: ampTypeLabel(type), namedType: sys.namedType ?? "", reason: sys.summary ?? "" });
  }
  // Whole classes, clans, backgrounds and conditions aren't Amps; their features are scanned one by one.
  if ( ["class", "subclass", "clan", "background", "condition"].includes(doc?.type) ) return null;
  const text = plain(sys.description).replace(UPCAST, " ");
  const named = namedAmpType(text);
  let reason = "";
  if ( startsAmp(sys) ) {
    const a = list(sys.activities).find(x => x?.effect?.amp || x?.effect?.ampType)?.effect ?? {};
    return row("linked", { ampType: a.ampType ?? "", typeLabel: a.amp ? `card: ${a.amp}` : ampTypeLabel(a.ampType ?? ""), namedType: named, reason: "Its button starts an Amp." });
  }
  if ( doc?.type === "stance" ) reason = "A stance (King Q-A4: stances become Amps with no type).";
  else if ( named ) reason = `Its text names a ${ampTypeLabel(named)} Amp.`;
  else if ( (lastingDuration(sys) || LASTING.test(text)) && BUFF.test(text) ) {
    const m = text.match(BUFF);
    reason = `Lasting bonus: "…${m[0].slice(0, 90)}…"`;
  }
  if ( !reason ) return null;
  const key = doc.uuid ?? doc._id ?? doc.name;
  return row(dismissed.has(key) ? "dismissed" : "candidate", { namedType: named, typeLabel: named ? ampTypeLabel(named) : "", reason });
}

/** Counts by status for a list of audit rows. */
export function ampAuditCounts(rows) {
  const out = Object.fromEntries(Object.keys(AMP_AUDIT_STATUSES).map(k => [k, 0]));
  for ( const r of rows ) if ( r?.status ) out[r.status]++;
  return out;
}

/** The type choices for a card's row ("" first: no type). */
export const AMP_TYPE_CHOICES = { "": "No type", ...Object.fromEntries(AMP_TYPES.map(t => [t, ampTypeLabel(t)])) };
