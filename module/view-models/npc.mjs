/**
 * NPC view models (NPC1b): the stat block in the Bingo Book's layout, and the Build tab.
 * Pure: they read prepared data and return plain objects for the templates.
 */
import { abilities, skills, ranks, rankOrder } from "../config/core.mjs";
import { npcTemplates } from "../config/combat.mjs";
import { adversaryClasses, adversaryRoles, adversaryArmor, adversaryBuilds, hpSources } from "../config/adversary.mjs";
import { ABILITY_KEYS } from "../rules/adversary.mjs";
import { signed, breakdownTooltip } from "./common.mjs";

const opts = (choices, value) => Object.entries(choices).map(([v, l]) => ({ value: v, label: l?.label ?? l, selected: v === value }));
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const DISC = [["nin", "Ninjutsu"], ["gen", "Genjutsu"], ["tai", "Taijutsu"]];

/**
 * The stat block, top to bottom as the book prints it. Used by the header, the simple sheet and
 * the limited view.
 */
export function statBlockVM(actor) {
  const sys = actor.system;
  const d = sys.details;
  const adv = sys.isAdversary;
  const tip = key => breakdownTooltip(sys.breakdowns?.[key]);
  const identity = [adv ? adversaryClasses[d.class] : "", cap(sys.traits?.size), ranks[d.rank]?.label ?? `${d.rank}-Rank`,
    adv && d.role !== "none" ? adversaryRoles[d.role] : "", d.clan, d.affiliation,
    !adv && d.creatureType ? cap(d.creatureType) : "", d.template !== "none" ? npcTemplates[d.template] : "",
    d.iconic ? "Iconic" : "", d.epic ? "Epic" : ""].filter(Boolean).join(", ");
  const lines = DISC.map(([key, label]) => ({ key, label, attack: signed(sys.disciplines[key].attack), dc: sys.disciplines[key].dc,
    attackTip: tip(`${key}.attack`), dcTip: tip(`${key}.dc`) }));
  const freeform = sys.adversaryBuild?.freeform;
  return {
    name: actor.name, img: actor.img, blurb: d.blurb, identity, isAdversary: adv,
    level: sys.level, prof: signed(sys.prof),
    ac: { value: sys.ac.value, tip: breakdownTooltip(sys.breakdowns?.ac, { signedTotal: false }) },
    dr: { value: sys.dr, tip: breakdownTooltip(sys.breakdowns?.dr, { signedTotal: false }) },
    hp: { value: sys.hp.value, max: sys.hp.max, tip: breakdownTooltip(sys.breakdowns?.["hp.max"], { signedTotal: false }) },
    cp: { value: sys.cp.value, max: sys.cp.max, none: adv && !sys.cp.max, tip: breakdownTooltip(sys.breakdowns?.["cp.max"], { signedTotal: false }) },
    speed: Object.entries(sys.speed ?? {}).filter(([, v]) => v).map(([k, v]) => (k === "walk" ? `${v} ft` : `${k} ${v} ft`)).join(", ") || "0 ft",
    initiative: { value: signed(sys.initiative.total), tip: tip("initiative") },
    abilities: ABILITY_KEYS.map(key => ({ key, abbr: abilities[key].abbr.toUpperCase(), label: abilities[key].label,
      mod: signed(sys.abilities[key].mod), score: sys.abilities[key].value, assigned: sys.adversary?.mods?.[key] ?? 0,
      save: signed(sys.saves[key].total), saveTip: tip(`save.${key}`), full: !!sys.saves[key].isProficient })),
    autoFailSaves: !!sys.autoFailSaves,
    // The book lists only the skills an adversary is trained in or has a stated bonus for.
    skills: Object.entries(sys.skills).filter(([key, s]) => s.isProficient || sys.adversary?.overrides?.skills?.[key] != null || (adv && sys._statParts(`skill.${key}`).length))
      .map(([key, s]) => ({ key, label: skills[key]?.label ?? key, total: signed(s.total), tip: tip(`skill.${key}`) })),
    passivePerception: sys.skills.prc?.passive ?? 10,
    lines,
    freeform: freeform ? { label: "Weapon/Freeform", ability: freeform.ability.toUpperCase(), attack: signed(freeform.attack), dc: freeform.dc,
      attackTip: tip("freeform.attack"), dcTip: tip("freeform.dc") } : null
  };
}

