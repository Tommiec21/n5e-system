/**
 * Character sheet view models: actor in, plain data out. Templates only print what these return.
 * Pure (no Foundry calls), so every tab is tested in Node (dnd5e prepares context per part the same way).
 *
 * One function per sheet part, matching the templates in templates/actor/character/:
 *   headerVM → header.hbs     railVM → rail.hbs (left column on every tab)
 *   mainVM → main.hbs         jutsuVM → jutsu.hbs       inventoryVM → inventory.hbs
 *   featuresVM → features.hbs effectsVM → effects.hbs   biographyVM → biography.hbs
 *   (the Combat tab's model is view-models/combat.mjs)
 * The sheet (applications/actor/character-sheet.mjs) calls these in _prepareContext and puts the
 * result in the template's `vm`. To show something new: compute it in the actor's data model,
 * expose it here, print it in the template. Keep decisions out of templates.
 */
import { rule } from "../rules-settings.mjs";
import {
  abilities, skills, toolkits, castingDisciplines, disciplines, rankOrder, ranks as rankDefs, progression
} from "../config/core.mjs";
import { conditions as coreConditions, states } from "../config/conditions.mjs";
import { removalOptions } from "../rules/condition-lifecycle.mjs";
import { usesStamina } from "../rules/trackers.mjs";
import { jutsuSections } from "../config/jutsu.mjs";
import { containerTypes, consumableTypes } from "../config/equipment.mjs";
import { featCategories } from "../config/character.mjs";
import {
  signed, breakdownTooltip, glyph, keywordChip, componentChips, propertyChips, conditionSummary, pips
} from "./common.mjs";
import { AC_FORMULAS } from "../rules/ac.mjs";

// Small helpers shared by every part. `list` accepts arrays, Sets and Foundry Collections alike
// (tests pass arrays; Foundry passes Collections).
const list = items => (Array.isArray(items) ? items : [...(items ?? [])]);
const ofType = (actor, ...types) => list(actor.items).filter(i => types.includes(i.type));
const bd = (actor, key, opts) => breakdownTooltip(actor.system.breakdowns?.[key], opts);
const pct = (v, max) => (max > 0 ? Math.max(0, Math.min(100, Math.round((v / max) * 100))) : 0);
const flag = (doc, key) => (typeof doc.getFlag === "function" ? doc.getFlag("n5e", key) : doc.flags?.n5e?.[key]);

/* -------------------------------------------- */
/*  Header                                      */
/* -------------------------------------------- */

/** Name, portrait, level/XP, ability strip, Class / Clan / Background strip, rest buttons. */
export function headerVM(actor) {
  const sys = actor.system;
  const cls = sys.grants?.classItem;
  const clan = sys.grants?.clanItem;
  const bg = sys.grants?.backgroundItem;
  const xp = sys.details?.xp ?? 0;
  const next = sys.details?.xpNext ?? null;
  const affinities = [...(sys.grants?.affinities ?? [])].join(", ");
  const bubble = (kind, label, item, sub) => (item
    ? { kind, label, id: item.id, name: item.name, img: item.img, sub }
    : { kind, label, empty: true, name: `No ${label.toLowerCase()}` });
  return {
    name: actor.name,
    img: actor.img,
    level: sys.level,
    prof: signed(sys.prof),
    className: cls?.name ?? "No class",
    clanName: clan?.name ?? "No clan",
    backgroundName: bg?.name ?? "",
    subtitle: [`Level ${sys.level}`, cls?.name, clan?.name, bg?.name].filter(Boolean).join(" · "),
    xp: { value: xp, next, pct: next ? pct(xp, next) : 100 },
    classId: cls?.id ?? "",
    canLevelUp: !!cls && (cls.system.levels ?? 0) < 20,
    nextLevel: cls ? (cls.system.levels ?? 0) + 1 : 1,
    // Compact ability strip (SW5e-style): abbr, modifier, score.
    abilities: Object.entries(abilities).map(([key, cfg]) => ({
      key, abbr: cfg.abbr.toUpperCase(), label: cfg.label,
      value: sys.abilities[key].value, mod: signed(sys.abilities[key].mod)
    })),
    // Identity bubbles: Class, Clan, Background.
    origins: [
      bubble("class", "Class", cls, cls ? `Level ${cls.system.levels ?? sys.level}` : ""),
      bubble("clan", "Clan", clan, affinities ? `Affinity: ${affinities}` : "Clan"),
      bubble("background", "Background", bg, "Background")
    ]
  };
}

