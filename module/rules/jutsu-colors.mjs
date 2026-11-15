/**
 * Jutsu pill colors (NPCUI1; King 2026-11-15): a light left-to-right gradient through the colors of
 * the jutsu's keywords, in the order the jutsu lists them. Pure.
 */
import { jutsuColors, jutsuPillPaper } from "../config/jutsu-colors.mjs";

const arr = v => (v instanceof Set ? [...v] : Array.isArray(v) ? v : []);

/**
 * The colored keywords of a jutsu, in order: its main discipline (Bukijutsu when it is a Bukijutsu
 * jutsu), its other listed disciplines, then its colored keywords (Bukijutsu, Releases) as listed.
 * @param {{discipline?: string, group?: string, disciplines?: Iterable, keywords?: Iterable}} system
 */
export function colorKeys(system = {}) {
  const keywords = arr(system.keywords);
  const buki = system.discipline === "buki" || system.group === "buki" || (system.discipline === "tai" && keywords.includes("bukijutsu"));
  const out = [];
  const add = k => { if ( jutsuColors[k] && !out.includes(k) ) out.push(k); };
  add(buki ? "buki" : system.discipline);
  for ( const d of arr(system.disciplines) ) add(d === "buki" ? "buki" : d);
  for ( const k of keywords ) add(k === "bukijutsu" ? "buki" : k);
  return out;
}

/** The CSS gradient for those keywords (one keyword fades into the paper color). */
export function pillGradient(keys) {
  const colors = keys.map(k => jutsuColors[k]?.color).filter(Boolean);
  if ( !colors.length ) return `linear-gradient(90deg, ${jutsuPillPaper}, ${jutsuPillPaper})`;
  if ( colors.length === 1 ) return `linear-gradient(90deg, ${colors[0]}, ${jutsuPillPaper})`;
  return `linear-gradient(90deg, ${colors.join(", ")})`;
}

/** The sheet group a jutsu sits in (King: Bukijutsu inside Taijutsu). */
export const sheetGroup = system => {
  const d = system?.discipline === "buki" ? "tai" : system?.discipline;
  return ["nin", "tai", "gen"].includes(d) ? d : "nin";
};
