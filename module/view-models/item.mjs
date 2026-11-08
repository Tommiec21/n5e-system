/**
 * Item sheet view model (pure). One sheet serves all 13 item types: a header with a one-line summary,
 * a PF2e-style sidebar of key facts, typed Details fields per type, rich-text blocks, the advancement
 * table for classes/subclasses/clans, and effects. Templates only print what this returns.
 *
 * Adding an editable field to an item sheet: add it to the type's list in DETAILS below, using a
 * builder from F (text, num, check, select, chips...). The builder writes the field's "system.<path>"
 * as the input name, so the sheet saves it with no extra code. Values come from the item's _source
 * (what's stored), not the prepared data, so derived numbers never get saved back by accident.
 */
import { abilities, ranks, rankOrder, disciplines, skills, toolkits } from "../config/core.mjs";
import { keywords, jutsuSections, upcastPresets, stimuli } from "../config/jutsu.mjs";
import { activationTypes, rangeTypes, areaShapes, durationUnits, recoveryPeriods, damageTypes } from "../config/combat.mjs";
import {
  weaponCategories, weaponProperties, armorCategories, armorProperties, consumableTypes, containerTypes
} from "../config/equipment.mjs";
import { featCategories, jutsuTiers } from "../config/character.mjs";
import { keywordChip, componentChips, propertyChips, glyph, signed } from "./common.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
const labelOf = v => (typeof v === "object" ? v?.label ?? "" : v);
const opts = (choices, value, { blank = false } = {}) => [
  ...(blank ? [{ value: "", label: "—", selected: !value }] : []),
  ...Object.entries(choices).map(([k, v]) => ({ value: k, label: labelOf(v) || k, selected: String(value ?? "") === k }))
];

/* -------------------------------------------- */
/*  Field builders                              */
/* -------------------------------------------- */

// Field builders: each returns {kind, path, label, value, ...} that templates/item/details.hbs renders
// as the matching input. kind decides the control (text, number, checkbox, select, chips...).
const F = {
  text: (src, path, label, extra = {}) => ({ kind: "text", path: `system.${path}`, label, value: get(src, path) ?? "", ...extra }),
  num: (src, path, label, extra = {}) => ({ kind: "number", path: `system.${path}`, label, value: get(src, path) ?? "", ...extra }),
  check: (src, path, label, extra = {}) => ({ kind: "checkbox", path: `system.${path}`, label, value: !!get(src, path), ...extra }),
  select: (src, path, label, choices, extra = {}) => ({ kind: "select", path: `system.${path}`, label,
    options: opts(choices, get(src, path), extra), ...extra }),
  /** Multi-pick from a registry, toggled one chip at a time (Set/Array fields). */
  tags: (src, path, label, choices) => {
    const have = new Set(list(get(src, path)));
    const extra = [...have].filter(k => !(k in choices));
    return { kind: "tags", path: `system.${path}`, label,
      options: [...Object.entries(choices).map(([k, v]) => ({ value: k, label: labelOf(v) || k, selected: have.has(k) })),
        ...extra.map(k => ({ value: k, label: k, selected: true }))] };
  },
  /** Free list as comma-separated text. */
  list: (src, path, label) => ({ kind: "list", path: `system.${path}`, label, value: list(get(src, path)).join(", ") }),
  /** key -> rank map (weapon/armor properties). */
  props: (src, path, label, registry) => {
    const have = get(src, path) ?? {};
    return { kind: "props", path: `system.${path}`, label,
      options: Object.entries(registry).map(([k, def]) => ({ value: k, label: def.label, ranked: !!def.ranked,
        selected: k in have, rank: have[k] ?? 1, max: def.maxRank ?? 20 })) };
  }
};

const section = (label, fields) => ({ label, fields: fields.filter(Boolean) });

