/**
 * The Freeform Strike and Freeform Jutsu windows (NPC3d): blank choices, form data -> choices, and
 * the view models with the live numbers. Pure; the windows only render these and save.
 */
import { freeformEffects, freeformShapes, freeformRanges, recoveryMethods, defensiveFocus, supportFocus, rankColumnLabel } from "../config/freeform.mjs";
import { damageTypes } from "../config/combat.mjs";
import { abilities, skills } from "../config/core.mjs";
import { keywords } from "../config/jutsu.mjs";
import { strikeDamage, combineAttacks, riderDC, freeformRanks, freeformCostFor, jutsuDamage, defensiveValue, supportValue, effectiveLevel } from "../rules/freeform.mjs";

const RANKS = ["D", "C", "B", "A", "S"];
const sel = (choices, value) => Object.entries(choices).map(([v, l]) => ({ value: v, label: l?.label ?? l, selected: v === value }));
const truthy = v => v === true || v === "true" || v === "on" || v === 1 || v === "1";
const LINES = { freeform: "Weapon / Freeform", nin: "Ninjutsu", tai: "Taijutsu", gen: "Genjutsu" };

/** Effect options grouped by tier, for a select. */
function effectOptions(value, { tier = null } = {}) {
  const groups = { 1: [], 2: [] };
  for ( const [key, e] of Object.entries(freeformEffects) ) if ( !tier || e.tier === tier ) groups[e.tier]?.push({ value: key, label: e.label, selected: key === value });
  return [{ label: "Tier 1", options: groups[1] }, { label: "Tier 2", options: groups[2] }].filter(g => g.options.length);
}

/* -------------------------------------------- */
/*  Strike                                      */
/* -------------------------------------------- */

export const blankStrike = () => ({ name: "", range: "melee", reach: 5, countsAs: "freeform", damageType: "bludgeoning", single: false, rider: null });

export function strikeFromForm(f, prev = blankStrike()) {
  const c = structuredClone(prev);
  if ( "name" in f ) c.name = String(f.name ?? "");
  if ( "range" in f ) c.range = f.range === "ranged" ? "ranged" : "melee";
  if ( "reach" in f ) c.reach = Math.max(5, Number(f.reach) || 5);
  if ( "countsAs" in f ) c.countsAs = LINES[f.countsAs] ? f.countsAs : "freeform";
  if ( "damageType" in f ) c.damageType = damageTypes[f.damageType] ? f.damageType : "bludgeoning";
  if ( "single" in f ) c.single = truthy(f.single);
  if ( "riderKey" in f ) {
    c.rider = f.riderKey && freeformEffects[f.riderKey] ? { ...(c.rider ?? { save: "con", recovery: "save", rounds: 1 }), key: f.riderKey } : null;
  }
  if ( c.rider ) {
    if ( "riderSave" in f && abilities[f.riderSave] ) c.rider.save = f.riderSave;
    if ( "riderRecovery" in f && recoveryMethods[f.riderRecovery] ) c.rider.recovery = f.riderRecovery;
    if ( "riderRounds" in f ) c.rider.rounds = Math.min(2, Math.max(1, Number(f.riderRounds) || 1));
    if ( "riderValue" in f ) c.rider.value = f.riderValue === "" ? null : Number(f.riderValue);
    if ( "riderText" in f ) c.rider.text = String(f.riderText ?? "");
  }
  return c;
}

/** @param {{level, klass, dcs: number[], name?: string}} adv */
export function strikeVM(c, adv, { isEdit = false } = {}) {
  const riderTier = c.rider?.key ? freeformEffects[c.rider.key]?.tier ?? 1 : 0;
  const dmg = strikeDamage(adv.level + (adv.damageLevel ?? 0), adv.klass, riderTier);
  const multi = dmg.attacks;
    const rider = c.rider?.key ? freeformEffects[c.rider.key] : null;
  return {
    isEdit, adversary: adv.name ?? "", level: adv.level, klass: adv.klass,
    name: c.name, reach: c.reach, isMelee: c.range !== "ranged", single: !!c.single,
    rangeOptions: sel({ melee: "Melee (reach you set)", ranged: "Ranged (60 ft)" }, c.range),
    countsAsOptions: sel(LINES, c.countsAs), damageTypeOptions: sel(damageTypes, c.damageType),
    riderOptions: effectOptions(c.rider?.key ?? ""), hasRider: !!rider,
    rider: rider ? { label: rider.label, tier: rider.tier, kind: rider.kind, isCustom: c.rider.key === "custom", hasValue: rider.kind === "effect",
      value: c.rider.value ?? rider.value ?? "", text: c.rider.text ?? "", rounds: c.rider.rounds ?? 1, isRounds: c.rider.recovery === "rounds",
      saveOptions: sel(abilities, c.rider.save ?? "con"), recoveryOptions: sel(recoveryMethods, c.rider.recovery ?? "save") } : null,
    damage: {
      formula: c.single ? combineAttacks(dmg.formula, multi) : dmg.formula, perAttack: dmg.formula, attacks: multi,
      readAt: dmg.level, column: { low: "Low", medium: "Medium", high: "High" }[dmg.column],
      penalty: [adv.damageLevel ? `Striker: +${adv.damageLevel}` : "", riderTier ? `Tier ${riderTier} rider: read ${riderTier === 1 ? 2 : 3} levels lower` : ""].filter(Boolean).join("; "),
      dc: riderDC(adv.klass, adv.dcs)
    }
  };
}

