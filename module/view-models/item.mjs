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
  weaponCategories, weaponGroups, weaponProperties, armorCategories, armorProperties, consumableTypes, containerTypes
} from "../config/equipment.mjs";
import { featCategories, featureKinds, jutsuTiers } from "../config/character.mjs";
import { keywordChip, componentChips, propertyChips, glyph, signed } from "./common.mjs";
import { n5eConfig } from "../rules/host.mjs";
import { effectFieldCatalog } from "../rules/effect-authoring.mjs";
import { describeChange, describeRule } from "../rules/plain-language.mjs";

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
  // UX1: extra.hint is a one-line definition under the field; extra.hints gives one per option of a
  // select (the sheet swaps it in when the choice changes).
  select: (src, path, label, choices, extra = {}) => {
    const options = opts(choices, get(src, path), extra).map(o => ({ ...o, hint: extra.hints?.[o.value] ?? "" }));
    const current = String(get(src, path) ?? "");
    return { kind: "select", path: `system.${path}`, label, options, ...extra, hint: extra.hints?.[current] || extra.hint || "", hinted: !!extra.hints };
  },
  /** Multi-pick from a registry, toggled one chip at a time (Set/Array fields). */
  tags: (src, path, label, choices, more = {}) => {
    const have = new Set(list(get(src, path)));
    const extra = [...have].filter(k => !(k in choices));
    return { kind: "tags", path: `system.${path}`, label, hint: more.hint ?? "",
      options: [...Object.entries(choices).map(([k, v]) => ({ value: k, label: labelOf(v) || k, selected: have.has(k) })),
        ...extra.map(k => ({ value: k, label: k, selected: true }))] };
  },
  /** NT1: a list of linked documents (uuids) the sheet fills by drag and drop, each with a remove button. */
  uuids: (src, path, label, nameOf, more = {}) => ({ kind: "uuids", path: `system.${path}`, label, hint: more.hint ?? "", accept: more.accept ?? "",
    items: list(get(src, path)).map((uuid, index) => ({ uuid, index, name: nameOf(uuid) })) }),
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

const section = (label, fields, extra = {}) => ({ label, fields: fields.filter(Boolean), ...extra });

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
/**
 * NT1: how a jutsu was learned: Class (counts toward Jutsu Known) or Bonus Jutsu from one of the owner's
 * features, feats or traits (or anything else, typed in). Old data: known = Class, granted = Bonus.
 */
function learnedSection(src, item) {
  const mode = ["granted", "bonus"].includes(src.learned?.mode) ? "bonus" : "class";
  const fields = [{ kind: "select", path: "system.learned.mode", label: "Learned as",
    options: [{ value: "class", label: "Class (counts toward Jutsu Known)", selected: mode === "class" },
      { value: "bonus", label: "Bonus Jutsu (feat, feature, trait...)", selected: mode === "bonus" }] }];
  if ( mode === "bonus" ) {
    const owner = item?.actor;
    const sources = owner ? list(owner.items?.contents ?? owner.items).filter(i => i.type === "feat" && i.id !== item.id) : [];
    if ( sources.length ) {
      const cur = src.learned?.source ?? "";
      const value = s => s._stats?.compendiumSource ?? s.flags?.core?.sourceId ?? s.id;
      const matched = sources.find(s => [s.id, value(s), s.uuid].includes(cur));
      fields.push({ kind: "select", path: "system.learned.source", label: "From",
        options: [{ value: "", label: "Other (type it below)", selected: !matched },
          ...sources.map(s => ({ value: value(s), label: s.name, selected: s === matched }))] });
    }
    fields.push(F.text(src, "learned.grantedBy", "Granted by", { placeholder: "e.g. a GM reward" }));
  }
  return section("Learned", fields);
}