/** Activation, range/area, duration, uses: shared by jutsu, features, stances, weapons, consumables. */
function activatable(src, { duration = true, uses = true } = {}) {
  return [
    section("Activation", [
      F.select(src, "activation.type", "Type", activationTypes),
      F.num(src, "activation.value", "Amount", { small: true }),
      F.text(src, "activation.trigger.text", "Trigger", { wide: true, placeholder: "Reactions: when..." })
    ]),
    section("Target", [
      F.select(src, "target.range.type", "Range", rangeTypes),
      F.num(src, "target.range.value", "Feet", { small: true }),
      F.select(src, "target.area.shape", "Area", Object.fromEntries(Object.entries(areaShapes).map(([k, v]) => [k, v.label])), { blank: true }),
      F.num(src, "target.area.size", "Size", { small: true })
    ]),
    duration ? section("Duration", [
      F.select(src, "duration.unit", "Unit", durationUnits),
      F.num(src, "duration.value", "Amount", { small: true }),
      F.check(src, "duration.concentration", "Concentration")
    ]) : null,
    uses ? section("Limited uses", [
      F.text(src, "uses.max", "Max", { placeholder: "e.g. 1 + @prof", small: true }),
      F.select(src, "uses.per", "Per", recoveryPeriods, { blank: true }),
      F.num(src, "uses.spent", "Spent", { small: true })
    ]) : null
  ].filter(Boolean);
}

/** Quantity, Bulk, location and equipped: shared by every physical item (weapons, armor, gear...). */
function physical(src) {
  return section("Item", [
    F.num(src, "quantity", "Quantity", { small: true }),
    F.num(src, "bulk", "Bulk", { small: true }),
    F.num(src, "price", "Price (Ryo)", { small: true }),
    F.select(src, "rank", "Rank", Object.fromEntries(rankOrder.map(r => [r, ranks[r].label])), { blank: true }),
    F.check(src, "equipped", "Equipped"),
    F.select(src, "location", "Location", { carried: "Carried", stored: "Stored (sealed or left behind)" })
  ]);
}

/* -------------------------------------------- */
/*  Per type                                    */
/* -------------------------------------------- */

const rankChoices = Object.fromEntries(rankOrder.map(r => [r, ranks[r].label]));
const kwChoices = Object.fromEntries(Object.entries(keywords).filter(([, k]) => !k.removed).map(([k, v]) => [k, v.label]));
const abilityChoices = Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, v.label]));

/**
 * Details tab fields per item type, as sections of fields. A type with no entry shows no Details tab.
 * Order here is the order on the sheet.
 */