/* -------------------------------------------- */
/*  Left rail                                   */
/* -------------------------------------------- */

/** Terse recovery labels for the rail ("10min/Rest", "SR/LR"; King: no formulas). */
const RECOVERY = { rest10m: "10min/Rest", sr: "SR", lr: "LR", fr: "FR", rest: "SR/LR", turn: "Turn", turnStart: "Turn",
  round: "Round", encounter: "Encounter", initiative: "Initiative", day: "Day" };

/** "SR/LR" style note from a pool's or use's recovery keys (unique, in RECOVERY's wording). */
function recoveryNote(keys) {
  return [...new Set(keys.filter(k => k && RECOVERY[k]).map(k => RECOVERY[k]))].join("/");
}

/** Segments for a click-to-set bar; long pools fall back to a plain fill bar. */
const segments = (value, max) => (max > 0 && max <= 12 ? pips(value, max) : null);

/**
 * Everything the character spends and recovers, in one list for the rail:
 * Will of Fire, class/clan resource pools, then features with limited uses.
 */
export function resourcesVM(actor) {
  const sys = actor.system;
  const out = [{
    kind: "wof", id: "willOfFire", label: "Will of Fire", value: sys.willOfFire?.value ?? 0, max: 3,
    segments: pips(sys.willOfFire?.value ?? 0, 3), note: "", action: "setWillOfFire"
  }];
  for ( const [id, p] of Object.entries(sys.resources ?? {}).sort(([, a], [, b]) => (a.sort ?? 0) - (b.sort ?? 0)) ) {
    const max = p.maxValue ?? 0;
    if ( !max ) continue;
    out.push({ kind: "pool", id, label: p.label || id, value: p.value, max, pct: pct(p.value, max),
      segments: segments(p.value, max), note: recoveryNote((p.recovery ?? []).map(r => r.on)), action: "setPool" });
  }
  for ( const i of ofType(actor, "feat") ) {
    const max = Number(i.system.uses?.maxValue ?? i.system.uses?.max) || 0;
    if ( !max || usesStamina(i) ) continue;
    const value = Math.max(0, max - (i.system.uses.spent ?? 0));
    out.push({ kind: "uses", id: i.id, itemId: i.id, label: i.name, value, max, pct: pct(value, max),
      segments: segments(value, max), note: recoveryNote([i.system.uses.per]), action: "setUses" });
  }
  return out;
}

/**
 * The left rail: portrait, AC/SPD/Init/Prof/DR with hover math, HP/CP bars, Hit/Chakra Dice, death
 * saves at 0 HP, every resource and limited use (resourcesVM), and the conditions with their ranks
 * and "Try to end" buttons.
 */