const DETAILS = {
  jutsu: (src, { item } = {}) => [
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
    learnedSection(src, item)
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
    section("Groups", [F.tags(src, "groups", "", weaponGroups)]),
    section("Properties", [F.props(src, "properties", "", weaponProperties)]),
    "evocation" in (get(src, "properties") ?? {}) ? section("Evocation: sealed echo", [
      F.select(src, "evocation.discipline", "Echo", { "": "None sealed", nin: "Ninjutsu", gen: "Genjutsu", tai: "Weapon (Taijutsu)" }),
      F.select(src, "evocation.type", "Damage type", { "": "—", ...Object.fromEntries(Object.entries(damageTypes).map(([k, v]) => [k, v.label])) })
    ]) : null,
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
    ...(armorCategories[src.category]?.overlay ? [section("Worn over armor", [
      F.select(src, "overlay.ability", "In place of Dex", { "": "—", nin: "Ninjutsu ability", tai: "Taijutsu ability", gen: "Genjutsu ability",
        ...Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, v.label])) }),
      F.select(src, "overlay.fromDC", "Save DC as AC", { "": "—", nin: "Ninjutsu save DC", tai: "Taijutsu save DC", gen: "Genjutsu save DC" }),
      F.text(src, "overlay.whileState", "Only while in", { placeholder: "a state, e.g. realityShift" })
    ])] : []),
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
  feat: (src, { nameOf } = {}) => [
    section("Feature", [
      F.select(src, "category", "Kind", featureKinds),
      F.select(src, "featureType", "Kind", { active: "Active", passive: "Passive" }),
      F.num(src, "requirement.level", "Level", { small: true }),
      F.text(src, "requirement.class", "Class", { placeholder: "identifier" }),
      F.text(src, "requirement.clan", "Clan", { placeholder: "identifier" })
    ]),
    // LVL1 L4: structured prerequisites (unmet: grayed out in level-up, alert if taken anyway).
    section("Prerequisites", [
      ...Object.entries(abilities).map(([k, v]) => F.num(src, `requirement.abilities.${k}`, `${v.abbr?.toUpperCase?.() ?? k.toUpperCase()} at least`, { small: true })),
      F.tags(src, "requirement.skills", "Proficient in skills", Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, v.label]))),
      F.tags(src, "requirement.tools", "Proficient in toolkits", Object.fromEntries(Object.entries(toolkits).map(([k, v]) => [k, v.label]))),
      F.select(src, "requirement.affinity", "Affinity", { "": "—", fire: "Fire Release", water: "Water Release", wind: "Wind Release", earth: "Earth Release", lightning: "Lightning Release" }),
      F.select(src, "requirement.keyword", "Knows a jutsu with", { "": "—", ...Object.fromEntries(Object.entries(keywords).map(([k, v]) => [k, labelOf(v) || k]).sort((a, b) => a[1].localeCompare(b[1]))) }),
      F.uuids(src, "requirement.feats", "Has (feats or features)", nameOf ?? (u => u), { accept: "feat", hint: "Drag feats or features here." }),
      F.list(src, "prerequisites", "Other (judged by hand)")
    ]),
    section("Tags", [F.list(src, "tags", "Tags")]),
    section("Ability Score Increase", [
      F.tags(src, "asi.options", "Choose from", abilityChoices), F.num(src, "asi.amount", "Amount", { small: true })
    ]),
    // NT1: Bonus Jutsu: slots the player fills (with optional limits), and jutsu granted outright.
    section("Bonus Jutsu", [
      F.num(src, "bonusJutsu.count", "Slots", { small: true, hint: "Bonus Jutsu the character picks; they don't use the class's Jutsu Known." }),
      F.select(src, "bonusJutsu.maxRank", "Up to", { "": "Any rank", ...Object.fromEntries(rankOrder.map(r => [r, `${r}-Rank`])) }),
      F.select(src, "bonusJutsu.discipline", "Discipline", { "": "Any", ...Object.fromEntries(Object.entries(disciplines).map(([k, v]) => [k, v.label])) }),
      F.select(src, "bonusJutsu.section", "Section", { "": "Any", ...Object.fromEntries(Object.entries(jutsuSections).map(([k, v]) => [k, labelOf(v) || k])) }),
      F.check(src, "bonusJutsu.nature", "Needs a Nature Release keyword"),
      F.select(src, "bonusJutsu.minRank", "At least", { "": "Any rank", ...Object.fromEntries(rankOrder.map(r => [r, `${r}-Rank`])) }),
      F.text(src, "bonusJutsu.atLevels", "One more at levels", { placeholder: "e.g. 3, 9, 14", hint: "Instead of Slots: one slot at each of these character levels." }),
      F.select(src, "bonusJutsu.countBy", "Slots equal", { "": "the Slots number", prof: "the proficiency bonus" }),
      F.uuids(src, "bonusJutsu.uuids", "Only these jutsu", nameOf ?? (u => u), { accept: "jutsu", hint: "Drag jutsu here to limit the slots to them." }),
      F.text(src, "bonusJutsu.condition", "Only if already", { placeholder: "e.g. affinity:fire", hint: "affinity:<key>, skill:<key>, tool:<key> or save:<key>: the slots count only if the character already had it when this was gained." }),
      F.num(src, "bonusJutsu.aboveMax.count", "Above highest rank", { small: true, hint: "How many of the slots may be above the character's highest rank, up to:" }),
      F.select(src, "bonusJutsu.aboveMax.maxRank", "Up to (above)", { "": "—", ...Object.fromEntries(rankOrder.map(r => [r, `${r}-Rank`])) }),
      F.select(src, "bonusJutsu.keyword", "Keyword", { "": "Any", ...Object.fromEntries(Object.entries(keywords).map(([k, v]) => [k, labelOf(v) || k]).sort((a, b) => a[1].localeCompare(b[1]))) }),
      F.uuids(src, "grants.jutsu", "Granted jutsu", nameOf ?? (u => u), { accept: "jutsu", hint: "Drag jutsu here: they are granted outright as Bonus Jutsu when this is gained." })
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
  condition: src => [
    section("Condition card", [
      F.text(src, "identifier", "Identifier"),
      F.select(src, "owner.kind", "Belongs to", { class: "Class", clan: "Clan" }),
      F.text(src, "owner.id", "Class or clan", { placeholder: "identifier" }),
      F.text(src, "owner.subclass", "Subclass", { placeholder: "identifier (optional)" }),
      F.text(src, "summary", "Summary", { wide: true })
    ]),
    section("Rules", [
      F.tags(src, "tags", "Counts as", { physical: "Physical", mental: "Mental", sensory: "Sensory", elemental: "Elemental", fatigue: "Fatigue" }),
      F.num(src, "maxRanks", "Max ranks", { small: true, placeholder: "none" }),
      F.select(src, "endsAt", "Ends", { "": "After its duration (1 minute)", nextTurnEnd: "End of the creature's (next) turn", rest: "After its duration, or any rest, whichever comes first", fullRest: "A full rest (no other end)" }),
      F.check(src, "persists", "Persists"),
      F.num(src, "initiativeShift", "Initiative change", { small: true }),
      F.select(src, "resave.ability", "End-of-turn save", { "": "None", str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" }),
      F.select(src, "resave.source", "Save DC from", { "": "Fixed DC", highest: "Highest jutsu DC", tai: "Taijutsu", nin: "Ninjutsu", gen: "Genjutsu", buki: "Bukijutsu" }),
      F.num(src, "seconds", "Duration (seconds, 0 = 1 minute)", { small: true }),
      F.num(src, "resave.dc", "Fixed DC", { small: true })
    ])
  ],
  // AMP1a / UX1: Amp cards (rules/amp-cards.mjs), in plain sections; each field says what it is.
  // "What it does" (the buff in words) is added by itemVM, which can read the card's effects.
  amp: src => [
    section("What it is", [
      F.select(src, "ampType", "Amp type", { "": "No type", battle: "Battle", reflex: "Reflex", fortitude: "Fortitude", will: "Will", clan: "Clan" }, { hints: {
        "": "Not sorted yet. It counts toward Rule of 3's but never clashes under Singleton.",
        battle: "Attacks, damage, save DCs and actions.", reflex: "Dexterity, Intelligence, AC, speed and actions.",
        fortitude: "Strength, Constitution, AC or DR, resistances and immunities.", will: "Wisdom, Charisma, chakra costs, healing and mental protection.",
        clan: "From a clan feature or clan jutsu." } }),
      F.select(src, "owner.kind", "Belongs to", { any: "Anyone", class: "A class", subclass: "A subclass", clan: "A clan", feat: "A feat" }, { hints: {
        any: "Anyone can start it from the card; it isn't listed on any sheet's Amps panel.",
        class: "Listed on the Amps panel of characters with this class.", subclass: "Listed for characters with this subclass.",
        clan: "Listed for this clan's characters. Clan Amps always count as Clan for the limits.", feat: "Listed for characters with this feat." } }),
      F.text(src, "owner.id", "Which one", { placeholder: "identifier, e.g. inuzuka", hint: "The class, subclass, clan or feat's identifier." }),
      F.text(src, "summary", "Summary", { wide: true, hint: "One line shown on the card and its tooltip." })
    ], { structured: true }),
    section("Starting it", [
      F.select(src, "activation", "Takes", { "": "—", action: "An Action", bonus: "A Bonus Action", reaction: "A Reaction", initiative: "Rolling initiative", trigger: "A trigger" },
        { hint: "What starting it costs. Shown on the card; the table tracks the action." }),
      F.select(src, "startOnInitiative", "On rolling initiative", { "": "Don't start", ask: "Ask to start it", auto: "Start it automatically" }, { hints: {
        "": "It only starts when someone presses Activate or drags the card.", ask: "When its owner rolls initiative, they're asked whether to start it.",
        auto: "It starts by itself when its owner rolls initiative." } }),
      F.check(src, "giveable", "Can be given to others", { hint: "Unticked: giving it to another creature asks for confirmation first." }),
      F.text(src, "uses.max", "Uses", { small: true, placeholder: "unlimited", hint: "How many times it can start between rests: a number, or @prof." }),
      F.select(src, "uses.per", "Uses come back on", { "": "—", sr: "A Short Rest", lr: "A Long Rest", fr: "A Full Rest", day: "Each day" }),
      F.num(src, "cooldown", "Wait after it ends (seconds)", { small: true, hint: "It can't start again until this time passes. 600 = 10 minutes." })
    ], { structured: true }),
    section("How long it lasts", [
      F.num(src, "duration.seconds", "Duration (seconds)", { small: true, hint: "60 = 1 minute, 600 = 10 minutes, 3600 = 1 hour." }),
      F.select(src, "duration.until", "Or until", { "": "Its duration runs out", turnStart: "The start of your next turn", turnEnd: "The end of your turn",
        nextTurnEnd: "The end of your next turn", combatEnd: "The end of combat", rest: "Your next rest", dismissed: "You end it (no time limit)" }, { hints: {
        "": "Ends when the duration above runs out.", turnStart: "Ends when your next turn starts.", turnEnd: "Ends when this turn ends.",
        nextTurnEnd: "Ends at the end of your next turn.", combatEnd: "Lasts the whole fight, then ends.", rest: "Lasts until you take any rest.", dismissed: "No time limit: it lasts until you end it." } }),
      F.check(src, "duration.concentration", "Needs concentration", { hint: "Shown on the card. Tracked automatically only when started from a concentration jutsu." })
    ], { structured: true }),
    section("What ends it early", [
      F.tags(src, "endsOn", "Ends if you become", { staggered: "Staggered", blinded: "Blinded", unconscious: "Unconscious", noChakra: "Out of chakra (0)", stanceLeave: "Out of your stance", finisherCast: "Casting a Finisher" },
        { hint: "The GM's setting decides whether these end it automatically or as a reminder." })
    ], { structured: true }),
    section("Advanced", [
      F.text(src, "identifier", "Identifier", { hint: "The card's key. Activities name it to start this Amp." }),
      F.text(src, "namedType", "Type the book's box names", { hint: "Kept as a note when the limits use another type (a clan Amp is Clan)." }),
      F.check(src, "outsideLimits", "Outside the Amp limits", { hint: "Doesn't count toward Rule of 3's (DYNAMIC FORM!, Flawless)." }),
      F.text(src, "exclusive", "Exclusive group", { placeholder: "surge", hint: "Starting one Amp of the group ends the others (Crash and Flow)." }),
      F.text(src, "state", "Named state", { placeholder: "crash", hint: "A name other rules check while this is on." }),
      F.text(src, "tempHp", "Temporary HP", { placeholder: "formula", hint: "Temporary HP given when it starts, such as 2d6 + @level." }),
      F.text(src, "series", "Version of", { placeholder: "base Amp identifier", hint: "The identifier of the Amp this is a stronger version of. Blank: not a version." }),
      F.num(src, "level", "From level", { small: true, hint: "The character level this version starts at. A character gets the highest version their level reaches." }),
      F.text(src, "endsWith", "Ends with", { placeholder: "another Amp's identifier", hint: "This Amp ends when that Amp ends, and starting it frees that Amp from concentration. Blank: none." })
    ], { collapsed: true, structured: true })
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
      subtitle = `${ranks[s.rank]?.label ?? s.rank} ${disciplines[s.group ?? s.discipline]?.label ?? ""}${s.section ? ` · ${jutsuSections[s.section]?.label ?? s.section}` : ""}`;
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
      subtitle = `${featureKinds[s.category] ?? featCategories[s.category] ?? s.category}${s.requirement?.level ? ` · Level ${s.requirement.level}` : ""}`;
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
    case "condition":
      subtitle = `${s.owner?.kind === "clan" ? "Clan" : "Class"} condition${s.owner?.id ? ` · ${s.owner.id.replace(/-/g, " ")}` : ""}${s.owner?.subclass ? ` (${s.owner.subclass.replace(/-/g, " ")})` : ""}`;
      add("Counts as", list(s.tags).map(t => t[0].toUpperCase() + t.slice(1)).join(", "));
      add("Ranks", s.maxRanks == null ? "No ranks" : s.maxRanks === 0 ? "Unlimited" : `Up to ${s.maxRanks}`);
      add("Ends", s.endsAt === "nextTurnEnd" ? "End of its next turn" : s.persists ? "Persists" : "");
      chips = s.summary ? [{ label: "Drag onto a creature to apply", tone: "", tooltip: s.summary }] : [];
      break;
    case "amp": {
      const type = s.owner?.kind === "clan" ? "clan" : s.ampType;
      subtitle = `${type ? `${type[0].toUpperCase()}${type.slice(1)} Amp` : "Amp: no type"}${s.owner?.id ? ` · ${s.owner.id.replace(/-/g, " ")}` : ""}`;
      add("Box names", s.namedType && s.namedType !== type ? s.namedType : "");
      add("Uses", s.uses?.max ? `${s.uses.max}${s.uses.per ? ` per ${s.uses.per}` : ""}` : "");
      add("Ends on", list(s.endsOn).join(", "));
      add("Limits", s.outsideLimits ? "Doesn't count toward Rule of 3's" : "");
      chips = [{ label: "Drag onto a creature to start it", tone: "", tooltip: s.summary ?? "" }];
      break;
    }
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
  const details = (DETAILS[item.type]?.(source, { item, nameOf: nameOf ?? (u => u.split(".").at(-1)) }) ?? []).filter(Boolean);
  // UX1: an Amp card's buff in plain words, from its Changes, its effects and its roll rules.
  if ( item.type === "amp" ) details.splice(details.length - 1, 0, ampBuffSection(item, source));
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

/** UX1: "What it does" on an Amp card: one plain line per change and roll rule. */
function ampBuffSection(item, source) {
  const N5E = n5eConfig();
  const catalog = effectFieldCatalog(N5E);
  const effects = list(item.effects).filter(e => !e.disabled);
  const changes = [...list(source.changes), ...effects.flatMap(e => list(e.changes))];
  const rules = [...list(item.flags?.n5e?.rules), ...effects.flatMap(e => list(e.flags?.n5e?.rules))];
  const lines = [...changes.filter(c => c?.key).map(c => describeChange(c, catalog, N5E)), ...rules.map(r => describeRule(r, N5E))];
  return section("What it does", [{ kind: "lines", lines, empty: "Nothing yet. Press Edit to add what this Amp changes.", action: "editAmpBuff", actionLabel: lines.length ? "Edit" : "Add what it does" }]);
}

export { DETAILS, HTML_FIELDS };