const DETAILS = {
  jutsu: src => [
    section("Jutsu", [
      F.select(src, "rank", "Rank", rankChoices),
      F.select(src, "discipline", "Discipline", Object.fromEntries(Object.entries(disciplines).map(([k, v]) => [k, v.label]))),
      F.select(src, "section", "Section", Object.fromEntries(Object.entries(jutsuSections).map(([k, v]) => [k, v.label])), { blank: true }),
      F.select(src, "ability", "Ability override", abilityChoices, { blank: true })
    ]),
    section("Cost", [
      F.select(src, "cost.mode", "Mode", { chakra: "Chakra", none: "None", special: "Special" }),
      F.num(src, "cost.value", "CP", { small: true }),
      F.text(src, "cost.text", "Special cost text"),
      F.select(src, "upcast.preset", "Upcasting", Object.fromEntries(Object.entries(upcastPresets).map(([k, v]) => [k, v.label])))
    ]),
    section("Keywords", [F.tags(src, "keywords", "", kwChoices)]),
    section("Components", [
      F.check(src, "components.hs", "Hand Seals"), F.check(src, "components.cm", "Chakra Molding"),
      F.check(src, "components.cs", "Chakra Seals"), F.check(src, "components.m", "Mobility"),
      F.check(src, "components.weapon.required", "Weapon"), F.check(src, "components.tool.required", "Ninja Tool"),
      F.text(src, "components.tool.text", "Tool", { placeholder: "e.g. Poison Kit, 1 Charge" })
    ]),
    src.discipline === "gen" ? section("Genjutsu", [
      F.tags(src, "stimuli", "Stimuli", Object.fromEntries(Object.entries(stimuli).map(([k, v]) => [k, v.label]))),
      F.check(src, "unaware", "Unaware")
    ]) : null,
    ...activatable(src, { uses: false }),
    section("Learned", [
      F.select(src, "learned.mode", "How", { known: "Known (counts toward Jutsu Known)", granted: "Granted (doesn't count)" }),
      F.text(src, "learned.grantedBy", "Granted by")
    ])
  ],
  weapon: src => [
    section("Weapon", [
      F.select(src, "category", "Category", weaponCategories),
      F.select(src, "weaponType", "Type", { melee: "Melee", ranged: "Ranged" }),
      F.text(src, "damage.die", "Damage", { small: true }),
      F.text(src, "damage.versatile", "Versatile", { small: true }),
      F.num(src, "range.normal", "Range", { small: true }), F.num(src, "range.long", "Long", { small: true }),
      F.check(src, "proficient", "Proficient")
    ]),
    section("Damage types", [F.tags(src, "damage.types", "", Object.fromEntries(Object.entries(damageTypes).map(([k, v]) => [k, v.label])))]),
    section("Properties", [F.props(src, "properties", "", weaponProperties)]),
    section("Ammunition Die", [F.check(src, "ammo.usesDie", "Uses an Ammunition Die")]),
    physical(src)
  ],
  armor: src => [
    section("Armor", [
      F.select(src, "category", "Category", Object.fromEntries(Object.entries(armorCategories).map(([k, v]) => [k, v.label]))),
      F.num(src, "armor.value", "AC bonus", { small: true }),
      F.num(src, "armor.dexCap", "Dex cap", { small: true, placeholder: "category" }),
      F.num(src, "strRequirement", "Str required", { small: true }),
      F.check(src, "proficient", "Proficient")
    ]),
    section("Properties", [F.props(src, "properties", "", armorProperties)]),
    physical(src)
  ],
  consumable: src => [
    section("Consumable", [
      F.select(src, "subtype", "Type", consumableTypes),
      F.num(src, "limit.max", "Limit", { small: true }), F.select(src, "limit.per", "Per", recoveryPeriods, { blank: true }),
      F.check(src, "destroyOnEmpty", "Remove when used up")
    ]),
    ...activatable(src),
    physical(src)
  ],
  toolkit: src => [
    section("Toolkit", [
      F.select(src, "kit", "Kit", Object.fromEntries(Object.entries(toolkits).map(([k, v]) => [k, v.label])), { blank: true }),
      F.num(src, "charges.value", "Charges", { small: true }),
      F.text(src, "charges.max", "Max charges", { small: true })
    ]),
    physical(src)
  ],
  container: src => [
    section("Storage", [
      F.select(src, "containerType", "Type", Object.fromEntries(Object.entries(containerTypes).map(([k, v]) => [k, v.label]))),
      F.num(src, "slots", "Slots", { small: true, placeholder: "type default" }),
      F.num(src, "sealsBulk", "Seals bulk", { small: true })
    ]),
    physical(src)
  ],
  loot: src => [physical(src)],
  feat: src => [
    section("Feature", [
      F.select(src, "category", "Category", featCategories),
      F.select(src, "featureType", "Kind", { active: "Active", passive: "Passive" }),
      F.num(src, "requirement.level", "Level", { small: true }),
      F.text(src, "requirement.class", "Class", { placeholder: "identifier" }),
      F.text(src, "requirement.clan", "Clan", { placeholder: "identifier" })
    ]),
    section("Prerequisites and tags", [F.list(src, "prerequisites", "Prerequisites"), F.list(src, "tags", "Tags")]),
    section("Ability Score Increase", [
      F.tags(src, "asi.options", "Choose from", abilityChoices), F.num(src, "asi.amount", "Amount", { small: true })
    ]),
    ...activatable(src)
  ],
  stance: src => [
    section("Stance", [
      F.tags(src, "categories", "Type", { taijutsu: "Taijutsu", bukijutsu: "Bukijutsu", chakra: "Chakra", clan: "Clan" }),
      F.text(src, "requirement", "Requirement", { wide: true })
    ]),
    ...activatable(src, { duration: false, uses: false })
  ],
  class: src => [
    section("Class", [
      F.text(src, "identifier", "Identifier"), F.num(src, "levels", "Levels", { small: true }),
      F.text(src, "hitDie", "Hit Die", { small: true }), F.text(src, "chakraDie", "Chakra Die", { small: true }),
      F.select(src, "jutsuTier", "Jutsu tier", jutsuTiers), F.num(src, "subclassLevel", "Subclass at", { small: true })
    ]),
    section("Saving throws", [F.tags(src, "saves", "", abilityChoices)]),
    section("Skills", [F.tags(src, "skills.fixed", "Always", Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, v.label]))),
      F.num(src, "skills.choose", "Choose", { small: true })]),
    section("Toolkits", [F.tags(src, "tools.fixed", "Always", Object.fromEntries(Object.entries(toolkits).map(([k, v]) => [k, v.label]))),
      F.num(src, "tools.choose", "Choose", { small: true })]),
    section("Proficiencies", [F.list(src, "armorProficiencies", "Armor"), F.list(src, "weaponProficiencies", "Weapons")])
  ],
  subclass: src => [section("Subclass", [F.text(src, "identifier", "Identifier"), F.text(src, "classIdentifier", "Class")])],
  clan: src => [
    section("Clan", [F.text(src, "identifier", "Identifier"), F.num(src, "speed", "Speed", { small: true }),
      F.tags(src, "hijutsuAbilities", "Hijutsu abilities", abilityChoices)]),
    section("Affinities", [F.list(src, "affinities.fixed", "Granted"), F.num(src, "affinities.choose", "Choose", { small: true })]),
    section("Skills", [F.tags(src, "skills.fixed", "Granted", Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, v.label])))])
  ],
  background: src => [
    section("Background", [
      F.tags(src, "skills", "Skills", Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, v.label]))),
      F.select(src, "tool", "Toolkit", Object.fromEntries(Object.entries(toolkits).map(([k, v]) => [k, v.label])), { blank: true }),
      F.select(src, "featCategory", "Feat from", { general: "General", skill: "Skill" }),
      F.text(src, "equipment", "Equipment", { wide: true })
    ])
  ]
};