export function railVM(actor, registry = coreConditions) {
  const sys = actor.system;
  const conditionList = [];
  for ( const e of list(actor.effects) ) {
    if ( e.type !== "condition" ) continue;
    const def = registry[e.system.key] ?? { label: e.name, maxRanks: null };
    const max = def.maxRanks;
    conditionList.push({
      id: e.id,
      key: e.system.key,
      label: def.label ?? e.name,
      ranks: e.system.ranks,
      max,
      ranked: max != null,
      pips: max != null ? pips(e.system.ranks, Math.min(max, 11)) : [],
      disabled: !!e.disabled,
      summary: conditionSummary(e.system.key, e.system.ranks, registry),
      removable: removalOptions(e, registry).some(o => o.checks.length)
    });
  }
  const stance = sys.combat?.activeStance
    ? list(actor.items).find(i => i.id === sys.combat.activeStance)?.name ?? "Unknown"
    : null;
  return {
    img: actor.img,
    name: actor.name,
    level: sys.level,
    prof: signed(sys.prof),
    resources: resourcesVM(actor),
    deathSaves: rule("deathSaves") && (sys.hp?.value ?? 1) <= 0 && actor.type === "character" ? {
      success: pips(sys.deathSaves?.success ?? 0, 3), failure: pips(sys.deathSaves?.failure ?? 0, 3),
      stable: !!actor.statuses?.has?.("stabilized"), dead: !!actor.statuses?.has?.("dead") } : null,
    hp: { value: sys.hp.value, max: sys.hp.max, temp: sys.hp.temp, pct: pct(sys.hp.value, sys.hp.max),
      bloodiedAt: Math.floor(sys.hp.max / 2), bloodied: !!sys.states?.bloodied, tip: bd(actor, "hp.max", { signedTotal: false }) },
    cp: { value: sys.cp.value, max: sys.cp.max, temp: sys.cp.temp, pct: pct(sys.cp.value, sys.cp.max),
      drainedAt: Math.floor(sys.cp.max / 2), drained: !!sys.states?.drained, tip: bd(actor, "cp.max", { signedTotal: false }) },
    ac: { value: sys.ac.value, label: AC_FORMULAS[sys.ac.calc]?.label?.split(" (")[0] ?? sys.ac.calc,
      tip: bd(actor, "ac", { signedTotal: false }).replace("</h4>",
        ` · ${AC_FORMULAS[sys.ac.calc]?.label?.split(" (")[0] ?? sys.ac.calc}</h4>`) },
    dr: { value: sys.dr, pierce: sys.pierce, tip: bd(actor, "dr", { signedTotal: false }) },
    initiative: { value: signed(sys.initiative.total), tip: bd(actor, "initiative") },
    profTip: breakdownTooltip({ label: "Proficiency Bonus", total: sys.prof,
      parts: [{ label: `Character level ${sys.level}`, value: sys.prof, base: true }] }),
    speed: { value: sys.speed?.walk ?? 0,
      tip: breakdownTooltip({ label: "Speed (ft)", total: sys.speed?.walk ?? 0,
        parts: Object.entries(sys.speed ?? {}).filter(([, v]) => v)
          .map(([k, v]) => ({ label: k === "walk" ? "Walk" : `${k[0].toUpperCase()}${k.slice(1)}`, value: v, base: true }))
          .concat(sys.inventory?.encumbered || sys.conditionPenalties?.flags?.speedMultiplier ? [{ label: "Halved", value: 0, base: true }] : []) },
      { signedTotal: false }), halved: !!sys.inventory?.encumbered || !!sys.conditionPenalties?.flags?.speedMultiplier,
      other: Object.entries(sys.speed ?? {}).filter(([k, v]) => k !== "walk" && v).map(([k, v]) => `${k} ${v}`).join(", ") },
    hitDice: { value: sys.hitDice.value, max: sys.hitDice.max, die: sys.hitDice.die || "—", pct: pct(sys.hitDice.value, sys.hitDice.max) },
    chakraDice: { value: sys.chakraDice.value, max: sys.chakraDice.max, die: sys.chakraDice.die || "—", pct: pct(sys.chakraDice.value, sys.chakraDice.max) },
    chain: pips(sys.combat?.chain?.value ?? 0, 3),
    concentration: { used: sys.combat?.concentrating?.length ?? 0, max: sys.concentration?.max ?? 2 },
    stance,
    conditions: conditionList,
    encumbered: !!sys.inventory?.encumbered
  };
}

/* -------------------------------------------- */
/*  Main tab                                    */
/* -------------------------------------------- */

