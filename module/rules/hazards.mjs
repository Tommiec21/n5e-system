/**
 * Hazards and vehicles (PRESTD1 Part D-ii; King Q-PF4: PF2e emulation, Q-P8: their own actor types).
 * Pure helpers: the chat shortcuts their cards post (enricher text, see rules/enrichers.mjs) and the
 * crew and passenger seats. Both actors are NPC-shaped otherwise, so they roll, save and take damage
 * like any creature; hardness is added to their Damage Reduction.
 */
import { skills, toolkits, abilities } from "../config/core.mjs";

/** Actor types built on the NPC data model (hazards and vehicles act like NPCs for privacy, defeat and damage). */
export const NPC_TYPES = ["npc", "hazard", "vehicle"];
export const isNpcLike = type => NPC_TYPES.includes(type);

export const HAZARD_KINDS = { simple: "Simple (acts once when triggered)", complex: "Complex (acts each round once triggered)" };

const clean = s => String(s ?? "").replace(/[{}[\]]/g, "").trim();

/** A check shortcut for a skill key, "tool:<kit>" or an ability key. */
export function checkShortcut(what, dc, label) {
  const key = String(what ?? "").trim();
  const n = Math.max(0, Math.floor(Number(dc) || 0));
  let target;
  if ( key.startsWith("tool:") && toolkits[key.slice(5)] ) target = `tool=${key.slice(5)}`;
  else if ( skills[key] || abilities[key] ) target = key;
  else return "";
  return `[[/check ${target}${n ? ` dc=${n}` : ""}]]{${clean(label)}}`;
}

export function saveShortcut(ability, dc, label) {
  if ( !abilities[ability] ) return "";
  const n = Math.max(0, Math.floor(Number(dc) || 0));
  return `[[/save ${ability}${n ? ` dc=${n}` : ""}]]{${clean(label)}}`;
}

export const damageShortcut = formula => {
  const f = String(formula ?? "").replace(/[[\]{}]/g, "").trim();
  return f ? `[[/damage ${f}]]` : "";
};

/** The options for a "check with" select: skills, toolkits and abilities. */
export function checkChoices() {
  return [
    ...Object.entries(skills).map(([k, v]) => [k, v.label]),
    ...Object.entries(toolkits).map(([k, v]) => [`tool:${k}`, v.label]),
    ...Object.entries(abilities).map(([k, v]) => [k, `${v.label} check`])
  ];
}

/** Lines for the hazard's card for this moment: notice, disable or trigger. */
export function hazardLines(name, h, moment) {
  if ( moment === "notice" ) return [`Notice ${clean(name)}: ${checkShortcut("prc", h.stealthDC, `Perception DC ${h.stealthDC}`)}`];
  if ( moment === "disable" ) return [`Disable ${clean(name)}: ${checkShortcut(h.disable?.skill, h.disable?.dc, `DC ${h.disable?.dc ?? 0}`)}`, h.disable?.note ?? ""].filter(Boolean);
  return [`${clean(name)} is triggered${h.kind === "complex" ? " and acts each round (add it to the combat)" : ""}.`];
}

/** Can one more join this list of seats? A capacity of 0 means no limit. */
export const hasSeat = (list = [], capacity = 0) => !capacity || list.length < capacity;

/** Add an actor to the crew or the passengers (never both, never twice). */
export function board(vehicle, uuid, as) {
  const crew = (vehicle.crew ?? []).filter(u => u !== uuid);
  const passengers = (vehicle.passengers ?? []).filter(u => u !== uuid);
  const list = as === "crew" ? crew : passengers;
  if ( !hasSeat(list, as === "crew" ? vehicle.capacity?.crew : vehicle.capacity?.passengers) ) throw new Error(`No ${as === "crew" ? "crew" : "passenger"} seat is free.`);
  list.push(uuid);
  return { crew, passengers };
}

export function leave(vehicle, uuid) {
  return { crew: (vehicle.crew ?? []).filter(u => u !== uuid), passengers: (vehicle.passengers ?? []).filter(u => u !== uuid) };
}

/** The vehicle's card lines: piloting or a collision. */
export function vehicleLines(name, v, moment) {
  if ( moment === "pilot" ) return [`Pilot ${clean(name)}: ${checkShortcut(v.pilot?.skill, v.pilot?.dc, `DC ${v.pilot?.dc ?? 0}`)}`];
  return [`${clean(name)} collides: ${damageShortcut(v.collision?.damage)} ${saveShortcut(v.collision?.save, v.collision?.dc, `${abilities[v.collision?.save]?.label ?? ""} save DC ${v.collision?.dc ?? 0} for half`)}`.trim()];
}