/** Rich-text fields per type (Description tab), beyond the main description. */
const HTML_FIELDS = {
  jutsu: [["chainEffects.1", "Chain 1"], ["chainEffects.2", "Chain 2"], ["chainEffects.3", "Chain 3"],
    ["finisher.text", "Finisher"], ["overcharge.text", "Overcharge"], ["upcast.text", "At higher ranks"]],
  stance: [["upgrades.5", "5th level"], ["upgrades.10", "10th level"], ["evocation", "Evocation"], ["expertise", "Expertise"]],
  background: [["feature", "Background feature"]]
};

/* -------------------------------------------- */
/*  Header, sidebar                             */
/* -------------------------------------------- */

/** One-line summary under the item name, plus the sidebar's key facts and chips. */
function summary(item) {
  const s = item.system;
  const facts = [];
  const add = (label, value) => { if ( value !== "" && value != null ) facts.push({ label, value: String(value) }); };
  let subtitle = "";
  let chips = [];
  switch ( item.type ) {
    case "jutsu": {
      const live = s.live ?? {};
      subtitle = `${ranks[s.rank]?.label ?? s.rank} ${disciplines[s.discipline]?.label ?? ""}${s.section ? ` · ${jutsuSections[s.section]?.label ?? s.section}` : ""}`;
      add("Cost", s.cost?.mode === "chakra" ? `${live.cost ?? s.cost.value} CP` : (s.cost?.mode === "none" ? "None" : s.cost?.text || "Special"));
      add("Time", glyph(s.activation)?.label ?? activationTypes[s.activation?.type]);
      add("Range", s.target?.range?.type === "feet" ? `${s.target.range.value} ft` : rangeTypes[s.target?.range?.type] ?? "");
      if ( s.target?.area?.shape ) add("Area", `${s.target.area.size ?? ""} ft ${areaShapes[s.target.area.shape]?.label ?? s.target.area.shape}`);
      add("Duration", s.duration?.unit === "instant" ? "Instant"
        : `${s.duration?.concentration ? "Conc., " : ""}${s.duration?.value ?? ""} ${durationUnits[s.duration?.unit] ?? s.duration?.unit ?? ""}`.trim());
      if ( live.attack != null && item.actor ) { add("Attack", signed(live.attack)); add("Save DC", live.dc); }
      chips = [...list(s.keywords).filter(k => !["ninjutsu", "genjutsu", "taijutsu", "bukijutsu"].includes(k)).map(k => keywordChip(k)),
        ...componentChips(s.components)];
      break;
    }
    case "weapon":
      subtitle = `${weaponCategories[s.category] ?? s.category} ${s.weaponType} weapon`;
      add("Damage", `${s.damage?.die} ${list(s.damage?.types).map(t => damageTypes[t]?.label ?? t).join("/")}`);
      if ( s.range?.normal ) add("Range", `${s.range.normal}${s.range.long ? `/${s.range.long}` : ""} ft`);
      if ( s.ammo?.usesDie ) add("Ammunition Die", `d${s.ammo.steps?.[s.ammo.step] ?? 8}`);
      add("Bulk", s.bulk); add("Price", s.price ? `${s.price} Ryo` : "");
      chips = propertyChips(s.properties, "weapon");
      break;
    case "armor":
      subtitle = `${armorCategories[s.category]?.label ?? s.category} armor`;
      add("AC", `+${s.armor?.value}`); add("Dex cap", s.dexCap === 0 ? "None" : s.dexCap != null ? `+${s.dexCap}` : "");
      add("Str", s.strRequirement); add("Bulk", s.bulk); add("Price", s.price ? `${s.price} Ryo` : "");
      chips = propertyChips(s.properties, "armor");
      break;
    case "consumable":
      subtitle = consumableTypes[s.subtype] ?? s.subtype;
      add("Quantity", s.quantity); add("Time", glyph(s.activation)?.label ?? ""); add("Bulk", s.bulk);
      break;
    case "toolkit":
      subtitle = `${toolkits[s.kit]?.label ?? "Toolkit"}${s.rank ? ` · ${s.rank}-Rank` : ""}`;
      add("Charges", `${s.charges?.value ?? 0}${s.charges?.maxValue ? ` / ${s.charges.maxValue}` : ""}`); add("Bulk", s.bulk);
      break;
    case "container":
      subtitle = containerTypes[s.containerType]?.label ?? "Storage";
      add("Slots", `+${s.slots ?? containerTypes[s.containerType]?.slots ?? 0}`);
      break;
    case "loot":
      subtitle = "Loot"; add("Quantity", s.quantity); add("Price", s.price ? `${s.price} Ryo` : "");
      break;
    case "feat":
      subtitle = `${featCategories[s.category] ?? s.category}${s.requirement?.level ? ` · Level ${s.requirement.level}` : ""}`;
      add("Kind", s.featureType === "passive" ? "Passive" : (glyph(s.activation)?.label ?? "Active"));
      if ( s.uses?.max ) add("Uses", `${s.uses.max}${s.uses.per ? ` / ${recoveryPeriods[s.uses.per] ?? s.uses.per}` : ""}`);
      for ( const p of list(s.prerequisites) ) add("Prerequisite", p);
      if ( list(s.asi?.options).length ) add("ASI", `+${s.asi.amount || 1} ${list(s.asi.options).map(a => abilities[a]?.abbr ?? a).join("/")}`);
      chips = list(s.tags).map(t => ({ label: t.replace(/-/g, " "), tone: "", tooltip: "" }));
      break;
    case "stance":
      subtitle = `${list(s.categories).map(c => c[0].toUpperCase() + c.slice(1)).join(" / ")} stance`;
      add("Switch", "Bonus Action"); add("Requirement", s.requirement);
      break;
    case "class":
      subtitle = `${jutsuTiers[s.jutsuTier] ?? s.jutsuTier} jutsu tier${item.actor ? ` · Level ${s.levels}` : ""}`;
      add("Hit Die", s.hitDie); add("Chakra Die", s.chakraDie);
      add("Saves", list(s.saves).map(a => abilities[a]?.abbr ?? a).join(", "));
      add("Skills", [...list(s.skills?.fixed).map(k => skills[k]?.label ?? k), s.skills?.choose ? `choose ${s.skills.choose}` : ""].filter(Boolean).join(", "));
      add("Subclass at", s.subclassLevel ? `Level ${s.subclassLevel}` : "");
      break;
    case "subclass":
      subtitle = `Subclass${s.classIdentifier ? ` of ${s.classIdentifier.replace(/-/g, " ")}` : ""}`;
      break;
    case "clan":
      subtitle = "Clan";
      add("Speed", s.speed ? `${s.speed} ft` : "");
      add("Hijutsu", list(s.hijutsuAbilities).map(a => abilities[a]?.abbr ?? a).join(" / "));
      add("Affinity", list(s.affinities?.fixed).join(", ") || (s.affinities?.choose ? `choose ${s.affinities.choose}` : ""));
      break;
    case "background":
      subtitle = "Background";
      add("Skills", list(s.skills).map(k => skills[k]?.label ?? k).join(", ")); add("Toolkit", toolkits[s.tool]?.label ?? s.tool);
      break;
    default:
      break;
  }
  if ( s.source?.book ) add("Source", s.source.book);
  return { subtitle, facts, chips };
}