/** Main tab: saving throws, skills (with tier and Mastery), toolkits, discipline attack/DC panels. */
export function mainVM(actor) {
  const sys = actor.system;
  const abilityCards = Object.entries(abilities).map(([key, cfg]) => ({
    key, abbr: cfg.abbr.toUpperCase(), label: cfg.label,
    value: sys.abilities[key].value,
    mod: signed(sys.abilities[key].mod),
    save: signed(sys.saves[key].total),
    saveProficient: !!sys.saves[key].isProficient,
    saveTip: bd(actor, `save.${key}`)
  }));
  const disciplineCards = castingDisciplines.map(key => ({
    key, label: disciplines[key].label,
    ability: abilities[sys.disciplines[key].ability]?.abbr ?? sys.disciplines[key].ability,
    attack: signed(sys.disciplines[key].attack), dc: sys.disciplines[key].dc,
    attackTip: bd(actor, `${key}.attack`), dcTip: bd(actor, `${key}.dc`, { signedTotal: false }),
    note: key === "tai" ? "also Bukijutsu" : ""
  }));
  const skillRows = Object.entries(skills).map(([key, cfg]) => {
    const s = sys.skills[key];
    return {
      key, label: cfg.label, ability: abilities[s.ability]?.abbr ?? s.ability,
      total: signed(s.total), passive: s.passive,
      proficient: !!s.isProficient, ownProficient: !!s.proficient, granted: !!s.isProficient && !s.proficient,
      mastery: s.mastery, masteryPips: pips(s.mastery, 3), tip: bd(actor, `skill.${key}`)
    };
  });
  const half = Math.ceil(skillRows.length / 2);
  const toolRows = Object.entries(toolkits)
    .filter(([key]) => sys.tools[key]?.isProficient)
    .map(([key, cfg]) => ({ key, label: cfg.label, mastery: sys.tools[key].mastery }));
  const pinIds = flag(actor, "pins") ?? [];
  const pinned = pinIds.map(id => list(actor.items).find(i => i.id === id)).filter(Boolean).map(i => ({
    id: i.id, name: i.name, img: i.img, type: i.type,
    glyph: glyph(i.system.activation)?.svg ?? "",
    detail: i.type === "jutsu" ? `${i.system.live?.cost ?? i.system.cost?.value ?? 0} CP` : ""
  }));
  return {
    abilities: abilityCards,
    disciplines: disciplineCards,
    asiAvailable: sys.mastery?.asiAvailable ?? 0,
    skillColumns: [skillRows.slice(0, half), skillRows.slice(half)],
    passives: {
      perception: sys.skills.prc?.passive, insight: sys.skills.ins?.passive, investigation: sys.skills.inv?.passive
    },
    toolkits: toolRows,
    pinned
  };
}

/* -------------------------------------------- */
/*  Jutsu tab                                   */
/* -------------------------------------------- */

/** "30 ft · 15 ft cone" style label from a jutsu's range and area. */
function rangeLabel(target) {
  const r = target?.range ?? {};
  const a = target?.area ?? {};
  let range = "";
  switch ( r.type ) {
    case "self": range = "Self"; break;
    case "touch": range = "Touch"; break;
    case "feet": range = r.value != null ? `${r.value} ft` : ""; break;
    case "miles": range = r.value != null ? `${r.value} mi` : ""; break;
    case "weapon": range = "Weapon"; break;
    case "unlimited": range = "Unlimited"; break;
    default: range = r.text || "Special";
  }
  const area = a.shape && a.size ? `${a.size} ft ${a.shape}` : "";
  return { range, area };
}

/**
 * @param {object} actor
 * @param {object} [state]  sheet UI state
 * @param {string} [state.discipline]  "" for all
 * @param {string} [state.search]
 * @param {Set<string>} [state.expanded]
 * @param {Record<string,string>} [state.castRank]
 */