/* -------------------------------------------- */
/*  Jutsu                                       */
/* -------------------------------------------- */

export const blankJutsu = (adv = {}) => ({
  name: "", type: "offensive", rank: freeformRanks(adv.klass, adv.level).at(-1) ?? "D", discipline: "nin", keywords: ["ninjutsu"],
  range: "close", target: "single", shape: "sphere", resolve: "save", saveAbility: "dex", noDamageOnSave: false, lowestAttack: false,
  preestablished: 0, attacks: 1, damageType: "fire", effects: [], focus: "", focusTypes: [], focusKey: "", activation: "", cost: null
});

const DISC_KEYWORD = { nin: "ninjutsu", gen: "genjutsu", tai: "taijutsu" };

export function jutsuFromForm(f, prev = blankJutsu()) {
  const c = structuredClone(prev);
  if ( "name" in f ) c.name = String(f.name ?? "");
  if ( "type" in f && ["offensive", "defensive", "support"].includes(f.type) && f.type !== c.type ) {
    c.type = f.type;
    c.focus = "";
    c.effects = c.effects.slice(0, c.type === "offensive" ? 2 : 1);
    c.range = c.type === "defensive" ? "self" : c.type === "support" ? "close" : c.range === "self" ? "close" : c.range;
  }
  if ( "rank" in f && RANKS.includes(f.rank) ) c.rank = f.rank;
  if ( "discipline" in f && DISC_KEYWORD[f.discipline] && f.discipline !== c.discipline ) {
    c.keywords = c.keywords.filter(k => k !== DISC_KEYWORD[c.discipline]);
    c.discipline = f.discipline;
    if ( !c.keywords.includes(DISC_KEYWORD[c.discipline]) ) c.keywords.unshift(DISC_KEYWORD[c.discipline]);
  }
  const kw = Object.keys(f).filter(k => k.startsWith("kw."));
  if ( kw.length ) c.keywords = kw.filter(k => truthy(f[k])).map(k => k.slice(3));
  for ( const k of ["range", "target", "shape", "resolve", "saveAbility", "damageType", "focus", "focusKey", "activation"] ) if ( k in f ) c[k] = String(f[k] ?? "");
  if ( c.type !== "offensive" ) c.target = "single";
  for ( const k of ["noDamageOnSave", "lowestAttack"] ) if ( k in f ) c[k] = truthy(f[k]);
  if ( "preestablished" in f ) c.preestablished = [0, 1, 2].includes(Number(f.preestablished)) ? Number(f.preestablished) : 0;
  if ( "attacks" in f ) c.attacks = Math.min(6, Math.max(1, Number(f.attacks) || 1));
  if ( "cost" in f ) c.cost = f.cost === "" || f.cost == null ? null : Math.max(0, Number(f.cost) || 0);
  const types = Object.keys(f).filter(k => /^focusType\d$/.test(k)).sort().map(k => f[k]).filter(t => damageTypes[t]);
  if ( Object.keys(f).some(k => /^focusType\d$/.test(k)) ) c.focusTypes = [...new Set(types)];
  const max = c.type === "offensive" ? 2 : 1;
  const effects = [];
  for ( let i = 0; i < max; i++ ) {
    const key = `effect${i}Key` in f ? f[`effect${i}Key`] : c.effects[i]?.key;
    if ( !key || !freeformEffects[key] ) continue;
    const prevE = c.effects[i]?.key === key ? c.effects[i] : { recovery: "save", rounds: 1 };
    effects.push({ ...prevE, key,
      recovery: recoveryMethods[f[`effect${i}Recovery`]] ? f[`effect${i}Recovery`] : prevE.recovery ?? "save",
      rounds: `effect${i}Rounds` in f ? Math.min(2, Math.max(1, Number(f[`effect${i}Rounds`]) || 1)) : prevE.rounds ?? 1,
      value: `effect${i}Value` in f ? (f[`effect${i}Value`] === "" ? null : Number(f[`effect${i}Value`])) : prevE.value ?? null,
      text: `effect${i}Text` in f ? String(f[`effect${i}Text`] ?? "") : prevE.text ?? "" });
  }
  c.effects = effects;
  return c;
}

