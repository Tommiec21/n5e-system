/**
 * Reads a jutsu's or feature's rules text into activities, for items whose activities aren't
 * authored yet (all imported content today). Authored activities always win. Pure.
 *
 * Recognised phrasing (Jiraiya's Jutsu Compendium style):
 *   "Make a melee ninjutsu attack"             -> attack (discipline, melee|ranged)
 *   "must make a Dexterity saving throw"       -> save (ability; "half as much damage on a success" -> half)
 *   "2d10+2 Fire damage", "[Unarmed damage] + 2d6" -> damage parts (@unarmed = the actor's unarmed damage)
 *   "gain 12 Temporary Hit points"             -> temporary HP
 *   "regain 2d8 hit points"                    -> healing
 *   "repeat the saving throw at the end of each of its turns" -> save.resave (turn-end resave prompt)
 *
 * The parser is deliberately conservative: it only produces buttons for phrasing it is sure of, and
 * the full text is always on the card, so a missed phrase costs a manual roll, never a wrong one.
 * When the text is too unusual (choices, conditional riders), author the activities instead
 * (tools/content/automation.py for imported content, or the item sheet's activities for homebrew).
 * Improving the parser: add the phrasing here and a case to tests/casting.test.mjs, which runs the
 * parser over every imported jutsu.
 */
import { n5eConfig } from "./host.mjs";
import { unarmedSpec } from "./unarmed.mjs";
import { hasResave } from "./trackers.mjs";
import { abilities } from "../config/core.mjs";
import { damageTypes } from "../config/combat.mjs";
import { conditions as CONDITIONS, states as STATES } from "../config/conditions.mjs";

/**
 * Condition and state names as they appear in text -> {key, kind}. Built from the registries, so a
 * new condition is recognized in text automatically. "Compelled: Berserk" is matched as "berserk".
 */
function effectNames() {
  const out = {};
  for ( const [k, v] of Object.entries({ ...CONDITIONS, ...(n5eConfig().conditions ?? {}), ...(n5eConfig().clanConditions ?? {}) }) ) out[v.label.replace(/^Compelled:\s*/, "").toLowerCase()] = { key: k, kind: "condition" };
  for ( const [k, v] of Object.entries({ ...STATES, ...(n5eConfig().states ?? {}) }) ) if ( !v.derived && !v.relational ) out[v.label.toLowerCase()] = { key: k, kind: "state" };
  out.bleeding = out.bleed;
  return out;
}
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/**
 * Conditions and states a save's text inflicts, in order: "gain 1 rank of Concussed", "fall Prone",
 * "being Restrained", "gain the Burned condition". Ranks default to 1.
 */
