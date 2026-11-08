/**
 * Combat tab view model: every option the character has in a fight, plus the trackers
 * (Chain, concentration and upkeep, stance, Combo/Finisher). Pure, tested in Node.
 */
import { abilities, skills, toolkits, disciplines, ranks as rankDefs, dcTables } from "../config/core.mjs";
import { coreActions, activationTypes } from "../config/combat.mjs";
import { skillActions, skillActionTiers } from "../config/character.mjs";
import { esc, glyph, pips, signed } from "./common.mjs";
import { skillActionPenalty } from "../rules/skill-actions.mjs";
import { rankValue } from "../rules/progression.mjs";
import { rule } from "../rules-settings.mjs";

const list = items => (Array.isArray(items) ? items : [...(items ?? [])]);
const ofType = (actor, ...types) => list(actor.items).filter(i => types.includes(i.type));
const flag = (doc, key) => (typeof doc.getFlag === "function" ? doc.getFlag("n5e", key) : doc.flags?.n5e?.[key]);

/** Economy rows, in turn order. */
const ECONOMY = [
  { key: "action", label: "Actions", types: ["action", "fullTurn"] },
  { key: "bonus", label: "Bonus Actions", types: ["bonus"] },
  { key: "reaction", label: "Reactions", types: ["reaction"] },
  { key: "other", label: "Free & Special", types: ["free", "special", "move", "none"] }
];
const COMBAT_ACTIVATIONS = new Set(["action", "fullTurn", "bonus", "reaction", "free", "special", "move"]);
const economyOf = type => ECONOMY.find(e => e.types.includes(type))?.key ?? "other";

/** Tooltip card: title, meta line, body. Body may be item HTML (trusted document content). */
function tipHTML({ title, meta = [], body = "", footer = "" }) {
  const metaLine = meta.filter(Boolean).map(esc).join(" · ");
  return `<div class="n5e-tip"><b class="tt">${esc(title)}</b>${metaLine ? `<div class="tm">${metaLine}</div>` : ""}`
    + `${body ? `<div class="tb">${body}</div>` : ""}${footer ? `<div class="tf">${footer}</div>` : ""}</div>`;
}

const pill = (o) => ({
  badges: [], cost: "", sub: "", dim: false, warn: "", ...o,
  glyph: glyph(o.activation)?.svg ?? "",
  economy: economyOf(o.activation)
});

/** Split pills into economy rows (empty rows dropped). */
function byEconomy(pills) {
  return ECONOMY.map(e => ({ ...e, pills: pills.filter(p => p.economy === e.key) })).filter(r => r.pills.length);
}

/* -------------------------------------------- */
/*  Basic Combat                                */
/* -------------------------------------------- */

