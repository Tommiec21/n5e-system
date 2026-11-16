/**
 * CHATUI1 (King 2026-11-16): font sizes and fonts for every N5e chat message, set globally.
 * Pure parts; the Foundry side is workflow/chat-appearance.mjs and the window is
 * applications/settings/chat-appearance.mjs.
 *
 *   Who controls it (King Q-F1: both)   the GM's world setting is everyone's default; a player can
 *                                       turn on their own copy for their client only.
 *   Fonts (King Q-F2)                   a heading font (titles, buttons, tags, tile and section
 *                                       headings, the speaker) and a body font (everything else).
 *   Which messages (King Q-F3)          every N5e chat message (tagged .n5e-msg when drawn).
 *
 *   CHAT_FIELDS          one size per field, in pixels (default, min, max)
 *   defaultAppearance    the factory settings
 *   cleanAppearance      a stored value made safe: numbers clamped, unknown keys dropped
 *   effectiveAppearance  the world's, or the player's own when they turned it on
 *   cssVariables         the CSS custom properties to set (sizes already scaled)
 */

export const CHAT_FIELDS = Object.freeze([
  { key: "body", label: "Body text", hint: "Ordinary text in a message.", default: 13 },
  { key: "speaker", label: "Speaker", hint: "Who sent it: the name at the top, and the caster beside the portrait.", default: 14 },
  { key: "title", label: "Card title", hint: "The jutsu, weapon, feature or roll name.", default: 14 },
  { key: "subtitle", label: "Type line", hint: "The line under the title (D-Rank Ninjutsu).", default: 12 },
  { key: "button", label: "Action buttons", hint: "Damage, Save, Place area and other main buttons.", default: 11 },
  { key: "small", label: "Small buttons", hint: "Critical, Clash, Read the Enemy, Identify.", default: 11 },
  { key: "tag", label: "Tags", hint: "Action, Instantaneous, Fire Release.", default: 11 },
  { key: "tileHead", label: "Result headings", hint: "DAMAGE, ATTACK, DEX SAVE above each result box.", default: 10 },
  { key: "total", label: "Result totals", hint: "The big number in a result box, and a plain roll's total.", default: 21, max: 48 },
  { key: "formula", label: "Formulas and save lines", hint: "4d6 + 4; Test ✓ 15; the dice behind a total.", default: 11 },
  { key: "section", label: "Section headings", hint: "TARGETS and APPLY.", default: 11 },
  { key: "target", label: "Targets", hint: "Each creature's line under Targets.", default: 13 },
  { key: "apply", label: "Apply panel", hint: "Names, amounts and the −1 to 2 buttons.", default: 13 },
  { key: "note", label: "Notes and rules text", hint: "Small notes, hints and the Rules text.", default: 12 }
].map(f => Object.freeze({ min: 8, max: 32, ...f })));

export const SCALE = Object.freeze({ min: 50, max: 200, default: 100 });

export function defaultAppearance() {
  return { scale: SCALE.default, fonts: { head: "", body: "" }, sizes: Object.fromEntries(CHAT_FIELDS.map(f => [f.key, f.default])) };
}

const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" && v !== null ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
// A font family name: letters, digits, spaces and a few marks only (it goes into CSS).
const cleanFont = v => String(v ?? "").replace(/[^\p{L}\p{N} _.'-]/gu, "").trim().slice(0, 60);

/** A stored value made safe: sizes clamped, unknown keys dropped, missing ones filled with defaults. */
export function cleanAppearance(value = {}) {
  const base = defaultAppearance();
  const v = value && typeof value === "object" ? value : {};
  return {
    scale: clamp(v.scale, SCALE.min, SCALE.max, base.scale),
    fonts: { head: cleanFont(v.fonts?.head), body: cleanFont(v.fonts?.body) },
    sizes: Object.fromEntries(CHAT_FIELDS.map(f => [f.key, clamp(v.sizes?.[f.key], f.min, f.max, f.default)]))
  };
}

/**
 * What this client shows.
 * @param {object} world  the GM's setting
 * @param {object} mine   this user's setting ({use: boolean, ...appearance})
 */
export function effectiveAppearance(world = {}, mine = {}) {
  return cleanAppearance(mine?.use ? mine : world);
}

const family = name => (name ? `"${name}", var(--font-primary, sans-serif)` : "");

/** CSS custom properties: --n5e-fs-<field> (px, scaled), --n5e-ff-head, --n5e-ff-body. */
export function cssVariables(appearance) {
  const a = cleanAppearance(appearance);
  const out = {};
  for ( const f of CHAT_FIELDS ) out[`--n5e-fs-${f.key}`] = `${Math.round(a.sizes[f.key] * a.scale) / 100}px`;
  out["--n5e-ff-head"] = family(a.fonts.head) || "inherit";
  out["--n5e-ff-body"] = family(a.fonts.body) || "inherit";
  return out;
}