/* -------------------------------------------- */
/*  Advancement table                           */
/* -------------------------------------------- */

const ADV_LABEL = { feature: "Features", itemChoice: "Choose", option: "Choose", trait: "Grant", mastery: "Mastery" };

/**
 * @param {object} item
 * @param {(uuid: string) => string} [nameOf]  resolves a uuid to a name (sheet passes fromUuidSync)
 */
export function advancementVM(item, nameOf = u => u.split(".").at(-1)) {
  const s = item.system;
  if ( !Array.isArray(s.advancement) && !s.advancement?.length ) return null;
  const rows = list(s.advancement);
  const byLevel = new Map();
  for ( const a of rows ) {
    const names = a.type === "option" || a.type === "trait"
      ? list(a.uuids).map(v => disciplines[v]?.label ?? v)
      : a.type === "mastery" ? [skills[a.key?.split(".")[1]]?.label ?? a.key] : list(a.uuids).map(nameOf);
    const chosen = list(a.chosen).map(v => (String(v).startsWith("Compendium.") || String(v).includes(".Item.") ? nameOf(v) : disciplines[v]?.label ?? v));
    const entry = { title: a.title, kind: ADV_LABEL[a.type] ?? a.type, count: a.type === "feature" || a.count === 0 ? null : a.count,
      names: a.type === "itemChoice" && names.length > 6 ? [`${names.length} options`] : names, chosen };
    if ( !byLevel.has(a.level) ) byLevel.set(a.level, []);
    byLevel.get(a.level).push(entry);
  }
  if ( item.type === "class" ) {
    if ( s.subclassLevel ) {
      if ( !byLevel.has(s.subclassLevel) ) byLevel.set(s.subclassLevel, []);
      byLevel.get(s.subclassLevel).push({ title: "Subclass", kind: "Choose", count: 1, names: list(s.subclasses).map(nameOf), chosen: [] });
    }
    const known = list(s.jutsuKnown);
    for ( const lvl of [4, 8, 12, 16, 19] ) {
      if ( !byLevel.has(lvl) ) byLevel.set(lvl, []);
      byLevel.get(lvl).push({ title: "Ability Score Improvement / Feat", kind: "ASI", count: null, names: ["+1 ability, a feat, a Mastery rank"], chosen: [] });
    }
    return {
      levels: [...byLevel.keys()].sort((a, b) => a - b).map(l => ({ level: l, entries: byLevel.get(l),
        reached: item.actor ? l <= (s.levels ?? 0) : false,
        columns: [{ label: "Jutsu", value: known[l - 1] ?? "" }, { label: "Max rank", value: s.maxRank?.[l - 1] || "" },
          ...list(s.columns).map(c => ({ label: c.label, value: c.values?.[l - 1] ?? "" }))] }))
    };
  }
  return { levels: [...byLevel.keys()].sort((a, b) => a - b).map(l => ({ level: l, entries: byLevel.get(l), columns: [] })) };
}