export function parseInflicted(text) {
  const EFFECT_NAMES = effectNames();
  const names = Object.keys(EFFECT_NAMES).sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?:(\\d+|one|two|three|four|five) ranks? of )?(?:the )?\\b(${names.join("|")})\\b`, "gi");
  const out = [];
  for ( const m of String(text).matchAll(re) ) {
    const prefix = String(text).slice(0, m.index).split(/[.;!?]/).pop();
    // Prose about immunity/removal is not an instruction to apply a condition.
    if ( /\b(?:immun\w*|resistan\w*|without|not)\b/i.test(prefix)
      || /\b(?:remove[sd]?|ends?|loses?)\s+(?:the\s+)?$/i.test(prefix) ) continue;
    const def = EFFECT_NAMES[m[2].toLowerCase()];
    if ( !def || out.some(o => o.key === def.key) ) continue;
    const ranks = m[1] ? (Number(m[1]) || NUM[m[1].toLowerCase()] || 1) : 1;
    out.push({ ...def, ranks, label: m[2][0].toUpperCase() + m[2].slice(1) });
  }
  return out;
}

const strip = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const ABILITY_BY_NAME = Object.fromEntries(Object.entries(abilities).map(([k, v]) => [v.label.toLowerCase(), k]));
const DISC = { ninjutsu: "nin", taijutsu: "tai", genjutsu: "gen", bukijutsu: "tai" };
const damageTypePattern = () => Object.keys({ ...damageTypes, ...(n5eConfig().damageTypes ?? {}) }).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

/**
 * @param {string} html
 * @param {object} [o]
 * @param {string} [o.discipline]  item discipline, used when the text says "jutsu attack"
 * @returns {object[]} activities (shape of activityFields(), only the parts that apply)
 */
export function parseActivities(html, { discipline = "" } = {}) {
  const text = strip(html);
  const out = [];
  const outcomes = [...text.matchAll(/\b(?:on (?:a |an )?)?(critical success|critical failure|success|failure)(?:\s*[:.,\]]|\s+(?:it|the target|the creature))\s*/gi)];
  const tierKeys = { "critical success": "critSuccess", "critical failure": "critFailure", success: "success", failure: "failure" };
  const tiered = new Set(outcomes.map(m => tierKeys[m[1].toLowerCase()])).size > 1;
  const tiers = {};
  if ( tiered ) outcomes.forEach((m, i) => { tiers[tierKeys[m[1].toLowerCase()]] = text.slice(m.index, outcomes[i + 1]?.index ?? text.length).trim(); });
  // Alternative outcome paragraphs are not cumulative damage; preserve their instructions.
  const damageText = tiered ? text.slice(0, outcomes[0].index) : text;
  let id = 0;
  const next = () => `parsed${++id}`;

  // Attack.
  const atk = text.match(/make an? (?:(melee|ranged) )?(ninjutsu|taijutsu|genjutsu|bukijutsu|jutsu|weapon|unarmed) attack/i);
  // Damage: "XdY(+Z) type damage" and "[Unarmed damage] (+ XdY)".
  const parts = [];
  const unarmed = damageText.match(/\[unarmed damage\](?:\s*\+\s*(\d+d\d+(?:\s*[+-]\s*\d+)?))?/i);
  if ( unarmed ) parts.push({ formula: `@unarmed${unarmed[1] ? ` + ${unarmed[1].replace(/\s+/g, "")}` : ""}`, type: "bludgeoning" });
  for ( const m of damageText.matchAll(new RegExp(`(\\d+d\\d+(?:\\s*[+-]\\s*\\d+)?)\\s+(${damageTypePattern()})\\s+damage`, "gi")) ) {
    if ( unarmed && unarmed[1] && m[1].replace(/\s+/g, "") === unarmed[1].replace(/\s+/g, "") ) continue;
    parts.push({ formula: m[1].replace(/\s+/g, ""), type: m[2].toLowerCase() });
  }
  if ( atk ) {
    const d = DISC[atk[2].toLowerCase()] ?? (atk[2].toLowerCase() === "jutsu" ? discipline : "");
    out.push({ id: next(), type: "attack", label: "Attack",
      attack: { discipline: d === "buki" ? "tai" : d, range: (atk[1] ?? "melee").toLowerCase(), count: 1 },
      damage: { parts: [...parts] } });
  }
  // Save.
  const save = text.match(/(?:make|makes) an? (strength|dexterity|constitution|intelligence|wisdom|charisma) saving throw/i);
  if ( save ) {
    const half = /half as much damage on a success|half damage on a success/i.test(text);
    // What a failed save inflicts: read from the save sentence onward.
    const inflicts = tiered ? [] : parseInflicted(text.slice(save.index));
    out.push({ id: next(), type: "save", label: "Save", inflicts,
      save: { abilities: [ABILITY_BY_NAME[save[1].toLowerCase()]], dc: { source: "discipline" }, onSuccess: half ? "half" : "none",
        fourTier: discipline === "gen" || outcomes.some(m => m[1].toLowerCase().startsWith("critical")), tiers, resave: hasResave(text.slice(save.index)) },
      // Save-based damage when there's no attack roll to carry it.
      damage: { parts: atk ? [] : [...parts] } });
  }
  if ( !atk && !save && parts.length ) out.push({ id: next(), type: "damage", label: "Damage", damage: { parts } });
  // Temporary HP and healing.
  const temp = text.match(/gain \+?(\d+d\d+(?:\s*[+-]\s*\d+)?|\d+) temporary hit points/i);
  if ( temp ) out.push({ id: next(), type: "heal", label: "Temporary HP", heal: { formula: temp[1].replace(/\s+/g, ""), pool: "tempHp" } });
  const heal = text.match(/(?:regains?|restores?) (\d+d\d+(?:\s*[+-]\s*\d+)?) (hit points|chakra)/i);
  if ( heal ) out.push({ id: next(), type: "heal", label: "Healing", heal: { formula: heal[1].replace(/\s+/g, ""), pool: heal[2].toLowerCase().startsWith("chakra") ? "cp" : "hp" } });
  return out;
}

/**
 * The activities an item actually uses: authored ones, else read from its text.
 * Every caller (cards, cast dialog, cast options) goes through this, so authoring activities on an
 * item fully replaces the parsed ones for it.
 */
export function effectiveActivities(item, { rank } = {}) {
  const ranked = rank ? item.flags?.n5e?.jutsuBookImport?.activitiesByRank?.[rank] : null;
  const authored = [...(Array.isArray(ranked) ? ranked : item.system.activities ?? [])];
  if ( authored.length ) return authored.map(a => ({ ...a, authored: true }));
  return parseActivities(item.system.description, { discipline: item.system.discipline ?? "" });
}

/**
 * The actor's [Unarmed damage]: 1 (or the stance's d6) + Str mod (KB 03; Taijutsu stances set d6).
 * @param {object} actor
 */
export function unarmedFormula(actor) {
  return unarmedSpec(actor).formula;
}

/**
 * A critical hit's damage formula: every die doubled; the ability modifier doubled; other flat bonuses
 * once (King ruling: crits double dice and ability modifiers only).
 * @param {string} formula     e.g. "2d10+2" or "1d6 + 3"
 * @param {number} [abilityMod] the modifier that the formula adds (doubled when present)
 */
export function critFormula(formula, abilityMod = null) {
  let doubled = String(formula).replace(/(\d*)d(\d+)/g, (m, n, f) => `${(Number(n) || 1) * 2}d${f}`);
  if ( abilityMod ) doubled += ` ${abilityMod < 0 ? "-" : "+"} ${Math.abs(abilityMod)}`;
  return doubled;
}