function basicCombat(actor) {
  const sys = actor.system;
  const equippedWeapons = ofType(actor, "weapon").filter(w => w.system.equipped);
  const hasLight = equippedWeapons.some(w => w.system.properties?.light);

  const core = Object.entries(coreActions)
    .filter(([, a]) => a.requires !== "lightWeapon" || hasLight)
    .map(([key, a]) => pill({ kind: "core", key, name: a.label, activation: a.activation,
      tip: tipHTML({ title: a.label, meta: [activationTypes[a.activation]], body: esc(a.text) }) }));

  // Strikes: unarmed always, plus each equipped weapon.
  const stance = sys.combat?.activeStance ? list(actor.items).find(i => i.id === sys.combat.activeStance) : null;
  const unarmedDie = stance ? "1d6" : "1";
  const strMod = sys.abilities?.str?.mod ?? 0;
  const strikes = [pill({ kind: "core", key: "unarmed", name: "Unarmed Strike", activation: "action",
    sub: `${unarmedDie} ${signed(strMod)}`,
    tip: tipHTML({ title: "Unarmed Strike", meta: ["Attack", "Always proficient"],
      body: esc(`${unarmedDie} + Str bludgeoning${stance ? ` (${stance.name} sets the die to d6)` : ""}. Counts as finesse for features; may use Dex if you can cast all Taijutsu with Dex.`) }) })];
  for ( const w of equippedWeapons ) {
    const s = w.system;
    const dmg = `${s.damage?.die ?? ""} ${[...(s.damage?.types ?? [])].join("/")}`.trim();
    const range = s.range?.normal ? `${s.range.normal}${s.range.long ? `/${s.range.long}` : ""} ft` : "Melee";
    strikes.push(pill({ kind: "item", id: w.id, name: w.name, activation: "action", sub: s.damage?.die ?? "",
      tip: tipHTML({ title: w.name, meta: ["Attack", range, dmg], body: s.description ?? "" }) }));
  }

  // Skill actions usable in a fight (action, bonus, reaction, move), with tier penalties.
  const skillPills = [];
  for ( const [key, a] of Object.entries(skillActions) ) {
    if ( a.nonCombat || !COMBAT_ACTIVATIONS.has(a.activation) ) continue;
    const sk = sys.skills?.[a.skill];
    if ( a.tier === "kit" ) {
      if ( !a.kit || !sys.tools?.[a.kit]?.isProficient || !sk?.isProficient ) continue;
    }
    const penalty = a.tier === "kit" || !rule("skillActionPenalties") ? 0 : skillActionPenalty(a.tier, { proficient: !!sk?.isProficient, masteryRank: sk?.mastery ?? 0 });
    const skillLabel = skills[a.skill]?.label ?? a.skill;
    const tierLabel = skillActionTiers[a.tier]?.label ?? a.tier;
    skillPills.push(pill({ kind: "skill", key, name: a.label, activation: a.activation === "move" ? "free" : a.activation,
      sub: penalty ? `${penalty}`.replace("-", "−") : "", warn: penalty ? "penalty" : "",
      tip: tipHTML({ title: a.label,
        meta: [skillLabel, tierLabel, a.tier === "kit" ? `${toolkits[a.kit]?.label ?? a.kit}, 1 Charge` : "",
          activationTypes[a.activation] ?? (a.activation === "move" ? "Part of your move" : "")],
        body: `<p><b>Roll:</b> ${esc(a.roll ?? "")}</p><p>${esc(a.text ?? "")}</p>`,
        footer: penalty ? esc(`${signed(penalty)} to this check: ${penalty === -5 ? "no Mastery rank" : "not proficient"} (penalties don't stack)`) : "" }) }));
  }

  // Active features and usable consumables.
  const featurePills = ofType(actor, "feat")
    .filter(i => i.system.featureType !== "passive" && COMBAT_ACTIVATIONS.has(i.system.activation?.type))
    .map(i => itemPill(i));
  const itemPills = ofType(actor, "consumable")
    .filter(i => COMBAT_ACTIVATIONS.has(i.system.activation?.type) && (i.system.quantity ?? 1) > 0)
    .map(i => itemPill(i, { sub: `×${i.system.quantity ?? 1}` }));

  return {
    key: "basic", label: "Basic Combat",
    sections: [
      { key: "core", label: "Actions", pills: core },
      { key: "strikes", label: "Strikes", pills: strikes },
      { key: "features", label: "Features", pills: featurePills },
      { key: "items", label: "Items", pills: itemPills },
      ...byEconomy(skillPills).map(r => ({ key: `skills-${r.key}`, label: `Skill ${r.label}`, pills: r.pills, skill: true }))
    ].filter(s => s.pills.length)
  };
}

function itemPill(i, extra = {}) {
  const s = i.system;
  const max = s.uses?.maxValue ?? 0;
  const left = max ? Math.max(0, max - (s.uses.spent ?? 0)) : null;
  return pill({
    kind: "item", id: i.id, name: i.name, activation: s.activation?.type ?? "action",
    sub: left != null ? `${left}/${max}` : "", dim: left === 0,
    tip: tipHTML({ title: i.name, meta: [activationTypes[s.activation?.type], left != null ? `${left}/${max} uses` : ""], body: s.description ?? "" }),
    ...extra
  });
}

/* -------------------------------------------- */
/*  Jutsu groups                                */
/* -------------------------------------------- */

