/**
 * Class & Clan Summons (King 2026-11-21): NPCs that class and clan features summon, in folders by
 * class and subclass like the features compendium. Writes packs/_source/summons.
 *   node tools/content/build-summons.mjs
 *
 * Each NPC is player-style (details.build "character") with the numbers its stat block gives.
 * Numbers that come from the summoner are links (flags.n5e.fromSummoner, rules/summoner-links.mjs)
 * that workflow/allied.mjs fills when the summon is placed.
 *
 * Sources: the Bunshin stat block (Scout-Nin Training Doc, Superior Clones); the Void Soul stat
 * block and rules (Superior Heart and Void Heart Mask, the imported Scout-Nin features); the
 * Duplicity (Beguiling Duplicity) and the Phantasm stat block (Phantasm, Illusionist) from the
 * imported Genjutsu Specialist features.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, "packs", "_source", "summons");
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const stableId = seed => `n5e${[...crypto.createHash("sha256").update(seed).digest().subarray(0, 13)].map(b => ALNUM[b % 62]).join("")}`;
const SKILLS = ["acr", "ani", "ath", "cha", "dec", "his", "ill", "ins", "itm", "inv", "mar", "med", "nat", "nin", "prc", "prf", "per", "slt", "ste", "sur"];
const SENSES = ["blindsight", "chakraSensing", "chakraSight", "darkvision", "tremorSense", "trueSight", "heatSense", "waterSense"];
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const STATS = { systemId: "n5e", systemVersion: JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8")).version, coreVersion: "13" };

const html = (...paras) => paras.map(p => (p.startsWith("<") ? p : `<p>${p}</p>`)).join("");

function folder(name, parent, seed) {
  const _id = stableId(`summons:folder:${seed}`);
  return { _id, _key: `!folders!${_id}`, name, type: "Actor", folder: parent, sorting: "a", sort: 0, color: null, description: "",
    flags: { n5e: { generated: true } } };
}

function item(actorId, name, category, description, activities = [], extra = {}) {
  const _id = stableId(`summons:${actorId}:${name}`);
  return { _id, _key: `!actors.items!${actorId}.${_id}`, name, type: "feat", img: extra.img ?? "icons/svg/aura.svg",
    system: { description, category, featureType: activities.length ? "active" : "passive", activities,
      activation: { type: extra.activation ?? (activities.length ? "action" : ""), cost: 1, condition: "" } },
    effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: { n5e: { generated: true } }, _stats: STATS };
}

function actor(seed, name, folderId, system, items, links, img) {
  const _id = stableId(`summons:actor:${seed}`);
  return { _id, _key: `!actors!${_id}`, name, type: "npc", img,
    system, items: items(_id), effects: [], folder: folderId, sort: 0, ownership: { default: 0 },
    flags: { n5e: { generated: true, fromSummoner: links } },
    prototypeToken: { name, actorLink: false, disposition: 1, displayName: 20, displayBars: 20, bar1: { attribute: "hp" }, bar2: { attribute: "cp" },
      texture: { src: img }, width: 1, height: 1 },
    _stats: STATS };
}

const act = (seed, label, type, body) => ({ id: stableId(`summons:act:${seed}:${label}`), type, label, ...body });

/* -------------------------------------------- */
/*  Folders                                     */
/* -------------------------------------------- */
const scout = folder("Scout-Nin", null, "scout-nin");
const cloning = folder("Cloning Scout", scout._id, "scout-nin/cloning-scout");
const voidHeart = folder("Void Heart Scout", scout._id, "scout-nin/void-heart-scout");

/* -------------------------------------------- */
/*  Bunshin (Cloning Scout)                     */
/* -------------------------------------------- */
// Its own level follows the summoner's, so each bonus below is the summoner's number less the Bunshin's
// own proficiency (its abilities are all +0): the totals come out as the summoner's.
const bunshinLinks = {
  "details.level": "@level",
  "attributes.ac.flat": "@dc.nin",
  // Bunshin Strike: your attack bonus with the cloned weapon (the higher of Str and Dex, as weapon attacks).
  "bonuses.attack.tai": "max(@str, @dex) + @bonuses.attack.weapon",
  // Bunshins Cast: your attack bonus and save DC.
  "bonuses.attack.nin": "@attack.nin - @prof",
  "bonuses.attack.gen": "@attack.gen - @prof",
  "bonuses.saveDC.nin": "@dc.nin - 8 - @prof",
  "bonuses.saveDC.gen": "@dc.gen - 8 - @prof",
  "bonuses.saveDC.tai": "@dc.tai - 8 - @prof",
  // Saves +0: cancel the half proficiency an unproficient save gets.
  "bonuses.save": "0 - floor(@prof / 2)",
  ...Object.fromEntries(SKILLS.map(k => [`skills.${k}.bonus`, `@skills.${k}.total`])),
  ...Object.fromEntries(SENSES.map(k => [`traits.senses.${k}`, `@senses.${k}`]))
};
const bunshinBio = html(
  "<p><em>Superior Clones (Cloning Scout, 3rd level).</em> When you summon a clone, you can summon a Bunshin instead, using this stat block. Up to 4 at once (6 at 10th, 8 at 17th); while you have Bunshins, you can't have clones from Clone jutsu. A Bunshin lasts 1 minute in combat or 1 hour outside it, can be up to 1 mile from you, and is dispelled if it enters combat in any other way. When one is dispelled, you learn what it knew.</p>",
  "<p><strong>Armor Class</strong> your Ninjutsu save DC · <strong>Hit Points</strong> 1 · <strong>Speed</strong> 30 ft.</p>",
  "<p><strong>Abilities</strong> STR, DEX, CON, INT, WIS, CHA: no modifier; saves +0. <strong>Skills</strong> uses its summoner's skills. <strong>Senses</strong> uses its summoner's senses.</p>",
  "<p><strong>Commands</strong> (yours): Where I say (once per turn, no action: all Bunshin move), Clone Strike (in place of an attack of your Attack action: a Bunshin Strike or Bunshins Cast), Split Focus (once per turn, Bonus action: a skill-based action or the Help action for an ally).</p>",
  "<p><strong>Linked to you when summoned:</strong> its level, AC, attack bonuses, save DCs, skills and senses are set from yours.</p>");
