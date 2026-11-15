/**
 * The Adversary Builder's logic (pure; NPC2). The window holds a draft; these functions read an
 * actor into a draft, check it, and turn it into the update and items to create or delete.
 *
 * Draft: {name, img, concept, blurb, blurbFollowsConcept, class, level, role, iconic, epic, rank,
 *   rankBonus, clan, affiliation, partyLevel, armor, hpSource, partySize, mods, fullSaves,
 *   freeformAbility, overrides, hpMax, cpMax,
 *   traits: [{id?, name, rank, text}], jutsu: [{id?, uuid?, name, rank, discipline}], weapons: [{id?, uuid?, name}],
 *   freeform: [{id?, kind: strike|jutsu, name, choices, dirty?}]}  (NPC3: built from choices by rules/freeform.mjs)
 * An entry with an `id` is an item already on the NPC; one with only a `uuid` comes from a compendium.
 */
import { ABILITY_KEYS, statLine, suggestedCounts, adversaryWarnings } from "./adversary.mjs";
import { suggestedJutsuRanks } from "../config/adversary.mjs";

const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
const clampLevel = l => Math.min(30, Math.max(1, Math.floor(Number(l) || 1)));

/** A blank draft for a new adversary. */
export function blankDraft() {
  return { name: "New Adversary", img: "icons/svg/mystery-man.svg", concept: "", blurb: "", blurbFollowsConcept: true,
    class: "standard", level: 1, role: "none", iconic: false, epic: false, rank: "D", rankBonus: false, clan: "", affiliation: "",
    partyLevel: null, armor: "light", hpSource: "formula", partySize: 4, mods: Object.fromEntries(ABILITY_KEYS.map((k, i) => [k, statLine(1, "standard").line[i]])),
    fullSaves: [], freeformAbility: "str", overrides: null, hpMax: null, cpMax: null, traits: [], jutsu: [], weapons: [], freeform: [] };
}

/** Read an NPC into a draft (its source data and items). */
export function draftFromActor(actor) {
  const src = actor._source?.system ?? actor.system;
  const d = src.details ?? {};
  const a = src.adversary ?? {};
  const items = [...(actor.items ?? [])];
  return {
    ...blankDraft(), name: actor.name, img: actor.img, concept: d.concept ?? "", blurb: d.blurb ?? "",
    blurbFollowsConcept: !d.blurb || d.blurb === d.concept,
    class: d.class ?? "standard", level: d.level ?? 1, role: d.role ?? "none", iconic: !!d.iconic, epic: !!d.epic, rank: d.rank ?? "D",
    rankBonus: !!a.rankBonus, clan: d.clan ?? "", affiliation: d.affiliation ?? "", armor: a.armor ?? "light", hpSource: a.hpSource ?? "formula",
    partySize: a.partySize ?? 4, mods: { ...blankDraft().mods, ...clone(a.mods ?? {}) }, fullSaves: [...(a.fullSaves ?? [])],
    freeformAbility: a.freeformAbility ?? "str", overrides: clone(a.overrides ?? null), hpMax: src.hpMax ?? null, cpMax: src.cpMax ?? null,
    traits: items.filter(i => i.type === "feat" && i.system?.category === "npcTraits")
      .map(i => ({ id: i.id, name: i.name, rank: i.flags?.n5e?.adversaryTrait?.rank ?? "", text: i.system.description ?? "" })),
    jutsu: items.filter(i => i.type === "jutsu" && !i.flags?.n5e?.freeform).map(i => ({ id: i.id, name: i.name, rank: i.system.rank, discipline: i.system.discipline })),
    weapons: items.filter(i => i.type === "weapon" && i.system?.identifier !== "unarmedStrike").map(i => ({ id: i.id, name: i.name })),
    freeform: items.filter(i => i.flags?.n5e?.freeform?.choices).map(i => ({ id: i.id, kind: i.flags.n5e.freeform.kind, name: i.name,
      choices: clone(i.flags.n5e.freeform.choices) }))
  };
}

/** The six baseline values given to abilities in an order (highest value to the first ability). */
export function assignLine(line, order = ABILITY_KEYS) {
  return Object.fromEntries(ABILITY_KEYS.map(k => [k, line[order.indexOf(k)] ?? 0]));
}

/**
 * "Update to the new baseline" (King Q-N30): keep which ability is highest, second and so on, and
 * give them the new line's values in that order.
 */
export function rebaseMods(mods, level, klass) {
  const order = [...ABILITY_KEYS].sort((x, y) => (mods[y] ?? 0) - (mods[x] ?? 0) || ABILITY_KEYS.indexOf(x) - ABILITY_KEYS.indexOf(y));
  return assignLine(statLine(level, klass).line, order);
}

/** The jutsu ranks the book suggests for an adversary of this rank. */
export const suggestedRanksFor = rank => suggestedJutsuRanks[rank] ?? suggestedJutsuRanks.D;