/** @param {{level, klass, name?: string}} adv */
export function jutsuVM(c, adv, { isEdit = false } = {}) {
  const suggested = freeformRanks(adv.klass, adv.level);
  const offensive = c.type === "offensive";
  const defensive = c.type === "defensive";
  const effects = [];
  const slots = offensive ? 2 : 1;
  for ( let i = 0; i < slots; i++ ) {
    const e = c.effects[i];
    const def = e ? freeformEffects[e.key] : null;
    effects.push({ i, n: i + 1, options: effectOptions(e?.key ?? ""), set: !!def, tier: def?.tier ?? null, isCustom: e?.key === "custom", hasValue: def?.kind === "effect",
      value: e?.value ?? def?.value ?? "", text: e?.text ?? "", rounds: e?.rounds ?? 1, isRounds: e?.recovery === "rounds",
      recoveryOptions: sel(recoveryMethods, e?.recovery ?? "save") });
  }
  const live = {};
  if ( offensive ) {
    const o = { area: c.target === "area", effects: c.effects.map(e => freeformEffects[e.key]?.tier).filter(Boolean),
      noDamageOnSave: c.resolve === "save" && c.noDamageOnSave, lowestAttack: c.resolve === "attack" && c.lowestAttack, preestablished: c.preestablished,
      damageBonus: adv.damageLevel ?? 0 };
    const d = jutsuDamage(adv.level, adv.klass, c.rank, o, c.resolve === "attack" ? c.attacks : 1);
    Object.assign(live, { kind: "damage", formula: d.formula, perAttack: d.perAttack, average: d.average, readAt: d.level,
      split: c.resolve === "attack" && c.attacks > 1, attacks: c.attacks,
      parts: effectiveLevel(adv.level, o).parts.map(p => ({ label: p.label, value: p.value > 0 ? `+${p.value}` : String(p.value) })),
      column: `${rankColumnLabel[c.rank]} (${d.table === "elite" ? "Elite and Solo" : "Minion and Standard"})` });
  } else if ( c.focus ) {
    const v = (defensive ? defensiveValue : supportValue)(c.focus, { rank: c.rank, klass: adv.klass, level: adv.level });
    Object.assign(live, { kind: "focus", value: v.value ?? "—", note: v.note ?? "", readAt: v.level ?? null });
  }
  const needsTypes = ["resistance", "immunity"].includes(c.focus);
  const typeSlots = needsTypes ? (c.type === "support" ? Math.max(1, Number(supportValue("resistance", { rank: c.rank }).value) || 1) : 1) : 0;
  return {
    isEdit, adversary: adv.name ?? "", level: adv.level, klass: adv.klass,
    name: c.name, isOffensive: offensive, isDefensive: defensive, isSupport: c.type === "support",
    typeOptions: sel({ offensive: "Offensive", defensive: "Defensive", support: "Support" }, c.type),
    rankOptions: RANKS.map(r => ({ value: r, label: `${r}-Rank${suggested.includes(r) ? "" : " (not suggested)"}`, selected: r === c.rank })),
    suggestedRanks: suggested.join(", "),
    disciplineOptions: sel({ nin: "Ninjutsu", gen: "Genjutsu", tai: "Taijutsu" }, c.discipline),
    keywordOptions: Object.entries(keywords).filter(([, k]) => !k.removed).map(([key, k]) => ({ key, label: k.label, checked: c.keywords.includes(key) })),
    rangeOptions: sel(Object.fromEntries(Object.entries(freeformRanges).filter(([k]) => offensive ? k !== "self" : true)), c.range),
    targetOptions: sel({ single: "Single target", area: "Area" }, c.target), isArea: c.target === "area",
    shapeOptions: sel(freeformShapes, c.shape), resolveOptions: sel({ attack: "Attack roll", save: "Saving throw" }, c.resolve),
    isAttack: c.resolve === "attack", saveOptions: sel(abilities, c.saveAbility || "dex"),
    noDamageOnSave: !!c.noDamageOnSave, lowestAttack: !!c.lowestAttack, attacks: c.attacks,
    preestablishedOptions: sel({ 0: "No", 1: "Builds on 1 effect", 2: "Builds on 2 effects" }, String(c.preestablished ?? 0)),
    damageTypeOptions: sel(damageTypes, c.damageType),
    focusOptions: [{ value: "", label: "Choose a focus", selected: !c.focus }, ...sel(defensive ? defensiveFocus : supportFocus, c.focus)],
    needsTypes, focusTypeSlots: Array.from({ length: typeSlots }, (_, i) => ({ i, options: sel(damageTypes, c.focusTypes[i] ?? "") })),
    needsAttackKey: c.focus === "attack", needsSkill: c.focus === "check",
    attackKeyOptions: sel({ all: "All attacks", nin: "Ninjutsu", gen: "Genjutsu", tai: "Taijutsu", buki: "Bukijutsu" }, c.focusKey || "all"),
    skillOptions: sel(skills, c.focusKey || "ath"),
    activationOptions: sel({ "": "The usual", action: "Action", bonus: "Bonus action", reaction: "Reaction" }, c.activation ?? ""),
    effects, live,
    cost: c.cost ?? "", bookCost: freeformCostFor(c.rank, adv.klass)
  };
}