const bunshinItems = id => [
  item(id, "Limited Casting I", "npcTraits", html("The Bunshin can cast 1 jutsu from its caster's known list, after which it is dispelled. This increases to 2 at 10th and 3 at 17th level. Bunshins can only make one attack with a jutsu per casting, regardless of the number of attacks a jutsu asks for, and they can maintain concentration on jutsu they cast until the beginning of your next turn, after which they lose concentration.")),
  item(id, "Placement", "npcTraits", html("Bunshin you summon must be in a space within 60 feet of you.")),
  item(id, "Basic Tools", "npcTraits", html("The Bunshin has a basic version of one weapon its summoner has, void of any weapon seals. It uses this weapon (if any) as part of its Bunshin Strike. Its Bunshin Strike shares the range of this weapon. If no weapon, then it strikes unarmed.")),
  item(id, "Gang Up", "npcTraits", html("When more than one Bunshin is attacking or targeting the same target, you do not make multiple attacks and the target does not make multiple saving throws; instead consolidate their attacks into a single attack roll or saving throw. Increase Bunshin Strike's or Bunshins Cast damage by +4 for each Bunshin beyond the first.")),
  item(id, "Hiding In Plain Sight", "npcTraits", html("Bunshin are indiscernible from their summoner, so much so that not even Chakra Sight can tell them apart. When one or more Bunshin are active, hostile creatures must perform the Search action at disadvantage vs the summoner's Stealth DC to determine that the Bunshins are clones.")),
  item(id, "Bunshin Strike", "npcStrikes", html("<em>Melee or Ranged Weapon Attack:</em> your attack bonus with the Bunshin's cloned weapon to hit, reach (the weapon's range), one creature. <em>Hit:</em> 1d6 damage (the weapon's damage type). Gang Up: +4 damage for each Bunshin beyond the first."),
    [act("bunshin", "Bunshin Strike", "attack", { attack: { discipline: "tai", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d6", type: "" }] } })]),
  item(id, "Bunshins Cast", "npcAbilities", html("The Bunshin casts a jutsu on its summoner's known list of C-Rank or lower that doesn't have the Fuinjutsu or Combination keyword, using the caster's statistics to determine its attack bonus or save DC. If the jutsu deals damage, it deals an amount of damage by the rank the jutsu is cast at: D-Rank 2d6, C-Rank 3d6, B-Rank 4d6, A-Rank 5d6, S-Rank 6d6."),
    [["D", "2d6"], ["C", "3d6"], ["B", "4d6"], ["A", "5d6"], ["S", "6d6"]].map(([r, f]) =>
      act("bunshin-cast", `${r}-Rank damage`, "damage", { damage: { parts: [{ formula: f, type: "" }] }, text: `The jutsu's damage at ${r}-Rank.` })))
];
const bunshin = actor("bunshin", "Bunshin", cloning._id, {
  details: { build: "character", level: 1, template: "clone", creatureType: "humanoid", blurb: "Cloning Scout: Superior Clones", biography: bunshinBio, summonRole: "Bunshin" },
  abilities: Object.fromEntries(ABILITIES.map(k => [k, { value: 10 }])),
  attributes: { ac: { calc: "flat", flat: 10, formula: "" }, init: { bonus: "" } },
  traits: { size: "medium", speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false } },
  hpMax: 1, cpMax: 0, diesAtZero: true
}, bunshinItems, bunshinLinks, "icons/svg/mystery-man.svg");

/* -------------------------------------------- */
/*  Void Soul (Void Heart Scout)                */
/* -------------------------------------------- */
const voidLinks = {
  "details.level": "@level",
  // Hit Points: shares yours (damage to it is lost from your hit points; the bar shows your maximum).
  "hpMax": "@hp.max",
  "traits.speed.walk": "@speed",
  // Your saving throw proficiencies.
  ...Object.fromEntries(ABILITIES.map(k => [`saves.${k}.proficient`, `@saves.${k}.proficient`]))
};
const voidBio = html(
  "<p><em>Void Heart Mask (Void Heart Scout, 3rd level).</em> Your Void Soul, a manifestation of your ideal self, always wearing your mask. Summoned as a bonus action into your space; visible to all creatures. You command it by spending your Bonus Actions.</p>",
  "<p><strong>Medium Construct</strong>, unaligned. <strong>Armor Class</strong> 8 + Dex + Con + Prof · <strong>Hit Points</strong> shares yours · <strong>Speed</strong> equal to yours.</p>",
  "<p><strong>Ability modifiers</strong> (not scores): distribute +4, +3, +2, +2, +1, +0, one to each ability (set the scores to 18, 16, 14, 14, 12, 10 as you assign them; +1 each from Heat Riser at 9th). <strong>Condition Immunities</strong> Charmed. <strong>Senses</strong> Darkvision 30 ft., passive Perception 10.</p>",
  "<ul><li>It knows jutsu equal to your proficiency bonus, only ones you could qualify for (keywords, Hijutsu...) plus one keyword you lack (any one nature release or Medical). Switch them when you gain a level. They are on your known list, but only it can cast them; it qualifies with its own ability modifiers.</li>",
  "<li>Its speed is yours. Ending your turn more than 60 feet from it resummons it in your space.</li><li>It uses your chakra to cast its jutsu.</li>",
  "<li>Damage it takes is lost from your hit points; you make no concentration check for it.</li><li>It has your saving throw proficiencies. If you and it save against the same effect, you make one save and suffer the effect once.</li>",
  "<li>Dismiss it as a bonus action on your turn, or when you fall unconscious.</li></ul>",
  "<p><strong>Linked to you when summoned:</strong> its level (so its proficiency bonus), hit point maximum, speed and save proficiencies are set from yours.</p>");
const voidItems = id => [
  item(id, "Inexhaustible", "npcTraits", html("The Void Soul cannot cast jutsu or use effects that would increase its own ranks of exhaustion.")),
  item(id, "Shared Being", "npcTraits", html("Hit points shared with you: damage the Void Soul takes is lost from your hit points (apply it to you), with no concentration check for you. It uses your chakra for its jutsu.")),
  item(id, "Unarmed Strike", "npcStrikes", html("<em>Melee Weapon Attack:</em> Str + Prof to hit, reach 5 ft., one creature. <em>Hit:</em> 1d6 + Str bludgeoning damage."),
    [act("void-soul", "Unarmed Strike", "attack", { attack: { discipline: "tai", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d6 + @str", type: "bludgeoning" }] } })])
];
const voidSoul = actor("void-soul", "Void Soul", voidHeart._id, {
  details: { build: "character", level: 3, template: "summon", creatureType: "construct", blurb: "Void Heart Scout: Void Heart Mask", biography: voidBio, summonRole: "Void Soul" },
  abilities: Object.fromEntries(ABILITIES.map(k => [k, { value: 10 }])),
  attributes: { ac: { calc: "formula", flat: 10, formula: "8 + @dex + @con + @prof" }, init: { bonus: "" } },
  traits: { size: "medium", conditionImmune: ["charmed"], senses: { darkvision: 30 }, speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false } },
  disciplines: { tai: { ability: "str" } },
  cpMax: 0, diesAtZero: false
}, voidItems, voidLinks, "icons/svg/mystery-man-black.svg");


/* -------------------------------------------- */
/*  Genjutsu Specialist: Duplicity (Beguiler)   */
/* -------------------------------------------- */
const genjutsu = folder("Genjutsu Specialist", null, "genjutsu-specialist");
const beguiler = folder("Beguiler", genjutsu._id, "genjutsu-specialist/beguiler");
const illusionist = folder("Illusionist", genjutsu._id, "genjutsu-specialist/illusionist");
const DAMAGE = ["bludgeoning", "piercing", "slashing", "acid", "cold", "earth", "fire", "lightning", "poison", "wind", "chakra", "force", "necrotic", "psychic"];
const CONDITIONS = ["exhaustion", "envenomed", "burned", "chilled", "corroded", "shocked", "petrified", "bruised", "staggered", "bleed", "dazed", "shaken", "weakened",
  "concussed", "demoralized", "berserk", "charmed", "confused", "slowed", "sealed", "blinded", "dazzled", "invisible", "deafened"];
const STATES = ["prone", "grappled", "restrained", "suffocating", "incapacitated", "stunned", "unconscious"];
// A perfect visual illusion of yourself (King Q-D27): your look (flags.n5e.summonerLook), size and speeds.
const duplicityLinks = {
  "details.level": "@level",
  "attributes.ac.flat": "@dc.gen",
  "traits.size": "@size",
  "traits.speed.walk": "@speeds.walk",
  "traits.speed.fly": "@speeds.fly"
};
const duplicityBio = html(
  "<p><em>Beguiling Duplicity (Beguiler, 2nd level).</em> A perfect visual illusion of yourself, summoned as a Bonus Action into an unoccupied space you can see within 15 feet. It lasts 1 minute, or until you dismiss it on your turn (no action) or are incapacitated. Up to 3 at once; you command one at a time. It's intangible, doesn't occupy its space, and is a Genjutsu you cast of the highest rank you can cast.</p>",
  "<p><strong>Armor Class</strong> your Genjutsu save DC · <strong>Hit Points</strong> 1 (at 0 it's dispelled) · <strong>Speed</strong> your speed (no flying unless you can fly).</p>",
  "<p><strong>Linked to you when summoned:</strong> it looks like you (your token's name, image and size), and its level, AC, speed and fly speed are set from yours.</p>");
const duplicityItems = id => [
  item(id, "Displaced Genjutsu", "npcTraits", html("You can cast Genjutsu as if you were in the Duplicity's space, but you must use your own senses.")),
  item(id, "Illusory Body", "npcTraits", html("While the Duplicity doesn't occupy space it can be attacked. It has an AC equal to your Genjutsu Save DC and 1 hit point. If its hit points are reduced to 0, it is dispelled. Creatures cannot discern which of you are real unless they take the Identify Genjutsu skill-Action. A creature with Chakra Sight, Chakra Sensing, True Sight or Tremor Sense can always tell which of you are real, becoming immune to Illusory Distraction.")),
  item(id, "Illusory Distraction", "npcTraits", html("While you and your Duplicity are within 5 feet of the same hostile creature, melee attacks made by that creature always target your Duplicity first.")),
  item(id, "Moving Illusion", "npcTraits", html("As part of the action used to summon it and as a Bonus Action, you can move your Duplicity up to your movement speed to a space you can see within 120 feet of yourself. It cannot fly unless you have a fly speed."))
];
const duplicity = actor("duplicity", "Duplicity", beguiler._id, {
  details: { build: "character", level: 2, template: "summon", creatureType: "humanoid", blurb: "Beguiler: Beguiling Duplicity", biography: duplicityBio, summonRole: "Duplicity" },
  abilities: Object.fromEntries(ABILITIES.map(k => [k, { value: 10 }])),
  attributes: { ac: { calc: "flat", flat: 10, formula: "" }, init: { bonus: "" } },
  traits: { size: "medium", speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false } },
  hpMax: 1, cpMax: 0, diesAtZero: true
}, duplicityItems, duplicityLinks, "icons/svg/mystery-man.svg");
duplicity.flags.n5e.summonerLook = true;

/* -------------------------------------------- */
/*  Genjutsu Specialist: Phantasm (Illusionist) */
/* -------------------------------------------- */
// Ghastly Strike uses your Genjutsu attack bonus; abilities that need a save use your Genjutsu save
// DC. Its own abilities are all +0, so each bonus is your number less its own proficiency.
const phantasmLinks = {
  "details.level": "@level",
  "bonuses.attack.gen": "@attack.gen - @prof",
  "bonuses.saveDC.gen": "@dc.gen - 8 - @prof",
  "bonuses.save": "0 - floor(@prof / 2)",
  ...Object.fromEntries(SENSES.map(k => [`traits.senses.${k}`, `@senses.${k}`]))
};
const phantasmBio = html(
  "<p><em>Phantasm (Illusionist, 2nd level).</em> Your illusory ally. It begins Small and looks as you describe, always tinged black (a crow, a snake, a small version of yourself). Summon it as an Action and command it as a Bonus Action on your turn. One at a time (two from Phantasmic Double); summoning another dispels the previous one. More than 120 feet from you, it's dispelled. Abilities it uses that require a saving throw use your Genjutsu Save DC. Spending 1 Actualization Die recharges one of its Recharge abilities.</p>",
  "<p><strong>Illusion.</strong> <strong>Armor Class</strong> 20 · <strong>Hit Points</strong> 10 · <strong>Speed</strong> 30 ft.</p>",
  "<p><strong>Abilities</strong> STR, DEX, CON, INT, WIS, CHA: no modifier; saves +0. <strong>Damage Immunities</strong> all, except Psychic, Force and Necrotic. <strong>Condition Immunities</strong> all. <strong>Senses</strong> uses its summoner's senses.</p>",
  "<p><strong>Linked to you when summoned:</strong> its level, Genjutsu attack bonus, Genjutsu save DC and senses are set from yours.</p>");
const phantasmItems = id => [
  item(id, "Incorporeal Movement", "npcTraits", html("The phantasm can move through other creatures and objects as if they were difficult terrain. It takes 5 damage if it ends its turn inside an object.")),
  item(id, "Phantasmic Form", "npcTraits", html("This creature is a Visual illusory construct and cannot be detected with Tremor sense, Blindsight or any auditory senses.")),
  item(id, "Ghastly Strike", "npcStrikes", html("<em>Melee Weapon Attack:</em> +(Genjutsu Attack Bonus) to hit, reach 5 ft., one creature. <em>Hit:</em> 1d6 + 4 Psychic damage. On a critical Hit, the target gains +1 rank of Demoralized or Shaken."),
    [act("phantasm", "Ghastly Strike", "attack", { attack: { discipline: "gen", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d6 + 4", type: "psychic" }] } })]),
  item(id, "Maddening Echo (Recharge 5-6 or Recharge 1 Minute)", "npcAbilities", html("The Phantasm opens its mouth revealing a twisted hole of incomprehensible darkness, fear and misery. All creatures of your choice in a 15 feet cone originating from the Phantasm that isn't Blinded must make a Wisdom saving throw. Once the Phantasm uses this ability, it dispels itself.",
    "<strong>Success:</strong> Affected creature is able to resist this maddening effect. <strong>Failure:</strong> Affected creature suffers flashbacks to memories they never had taking 3d6 psychic damage and gaining 1 rank of Berserk. <strong>Critical Failure:</strong> Same a failure, but they take 4d6 psychic damage and gain 3 ranks of Berserk."),
    [act("phantasm", "Maddening Echo", "save", { save: { abilities: ["wis"], dc: { source: "gen" }, onSuccess: "none", resave: false },
      inflicts: [{ key: "berserk", kind: "condition", ranks: 1, label: "Berserk (3 on a critical failure)" }], text: "Failure: 3d6 psychic and 1 rank of Berserk. Critical failure: 4d6 and 3 ranks. The Phantasm then dispels itself." }),
     act("phantasm", "Maddening Echo: failure", "damage", { damage: { parts: [{ formula: "3d6", type: "psychic" }] } }),
     act("phantasm", "Maddening Echo: critical failure", "damage", { damage: { parts: [{ formula: "4d6", type: "psychic" }] } })])
];
const phantasm = actor("phantasm", "Phantasm", illusionist._id, {
  details: { build: "character", level: 2, template: "summon", creatureType: "construct", blurb: "Illusionist: Phantasm", biography: phantasmBio, summonRole: "Phantasm" },
  abilities: Object.fromEntries(ABILITIES.map(k => [k, { value: 10 }])),
  attributes: { ac: { calc: "flat", flat: 20, formula: "" }, init: { bonus: "" } },
  traits: { size: "small", immune: DAMAGE.filter(t => !["psychic", "force", "necrotic"].includes(t)), conditionImmune: CONDITIONS, stateImmune: STATES,
    speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false } },
  hpMax: 10, cpMax: 0, diesAtZero: true
}, phantasmItems, phantasmLinks, "icons/svg/mystery-man-black.svg");


/* -------------------------------------------- */
/*  Bakuton: Clay constructs (STD6e)            */
/* -------------------------------------------- */
// The Clay Spider, Clay Bird, Clay Centipede and Clay Dragon stat blocks (Bakuton Clan Jutsu). AC is a
// base plus your Ninjutsu ability modifier; hit points grow with the rank the jutsu was cast at.
const bakuton = folder("Bakuton", null, "bakuton");
const NIN_MOD = "(@dc.nin - 8 - @prof)";
const CLAY_IMMUNE = ["acid", "poison", "psychic"];
const MENTAL_SENSORY = ["berserk", "charmed", "confused", "demoralized", "shaken", "concussed", "blinded", "dazzled", "deafened"];
const shock = id => item(id, "Shock Weakness", "npcTraits", html("If this creature takes Lightning damage it cannot perform its Detonate attack, until the end of its casters next turn. It also cannot perform its Detonate attack while it has the Shocked condition."));
const boom = id => item(id, "Purpose to BOOM", "npcTraits", html("Once summoned this creature has 1 minute before it self Detonates. If it cannot Detonate after this 1-minute duration, it dispels itself."));
const detonate = (seed, id, text, ranks) => item(id, "Detonate", "npcAbilities", html(text),
  [act(seed, "Detonate", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "half", resave: false }, text: "Force damage by the rank it was summoned at; half on a success." }),
   ...ranks.map(([r, f]) => act(seed, `Detonate: ${r}`, "damage", { damage: { parts: [{ formula: f, type: "force" }] }, text: `Summoned at ${r}.` }))]);
const clay = (seed, name, size, acBase, hp, speed, abil, extra, items, bio, more = {}) => actor(seed, name, bakuton._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: `Bakuton: ${name}`, biography: bio, summonRole: name },
  abilities: Object.fromEntries(Object.entries(abil).map(([k, mod]) => [k, { value: 10 + 2 * mod }])),
  attributes: { ac: { calc: "flat", flat: acBase, formula: "" }, init: { bonus: "" } },
  traits: { size, immune: CLAY_IMMUNE, conditionImmune: [...MENTAL_SENSORY, ...(extra.exhaustion ? ["exhaustion"] : [])], stateImmune: extra.stunned ? ["stunned"] : [],
    ...(extra.vuln ? { vuln: ["lightning"] } : {}), speed: { walk: speed.walk, climb: speed.climb ?? 0, swim: 0, fly: speed.fly ?? 0, burrow: 0, hover: false } },
  hpMax: hp, cpMax: 0, diesAtZero: true, ...more
}, items, { "details.level": "@level", "attributes.ac.flat": `${acBase} + ${NIN_MOD}`, "hpMax": extra.hp,
  "bonuses.saveDC.nin": "@dc.nin - 8 - @prof", "bonuses.attack.nin": "@attack.nin - @prof",
  ...Object.fromEntries(SENSES.map(k => [`traits.senses.${k}`, `@senses.${k}`])) }, "icons/svg/mystery-man-black.svg");
const castBio = (jutsu, rest) => html(`<p><em>${jutsu} (Bakuton Hijutsu).</em> It uses your Ninjutsu attack bonus or Save DC when an effect calls for it. You command it as an Action or Bonus action.</p>`, rest,
  "<p><strong>Linked to you when summoned:</strong> its AC (base + your Ninjutsu ability modifier), hit points (by the rank you cast the jutsu at), Ninjutsu attack bonus and save DC, and your senses.</p>");
const clayStats = (ac, hp, speed, abil, vuln, immunities) => `<p><strong>Armor Class</strong> ${ac} + your ninjutsu ability modifier · <strong>Hit Points</strong> ${hp} · <strong>Speed</strong> ${speed}</p><p><strong>Abilities</strong> ${abil}. ${vuln ? "<strong>Damage Vulnerability</strong> Lightning. " : ""}<strong>Damage Immunities</strong> Acid, Poison, Psychic. <strong>Condition Immunities</strong> ${immunities}. <strong>Senses</strong> Relies on Caster senses.</p>`;

const spider = clay("clay-spider", "Clay Spider", "small", 10, 10, { walk: 30 }, { str: 0, dex: 0, con: 0, int: -5, wis: 0, cha: -5 },
  { hp: "10 + 10 * max(0, @rankValue - 2)", exhaustion: true, stunned: true },
  id => [shock(id), boom(id),
    item(id, "Silent Scurry", "npcTraits", html("When this creature is summoned, make a Stealth check using your highest jutsu modifier vs any hostile creature that can see you. On a success, then Clay Spider is Undetected by creatures that do not have Chakra sight or Chakra sense.")),
    item(id, "Scurry", "npcAbilities", html("The Spider takes the Dash and Disengage action as part of this action.")),
    item(id, "Grab", "npcAbilities", html("The Spider attempts to grab onto a creature and hold on to it with sacrificial intent. The target must make a Dexterity saving throw. On a failed save the creature has the spider hold on to it. The creature can attempt to pull the spider free by making a Strength saving throw, pulling the spider free on a success."),
      [act("clay-spider", "Grab", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "none", resave: false }, text: "Failure: the spider holds on (it pulls it free with a Strength save)." })]),
    detonate("clay-spider", id, "The Spider detonates, filling a 5-foot radius. All creatures in the radius takes force damage on a failed Dexterity saving throw or half as much on a success based on the rank the Spider(s) were summoned at. A creature the spider is grabbing makes their save at disadvantage. If more than one spider is Detonating and the same creature is within more than 1 radius, they make a single saving throw, but increase the damage they take by +2d6 for each Clay Spider explosion radius they are in. D-Rank/C-Rank: 3d6. B-Rank/A-Rank: 4d6. S-Rank: 5d6.",
      [["D/C-Rank", "3d6"], ["B/A-Rank", "4d6"], ["S-Rank", "5d6"]])],
  castBio("Explosion Release: Clay Spiders", clayStats(10, "10 + 10 for every rank above C-Rank", "30 ft.", "STR +0 (save +3), DEX +0 (+3), CON +0 (+3), INT −5, WIS +0, CHA −5", false, "All Mental, All Sensory, Stunned, Exhaustion") + "<p><strong>Skills</strong> Stealth.</p>"));
const bird = clay("clay-bird", "Clay Bird", "large", 12, 40, { walk: 0, fly: 45 }, { str: 2, dex: 4, con: 3, int: -5, wis: 0, cha: -5 },
  { hp: "40 + 10 * max(0, @rankValue - 2)", exhaustion: true, stunned: true, vuln: true },
  id => [shock(id), boom(id),
    item(id, "Flying Mount", "npcTraits", html("The Clay Birds primary purpose is to be a flying mount. A creature of your choice can mount the Clay Bird. When it does, replace the creatures movement with the Clay Birds. The Clay Bird moves with the mounted creature. If you are mounted to the Clay Bird, you cannot command it to move separate from you unless you dismount by spending 5 feet of your normal movement. Attacks targeting the mounted Creature does not harm the Clay Bird and attacks targeting the Clay Bird does not harm the mounted creature. A mounted creature can spend its reaction to switch targets causing either themselves or the Clay Bird to interpose an attack targeting the other. Effects that target an area affects both the Clay Bird and mounted creature as individuals.")),
    item(id, "Ram", "npcAbilities", html("If the Clay Bird flies in a straight line for at least 30 feet it can perform the Ram attack. All creatures in a straight line after the bird has moved at least 30 feet must succeed a Dexterity saving throw, taking 6d6 bludgeoning damage on a failed save or half as much on a success."),
      [act("clay-bird", "Ram", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "half", resave: false }, damage: { parts: [{ formula: "6d6", type: "bludgeoning" }] } })]),
    detonate("clay-bird", id, "The Clay Bird detonates in a beautiful incendiary display, filling a 10-foot radius centered on it. All creatures in the radius takes force damage on a failed Dexterity saving throw or half as much on a success based on the rank the Clay Bird was summoned at. If more than one Clay Bird is Detonating and the same creature is within more than 1 radius, they make a single saving throw, but increase the damage they take by +2d8 for each additional Clay Bird explosion radius they are in. D-Rank/C-Rank: 4d8. B-Rank/A-Rank: 5d8. S-Rank: 6d8.",
      [["D/C-Rank", "4d8"], ["B/A-Rank", "5d8"], ["S-Rank", "6d8"]])],
  castBio("Explosion Release: Clay Bird", clayStats(12, "40 + 10 for every rank above C-Rank", "45 ft. flying", "STR +2 (save +4), DEX +4 (+8), CON +3 (+7), INT −5, WIS +0, CHA −5", true, "All Mental, All Sensory, Stunned, Exhaustion")));
const centipede = clay("clay-centipede", "Clay Centipede", "large", 14, 30, { walk: 40, climb: 60 }, { str: 2, dex: 4, con: 3, int: -5, wis: 0, cha: -5 },
  { hp: "30 + 15 * max(0, @rankValue - 3)", vuln: true },
  id => [shock(id), boom(id),
    item(id, "Bug Bomb", "npcTraits", html("When this creature falls to 0 hit points it uses its Detonate attack as a reaction.")),
    item(id, "Pincers", "npcStrikes", html("<em>Multiattack.</em> The Clay Centipede can attack 2 times with its pincers. <em>Melee Weapon Attack:</em> reach 10 ft., one creature. <em>Hit:</em> 2d6 + 4 piercing damage."),
      [act("clay-centipede", "Pincers", "attack", { attack: { discipline: "nin", range: "melee", count: 2, bonus: "0" }, damage: { parts: [{ formula: "2d6 + 4", type: "piercing" }] } })]),
    item(id, "Body Wrap", "npcAbilities", html("The Centipede attempts to grapple onto a creature and hold it in place with sacrificial intent. The target must make a Dexterity saving throw. On a failed save the creature is Grappled by the centipede. The creature can attempt to free itself by spending its Action to; or at the end of its turn; make a Strength saving throw, breaking the grapple on a success."),
      [act("clay-centipede", "Body Wrap", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: [{ key: "grappled", kind: "state", ranks: 1, label: "Grappled" }] })]),
    detonate("clay-centipede", id, "The Clay Centipede detonates in a beautiful incendiary display, filling a 10-foot radius centered on it. All creatures in the radius takes force damage on a failed Dexterity saving throw or half as much on a success based on the rank the Clay Centipede was summoned at. If more than one Clay Centipede is Detonating and the same creature is within more than 1 radius, they make a single saving throw, but increase the damage they take by +2d6 for each additional Clay Centipede explosion radius they are in. B-Rank/A-Rank: 6d6. S-Rank: 8d6.",
      [["B/A-Rank", "6d6"], ["S-Rank", "8d6"]])],
  castBio("Explosion Release: Clay Centipede", clayStats(14, "30 + 15 for every rank above B-Rank", "40 ft., 60 ft. climb", "STR +2 (save +4), DEX +4 (+8), CON +3 (+7), INT −5, WIS +0, CHA −5", true, "All Mental, All Sensory")));
const dragon = clay("clay-dragon", "Clay Dragon", "huge", 16, 60, { walk: 0, fly: 40 }, { str: 5, dex: 4, con: 5, int: -5, wis: 0, cha: -5 },
  { hp: "60 + 25 * max(0, @rankValue - 4)", exhaustion: true, stunned: true, vuln: true },
  id => [shock(id), boom(id),
    item(id, "Flying Mount", "npcTraits", html("The Clay Dragon primary purpose is to be a flying mount. A creature of your choice can mount the Clay Dragon. When it does, replace the creatures movement with the Clay Dragon. The Clay Dragon moves with the mounted creature. If you are mounted to the Clay Dragon, you cannot command it to move separate from you unless you dismount by spending 5 feet of your normal movement. Attacks targeting the mounted Creature must instead target the Dragon and attacks targeting the Clay Dragon does not harm the mounted creature. Effects that target an area affects only the Clay Dragon.")),
    item(id, "Tail", "npcStrikes", html("<em>Multiattack.</em> The Clay Dragon can attack 2 times with its Tail. <em>Melee Weapon Attack:</em> reach 10 ft., one creature. <em>Hit:</em> 3d8 + 5 Earth damage."),
      [act("clay-dragon", "Tail", "attack", { attack: { discipline: "nin", range: "melee", count: 2, bonus: "0" }, damage: { parts: [{ formula: "3d8 + 5", type: "earth" }] } })]),
    item(id, "Explosive Breath", "npcAbilities", html("The Clay Dragon casts Explosion Release: Clay Missiles at C-Rank as if you had cast it, using your Ninjutsu attack bonus, save DC or ability Modifier when needed.")),
    detonate("clay-dragon", id, "The Clay Dragon detonates in a beautiful incendiary display, filling a 10-foot radius centered on it. All creatures in the radius takes force damage on a failed Dexterity saving throw or half as much on a success based on the rank the Clay Dragon was summoned at. A-Rank: 8d8. S-Rank: 12d8.",
      [["A-Rank", "8d8"], ["S-Rank", "12d8"]])],
  castBio("Explosion Release: Clay Dragon", clayStats(16, "60 + 25 for every rank above A-Rank", "40 ft. flying", "STR +5 (save +11), DEX +4 (+10), CON +5 (+11), INT −5, WIS +0, CHA −5", true, "All Mental, All Sensory, Stunned, Exhaustion") + "<p><strong>DR</strong> 6. <strong>Jutsu Slots</strong> 4.</p>"));
dragon.system.traits.dr = 6;

// The Blood Dragon (Chinoike Hijutsu Blood Dragon Ascension, A-Rank): it uses your highest jutsu attack bonus and save DC.
const chinoike = folder("Chinoike", null, "chinoike");
const HIGH_DC = "max(@dc.nin, @dc.tai, @dc.gen) - 8 - @prof", HIGH_ATK = "max(@attack.nin, @attack.tai, @attack.gen) - @prof";
const bloodDragon = actor("blood-dragon", "Blood Dragon", chinoike._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Chinoike: Blood Dragon", summonRole: "Blood Dragon",
    biography: html("<p><em>Blood Dragon Ascension (Chinoike Hijutsu).</em> You command the Dragon, and it only listens to you (no action needed). It uses your highest jutsu attack bonus or Save DC. It takes its turn immediately after yours.</p>",
      "<p><strong>Gargantuan Construct, Unaligned.</strong> <strong>Armor Class</strong> 21 · <strong>Hit Points</strong> 100 · <strong>Speed</strong> 40 ft.</p>",
      "<p><strong>Abilities</strong> STR +6 (save +11), DEX +1 (+7), CON +6 (+11), INT −5, WIS +0, CHA −5 (−5). <strong>Damage Vulnerabilities</strong> Earth. <strong>Damage Resistances</strong> Bludgeoning, Piercing, Slashing. <strong>Damage Immunities</strong> Fire, Poison. <strong>Condition Immunities</strong> Bleeding, Bruised, All Mental and Sensory, Paralyzed, Petrified, Envenomed. <strong>Senses</strong> Blindsight 60 ft., Passive Perception 10.</p>",
      "<p><strong>Linked to you when summoned:</strong> its attack bonus and save DC (your highest jutsu ones).</p>") },
  abilities: { str: { value: 22 }, dex: { value: 12 }, con: { value: 22 }, int: { value: 1 }, wis: { value: 10 }, cha: { value: 1 } },
  attributes: { ac: { calc: "flat", flat: 21, formula: "" }, init: { bonus: "" } },
  traits: { size: "gargantuan", vuln: ["earth"], resist: ["bludgeoning", "piercing", "slashing"], immune: ["fire", "poison"],
    conditionImmune: ["bleed", "bruised", "envenomed", "petrified", ...MENTAL_SENSORY], speed: { walk: 40, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false },
    senses: { blindsight: 60 } },
  hpMax: 100, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Ineffable Makeup", "npcTraits", html("The Blood Dragon cannot be dispelled by any jutsu of A-Rank or Lower.")),
  item(id, "Liquid Body", "npcTraits", html("Creatures are able to pass through the body of the Blood Dragon at its summoner's discretion. If a creature ends their turn in your space, they are immediately ejected out of you in a space that can hold them.")),
  item(id, "Bite", "npcStrikes", html("<em>Multiattack.</em> The Blood Dragon can attack 2 times with its Bite or Hydra Bullet. <em>Melee Weapon Attack:</em> reach 10 ft., one creature. <em>Hit:</em> 3d10 + 6 Cold or Necrotic damage (pick one)."),
    [act("blood-dragon", "Bite", "attack", { attack: { discipline: "nin", range: "melee", count: 2, bonus: "0" }, damage: { parts: [{ formula: "3d10 + 6", type: "necrotic" }] }, text: "Cold or necrotic (pick one)." })]),
  item(id, "Hydra Bullet", "npcStrikes", html("<em>Ranged Weapon Attack:</em> Range (60/120), one creature. <em>Hit:</em> 4d6+6 Cold or Necrotic damage (pick one)."),
    [act("blood-dragon", "Hydra Bullet", "attack", { attack: { discipline: "nin", range: "ranged", count: 2, bonus: "0" }, damage: { parts: [{ formula: "4d6 + 6", type: "necrotic" }] }, text: "Cold or necrotic (pick one)." })]),
  item(id, "Vicious Vortex", "npcAbilities", html("The heads of the dragon converge and form into a gargantuan torrent of water, ripping everything it touches to shreds. The dragon travels to a space within its movement speed, taking a specific path that you designate. Each creature within this path must make a Dexterity saving throw, taking 8d6 cold or necrotic damage (pick one) and having their movement speed reduced by half until the end of their next turn on a failure, or half as much damage and no further effects on a success."),
    [act("blood-dragon", "Vicious Vortex", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "half", resave: false }, damage: { parts: [{ formula: "8d6", type: "necrotic" }] }, text: "Cold or necrotic (pick one). Failure: half speed until the end of its next turn." })]),
  item(id, "Blood Ocean", "npcAbilities", html("<em>(Recharge 9-10).</em> The Blood Dragon casts Genjutsu: Numbing Blood Spear at B-Rank as if you had cast it twice, at two different locations. These castings cannot trigger their Blood Detonation, effects."), [], { uses: { max: "1", spent: 0, per: "", recharge: "9-10", staminaEligible: false } })
], { "details.level": "@level", "bonuses.saveDC.nin": HIGH_DC, "bonuses.attack.nin": HIGH_ATK }, "icons/svg/mystery-man-black.svg");