/* -------------------------------------------- */
/*  Entry                                       */
/* -------------------------------------------- */

/**
 * @param {object} item          the item document (prepared)
 * @param {object} [o]
 * @param {object} [o.source]    item._source.system (editable values)
 * @param {(uuid: string) => string} [o.nameOf]
 */
export function itemVM(item, { source = item._source?.system ?? item.system, nameOf } = {}) {
  const sum = summary(item);
  const details = (DETAILS[item.type]?.(source) ?? []).filter(Boolean);
  // Extra rich-text blocks show when they have text, or when the item's keywords call for them
  // (Chain 1-3 on Chain jutsu, Finisher on Finisher jutsu, stance upgrades on stances).
  const kw = new Set(list(item.system.keywords));
  const relevant = path => (path.startsWith("chainEffects") ? kw.has("chain")
    : path === "finisher.text" ? kw.has("finisher") : item.type === "stance" && path.startsWith("upgrades"));
  const htmlFields = [["description", "Description"], ...(HTML_FIELDS[item.type] ?? [])].map(([path, label]) => ({
    path: `system.${path}`, label, html: get(item.system, path) ?? "", main: path === "description", relevant: relevant(path)
  }));
  const effects = list(item.effects).map(e => ({ id: e.id, name: e.name, img: e.img, disabled: !!e.disabled,
    transfer: !!e.transfer, changes: list(e.changes).length, type: e.type }));
  const hasAdvancement = ["class", "subclass", "clan", "background", "feat"].includes(item.type)
    && list(item.system.advancement).length > 0 || item.type === "class";
  return {
    name: item.name, img: item.img, type: item.type,
    subtitle: sum.subtitle, facts: sum.facts, chips: sum.chips,
    details, htmlFields,
    advancement: hasAdvancement ? advancementVM(item, nameOf) : null,
    effects,
    owned: !!item.actor
  };
}

export { DETAILS, HTML_FIELDS };
