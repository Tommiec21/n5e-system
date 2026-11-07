/**
 * Shared view-model helpers: signed numbers, breakdown tooltips, action glyphs, rule chips.
 * Pure functions (no Foundry), so they run in Node tests.
 */
import { signed } from "../rules/breakdown.mjs";
import { keywords, components, featureTags } from "../config/jutsu.mjs";
import { weaponProperties, armorProperties } from "../config/equipment.mjs";
import { conditions } from "../config/conditions.mjs";
import { activationTypes } from "../config/combat.mjs";

export { signed };

/** Minimal HTML escaping for text placed inside tooltip HTML. */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/**
 * Tooltip HTML for a Breakdown (PF2e-style): title, each part, total.
 * @param {{label: string, total: number, parts: Array<{label: string, value: number, base?: boolean}>}|null} bd
 * @param {object} [options]
 * @param {boolean} [options.signedTotal=true]  "+8" for bonuses, "17" for AC/DC style numbers
 */
export function breakdownTooltip(bd, { signedTotal = true } = {}) {
  if ( !bd ) return "";
  const json = typeof bd.toJSON === "function" ? bd.toJSON() : bd;
  const rows = json.parts.map(p => {
    const v = p.base ? String(p.value) : signed(p.value);
    const cls = p.value < 0 ? " class=\"neg\"" : "";
    return `<li${cls}><span>${esc(p.label)}</span><b>${v}</b></li>`;
  }).join("");
  const total = signedTotal ? signed(json.total) : String(json.total);
  return `<div class="n5e-breakdown"><h4>${esc(json.label)}</h4><ul>${rows}</ul>`
    + `<div class="total"><span>Total</span><b>${total}</b></div></div>`;
}

/* -------------------------------------------- */
/*  Action glyphs (PF2e-style, N5e set)          */
/* -------------------------------------------- */

const SVG = (w, body) => `<svg class="n5e-glyph" width="${w}" height="16" viewBox="0 0 ${w} 16" aria-hidden="true">${body}</svg>`;
const GLYPH_SVG = {
  action: SVG(16, "<path d=\"M8 1L15 8L8 15L1 8Z\" fill=\"currentColor\"/>"),
  bonus: SVG(16, "<path d=\"M8 1.5L14.5 8L8 14.5L1.5 8Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/>"
    + "<path d=\"M8 5L11 8L8 11L5 8Z\" fill=\"currentColor\"/>"),
  reaction: SVG(16, "<path d=\"M12.6 5.2A5.2 5.2 0 1 0 13.2 9.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>"
    + "<path d=\"M13.6 2.2L13.1 5.9L9.4 5.4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"),
  fullTurn: SVG(20, "<path d=\"M5.5 1L10.5 8L5.5 15L0.5 8Z\" fill=\"currentColor\"/><path d=\"M14.5 1L19.5 8L14.5 15L9.5 8Z\" fill=\"currentColor\"/>"),
  free: SVG(16, "<path d=\"M8 1.5L14.5 8L8 14.5L1.5 8Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/>"),
  long: SVG(16, "<circle cx=\"8\" cy=\"8\" r=\"6.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/>"
    + "<path d=\"M8 4.5V8L10.5 9.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/>")
};

/**
 * Glyph for an activation: {key, svg, label}. Unknown or passive -> null.
 * @param {{type: string, value?: number, unit?: string}|string} activation
 */
export function glyph(activation) {
  const type = typeof activation === "string" ? activation : activation?.type;
  if ( !type || type === "none" ) return null;
  const key = { special: "free", minute: "long", hour: "long" }[type] ?? type;
  const svg = GLYPH_SVG[key];
  if ( !svg ) return null;
  let label = activationTypes[type] ?? type;
  if ( type === "long" && activation?.value ) label = `${activation.value} ${activation.unit || ""}`.trim();
  return { key, svg, label };
}

/* -------------------------------------------- */
/*  Chips with rule tooltips                     */
/* -------------------------------------------- */

const SCOPE_LABEL = { universal: "Keyword", limited: "Limited keyword", unique: "Unique keyword" };