// The Steam Imp (Hozuki Hijutsu Steaming Danger: Tyranny, C-Rank): your Ninjutsu attack bonus and save DC.
const hozuki = folder("Hozuki", null, "hozuki");
const steamImp = actor("steam-imp", "Steam Imp", hozuki._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Hozuki: Steam Imp", summonRole: "Steam Imp",
    biography: html("<p><em>Steaming Danger: Tyranny (Hozuki Hijutsu).</em> You can command the imp as a bonus action on your turns. It uses your Ninjutsu attack bonus and Save DC for effects that require an attack or saving throw. Strength, Dexterity and Constitution saving throws this creature makes use your Ninjutsu ability modifier as its proficiency bonus.</p>",
      "<p><strong>Medium Construct, unaligned.</strong> <strong>Armor Class</strong> 14 + Your Ninjutsu Ability Modifier · <strong>Hit Points</strong> 10 · <strong>Speed</strong> 30 ft.</p>",
      "<p><strong>Abilities</strong> STR +7, DEX +3, CON +4, INT −5, WIS +0, CHA −5. <strong>Damage Immunities</strong> Cold, Fire. <strong>Condition Immunities</strong> All Mental, All Sensory, Chilled, Bleed, Envenomed. <strong>Senses</strong> passive Perception 10.</p>",
      "<p><strong>Linked to you when summoned:</strong> its AC (14 + your Ninjutsu ability modifier), Ninjutsu attack bonus and save DC.</p>") },
  abilities: { str: { value: 24 }, dex: { value: 16 }, con: { value: 18 }, int: { value: 1 }, wis: { value: 10 }, cha: { value: 1 } },
  attributes: { ac: { calc: "flat", flat: 14, formula: "" }, init: { bonus: "" } },
  traits: { size: "medium", immune: ["cold", "fire"], conditionImmune: ["chilled", "bleed", "envenomed", ...MENTAL_SENSORY], speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false } },
  hpMax: 10, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Mists Tyranny", "npcTraits", html("When the Steam Imp is reduced to 0 Hit points, it uses its Detonation ability.")),
  item(id, "Looping Destruction (B-Rank)", "npcTraits", html("At the beginning of your following turn, if the Steam Imp has detonated since the beginning of your last turn and you are concentrating on the jutsu used to summon the Steam Imp and either the Misty Hallucination, Water Balloon, or Demonic Illusion: Steaming Mirage Hijutsu, the Steam Imp is summoned again at no additional cost.")),
  item(id, "Growing Pains", "npcTraits", html("At the end of each of your turns, following the turn used to summon this Steam Imp, the Steam Imp grows in size by 1 stage. If the Steam Imp grows to be Huge, it uses the Detonation ability.")),
  item(id, "Arm Blade", "npcStrikes", html("<em>Multiattack (B-Rank).</em> The Steam can attack 2 times with its Arm Blade. <em>Melee Weapon Attack:</em> reach 5 ft., one creature. <em>Hit:</em> 1d12 + 7 Slashing damage. Beginning at A-Rank, this attack deals an additional +1d12 cold damage."),
    [act("steam-imp", "Arm Blade", "attack", { attack: { discipline: "nin", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d12 + 7", type: "slashing" }] }, text: "Two attacks at B-Rank or higher." }),
     act("steam-imp", "Arm Blade: A-Rank cold", "damage", { damage: { parts: [{ formula: "1d12", type: "cold" }] }, text: "Summoned at A-Rank or higher." })]),
  item(id, "Detonation", "npcAbilities", html("The Steam Imp cannot spend an action to use this ability. When the Steam Imp Detonates, its hit points are reduced to 0 and all creatures within 15 feet of it must make a Dexterity saving throw. On a failure, they take 6d6 cold damage and constructs and structures treat damage from this effect as if they are vulnerable. This increases by +1d6 for every rank beyond C-Rank."),
    [act("steam-imp", "Detonation", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "none", resave: false }, text: "Creatures within 15 feet. Failure: cold damage by rank (constructs and structures as if vulnerable)." }),
     ...[["C-Rank", "6d6"], ["B-Rank", "7d6"], ["A-Rank", "8d6"], ["S-Rank", "9d6"]].map(([r, f]) => act("steam-imp", `Detonation: ${r}`, "damage", { damage: { parts: [{ formula: f, type: "cold" }] }, text: `Summoned at ${r}.` }))])
], { "details.level": "@level", "attributes.ac.flat": `14 + ${NIN_MOD}`, "bonuses.saveDC.nin": "@dc.nin - 8 - @prof", "bonuses.attack.nin": "@attack.nin - @prof" }, "icons/svg/mystery-man-black.svg");