export function jutsuVM(actor, { discipline = "", search = "", expanded = new Set(), castRank = {} } = {}) {
  const sys = actor.system;
  const all = ofType(actor, "jutsu");
  const q = search.trim().toLowerCase();
  const shown = all.filter(i => {
    if ( discipline && i.system.discipline !== discipline ) return false;
    if ( !q ) return true;
    const hay = [i.name, ...i.system.keywords].join(" ").toLowerCase();
    return hay.includes(q);
  });
  const order = ["nin", "tai", "gen", "buki"];
  const groups = order.map(dKey => {
    const items = shown.filter(i => i.system.discipline === dKey);
    if ( !items.length ) return null;
    const castKey = dKey === "buki" ? "tai" : dKey;
    const ranks = rankOrder.map(r => {
      const rows = items.filter(i => i.system.rank === r).sort((a, b) => a.name.localeCompare(b.name)).map(i => {
        const s = i.system;
        const live = s.live ?? {};
        const types = new Set((s.activities ?? []).map(a => a.type));
        const chosen = castRank[i.id] && live.upcastRanks?.includes(castRank[i.id]) ? castRank[i.id] : s.rank;
        const costAt = r2 => (typeof s.computeCost === "function" ? s.computeCost(sys, r2).cost : live.cost);
        const { range, area } = rangeLabel(s.target);
        const g = glyph(s.activation);
        const open = expanded.has(i.id);
        return {
          id: i.id, name: i.name, img: i.img,
          glyph: g?.svg ?? "", glyphLabel: g?.label ?? "",
          range, area,
          concentration: !!s.duration?.concentration,
          cost: costAt(chosen), costMode: s.cost.mode,
          hit: types.has("attack") ? signed(live.attack ?? 0) : null,
          dc: types.has("save") ? live.dc : null,
          chips: [...s.keywords].filter(k => !["ninjutsu", "taijutsu", "genjutsu", "bukijutsu"].includes(k)).map(k => keywordChip(k)),
          // Components as one short chip ("HS·CM·CS"); hover lists them in full.
          components: (() => {
            const cc = componentChips(s.components);
            return cc.length ? { label: cc.map(c => c.label).join("·"),
              tooltip: cc.map(c => c.tooltip).join("") } : null;
          })(),
          upcastTo: live.upcastRanks?.length ? live.upcastRanks.at(-1) : null,
          missingAccess: live.castable === false,
          unmetRequirement: live.meetsRequirement === false ? `Needs ${abilities[live.ability]?.abbr ?? live.ability} ${live.requirement}` : "",
          open,
          detail: open ? {
            description: s.description,
            chain: [1, 2, 3].map(n => ({ n, text: s.chainEffects?.[n] })).filter(c => c.text),
            finisher: s.finisher?.text || "",
            overcharge: s.overcharge?.text || "",
            upcast: s.upcast?.text || "",
            ranks: [s.rank, ...(live.upcastRanks ?? [])].map(r2 => ({ rank: r2, label: rankDefs[r2].label, cost: costAt(r2), selected: r2 === chosen })),
            duration: s.duration?.unit && s.duration.unit !== "instant"
              ? `${s.duration.concentration ? "Concentration, " : ""}${s.duration.value ?? ""} ${s.duration.unit}`.trim() : "Instant"
          } : null
        };
      });
      return rows.length ? { rank: r, label: rankDefs[r].label, rows } : null;
    }).filter(Boolean);
    return {
      key: dKey, label: disciplines[dKey].label,
      attack: signed(sys.disciplines[castKey].attack), dc: sys.disciplines[castKey].dc,
      ability: abilities[sys.disciplines[castKey].ability]?.abbr ?? "",
      attackTip: bd(actor, `${castKey}.attack`), dcTip: bd(actor, `${castKey}.dc`, { signedTotal: false }),
      ranks
    };
  }).filter(Boolean);
  const known = all.filter(i => i.system.learned?.mode !== "granted").length;
  const classItem = sys.grants?.classItem;
  const knownMax = classItem?.system?.jutsuKnownNow ?? null;
  return {
    groups,
    empty: all.length === 0,
    noMatches: all.length > 0 && groups.length === 0,
    filters: [{ key: "", label: "All" }, ...["nin", "tai", "gen", "buki"].map(k => ({ key: k, label: disciplines[k].label }))]
      .map(f => ({ ...f, active: f.key === discipline })),
    search,
    known, knownMax,
    maxRank: rankDefs[sys.grants?.maxRank ?? "D"]?.label ?? "",
    concentrating: (sys.combat?.concentrating ?? []).map(id => list(actor.items).find(i => i.id === id)?.name).filter(Boolean),
    concentrationMax: sys.concentration?.max ?? 2,
    sections: jutsuSections
  };
}