function jutsuPill(actor, i, { comboReady }) {
  const s = i.system;
  const live = s.live ?? {};
  const kw = s.keywords instanceof Set ? s.keywords : new Set(s.keywords ?? []);
  const cost = live.cost ?? s.cost?.value ?? 0;
  const badges = [];
  if ( kw.has("combo") ) badges.push({ key: "combo", label: "Combo" });
  const isFinisher = kw.has("finisher") || !!s.finisher?.text;
  if ( isFinisher ) badges.push({ key: "finisher", label: "Finisher", on: comboReady });
  if ( kw.has("chain") ) badges.push({ key: "chain", label: "Chain" });
  if ( kw.has("clash") ) badges.push({ key: "clash", label: "Clash" });
  if ( s.duration?.concentration ) badges.push({ key: "conc", label: "Conc." });
  const cp = actor.system.cp?.value ?? 0;
  const affordable = s.cost?.mode !== "chakra" || cost <= cp;
  const disc = disciplines[s.discipline]?.label ?? s.discipline;
  const hit = live.attack != null ? `${signed(live.attack)} hit · DC ${live.dc}` : "";
  const rider = (label, html) => (html ? `<p><b>${esc(label)}.</b></p>${html}` : "");
  const chainHTML = [1, 2, 3].map(n => rider(`Chain ${n}`, s.chainEffects?.[n])).join("");
  return pill({
    kind: "item", id: i.id, name: i.name, activation: s.activation?.type ?? "action",
    rank: s.rank, cost: s.cost?.mode === "chakra" ? `${cost} CP` : (s.cost?.text || ""),
    badges, dim: !affordable || live.castable === false,
    warn: !affordable ? "Not enough chakra" : (live.castable === false ? "Missing affinity" : ""),
    concentration: !!s.duration?.concentration,
    concentrating: list(actor.system.combat?.concentrating).includes(i.id),
    tip: tipHTML({
      title: i.name,
      meta: [`${s.rank}-Rank ${disc}`, activationTypes[s.activation?.type], s.cost?.mode === "chakra" ? `${cost} CP` : s.cost?.text,
        s.duration?.concentration ? "Concentration" : "", hit],
      body: (s.description ?? "") + chainHTML + rider("Finisher", s.finisher?.text) + rider("Overcharge", s.overcharge?.text),
      footer: [...kw].map(k => esc(globalThis.CONFIG?.N5E?.keywords?.[k]?.label ?? k)).join(", ")
    })
  });
}

function jutsuGroups(actor, state) {
  const rankOrder = Object.keys(rankDefs);
  const all = ofType(actor, "jutsu").sort((a, b) =>
    (rankOrder.indexOf(a.system.rank) - rankOrder.indexOf(b.system.rank)) || a.name.localeCompare(b.name));
  return [["nin", "Ninjutsu"], ["gen", "Genjutsu"], ["tai", "Taijutsu"], ["buki", "Bukijutsu"]].map(([key, label]) => {
    const pills = all.filter(i => i.system.discipline === key).map(i => jutsuPill(actor, i, state));
    const castKey = key === "buki" ? "tai" : key;
    const d = actor.system.disciplines?.[castKey];
    return { key, label, sub: d ? `${signed(d.attack)} hit · DC ${d.dc}` : "", rows: byEconomy(pills), empty: !pills.length };
  });
}

/* -------------------------------------------- */
/*  Trackers                                    */
/* -------------------------------------------- */

