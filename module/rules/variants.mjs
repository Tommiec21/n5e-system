/**
 * PRESTD1 A-iv (King 2026-11-15): pure parts of the homebrew elements and the world clock.
 */

/** "Storm Release, Lava Release" -> {stormRelease: "Storm Release", lavaRelease: "Lava Release"}. */
export function parseHomebrew(text) {
  const out = {};
  for ( const raw of String(text ?? "").split(",") ) {
    const label = raw.trim().slice(0, 60);
    if ( !label ) continue;
    const words = label.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean);
    if ( !words.length ) continue;
    const key = words[0] + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join("");
    out[key] = label;
  }
  return out;
}

/** Add homebrew entries to a config list without replacing what's there. */
export function mergeHomebrew(list, entries, shape = label => label) {
  const added = [];
  for ( const [key, label] of Object.entries(entries) ) {
    if ( key in list ) continue;
    list[key] = shape(label);
    added.push(key);
  }
  return added;
}

/** World time (seconds) as day, hour and minute ("Day 3, 14:05"); day 1 starts at 0. */
export function worldTimeParts(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const day = Math.floor(s / 86400) + 1;
  const hour = Math.floor((s % 86400) / 3600);
  const minute = Math.floor((s % 3600) / 60);
  return { day, hour, minute, label: `Day ${day}, ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

/** The World Clock's advance buttons, in seconds. */
export const CLOCK_STEPS = Object.freeze([
  { label: "+1 round", seconds: 6 }, { label: "+1 min", seconds: 60 }, { label: "+10 min", seconds: 600 },
  { label: "+1 hr", seconds: 3600 }, { label: "+8 hr", seconds: 28800 }, { label: "+1 day", seconds: 86400 }
]);

/** Which table a natural roll draws from: crit on a natural 20, fumble on a natural 1 (attacks). */
export function tableFor({ kind, natural } = {}, { crit = "", fumble = "" } = {}) {
  if ( kind !== "attack" ) return null;
  if ( natural === 20 && crit ) return { which: "crit", name: crit };
  if ( natural === 1 && fumble ) return { which: "fumble", name: fumble };
  return null;
}