/* -------------------------------------------- */
/*  Inventory tab                               */
/* -------------------------------------------- */

/**
 * One inventory row: quantity, Bulk, equip toggle (items that can be equipped), Ammunition Die state
 * (face and steps) for weapons that use one, toolkit charge pips, and the row's tooltip.
 */
function gearRow(i) {
  const s = i.system;
  const row = {
    id: i.id, name: i.name, img: i.img, type: i.type, quantity: s.quantity ?? 1,
    bulk: (s.bulk ?? 0) * Math.max(1, s.quantity ?? 1), equipped: !!s.equipped,
    equippable: ["weapon", "armor", "container"].includes(i.type), subtitle: "", chips: [], seals: null, ammo: null, charges: null
  };
  if ( i.type === "weapon" ) {
    const dmg = `${s.damage.die} ${[...s.damage.types].join("/")}`.trim();
    const range = s.range?.normal ? ` · ${s.range.normal}${s.range.long ? `/${s.range.long}` : ""} ft` : "";
    row.subtitle = `${s.category} ${s.weaponType} · ${dmg}${range}`;
    row.chips = propertyChips(s.properties, "weapon");
    row.seals = { used: s.sealSlots?.used ?? 0, max: s.sealSlots?.max ?? 3 };
    if ( s.ammo?.usesDie ) {
      const steps = s.ammo.steps ?? [];
      const face = steps[s.ammo.step] ?? 0;
      row.ammo = { label: face > 1 ? `d${face}` : String(face), atMax: s.ammo.step <= 0,
        ladder: steps.map(f => (f > 1 ? `d${f}` : String(f))).join(" › ") };
    }
  } else if ( i.type === "armor" ) {
    row.subtitle = `${s.category} armor · +${s.armor.value} AC${s.dexCap != null ? ` · Dex max ${s.dexCap === 0 ? "none" : `+${s.dexCap}`}` : ""}`;
    row.chips = propertyChips(s.properties, "armor");
    row.seals = { used: s.sealSlots?.used ?? 0, max: s.sealSlots?.max ?? 3 };
  } else if ( i.type === "container" ) {
    row.subtitle = `${containerTypes[s.containerType]?.label ?? s.containerType} · +${s.slots ?? 0} slots`;
  } else if ( i.type === "toolkit" ) {
    const max = s.charges?.maxValue ?? 0;
    row.subtitle = `${s.rank ? `${s.rank}-Rank · ` : ""}charges don't recover`;
    row.charges = pips(s.charges?.value ?? 0, max).map((p, idx) => ({ ...p, idx }));
  } else if ( i.type === "consumable" ) {
    row.subtitle = consumableTypes[s.subtype] ?? s.subtype;
  }
  return row;
}

/** Inventory tab: gear grouped by type, Bulk vs slots, equip toggles, Ammunition Die controls. */
export function inventoryVM(actor) {
  const sys = actor.system;
  const physical = ofType(actor, "weapon", "armor", "consumable", "toolkit", "container", "loot");
  const rows = physical.map(gearRow);
  const byId = id => rows.find(r => r.id === id);
  const slots = sys.inventory?.slots ?? 0;
  const used = sys.inventory?.used ?? 0;
  const meterCount = Math.max(slots, Math.ceil(used));
  return {
    slots, used,
    over: used > slots,
    encumbered: !!sys.inventory?.encumbered,
    encumberedBy: sys.inventory?.encumberedBy ?? [],
    meter: Array.from({ length: meterCount }, (_, i) => ({ filled: i < used, over: i >= slots })),
    slotsTip: bd(actor, "inventory.slots", { signedTotal: false }),
    sections: [
      { key: "equipped", label: "Equipped", rows: physical.filter(i => ["weapon", "armor"].includes(i.type) && i.system.equipped).map(i => byId(i.id)) },
      { key: "carried", label: "Weapons & Armor", rows: physical.filter(i => ["weapon", "armor"].includes(i.type) && !i.system.equipped).map(i => byId(i.id)) },
      { key: "storage", label: "Storage", rows: physical.filter(i => i.type === "container").map(i => byId(i.id)) },
      { key: "toolkits", label: "Toolkits", rows: physical.filter(i => i.type === "toolkit").map(i => byId(i.id)) },
      { key: "consumables", label: "Consumables & Ninja Tools", rows: physical.filter(i => i.type === "consumable").map(i => byId(i.id)) },
      { key: "loot", label: "Loot", rows: physical.filter(i => i.type === "loot").map(i => byId(i.id)) }
    ].map(sec => ({ ...sec, empty: sec.rows.length === 0 })),
    ryo: sys.currency?.ryo ?? 0
  };
}