function concentrationVM(actor) {
  const sys = actor.system;
  const paidMap = flag(actor, "concentrationPaid") ?? {};
  const ids = list(sys.combat?.concentrating);
  const rows = ids.map(id => {
    const i = list(actor.items).find(x => x.id === id);
    if ( !i ) return { id, name: "Missing jutsu", rank: "", upkeep: 0, missing: true };
    const kw = i.system.keywords instanceof Set ? i.system.keywords : new Set(i.system.keywords ?? []);
    const paid = paidMap[id] ?? i.system.live?.cost ?? i.system.cost?.value ?? 0;
    const efficient = kw.has("efficient");
    return { id, name: i.name, rank: i.system.rank, paid, efficient, stable: kw.has("stable"),
      upkeep: efficient ? 0 : Math.floor(paid / 2) };
  });
  const upkeep = rows.reduce((t, r) => t + r.upkeep, 0);
  const rankSum = rows.reduce((t, r) => t + (r.rank ? rankValue(r.rank) : 0), 0);
  const base = sys.concentration?.dcBase ?? dcTables?.concentration?.base ?? 15;
  const max = sys.concentration?.max ?? 2;
  const cp = sys.cp?.value ?? 0;
  const knowsAny = ofType(actor, "jutsu").some(i => i.system.duration?.concentration);
  return {
    show: rows.length > 0 || knowsAny,
    rows, used: rows.length, max, slots: pips(rows.length, max),
    upkeep, short: upkeep > cp, cpAfter: Math.max(0, cp - upkeep),
    dc: base + rankSum, dcBase: base, rankSum
  };
}

function chainVM(actor) {
  const sys = actor.system;
  const value = sys.combat?.chain?.value ?? 0;
  const chainJutsu = ofType(actor, "jutsu").filter(i => {
    const kw = i.system.keywords instanceof Set ? i.system.keywords : new Set(i.system.keywords ?? []);
    return kw.has("chain");
  });
  const atRank = value ? chainJutsu.filter(i => i.system.chainEffects?.[value]).map(i => ({ id: i.id, name: i.name })) : [];
  // Shown once a Chain jutsu has been cast (or the count was set by hand).
  return { show: !!sys.combat?.chain?.active || value > 0, value, boxes: pips(value, 3), atRank };
}

function stanceVM(actor) {
  const sys = actor.system;
  const stances = ofType(actor, "stance");
  const active = stances.find(s => s.id === sys.combat?.activeStance) ?? null;
  return {
    active: active ? { id: active.id, name: active.name, categories: [...(active.system.categories ?? [])].join(", "),
      tip: tipHTML({ title: active.name, meta: [[...(active.system.categories ?? [])].join(", ")], body: active.system.description ?? "" }) } : null,
    others: stances.filter(s => s !== active).map(s => ({ id: s.id, name: s.name,
      tip: tipHTML({ title: s.name, meta: ["Switch: Bonus Action"], body: s.system.description ?? "" }) })),
    any: stances.length > 0
  };
}

function comboVM(actor, combo) {
  if ( !combo ) return { show: false, finishers: [] };
  const has = (i, k) => (i.system.keywords instanceof Set ? i.system.keywords : new Set(i.system.keywords ?? [])).has(k);
  const finishers = ofType(actor, "jutsu").filter(i => has(i, "finisher") || i.system.finisher?.text)
    .map(i => ({ id: i.id, name: i.name }));
  return { show: true, ready: true, name: combo.name, finishers };
}

/* -------------------------------------------- */
/*  Entry                                       */
/* -------------------------------------------- */

export function combatVM(actor) {
  const combo = flag(actor, "combo") ?? null;
  const comboReady = !!combo;
  const basic = basicCombat(actor);
  const skillRows = basic.sections.filter(sec => sec.skill).map(sec => ({ ...sec, label: sec.label.replace(/^Skill /, "") }));
  basic.sections = basic.sections.filter(sec => !sec.skill);
  const used = flag(actor, "economy") ?? {};
  const economy = [["action", "Action"], ["bonus", "Bonus"], ["reaction", "Reaction"], ["special", "Special"], ["object", "Object"]]
    .map(([key, label]) => ({ key, label, used: !!used[key], glyph: glyph(key === "object" ? "free" : key)?.svg ?? "" }));
  return {
    economy: rule("actionEconomy") ? economy : [],
    chain: chainVM(actor),
    concentration: concentrationVM(actor),
    stance: stanceVM(actor),
    combo: comboVM(actor, combo),
    basic,
    // Only disciplines the character has jutsu in.
    jutsu: jutsuGroups(actor, { comboReady }).filter(g => !g.empty),
    skills: { key: "skills", label: "Skill Actions", rows: skillRows },
    abilities: Object.keys(abilities)
  };
}
