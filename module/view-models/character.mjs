/**
 * Character sheet view models: actor in, plain data out. Templates only print what these return.
 * Pure (no Foundry calls), so every tab is tested in Node (dnd5e prepares context per part the same way).
 */
import {
  abilities, skills, toolkits, castingDisciplines, disciplines, rankOrder, ranks as rankDefs, progression
} from "../config/core.mjs";
import { conditions as coreConditions, states } from "../config/conditions.mjs";
import { jutsuSections } from "../config/jutsu.mjs";
import { containerTypes, consumableTypes } from "../config/equipment.mjs";
import { featCategories } from "../config/character.mjs";
import {
  signed, breakdownTooltip, glyph, keywordChip, componentChips, propertyChips, conditionSummary, pips
} from "./common.mjs";
import { AC_FORMULAS } from "../rules/ac.mjs";

const list = items => (Array.isArray(items) ? items : [...(items ?? [])]);
const ofType = (actor, ...types) => list(actor.items).filter(i => types.includes(i.type));
const bd = (actor, key, opts) => breakdownTooltip(actor.system.breakdowns?.[key], opts);
const pct = (v, max) => (max > 0 ? Math.max(0, Math.min(100, Math.round((v / max) * 100))) : 0);
const flag = (doc, key) => (typeof doc.getFlag === "function" ? doc.getFlag("n5e", key) : doc.flags?.n5e?.[key]);

/* -------------------------------------------- */
/*  Header                                      */
/* -------------------------------------------- */

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

const RECOVERY = { sr: "short rest", lr: "long rest", fr: "full rest", turn: "turn", round: "round", day: "day", encounter: "encounter" };

/** "back on a short or long rest" from a pool's recovery rows or a uses.per key. */
function recoveryNote(keys) {
  const labels = [...new Set(keys.filter(Boolean).map(k => RECOVERY[k] ?? k))];
  if ( !labels.length ) return "";
  if ( labels.length > 1 && labels.every(l => l.endsWith(" rest")) ) {
    const kinds = labels.map(l => l.replace(/ rest$/, ""));
    return `back on a ${kinds.slice(0, -1).join(", ")} or ${kinds.at(-1)} rest`;
  }
  return `back on a ${labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : labels[0]}`;
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
  for ( const [id, p] of Object.entries(sys.resources ?? {}) ) {
    const max = p.maxValue ?? 0;
    out.push({ kind: "pool", id, label: p.label || id, value: p.value, max, pct: pct(p.value, max),
      segments: segments(p.value, max), note: [p.max && !/^\d+$/.test(String(p.max)) ? String(p.max).replace(/@/g, "") : "",
        recoveryNote((p.recovery ?? []).map(r => r.on))].filter(Boolean).join(" · "), action: "setPool" });
  }
  for ( const i of ofType(actor, "feat") ) {
    const max = Number(i.system.uses?.maxValue ?? i.system.uses?.max) || 0;
    if ( !max ) continue;
    const value = Math.max(0, max - (i.system.uses.spent ?? 0));
    out.push({ kind: "uses", id: i.id, itemId: i.id, label: i.name, value, max, pct: pct(value, max),
      segments: segments(value, max), note: recoveryNote([i.system.uses.per]), action: "setUses" });
  }
  return out;
}

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
      summary: conditionSummary(e.system.key, e.system.ranks, registry)
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
    hp: { value: sys.hp.value, max: sys.hp.max, temp: sys.hp.temp, pct: pct(sys.hp.value, sys.hp.max),
      bloodiedAt: Math.floor(sys.hp.max / 2), bloodied: !!sys.states?.bloodied, tip: bd(actor, "hp.max", { signedTotal: false }) },
    cp: { value: sys.cp.value, max: sys.cp.max, temp: sys.cp.temp, pct: pct(sys.cp.value, sys.cp.max),
      drainedAt: Math.floor(sys.cp.max / 2), drained: !!sys.states?.drained, tip: bd(actor, "cp.max", { signedTotal: false }) },
    ac: { value: sys.ac.value, label: AC_FORMULAS[sys.ac.calc]?.label?.split(" (")[0] ?? sys.ac.calc,
      tip: bd(actor, "ac", { signedTotal: false }) },
    dr: { value: sys.dr, pierce: sys.pierce, tip: bd(actor, "dr", { signedTotal: false }) },
    initiative: { value: signed(sys.initiative.total), tip: bd(actor, "initiative") },
    speed: { value: sys.speed?.walk ?? 0, halved: !!sys.inventory?.encumbered || !!sys.conditionPenalties?.flags?.speedMultiplier,
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
          chips: [
            ...[...s.keywords].filter(k => !["ninjutsu", "taijutsu", "genjutsu", "bukijutsu"].includes(k)).map(k => keywordChip(k)),
            ...componentChips(s.components)
          ],
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
      row.ammo = (s.ammo.steps ?? []).map((face, idx) => ({ idx, label: face > 1 ? `d${face}` : (face === 1 ? "1" : "0"),
        current: idx === s.ammo.step }));
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

export function featuresVM(actor) {
  const sys = actor.system;
  const feats = ofType(actor, "feat");
  const featRow = i => ({ id: i.id, name: i.name, img: i.img, glyph: glyph(i.system.activation)?.svg ?? "",
    level: i.system.requirement?.level || "", passive: i.system.featureType === "passive",
    uses: i.system.uses?.max ? `${Math.max(0, (i.system.uses.maxValue ?? (Number(i.system.uses.max) || 0)) - i.system.uses.spent)} / ${i.system.uses.maxValue ?? i.system.uses.max}` : "" });
  const byCategory = cats => feats.filter(i => cats.includes(i.system.category)).map(featRow);
  const cls = sys.grants?.classItem;
  const clan = sys.grants?.clanItem;
  const bg = sys.grants?.backgroundItem;
  return {
    classCard: cls ? { id: cls.id, name: cls.name, levels: cls.system.levels, hitDie: cls.system.hitDie,
      chakraDie: cls.system.chakraDie, tier: cls.system.jutsuTier } : null,
    clanCard: clan ? { id: clan.id, name: clan.name, affinities: [...(sys.grants?.affinities ?? [])].join(", "),
      hijutsu: [...(clan.system.hijutsuAbilities ?? [])].map(a => ({ value: a, label: abilities[a]?.abbr ?? a,
        selected: clan.system.hijutsuChoice === a })),
      hijutsuChoice: clan.system.hijutsuChoice || "" } : null,
    backgroundCard: bg ? { id: bg.id, name: bg.name } : null,
    stances: ofType(actor, "stance").map(i => ({ id: i.id, name: i.name, active: sys.combat?.activeStance === i.id,
      categories: [...i.system.categories].join(", ") })),
    groups: [
      { key: "class", label: cls?.name ?? "Class features", rows: byCategory(["classFeature", "class"]) },
      { key: "clan", label: clan?.name ?? "Clan features", rows: byCategory(["clanFeature", "clan"]) },
      { key: "feats", label: "Feats", rows: feats.filter(i => !["classFeature", "class", "clanFeature", "clan"].includes(i.system.category)).map(i => ({ ...featRow(i), category: featCategories[i.system.category] ?? i.system.category })) }
    ].map(g => ({ ...g, empty: g.rows.length === 0 }))
  };
}

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