/* -------------------------------------------- */
/*  Features, Effects, Biography                */
/* -------------------------------------------- */

/** Labels for class option tags (sub-groups on the Features tab and compendium folders). */
export const OPTION_GROUPS = {
  "scout-path": "Shinobi\u2019s Path", "scout-generalization": "Generalization",
  "assault-maneuver": "Assault Maneuvers", "nin-molding": "Moldings"
};
const titleCase = s => s.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/**
 * Features tab: Class / Clan / Background strip, then Class features (core, subclass, one group per
 * option type), Clan, Feats by category, and Stances. Rows carry uses and feature choice pickers.
 */
export function featuresVM(actor) {
  const sys = actor.system;
  const feats = ofType(actor, "feat");
  const choiceVM = i => {
    const c = i.flags?.n5e?.choice;
    return c?.options ? { label: c.label, options: Object.entries(c.options).map(([value, label]) => ({ value, label, selected: value === c.value })), none: !c.value } : null;
  };
  const featRow = i => ({ id: i.id, name: i.name, img: i.img, glyph: glyph(i.system.activation)?.svg ?? "", choice: choiceVM(i),
    level: i.system.requirement?.level || "", passive: i.system.featureType === "passive",
    uses: i.system.uses?.max ? `${Math.max(0, (i.system.uses.maxValue ?? (Number(i.system.uses.max) || 0)) - i.system.uses.spent)} / ${i.system.uses.maxValue ?? i.system.uses.max}` : "" });
  const cls = sys.grants?.classItem;
  const clan = sys.grants?.clanItem;
  const bg = sys.grants?.backgroundItem;
  const subclass = list(actor.items).find(i => i.type === "subclass") ?? null;
  const subUuids = new Set(list(subclass?.system.advancement).flatMap(a => list(a.uuids)));
  const fromSubclass = i => {
    const origin = i.flags?.n5e?.advancement?.origin;
    if ( origin ) return subclass && origin === subclass.id;
    const src = i._stats?.compendiumSource ?? i.flags?.core?.sourceId;
    return !!src && subUuids.has(src);
  };
  const tagsOf = i => [...(i.system.tags ?? [])];
  const sub = (key, label, rows) => ({ key, label, rows, empty: !rows.length });
  const byLevel = (a, b) => (Number(a.level) || 0) - (Number(b.level) || 0) || a.name.localeCompare(b.name);

  // Class: core features, subclass features, then one sub-group per option type.
  const classFeats = feats.filter(i => ["classFeature", "class", "classOption"].includes(i.system.category));
  const options = classFeats.filter(i => i.system.category === "classOption");
  const optionTags = [...new Set(options.map(i => tagsOf(i)[0] ?? "option"))];
  const classSubs = [
    sub("core", "Core features", classFeats.filter(i => i.system.category !== "classOption" && !fromSubclass(i)).map(featRow).sort(byLevel)),
    ...(subclass ? [sub("subclass", subclass.name, classFeats.filter(i => i.system.category !== "classOption" && fromSubclass(i)).map(featRow).sort(byLevel))] : []),
    ...optionTags.map(t => sub(t, OPTION_GROUPS[t] ?? titleCase(t), options.filter(i => (tagsOf(i)[0] ?? "option") === t).map(featRow)
      .sort((a, b) => a.name.localeCompare(b.name))))
  ].filter(g => !g.empty || g.key === "core");

  // Feats by category.
  const general = feats.filter(i => !["classFeature", "class", "classOption", "clanFeature", "clan"].includes(i.system.category));
  const cats = [...new Set(general.map(i => i.system.category))];
  const featSubs = cats.map(c => sub(c, featCategories[c] ?? titleCase(c), general.filter(i => i.system.category === c).map(featRow)
    .sort((a, b) => a.name.localeCompare(b.name))));

  return {
    classCard: cls ? { id: cls.id, name: cls.name, levels: cls.system.levels, hitDie: cls.system.hitDie,
      chakraDie: cls.system.chakraDie, tier: cls.system.jutsuTier, subclass: subclass?.name ?? "" } : null,
    clanCard: clan ? { id: clan.id, name: clan.name, affinities: [...(sys.grants?.affinities ?? [])].join(", "),
      hijutsu: [...(clan.system.hijutsuAbilities ?? [])].map(a => ({ value: a, label: abilities[a]?.abbr ?? a,
        selected: clan.system.hijutsuChoice === a })),
      hijutsuChoice: clan.system.hijutsuChoice || "" } : null,
    backgroundCard: bg ? { id: bg.id, name: bg.name } : null,
    stances: ofType(actor, "stance").map(i => ({ id: i.id, name: i.name, active: sys.combat?.activeStance === i.id,
      categories: [...i.system.categories].join(", ") })),
    groups: [
      { key: "class", label: cls?.name ?? "Class features", subgroups: classSubs },
      { key: "clan", label: clan?.name ?? "Clan features", clan: true,
        subgroups: [sub("clan", "Clan features", feats.filter(i => ["clanFeature", "clan"].includes(i.system.category)).map(featRow).sort(byLevel))] },
      { key: "feats", label: "Feats", subgroups: featSubs.length ? featSubs : [sub("none", "", [])] }
    ]
  };
}