/** The profile the adversary math reads, from a draft. */
export const draftProfile = d => ({ level: clampLevel(d.level), class: d.class, role: d.role, rank: d.rank, iconic: d.iconic, epic: d.epic,
  armor: d.armor, mods: d.mods, fullSaves: d.fullSaves, hpSource: d.hpSource, rankBonus: d.rankBonus, players: d.partySize });

/** Notes per step (the warning badges). Nothing here blocks Create. */
export function stepNotes(d) {
  const p = draftProfile(d);
  const counts = suggestedCounts(p);
  const notes = { concept: [], class: [], level: [], role: [], rank: [], clan: [], attacks: [], generic: [], finalize: [] };
  if ( !String(d.concept ?? "").trim() ) notes.concept.push("No concept yet: the book starts here.");
  for ( const w of adversaryWarnings(p) ) (w.startsWith("Ability") || w.includes("fully proficient") ? notes.finalize : notes.class).push(w);
  if ( d.partyLevel != null && d.partyLevel !== "" && Math.abs(clampLevel(d.level) - Number(d.partyLevel)) > 3 ) {
    notes.level.push(`More than 3 levels from the party (${d.partyLevel}): the players will be clearly outmatched or overwhelming.`);
  }
  if ( d.traits.length > counts.traits ) notes.role.push(`${d.traits.length} traits; the book suggests ${counts.traits}.`);
  const freeformJutsu = (d.freeform ?? []).filter(f => f.kind === "jutsu").length;
  const jutsuCount = d.jutsu.length + freeformJutsu;
  if ( jutsuCount > counts.jutsu ) notes.attacks.push(`${jutsuCount} jutsu${freeformJutsu ? ` (${freeformJutsu} Freeform)` : ""}; the limit at this level is ${counts.jutsu}.`);
  if ( (d.freeform ?? []).length > (counts.freeformSlots ?? 0) ) notes.attacks.push(`${d.freeform.length} Freeform Strikes and Jutsu; the book suggests ${counts.freeformSlots ?? 0} Freeform slots.`);
  const ranks = suggestedRanksFor(d.rank);
  const outside = d.jutsu.filter(j => j.rank && !ranks.includes(j.rank));
  if ( outside.length ) notes.attacks.push(`Outside the suggested ranks (${ranks.join(", ")}): ${outside.map(j => j.name).join(", ")}.`);
  return notes;
}

/**
 * What saving a draft does: the actor update, the items to create (from compendium uuids, or typed
 * traits), and the ids of items removed in the builder.
 */
export function draftToUpdate(d, actor = null) {
  const blurb = d.blurbFollowsConcept ? d.concept : d.blurb;
  const update = {
    name: d.name, img: d.img,
    "system.details.build": "adversary", "system.details.concept": d.concept ?? "", "system.details.blurb": blurb ?? "",
    "system.details.class": d.class, "system.details.level": clampLevel(d.level), "system.details.role": d.role,
    "system.details.iconic": !!d.iconic, "system.details.epic": !!d.epic, "system.details.rank": d.rank,
    "system.details.clan": d.clan ?? "", "system.details.affiliation": d.affiliation ?? "",
    "system.adversary.mods": { ...d.mods }, "system.adversary.fullSaves": [...d.fullSaves], "system.adversary.armor": d.armor,
    "system.adversary.hpSource": d.hpSource, "system.adversary.partySize": Number(d.partySize) || 0, "system.adversary.rankBonus": !!d.rankBonus,
    "system.adversary.freeformAbility": d.freeformAbility, "system.hpMax": d.hpMax ?? null, "system.cpMax": d.cpMax ?? null
  };
  if ( d.overrides ) update["system.adversary.overrides"] = clone(d.overrides);
  const fromUuid = [...d.jutsu, ...d.weapons].filter(e => !e.id && e.uuid).map(e => e.uuid);
  const typed = d.traits.filter(t => !t.id).map(t => ({ name: t.name || "Trait", type: "feat",
    system: { category: "npcTraits", description: t.text ? `<p>${t.text}</p>` : "" }, flags: { n5e: { adversaryTrait: { rank: t.rank ?? "" } } } }));
  const traitEdits = d.traits.filter(t => t.id).map(t => ({ _id: t.id, name: t.name, "flags.n5e.adversaryTrait.rank": t.rank ?? "" }));
  const ff = d.freeform ?? [];
  const kept = new Set([...d.traits, ...d.jutsu, ...d.weapons, ...ff].filter(e => e.id).map(e => e.id));
  const removed = [...(actor?.items ?? [])].filter(i => (i.type === "jutsu" || (i.type === "weapon" && i.system?.identifier !== "unarmedStrike")
    || (i.type === "feat" && i.system?.category === "npcTraits") || i.flags?.n5e?.freeform) && !kept.has(i.id)).map(i => i.id);
  // Freeform items are built after the save, from the saved adversary (its level, class and save DCs).
  const freeform = { create: ff.filter(f => !f.id).map(f => ({ kind: f.kind, choices: clone(f.choices) })),
    edit: ff.filter(f => f.id && f.dirty).map(f => ({ id: f.id, kind: f.kind, choices: clone(f.choices) })) };
  return { update, fromUuid, typed, traitEdits, removed, freeform };
}
