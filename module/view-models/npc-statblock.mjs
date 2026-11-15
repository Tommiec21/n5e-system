/**
 * NPC sheet view models (NPCUI1; King 2026-11-15, design canvas "N5e NPC Sheet Redesign"):
 *   npcSheetHeaderVM  identity line, HP and CP trackers, conditions
 *   npcStatBlockVM    the Stat Block tab: the core panel (six statistics | six abilities with MOD and
 *                     SAVE), the stat-block lines, strikes, jutsu pills by discipline then rank (E→S)
 *                     with keyword gradients and action symbols, features and reactions
 *   npcPlayerVM       what a player who doesn't own the NPC sees
 * Pure apart from reading prepared actor data.
 */
import { ranks, rankOrder } from "../config/core.mjs";
import { npcTemplates, sizes } from "../config/combat.mjs";
import { adversaryClasses, adversaryRoles } from "../config/adversary.mjs";
import { jutsuColors } from "../config/jutsu-colors.mjs";
import { colorKeys, pillGradient, sheetGroup } from "../rules/jutsu-colors.mjs";
import { statBlockVM, attackLine, learnedVM } from "./npc.mjs";
import { railVM } from "./character.mjs";
import { jutsuPill } from "./combat.mjs";
import { glyph } from "./common.mjs";

const list = items => (Array.isArray(items) ? items : [...(items ?? [])]);
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const GROUPS = [["nin", "Ninjutsu"], ["tai", "Taijutsu"], ["gen", "Genjutsu"]];

/** Header: identity and the live trackers (no numbers the body repeats). */
export function npcSheetHeaderVM(actor, conditionRegistry) {
  const sys = actor.system;
  const d = sys.details;
  const adv = sys.isAdversary;
  const rail = railVM(actor, conditionRegistry);
  const role = adv && d.role && d.role !== "none" ? adversaryRoles[d.role] : "";
  return {
    name: actor.name, img: actor.img,
    summary: [`Level ${sys.level}`, ranks[d.rank]?.label ?? (d.rank ? `${d.rank}-Rank` : ""),
      [adv ? adversaryClasses[d.class] : "", role].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    blurb: [d.blurb, d.template && d.template !== "none" ? npcTemplates[d.template] : "", sizes[sys.traits?.size]?.label ?? cap(sys.traits?.size),
      d.clan].filter(Boolean).join(" · "),
    hp: rail.hp, cp: rail.cp, noChakra: adv && !sys.cp.max, conditions: rail.conditions
  };
}

/** One jutsu pill: the Combat tab's pill (glyph, cost, tooltip) plus its keyword gradient. */
function npcJutsuPill(actor, item) {
  const p = jutsuPill(actor, item);
  const keys = colorKeys(item.system);
  return { ...p, gradient: pillGradient(keys), colorKeys: keys,
    style: `background: ${pillGradient(keys)}` };
}

/**
 * Jutsu by sheet group (Ninjutsu, Taijutsu with Bukijutsu, Genjutsu), then rank E→S, then name.
 * Empty groups are dropped; `hidden` is the user's own toggle per group.
 */
export function npcJutsuGroups(actor, { hidden = [] } = {}) {
  const jutsu = list(actor.items).filter(i => i.type === "jutsu" && !i.flags?.n5e?.scrollCopy && !i.flags?.n5e?.wandCopy);
  const sys = actor.system;
  return GROUPS.map(([key, label]) => {
    const mine = jutsu.filter(j => sheetGroup(j.system) === key);
    const d = sys.disciplines?.[key];
    const ranksIn = rankOrder.map(rank => ({ rank, label: `${rank}-Rank`,
      pills: mine.filter(j => j.system.rank === rank).sort((a, b) => a.name.localeCompare(b.name)).map(j => npcJutsuPill(actor, j)) }))
      .filter(r => r.pills.length);
    const isHidden = hidden.includes(key);
    return { key, label, color: jutsuColors[key].color, count: mine.length,
      numbers: d ? `${d.attack >= 0 ? "+" : ""}${d.attack} to hit · DC ${d.dc}${key === "tai" && mine.some(j => colorKeys(j.system).includes("buki")) ? " (also Bukijutsu)" : ""}` : "",
      ranks: ranksIn, hidden: isHidden, shown: !isHidden };
  }).filter(g => g.count);
}

/** The color key: action symbols first, then the keyword colors. */
export function jutsuLegendVM() {
  return {
    actions: [["action", "Action"], ["bonus", "Bonus Action"], ["reaction", "Reaction"], ["fullTurn", "Full Turn"], ["minute", "Minutes or longer"]]
      .map(([type, label]) => ({ label, svg: glyph({ type })?.svg ?? "" })),
    colors: Object.values(jutsuColors).map(c => ({ label: c.label, color: c.color }))
  };
}

/** The Stat Block tab. view = the user's toggles {legend, hidden}. */
export function npcStatBlockVM(actor, view = {}) {
  const block = statBlockVM(actor);
  const items = list(actor.items);
  const byName = (a, b) => a.name.localeCompare(b.name);
  const strikes = items.filter(i => i.type === "weapon").sort(byName).map(w => {
    try { return { ...attackLine(actor, w), freeform: !!w.flags?.n5e?.freeform }; } catch { return { id: w.id, name: w.name, text: "" }; }
  });
  const feats = items.filter(i => i.type === "feat").sort(byName).map(i => {
    const type = i.system.activation?.type ?? "";
    return { id: i.id, name: i.name, text: i.system.description ?? "", reaction: type === "reaction",
      usable: !!type && !["", "none", "passive"].includes(type), glyph: glyph(i.system.activation)?.svg ?? "" };
  });
  return {
    block,
    core: {
      stats: [
        { key: "ac", label: "AC", value: block.ac.value, tip: block.ac.tip },
        { key: "dr", label: "DR", value: block.dr.value, tip: block.dr.tip },
        { key: "init", label: "Init", value: block.initiative.value, tip: block.initiative.tip, roll: true },
        { key: "speed", label: "Speed", value: actor.system.speed?.walk ?? 0, tip: block.speed },
        { key: "prof", label: "Prof", value: block.prof },
        { key: "pp", label: "Passive Prc", value: block.passivePerception }
      ],
      abilities: block.abilities
    },
    strikes,
    jutsu: npcJutsuGroups(actor, view),
    legend: view.legend === false ? null : jutsuLegendVM(),
    legendOn: view.legend !== false,
    features: feats.filter(f => !f.reaction),
    reactions: feats.filter(f => f.reaction)
  };
}

/** A player without ownership: no numbers, a condition word, what the party has learned. */
export function npcPlayerVM(actor) {
  const sys = actor.system;
  const hp = sys.hp ?? {};
  const word = hp.value <= 0 ? "Down" : sys.states?.bloodied ? "Bloodied" : hp.value < hp.max ? "Hurt" : "Unhurt";
  return { name: actor.name, img: actor.img, blurb: sys.details?.blurb ?? "", condition: word, learned: learnedVM(actor) };
}