/** Effects tab: every Active Effect grouped (conditions, states, Amps, concentration, other). */
export function effectsVM(actor) {
  const rows = list(actor.effects).map(e => ({
    id: e.id, name: e.name, img: e.img, type: e.type, disabled: !!e.disabled,
    ranks: e.type === "condition" ? e.system.ranks : null,
    max: e.type === "condition" ? (coreConditions[e.system.key]?.maxRanks ?? null) : null,
    source: e.sourceName ?? "", duration: e.duration?.label ?? ""
  }));
  const group = (key, label, filter) => {
    const r = rows.filter(filter);
    return { key, label, rows: r, empty: r.length === 0 };
  };
  return {
    groups: [
      group("conditions", "Conditions", r => r.type === "condition"),
      group("states", "States", r => r.type === "state"),
      group("amps", "Amps", r => r.type === "amp"),
      group("concentration", "Concentration", r => r.type === "concentration"),
      group("other", "Other effects", r => !["condition", "state", "amp", "concentration"].includes(r.type))
    ],
    states
  };
}

/** Biography tab: the rich-text biography and the character details fields. */
export function biographyVM(actor) {
  const d = actor.system.details ?? {};
  return {
    fields: [
      { key: "ambition", label: "Ambition", value: d.ambition ?? "" },
      { key: "drive", label: "Drive", value: d.drive ?? "" },
      { key: "goals", label: "Goals", value: d.goals ?? "" },
      { key: "fears", label: "Fears", value: d.fears ?? "" },
      { key: "age", label: "Age", value: d.age ?? "" },
      { key: "village", label: "Village", value: d.village ?? "" },
      { key: "ninjaRank", label: "Ninja rank", value: d.ninjaRank ?? "" }
    ],
    biography: d.biography ?? ""
  };
}

/** XP needed for the next level (re-exported for the header). */
export const xpTable = progression.xpToLevel;