/** Header fields for edit mode. */
export function npcHeaderVM(actor) {
  const src = actor._source?.system ?? actor.system;
  const d = src.details;
  return {
    block: statBlockVM(actor), isAdversary: actor.system.isAdversary,
    mods: src.adversary?.mods ?? {},
    summary: [`Level ${actor.system.level}`, ranks[d.rank]?.label, actor.system.isAdversary ? adversaryClasses[d.class] : "",
      d.template !== "none" ? npcTemplates[d.template] : ""].filter(Boolean).join(" \u00b7 "),
    level: d.level, blurb: d.blurb, clan: d.clan, affiliation: d.affiliation, creatureType: d.creatureType,
    hpMax: src.hpMax ?? "", cpMax: src.cpMax ?? "", hitDie: src.hitDie, chakraDie: src.chakraDie,
    rankOptions: opts(Object.fromEntries(rankOrder.map(r => [r, ranks[r].label])), d.rank),
    classOptions: opts(adversaryClasses, d.class), roleOptions: opts(adversaryRoles, d.role),
    templateOptions: opts(npcTemplates, d.template)
  };
}

/** The Build tab: the profile, the modifier budget, and every number with its baseline and override. */
export function npcBuildVM(actor, { partyManual = false } = {}) {
  const sys = actor.system;
  const src = actor._source?.system ?? sys;
  const d = src.details;
  const a = src.adversary ?? {};
  const build = sys.adversaryBuild;
  const base = { buildOptions: opts(adversaryBuilds, d.build), isAdversary: sys.isAdversary };
  if ( !sys.isAdversary || !build ) return base;
  const o = a.overrides ?? {};
  const bd = key => sys.breakdowns?.[key];
  const row = (label, path, value, key, { plain = false, baseline } = {}) => {
    const b = key ? bd(key) : null;
    const stated = path.split(".").reduce((o2, k) => o2?.[k], src);
    return { label, path: `system.${path}`, final: plain ? String(value) : signed(value), stated: stated ?? "",
      overridden: stated != null, baseline: baseline ?? b?.baseline ?? null, tip: b ? breakdownTooltip(b, { signedTotal: !plain }) : "" };
  };
  const stats = [
    row("Proficiency", "adversary.overrides.prof", sys.prof, null),
    row("Armor Class", "adversary.overrides.ac", sys.ac.value, "ac", { plain: true, baseline: build.baselines.ac }),
    row("Damage Reduction", "adversary.overrides.dr", sys.dr, "dr", { plain: true }),
    row("Hit Points", "hpMax", sys.hp.max, "hp.max", { plain: true, baseline: src.hpMax != null ? build.baselines.hp : null }),
    ...(sys.autoFailSaves ? [] : [row("Chakra Points", "cpMax", sys.cp.max, "cp.max", { plain: true, baseline: src.cpMax != null ? build.baselines.cp : null })]),
    row("Initiative", "adversary.overrides.initiative", sys.initiative.total, "initiative"),
    row("Speed", "adversary.overrides.speed", sys.speed.walk, null, { plain: true }),
    row("Passive Perception", "adversary.overrides.passivePerception", sys.skills.prc.passive, "passive.prc", { plain: true })
  ];
  const fullCount = build.fullSaves.length;
  return {
    ...base,
    level: d.level, clan: d.clan, affiliation: d.affiliation, iconic: d.iconic, epic: d.epic, rankBonus: a.rankBonus,
    rankOptions: opts(Object.fromEntries(rankOrder.map(r => [r, ranks[r].label])), d.rank),
    classOptions: opts(adversaryClasses, d.class), roleOptions: opts(adversaryRoles, d.role),
    armorOptions: opts(adversaryArmor, a.armor), hpSourceOptions: opts(hpSources, a.hpSource),
    freeformOptions: ABILITY_KEYS.map(k => ({ value: k, label: abilities[k].label, selected: k === a.freeformAbility })),
    showPartySize: d.class === "solo", partySize: a.partySize, partyManual, players: build.profile.players,
    abilities: ABILITY_KEYS.map(key => ({ key, label: abilities[key].label, abbr: abilities[key].abbr.toUpperCase(),
      assigned: a.mods?.[key] ?? 0, final: signed(sys.abilities[key].mod) })),
    statLine: build.statLine.line.map(v => signed(v)).join("  "), statLineMissing: build.statLine.missing,
    budget: build.budget.budget, assigned: build.budget.assigned, difference: build.budget.difference,
    overBudget: build.budget.difference > 0, underBudget: build.budget.difference < 0,
    budgetParts: build.budget.parts.map(p => `${p.label} ${signed(p.value)}`).join(", "),
    saves: ABILITY_KEYS.map(key => ({ ...row(`${abilities[key].label} save`, `adversary.overrides.saves.${key}`, sys.saves[key].total, `save.${key}`),
      key, full: build.fullSaves.includes(key) })),
    fullCount, fullSuggested: build.suggested.fullSaves, savesPicked: (a.fullSaves ?? []).length > 0, autoFailSaves: sys.autoFailSaves,
    stats,
    lines: [...DISC.map(([key, label]) => ({ label, key,
      attack: row(`${label} attack`, `adversary.overrides.attack.${key}`, sys.disciplines[key].attack, `${key}.attack`),
      dc: row(`${label} save DC`, `adversary.overrides.dc.${key}`, sys.disciplines[key].dc, `${key}.dc`, { plain: true }) })),
    { label: "Weapon/Freeform", key: "freeform",
      attack: row("Weapon/Freeform attack", "adversary.overrides.attack.freeform", build.freeform?.attack ?? 0, "freeform.attack"),
      dc: row("Freeform save DC", "adversary.overrides.dc.freeform", build.freeform?.dc ?? 0, "freeform.dc", { plain: true }) }],
    skills: Object.entries(sys.skills).map(([key, s]) => ({ key, label: skills[key]?.label ?? key, total: signed(s.total),
      proficient: !!src.skills?.[key]?.proficient, stated: o.skills?.[key] ?? "", tip: breakdownTooltip(bd(`skill.${key}`)) })),
    suggested: build.suggested, warnings: build.warnings
  };
}