/** A keyword chip. */
export function keywordChip(key, registry = keywords) {
  const def = registry[key] ?? featureTags[key];
  const label = def?.label ?? key;
  const lines = [SCOPE_LABEL[def?.scope] ?? "Tag"];
  if ( def?.requires === "affinity" ) lines.push(`Requires the ${def.affinity} affinity to learn`);
  if ( def?.requires === "master" ) lines.push("Learned only from a master in downtime");
  if ( def?.requires === "clan" ) lines.push("Clan jutsu");
  if ( def?.concentrationOnly ) lines.push("Concentration jutsu only");
  if ( def?.reactionOnly ) lines.push("Reaction jutsu only");
  if ( def?.removed ) lines.push("Removed in 4.0");
  const tone = ["finisher", "combo", "chain", "clash", "hijutsu", "kinjutsu"].includes(key) ? "accent" : "";
  return { key, label, tone, tooltip: `<b>${esc(label)}</b><br>${lines.map(esc).join("<br>")}` };
}

/** Component chips for a jutsu's components block. */
export function componentChips(comp = {}) {
  const out = [];
  for ( const k of ["hs", "cm", "cs", "m"] ) {
    if ( comp[k] ) out.push({ key: k, label: components[k].abbr, tone: "",
      tooltip: `<b>${esc(components[k].label)}</b><br>Component` });
  }
  if ( comp.weapon?.required ) {
    const groups = [...(comp.weapon.groups ?? [])].join(", ");
    out.push({ key: "w", label: "W", tone: "", tooltip: `<b>Weapons</b><br>${esc(comp.weapon.text || groups || "Any weapon")}` });
  }
  if ( comp.tool?.required ) {
    out.push({ key: "nt", label: "NT", tone: "", tooltip: `<b>Ninja Tools</b><br>${esc(comp.tool.text || comp.tool.item || "Spends one charge")}` });
  }
  return out;
}

/** Weapon/armor property chips: {thrown: 1, deadly: 2} -> "Thrown", "Deadly 2". */
export function propertyChips(props = {}, kind = "weapon") {
  const reg = kind === "armor" ? armorProperties : weaponProperties;
  return Object.entries(props).filter(([, v]) => v).map(([k, v]) => {
    const def = reg[k];
    const label = def?.ranked ? `${def.label} ${v}` : (def?.label ?? k);
    return { key: k, label, tone: "", tooltip: `<b>${esc(label)}</b><br>${kind === "armor" ? "Armor" : "Weapon"} property` };
  });
}

/** Rule summary of a condition for tooltips and the rail. */
export function conditionSummary(key, ranks = 1, registry = conditions) {
  const def = registry[key];
  if ( !def ) return "";
  const r = def.maxRanks == null ? 1 : ranks;
  const bits = [];
  const names = { allDice: "all dice rolls", ac: "AC", saveDC: "save DCs", d20Physical: "Str/Dex/Con d20 rolls",
    d20Mental: "Int/Wis/Cha d20 rolls", checksAndAttacks: "checks and attacks", damageTaken: "damage taken",
    damageDealt: "damage dealt", perception: "Perception" };
  for ( const [k, v] of Object.entries(def.perRank ?? {}) ) {
    if ( typeof v === "object" ) {
      for ( const [d, n] of Object.entries(v) ) bits.push(`${d === "nin" ? "Ninjutsu" : d === "gen" ? "Genjutsu" : d} base cost +${n * r}`);
    } else bits.push(`${signed(v * r)} ${names[k] ?? k}`);
  }
  for ( const [k, v] of Object.entries(def.flat ?? {}) ) bits.push(`${signed(v)} ${names[k] ?? k}`);
  if ( def.turnStartDamage ) bits.push(`${def.turnStartDamage.perRank ? `${r}${def.turnStartDamage.die.slice(1)}` : def.turnStartDamage.die} ${def.turnStartDamage.type} at the start of your turn`);
  if ( def.moveDamage ) bits.push(`${r}${def.moveDamage.die.slice(1)} ${def.moveDamage.type} when you move`);
  if ( def.drBySourceRank ) bits.push("DR reduced by the inflicting jutsu's rank");
  if ( def.endsAt === "nextTurnEnd" ) bits.push("ends at the end of your next turn");
  if ( def.decay?.when === "turnEnd" ) bits.push(`loses ${def.decay.amount} rank at the end of your turn`);
  if ( def.persists ) bits.push("persists");
  if ( def.text ) bits.push(def.text);
  return bits.join(" · ");
}

/** Pip array for rank displays: [{filled: true}, ...]. Caps long tracks (Exhaustion 11) at `max`. */
export function pips(value, max) {
  const n = Math.max(0, Number(max) || 0);
  return Array.from({ length: n }, (_, i) => ({ filled: i < value, n: i + 1 }));
}