/* -------------------------------------------- */
export const SUMMONS = { bunshin, voidSoul, duplicity, phantasm, spider, bird, centipede, dragon, bloodDragon, steamImp, folders: [scout, cloning, voidHeart, genjutsu, beguiler, illusionist, bakuton, chinoike, hozuki] };

if ( import.meta.url === `file://${process.argv[1]}` ) {
  fs.rmSync(OUT, { recursive: true, force: true });
  const write = (rel, doc) => {
    const file = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  };
  write("scout-nin/_folder.json", scout);
  write("scout-nin/cloning-scout/_folder.json", cloning);
  write("scout-nin/void-heart-scout/_folder.json", voidHeart);
  write(`scout-nin/cloning-scout/bunshin-${bunshin._id}.json`, bunshin);
  write(`scout-nin/void-heart-scout/void-soul-${voidSoul._id}.json`, voidSoul);
  write("genjutsu-specialist/_folder.json", genjutsu);
  write("genjutsu-specialist/beguiler/_folder.json", beguiler);
  write("genjutsu-specialist/illusionist/_folder.json", illusionist);
  write(`genjutsu-specialist/beguiler/duplicity-${duplicity._id}.json`, duplicity);
  write(`genjutsu-specialist/illusionist/phantasm-${phantasm._id}.json`, phantasm);
  write("bakuton/_folder.json", bakuton);
  for ( const d of [spider, bird, centipede, dragon] ) write(`bakuton/${d.name.toLowerCase().replace(/\s+/g, "-")}-${d._id}.json`, d);
  write("chinoike/_folder.json", chinoike);
  write(`chinoike/blood-dragon-${bloodDragon._id}.json`, bloodDragon);
  write("hozuki/_folder.json", hozuki);
  write(`hozuki/steam-imp-${steamImp._id}.json`, steamImp);
  console.log(`✓ summons: 10 NPCs (${[bunshin, voidSoul, duplicity, phantasm, spider, bird, centipede, dragon, bloodDragon, steamImp].map(d => `${d.name} ${d._id}`).join(", ")})`);
}