/** The simple sheet: the stat block, then traits, jutsu by discipline and rank, and attacks. */
export function npcSimpleVM(actor) {
  const items = [...(actor.items ?? [])];
  const byName = (x, y) => x.name.localeCompare(y.name);
  const jutsu = items.filter(i => i.type === "jutsu");
  const groups = [];
  for ( const [key, label] of [...DISC, ["buki", "Bukijutsu"]] ) {
    const mine = jutsu.filter(j => j.system.discipline === key);
    if ( !mine.length ) continue;
    const byRank = rankOrder.map(rank => ({ rank, label: ranks[rank]?.label ?? rank,
      jutsu: mine.filter(j => j.system.rank === rank).sort(byName).map(j => ({ id: j.id, name: j.name, cost: j.system.live?.cost ?? j.system.cost?.value ?? "" })) }))
      .filter(r => r.jutsu.length);
    groups.push({ key, label, ranks: byRank });
  }
  return {
    block: statBlockVM(actor),
    traits: items.filter(i => i.type === "feature" || i.type === "feat").sort(byName).map(i => ({ id: i.id, name: i.name, text: i.system.description ?? "" })),
    jutsu: groups,
    attacks: items.filter(i => i.type === "weapon").sort(byName).map(i => ({ id: i.id, name: i.name })),
    publicNotes: actor.system.details.publicNotes
  };
}
