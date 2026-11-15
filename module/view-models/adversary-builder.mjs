/**
 * The Adversary Builder's view model (pure; NPC2). builderVM(draft, extra) -> what the template prints.
 * The window (applications/npc/adversary-builder.mjs) supplies the preview stat block and the
 * compendium search results in `extra`.
 */
import { abilities, ranks, rankOrder } from "../config/core.mjs";
import {
  adversaryClasses, adversaryRoles, adversaryArmor, hpSources, classDescriptions, roleDescriptions, rankDescriptions,
  conceptExamples, rankTable, classModifiers, roleModifiers, classifications
} from "../config/adversary.mjs";
import { ABILITY_KEYS, statLine, suggestedCounts, adversaryProf, abilityBudget, fullSaveCount } from "../rules/adversary.mjs";
import { stepNotes, suggestedRanksFor, draftProfile } from "../rules/adversary-builder.mjs";
import { signed } from "./common.mjs";

export const STEPS = [
  ["concept", "1. Define the Concept"], ["class", "2. Pick a Class"], ["level", "3. Pick a Level"], ["role", "4. Role and Role Traits"],
  ["rank", "5. Pick a Rank"], ["clan", "6. Clan and Affiliation"], ["attacks", "7. Attacks and Jutsu"],
  ["generic", "7.5 Generic Jutsu and General Traits"], ["finalize", "8. Calculate and Finalize"]
];

const sel = (choices, value) => Object.entries(choices).map(([v, l]) => ({ value: v, label: l?.label ?? l, selected: v === value }));
const bonusText = (mods = {}) => Object.entries({ ac: "AC", dr: "DR", save: "saves", initiative: "initiative", dc: "save DCs", attack: "attacks", speed: "speed" })
  .filter(([k]) => mods[k]).map(([k, label]) => `${signed(mods[k])} ${label}`).join(", ");

/**
 * @param {object} draft
 * @param {{step?: string, preview?: object, jutsuResults?: object[], weaponResults?: object[], clanNames?: string[],
 *   showAllRanks?: boolean, isNew?: boolean, search?: {jutsu, weapon}}} extra
 */
export function builderVM(draft, extra = {}) {
  const step = extra.step ?? "concept";
  const p = draftProfile(draft);
  const counts = suggestedCounts(p);
  const notes = stepNotes(draft);
  const line = statLine(p.level, p.class);
  const budget = abilityBudget(p);
  const ranksOk = suggestedRanksFor(draft.rank);
  return {
    isNew: !!extra.isNew, step, draft,
    steps: STEPS.map(([key, label]) => ({ key, label, active: key === step, notes: notes[key].length })),
    notes: notes[step] ?? [],
    conceptExamples,
    classCards: Object.entries(adversaryClasses).map(([key, label]) => ({ key, label, text: classDescriptions[key], selected: key === draft.class,
      mods: bonusText(classModifiers[key]), hp: key === "elite" ? "HP and CP ×1.25" : key === "solo" ? "HP and CP ×(1.5 + 0.5 per player)" : key === "minion" ? "HP 10 + level" : "" })),
    level: { value: p.level, prof: signed(adversaryProf(p.level)), line: line.line.map(v => signed(v)).join("  "), missing: line.missing,
      partyLevel: draft.partyLevel ?? "", counts },
    roleCards: Object.entries(adversaryRoles).map(([key, label]) => ({ key, label, text: roleDescriptions[key], selected: key === draft.role })),
    classifications: [{ key: "iconic", label: "Iconic", on: !!draft.iconic, text: `A named adversary with narrative weight: HP ×1.5, ${bonusText(classifications.iconic)}, +2 ability points` },
      { key: "epic", label: "Epic", on: !!draft.epic, text: `World-defining: HP ×2, ${bonusText(classifications.epic)}, +4 ability points` }],
    traits: draft.traits.map((t, i) => ({ ...t, i, rankOptions: sel(Object.fromEntries(rankOrder.map(r => [r, `${r}-Rank`])), t.rank) })),
    rankCards: rankOrder.map(key => ({ key, label: ranks[key]?.label ?? `${key}-Rank`, text: rankDescriptions[key], selected: key === draft.rank,
      perLevel: rankTable[key]?.perLevel, points: rankTable[key]?.points, casts: suggestedRanksFor(key).join(", ") })),
    rankBonus: !!draft.rankBonus,
    clan: draft.clan, affiliation: draft.affiliation, clanNames: extra.clanNames ?? [],
    jutsu: draft.jutsu.map((j, i) => ({ ...j, i, outside: j.rank && !ranksOk.includes(j.rank) })),
    jutsuCount: draft.jutsu.length + (draft.freeform ?? []).filter(f => f.kind === "jutsu").length, jutsuLimit: counts.jutsu, jutsuRanks: ranksOk.join(", "), showAllRanks: !!extra.showAllRanks,
    jutsuResults: extra.jutsuResults ?? [], weaponResults: extra.weaponResults ?? [], search: extra.search ?? { jutsu: "", weapon: "" },
    weapons: draft.weapons.map((w, i) => ({ ...w, i })),
    freeform: (draft.freeform ?? []).map((f, i) => ({ i, kind: f.kind, name: f.choices?.name || f.name || "Unnamed",
      label: f.kind === "strike" ? "Strike" : `${f.choices?.rank ?? ""}-Rank ${f.choices?.type ?? "offensive"} jutsu`, pending: !f.id || !!f.dirty })),
    freeformSlots: counts.freeformSlots ?? 0,
    finalize: {
      abilities: ABILITY_KEYS.map(k => ({ key: k, label: abilities[k].label, abbr: abilities[k].abbr.toUpperCase(), value: draft.mods[k] ?? 0,
        full: draft.fullSaves.includes(k) })),
      line: line.line.map(v => signed(v)).join("  "), budget: budget.budget, assigned: budget.assigned, over: budget.difference > 0, under: budget.difference < 0,
      armorOptions: sel(adversaryArmor, draft.armor), hpSourceOptions: sel(hpSources, draft.hpSource),
      freeformOptions: ABILITY_KEYS.map(k => ({ value: k, label: abilities[k].label, selected: k === draft.freeformAbility })),
      isSolo: draft.class === "solo", partySize: draft.partySize, fullSuggested: fullSaveCount(p.level), fullPicked: draft.fullSaves.length,
      hpMax: draft.hpMax ?? "", cpMax: draft.cpMax ?? ""
    },
    roleBonus: bonusText(roleModifiers[draft.role]),
    preview: extra.preview ?? null
  };
}
