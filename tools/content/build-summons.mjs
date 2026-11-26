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
 * imported Genjutsu Specialist features. Non-Elemental Ninjutsu summons and the Clone: the Summon Stat Blocks section (STD6f F6).
 */
import { totalLinks } from "../../module/rules/summoner-links.mjs";
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
    flags: { n5e: { generated: true, fromSummoner: totalLinks(links) } },
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

// The three Doki (Kashu Conductors Throne; stat blocks printed under Demonic Instrument: Chains of Fantasia).
const kashu = folder("Kashu", null, "kashu");
const HIGH_ATK2 = "max(@attack.nin, @attack.tai, @attack.gen) - @prof", HIGH_DC2 = "max(@dc.nin, @dc.tai, @dc.gen) - 8 - @prof";
const DOKI_TRAITS = id => [
  item(id, "Demonic Immunity", "npcTraits", html("Doki are immune to negative effects and damage inflicted by jutsu cast with the Auditory Ninja Tool.")),
  item(id, "Shared Proficiency", "npcTraits", html("The Doki’s proficiency bonus is equal to yours and uses it calculate its saving throws and it uses its summoners highest jutsu attack bonus or save DC for its calculations."))];
const revolt = (seed, id, dice) => item(id, "Revolt of the Demon World", "npcStrikes", html(`<em>Ranged Genjutsu Attack:</em> +Your attack bonus to hit, reach 30 ft., one target. <em>Hit:</em> ${dice} Psychic damage, and half as much chakra damage. This increases by +1d8 at 7th and 15th levels.`),
  [act(seed, "Revolt of the Demon World", "attack", { attack: { discipline: "gen", range: "ranged", count: 1, bonus: "0" }, damage: { parts: [{ formula: dice, type: "psychic" }] }, text: "Half as much chakra damage too; +1d8 at your 7th and 15th levels." })]);
const doki = (seed, name, ac, hp, hpLink, walk, abil, stats, items) => actor(seed, name, kashu._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "mutant", blurb: `Kashu: ${name}`, summonRole: name,
    biography: html(`<p><em>Conductors Throne (Kashu, Harmonic Branch).</em> Your Doki act as a bonus action on your turn. They use your proficiency bonus and your highest jutsu attack bonus or save DC.</p>`, `<p><strong>Large Mutant.</strong> ${stats}</p>`,
      "<p><strong>Linked to you when summoned:</strong> hit points, proficiency bonus, highest jutsu attack bonus and save DC, and your level. Add the AC increases at 7th and 15th by hand.</p>") },
  abilities: Object.fromEntries(Object.entries(abil).map(([k, mod]) => [k, { value: 10 + 2 * mod }])),
  attributes: { ac: { calc: "flat", flat: ac, formula: "" }, init: { bonus: "" } },
  traits: { size: "large", conditionImmune: [...MENTAL_SENSORY.filter(c => !["blinded", "dazzled", "deafened"].includes(c)), "exhaustion"], speed: { walk, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false }, senses: { blindsight: 30 } },
  hpMax: hp, cpMax: 0, diesAtZero: true
}, id => [...DOKI_TRAITS(id), ...items(id)], { "details.level": "@level", hpMax: hpLink, "bonuses.attack.gen": HIGH_ATK2, "bonuses.attack.tai": HIGH_ATK2, "bonuses.saveDC.gen": HIGH_DC2 }, "icons/svg/mystery-man-black.svg");
const dokiBandaged = doki("doki-bandaged", "Doki (Bandaged)", 16, 21, "20 + @level", 50, { str: 3, dex: 5, con: 4, int: -2, wis: 0, cha: 0 },
  "<strong>Armor Class</strong> 16 + 1 at 7th and 15th levels · <strong>Hit Points</strong> 20 + (Your Level) · <strong>Speed</strong> 50 ft. STR +3, DEX +5, CON +4, INT −2, WIS +0, CHA +0. <strong>Condition Immunities</strong> All Mental, Exhaustion. <strong>Saving Throws</strong> Dex, Con. <strong>Skills</strong> Athletics, Acrobatics, Perception (Mastery 2). <strong>Senses</strong> Blindsight 30 ft.",
  id => [revolt("doki-bandaged", id, "2d8"),
    item(id, "Multiattack", "npcAbilities", html("Doki (Bandaged) can make 2 attacks with Revolt of the Demon World.")),
    item(id, "Cursed Veil", "npcAbilities", html("The Bandaged Doki radiates a distorting aura of illusory chakra that warps the perceptions of nearby creatures. The first time a Hostile creatures moves or begins their turn within 10 feet of the Bandaged Doki, they must make a Wisdom saving throw. On a failure their AC and jutsu save DC is reduced by 2 and they cannot benefit from advantage on saving throws until the start of their next turn as the curse briefly unravels their mental defenses."),
      [act("doki-bandaged", "Cursed Veil", "save", { save: { abilities: ["wis"], dc: { source: "gen" }, onSuccess: "none", resave: false }, text: "Failure: −2 AC and jutsu save DC, no advantage on saves until the start of its next turn." })])]);
const dokiClub = doki("doki-club", "Doki (Club)", 16, 23, "20 + 3 * @level", 30, { str: 4, dex: 3, con: 5, int: -2, wis: 0, cha: 0 },
  "<strong>Armor Class</strong> 16 + 3 at 7th and 15th levels · <strong>Hit Points</strong> 20 + (Three times your level) · <strong>Speed</strong> 30 ft. STR +4, DEX +3, CON +5, INT −2, WIS +0, CHA +0. <strong>Condition Immunities</strong> All Mental, Exhaustion. <strong>Saving Throws</strong> Str, Con. <strong>Skills</strong> Athletics (Mastery 2), Acrobatics, Perception. <strong>Senses</strong> Blindsight 30 ft.",
  id => [revolt("doki-club", id, "1d8"),
    item(id, "Stalwart Interception", "npcTraits", html("Whenever an allied creature within 10 feet of this Doki would take damage from an attack, it can spend its Reaction to interpose. The Doki (Club) becomes the new target and takes the full damage instead.")),
    item(id, "Durable Demon", "npcTraits", html("The Doki (Club) reduces all damage it takes from area of effect attacks by an amount equal to its summoners level.")),
    item(id, "Club", "npcStrikes", html("<em>Melee Weapon Attack:</em> Your attack bonus to hit, reach 5 ft., one target. <em>Hit:</em> 1d10+4 Bludgeoning damage."),
      [act("doki-club", "Club", "attack", { attack: { discipline: "tai", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d10 + 4", type: "bludgeoning" }] } })]),
    item(id, "Earthshaker Slam", "npcAbilities", html("<em>(Recharge 5-6).</em> The Doki slams their hammer into the ground, all hostile creatures within 10 feet of it, must make a Dexterity saving throw. On a failure, they take 2d8 + 4 bludgeoning damage (+1d8 at 7th and 15th levels.) and their speed is reduced by 20 feet until the end of their next turn and are knocked Prone. While their speed is reduced in this way, they cannot benefit from bonuses to movement."),
      [act("doki-club", "Earthshaker Slam", "save", { save: { abilities: ["dex"], dc: { source: "gen" }, onSuccess: "none", resave: false }, damage: { parts: [{ formula: "2d8 + 4", type: "bludgeoning" }] }, inflicts: [{ key: "prone", kind: "state", ranks: 1, label: "Prone" }], text: "Failure: the damage (+1d8 at your 7th and 15th), −20 speed until the end of its next turn, Prone." })])]);
const dokiClaw = doki("doki-claw", "Doki (Claw)", 16, 22, "20 + 2 * @level", 40, { str: 4, dex: 4, con: 3, int: -2, wis: 0, cha: 0 },
  "<strong>Armor Class</strong> 16 + 2 at 7th and 15th levels · <strong>Hit Points</strong> 20 + (Twice your Level) · <strong>Speed</strong> 40 ft. STR +4, DEX +4, CON +3, INT −2, WIS +0, CHA +0. <strong>Condition Immunities</strong> All Mental, Exhaustion. <strong>Saving Throws</strong> Str, Dex. <strong>Skills</strong> Athletics, Acrobatics (Mastery 2), Perception. <strong>Senses</strong> Blindsight 30 ft.",
  id => [revolt("doki-claw", id, "3d8"),
    item(id, "Predatory Endurance", "npcTraits", html("At the start of its summoners turns, if an allied Doki creature within 30 feet took damage since the summoners previous turn, All Doki creatures gains 10 temporary hit points. This increases by +5 at 7th and 15th levels.")),
    item(id, "Claw", "npcStrikes", html("<em>Multiattack.</em> Doki (Claw) can make 2 attacks with Claw. <em>Melee Weapon Attack:</em> +Your attack bonus to hit, reach 5 ft., one target. <em>Hit:</em> 1d6+4 Slashing damage. This attack scores a critical hit on a roll of 19-20. If you score at least one attack, you force the target to make a Constitution saving throw. On a failure, they gain 1 rank of Disorient."),
      [act("doki-claw", "Claw", "attack", { attack: { discipline: "tai", range: "melee", count: 2, bonus: "0" }, damage: { parts: [{ formula: "1d6 + 4", type: "slashing" }] }, text: "Critical hit on 19–20." }),
       act("doki-claw", "Claw: disorient", "save", { save: { abilities: ["con"], dc: { source: "gen" }, onSuccess: "none", resave: false }, inflicts: [{ key: "kashu-disoriented", kind: "condition", ranks: 1, label: "Disoriented" }], text: "At least one hit. Failure: 1 rank of Disoriented." })])]);

// The Crystal Rabbit, Deer and Dragon (Shoton Hijutsu; stat blocks at the end of the clan): Earthen Artifacts that use your highest jutsu attack bonus or save DC.
const shoton = folder("Shoton", null, "shoton");
const crystal = (seed, name, size, ac, acLink, hp, hpLink, speed, abil, stats, items, dr = 0, drLink = "") => {
  const a = actor(seed, name, shoton._id, {
    details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: `Shoton: ${name}`, summonRole: name,
      biography: html(`<p><em>Shoton Hijutsu (an Earthen Artifact).</em> It uses your highest jutsu attack bonus or Save DC when an effect calls for it. You command it as a Bonus action.</p>`, `<p>${stats}</p>`,
        "<p><strong>Linked to you when summoned:</strong> AC, DR and hit points by the rank you cast the jutsu at, and your highest jutsu attack bonus and save DC.</p>") },
    abilities: Object.fromEntries(Object.entries(abil).map(([k, mod]) => [k, { value: 10 + 2 * mod }])),
    attributes: { ac: { calc: "flat", flat: ac, formula: "" }, init: { bonus: "" } },
    traits: { size, conditionImmune: [...MENTAL_SENSORY, "petrified", "envenomed"], stateImmune: ["stunned"], speed },
    hpMax: hp, cpMax: 0, diesAtZero: true
  }, id => [item(id, "Abrasive", "npcTraits", html(`When a crystal ${name.split(" ")[1].toLowerCase()} takes damage from a melee attack, the attacking creature must make a Constitution saving throw, gaining a rank of Bleed on a failure.`),
      [act(seed, "Abrasive", "save", { save: { abilities: ["con"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: [{ key: "bleed", kind: "condition", ranks: 1, label: "Bleed" }], text: "A melee attacker that damaged it. Failure: a rank of Bleed." })]), ...items(id)],
    { "details.level": "@level", "attributes.ac.flat": acLink, hpMax: hpLink, "bonuses.saveDC.nin": HIGH_DC2, "bonuses.attack.nin": HIGH_ATK2, ...(drLink ? { "traits.dr": drLink } : {}) }, "icons/svg/mystery-man-black.svg");
  if ( dr ) a.system.traits.dr = dr;
  return a;
};
const CRYST = n => [{ key: "shoton-crystallization", kind: "condition", ranks: n, label: "Crystallization" }];
const crystalRabbit = crystal("crystal-rabbit", "Crystal Rabbit", "small", 10, "10 + 2 * max(0, @rankValue - 2)", 10, "10 + 10 * max(0, @rankValue - 2)", { walk: 40, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false }, { str: 1, dex: 4, con: 2, int: -5, wis: 0, cha: -5 },
  "<strong>Small Construct, unaligned.</strong> <strong>Armor Class</strong> 10 + 2 for every rank above D-Rank · <strong>Hit Points</strong> 10 + 10 for every rank above D-Rank · <strong>Speed</strong> 40 ft. STR +1 (save +3), DEX +4 (+7), CON +2 (+7), INT −5, WIS +0, CHA −5. <strong>Condition Immunities</strong> All Mental, All Sensory, Stunned, Petrified, Envenomed.",
  id => [item(id, "Team Effort", "npcTraits", html("If more than one Crystal Rabbit uses Bucktooth against the same creature on the same turn, that creature makes a single saving throw, but takes +1d6 damage for each Crystal Rabbit beyond the first on a failed save.")),
    item(id, "Nibble", "npcStrikes", html("<em>Natural weapon Attack:</em> +X to hit, Reach 5ft., one target. <em>Hit:</em> 1d4+4 earth damage. On a roll of 4 of the damage die, the affected creature has its speed reduced by 5, until the beginning of the summoners next turn."),
      [act("crystal-rabbit", "Nibble", "attack", { attack: { discipline: "nin", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d4 + 4", type: "earth" }] } })]),
    item(id, "Bucktooth", "npcAbilities", html("<em>(Recharge 5-6).</em> The crystal rabbit grows two crystal teeth and fires them like missiles at a target creature within 30 feet, forcing them to make a Dexterity saving throw. On a failure, they take 2d6 earth damage and they gain 1 rank of Crystallization."),
      [act("crystal-rabbit", "Bucktooth", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "none", resave: false }, damage: { parts: [{ formula: "2d6", type: "earth" }] }, inflicts: CRYST(1) })])]);
const crystalDeer = crystal("crystal-deer", "Crystal Deer", "medium", 16, "16 + 2 * max(0, @rankValue - 3)", 30, "30 + 15 * max(0, @rankValue - 3)", { walk: 40, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false }, { str: 4, dex: 2, con: 3, int: -5, wis: 0, cha: -5 },
  "<strong>Medium Construct, unaligned.</strong> <strong>Armor Class</strong> 16 + 2 for every rank above C-Rank, <strong>DR</strong> 4 +1 for every rank above C-Rank · <strong>Hit Points</strong> 30 + 15 for every rank above C-Rank · <strong>Speed</strong> 40 ft. STR +4 (save +8), DEX +2 (+6), CON +3 (+8), INT −5, WIS +0, CHA −5. <strong>Condition Immunities</strong> All Mental, All Sensory, Stunned, Petrified, Envenomed.",
  id => [item(id, "Resonant Presence", "npcTraits", html("If an allied creature with ranks of a Physical or Elemental condition. Spends their Bonus action, they can touch the Crystal deer, transferring all ranks of a single condition to the Deer, except those the Deer is immune to.")),
    item(id, "Horn", "npcStrikes", html("<em>Natural weapon Attack:</em> +X to hit, Reach 5ft., one target. <em>Hit:</em> 1d6+4 earth damage. The affected creature must make a Strength saving throw, being knocked Prone and gaining 1 rank of Crystallization on a failure."),
      [act("crystal-deer", "Horn", "attack", { attack: { discipline: "nin", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d6 + 4", type: "earth" }] } }),
       act("crystal-deer", "Horn: on a hit", "save", { save: { abilities: ["str"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: [{ key: "prone", kind: "state", ranks: 1, label: "Prone" }, ...CRYST(1)] })]),
    item(id, "Crystal Gore", "npcAbilities", html("<em>(Recharge 5-6).</em> The majestic Deer prepares to gore all enemies in its path. It runs 40feet in a straight line, forcing all creatures in range to make a Dexterity saving throw, taking twice the damage Horn would do, and inflicting 1 rank of Crystallization on all creatures that fail."),
      [act("crystal-deer", "Crystal Gore", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "none", resave: false }, damage: { parts: [{ formula: "2d6 + 8", type: "earth" }] }, inflicts: CRYST(1), text: "Twice Horn's damage (roll 1d6 + 4 and double it)." })])], 4, "4 + max(0, @rankValue - 3)");
const crystalDragon = crystal("crystal-dragon", "Crystal Dragon", "large", 22, "22 + 2 * max(0, @rankValue - 4)", 80, "80 + 20 * max(0, @rankValue - 4)", { walk: 0, climb: 0, swim: 0, fly: 40, burrow: 0, hover: false }, { str: 6, dex: 2, con: 9, int: -5, wis: 0, cha: 5 },
  "<strong>Large Construct, unaligned.</strong> <strong>Armor Class</strong> 22 + 2 For every rank above A-Rank, <strong>DR</strong> 6 +2 for every rank above A-Rank · <strong>Hit Points</strong> 80 + 20 for every rank above A-Rank · <strong>Speed</strong> 40 ft fly. STR +6 (save +9), DEX +2 (+5), CON +9 (+9), INT −5, WIS +0, CHA +5 (−5). <strong>Damage Immunities</strong> Bludgeoning, Piercing and Slashing. <strong>Condition Immunities</strong> All Mental, All Sensory, Stunned, Petrified, Envenomed. <strong>Senses</strong> Darkvision 60 ft.",
  id => [item(id, "Crystalline Sovereignty", "npcTraits", html("All creatures that are summoned as a result of a Shoton Hijutsu, within 20 feet of the Crystal Dragon, except the Dragon itself, gains +2 DR")),
    item(id, "Bite", "npcStrikes", html("<em>Multiattack.</em> The Crystal Dragon can attack 2 times. Once with its Bite and once with its tail sweep. <em>melee Weapon Attack:</em> reach 10 ft., one creature. <em>Hit:</em> 4d6+6 Earth damage. Once per turn, a creature hit by this attack must make a Strength Saving throw. On a failed save they are Bruised."),
      [act("crystal-dragon", "Bite", "attack", { attack: { discipline: "nin", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "4d6 + 6", type: "earth" }] } }),
       act("crystal-dragon", "Bite: bruise", "save", { save: { abilities: ["str"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: [{ key: "bruised", kind: "condition", ranks: 1, label: "Bruised" }], text: "Once per turn, on a hit." })]),
    item(id, "Tail Sweep", "npcAbilities", html("The Crystal Dragon sweeps its tail in a 10-foot cone, in front of itself, forcing all creatures in range to make a Dexterity saving throw, taking 3d6+6 earth damage, and being knocked Prone on a failure, or half as much damage on a success."),
      [act("crystal-dragon", "Tail Sweep", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "half", resave: false }, damage: { parts: [{ formula: "3d6 + 6", type: "earth" }] }, inflicts: [{ key: "prone", kind: "state", ranks: 1, label: "Prone" }] })]),
    item(id, "Crystal Breath", "npcAbilities", html("<em>(Recharge 5-6):</em> The Crystal Dragon exhales a beam of crystalline energy, compressed into a 90-foot long, 5-foot-wide beam of earth chakra, forcing everyone in range to make a Dexterity saving throw. On a failure, they take 8d6 earth damage, and gain 2 ranks of Crystalize as their body is forcibly shifted into a crystalline molecular structure."),
      [act("crystal-dragon", "Crystal Breath", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "none", resave: false }, damage: { parts: [{ formula: "8d6", type: "earth" }] }, inflicts: CRYST(2) })])], 6, "6 + 2 * max(0, @rankValue - 4)");
crystalDragon.system.traits.immune = ["bludgeoning", "piercing", "slashing"];

// The Brood Mother (Tsuchigumo King of the Brood; stat block printed under Master Silk Weaver): your highest jutsu attack bonus and save DC.
const tsuchigumo = folder("Tsuchigumo", null, "tsuchigumo");
const broodMother = actor("brood-mother", "Brood Mother", tsuchigumo._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "beast", blurb: "Tsuchigumo: Brood Mother", summonRole: "Brood Mother",
    biography: html("<p><em>King of the Brood (Tsuchigumo).</em> You command it as a Bonus Action on your turns. It uses your highest Jutsu attack bonus and Save DC to calculate its attacks and ability save DCs.</p>",
      "<p><strong>Large Creature, unaligned.</strong> <strong>Armor Class</strong> 20 · <strong>Hit Points</strong> 100 · <strong>Speed</strong> 60 ft. STR +4 (save +11), DEX +5 (+12), CON +2 (+5), INT +4 (+11), WIS +3 (+6), CHA +2 (+5). <strong>Damage Immunities</strong> Poison. <strong>Condition Immunities</strong> Charmed, Envenomed. <strong>Senses</strong> Darkvision 60ft, passive Perception 25.</p>") },
  abilities: { str: { value: 18 }, dex: { value: 20 }, con: { value: 14 }, int: { value: 18 }, wis: { value: 16 }, cha: { value: 14 } },
  attributes: { ac: { calc: "flat", flat: 20, formula: "" }, init: { bonus: "" } },
  traits: { size: "large", immune: ["poison"], conditionImmune: ["charmed", "envenomed"], speed: { walk: 60, climb: 60, swim: 0, fly: 0, burrow: 0, hover: false }, senses: { darkvision: 60 } },
  hpMax: 100, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Immutable Poison", "npcTraits", html("Poison damage this creature deals cannot be resisted and it treats immunity as resistance.")),
  item(id, "Spider Climb", "npcTraits", html("The Brood Mother can climb or cross any surface suffering no movement speed penalties.")),
  item(id, "Bite", "npcStrikes", html("<em>Multiattack.</em> The Brood Mother Arachnid can attack 2 times with its Bite and once with its Web string or it can attack twice with its Web String. <em>Melee Weapon Attack:</em> reach 10 ft., one creature. <em>Hit:</em> 2d10 + 5 Poison damage and once per turn, force the target to make a Constitution saving throw, gaining a rank of Envenomed on a failure."),
    [act("brood-mother", "Bite", "attack", { attack: { discipline: "nin", range: "melee", count: 2, bonus: "0" }, damage: { parts: [{ formula: "2d10 + 5", type: "poison" }] } }),
     act("brood-mother", "Bite: venom", "save", { save: { abilities: ["con"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: [{ key: "envenomed", kind: "condition", ranks: 1, label: "Envenomed" }], text: "Once per turn, on a hit." })]),
  item(id, "Web String", "npcAbilities", html("The Brood Mother shoots a string of thick webbing at a creature, forcing them to make a Dexterity saving throw. On a failure, the affected creature is Grappled and Restrained."),
    [act("brood-mother", "Web String", "save", { save: { abilities: ["dex"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: [{ key: "grappled", kind: "state", ranks: 1, label: "Grappled" }, { key: "restrained", kind: "state", ranks: 1, label: "Restrained" }] })]),
  item(id, "Hatching Brood", "npcAbilities", html("The Brood Mother looks to your webbing as places to give new life. It summons a collection of Broodling’s, selecting a number of your Web Anchors currently active, dispelling up to 4, and summoning two Broodling’s per dispelled Web Anchor, each pair in the original spaces of the dispelled Web Anchors. The Broodling’s all follow a single directive. Consume the Brood Mothers prey, by any means. These creatures cannot be controlled by normal means, they simply take cues from their mother attacking whatever their Brood Mother last attacked. These Broodling’s also uses your highest jutsu attack bonus and save DC for abilities that call for it."))
], { "details.level": "@level", "bonuses.saveDC.nin": HIGH_DC2, "bonuses.attack.nin": HIGH_ATK2 }, "icons/svg/mystery-man-black.svg");

// The Kujaku Beast (Hoshi Hijutsu Kujaku Art: Kujaku Beast, D-Rank): your Ninjutsu attack bonus and save DC; AC and hit points by rank.
const hoshi = folder("Hoshi", null, "hoshi");
const WEAK = [{ key: "weakened", kind: "condition", ranks: 1, label: "Weakened" }];
const kujakuBeast = actor("kujaku-beast", "Kujaku Beast", hoshi._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Hoshi: Kujaku Beast", summonRole: "Kujaku Beast",
    biography: html("<p><em>Kujaku Art: Kujaku Beast (Hoshi Hijutsu).</em> It uses your Ninjutsu attack bonus or save DC when an effect calls for it. You command it as a Bonus Action. Irradiated: it gains its Radiation Aura.</p>",
      "<p><strong>Medium Construct</strong> (1 size larger at B-Rank and at S-Rank). <strong>Armor Class</strong> 12 + 2 for every rank beyond D-Rank · <strong>Hit Points</strong> 20 + 15 for every rank beyond D-Rank · <strong>Speed</strong> 30 ft. (at B-Rank, 40 ft. fly).</p>",
      "<p><strong>Abilities</strong> STR +3 (save +6), DEX +2 (+5), CON +3 (+6), INT −5 (−5), WIS −5 (−5), CHA −5 (−5). <strong>Damage Resistances</strong> Force, Bludgeoning, Piercing, Slashing. <strong>Damage Immunities</strong> Chakra, Poison, Psychic. <strong>Condition Immunities</strong> All Mental, Bleeding, Exhaustion, Poisoned. <strong>Senses</strong> Darkvision 60 ft., passive Perception 10.</p>",
      "<p><strong>Linked to you when summoned:</strong> AC and hit points by the rank you cast the jutsu at, and your Ninjutsu attack bonus and save DC.</p>") },
  abilities: { str: { value: 16 }, dex: { value: 14 }, con: { value: 16 }, int: { value: 1 }, wis: { value: 1 }, cha: { value: 1 } },
  attributes: { ac: { calc: "flat", flat: 12, formula: "" }, init: { bonus: "" } },
  traits: { size: "medium", resist: ["force", "bludgeoning", "piercing", "slashing"], immune: ["chakra", "poison", "psychic"],
    conditionImmune: ["berserk", "charmed", "confused", "demoralized", "shaken", "bleed", "exhaustion", "envenomed"], speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false },
    senses: { darkvision: 60 } },
  hpMax: 20, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Boosted Strength", "npcTraits", html("The Kujaku Beast gains a +1 to all of its Modifiers and Saving throws when summoned at B-Rank or higher, and an additional +2 when summoned at S-Rank.")),
  item(id, "Star Chakra Furnace", "npcTraits", html("When the Kujaku Beast makes an attack using its Bite or Meteor Breath attacks its summoner can spend multiples of 2 Star Chakra, to increase the damage dealt by 1d6, for every 2 Star Chakra spent.")),
  item(id, "Radiation Aura (Irradiated)", "npcTraits", html("The Kujaku Beast radiates a sickening aura, in a 10-foot radius centered on it. The first time a creature enters the aura on a turn, or begins their turn in this aura, they must make a Constitution saving throw. On a failure, they gain 1 rank of Weakened and Envenomed, until the end of this creatures summoners next turn, unless they are still in the aura when these conditions would end, extending their duration for another round."),
    [act("kujaku-beast", "Radiation Aura", "save", { save: { abilities: ["con"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: [...WEAK, { key: "envenomed", kind: "condition", ranks: 1, label: "Envenomed" }], text: "Irradiated only. Entering or starting a turn in 10 feet." })]),
  item(id, "Bite", "npcStrikes", html("<em>Multiattack (Level 7+).</em> The Kujaku Beast makes one attack with its Bite and Claw, Or two attacks using either Bite or Claw. <em>Melee Weapon Attack,</em> reach 10 ft., one target. <em>Hit:</em> 2d6 + Str force damage. Beginning at 7th level, half of the result becomes chakra damage."),
    [act("kujaku-beast", "Bite", "attack", { attack: { discipline: "nin", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "2d6 + @abilities.str.mod", type: "force" }] }, text: "7th level: half the result is chakra damage." })]),
  item(id, "Claw", "npcStrikes", html("<em>Melee Weapon Attack,</em> reach 10 ft., one target. <em>Hit:</em> 1d8 + Dex force damage. Beginning at 7th level, On a hit, force the affected creature to make a Constitution save, gaining a rank of Weakened on a failure."),
    [act("kujaku-beast", "Claw", "attack", { attack: { discipline: "nin", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d8 + @abilities.dex.mod", type: "force" }] } }),
     act("kujaku-beast", "Claw: Weakened (7th)", "save", { save: { abilities: ["con"], dc: { source: "nin" }, onSuccess: "none", resave: false }, inflicts: WEAK, text: "7th level, on a hit." })]),
  item(id, "Meteor Breath (Level 15+)", "npcAbilities", html("The Kujaku Beast spews irradiated chakra in a 30-foot cone originating from it. Each creature in range must make a Constitution saving throw, taking 9d6 Force damage and 2 ranks of Weakened on a failed save, or half as much damage on a success. A creature that fails this save by 5 or more gains 1 rank of Star Sickness for the next minute as meteoric radiation bleeds through its skin."),
    [act("kujaku-beast", "Meteor Breath", "save", { save: { abilities: ["con"], dc: { source: "nin" }, onSuccess: "half", resave: false }, damage: { parts: [{ formula: "9d6", type: "force" }] }, inflicts: [{ key: "weakened", kind: "condition", ranks: 2, label: "Weakened" }], text: "15th level. Failing by 5 or more: 1 rank of Star Sickness for 1 minute." })])
], { "details.level": "@level", "attributes.ac.flat": "12 + 2 * max(0, @rankValue - 1)", hpMax: "20 + 15 * max(0, @rankValue - 1)", "bonuses.saveDC.nin": "@dc.nin - 8 - @prof", "bonuses.attack.nin": "@attack.nin - @prof" }, "icons/svg/mystery-man-black.svg");


/* -------------------------------------------- */
/*  Non-Elemental Ninjutsu summons (STD6f F6)   */
/* -------------------------------------------- */
// Source: the Summon Stat Blocks section (Non-Elemental Summons). Each uses your Ninjutsu attack bonus
// and save DC; AC and hit points grow by the rank you cast the jutsu at.
const ninjutsu = folder("Ninjutsu", null, "ninjutsu");
const nonElemental = folder("Non-Elemental", ninjutsu._id, "ninjutsu/non-elemental");
const MENTAL = ["berserk", "charmed", "confused", "demoralized", "shaken", "concussed"];
const PHYSICAL = ["bruised", "staggered", "bleed", "dazed", "weakened", "slowed"];
const ELEMENTAL = ["burned", "chilled", "corroded", "shocked", "envenomed"];
const SENSORY = ["blinded", "dazzled", "deafened"];
const NIN = { "bonuses.saveDC.nin": "@dc.nin - 8 - @prof", "bonuses.attack.nin": "@attack.nin - @prof" };
const mods = m => Object.fromEntries(ABILITIES.map((k, i) => [k, { value: 10 + 2 * m[i] }]));
const statLine = (m, sv) => ABILITIES.map((k, i) => `${k.toUpperCase()} ${m[i] >= 0 ? "+" : "−"}${Math.abs(m[i])} (save ${sv[i] >= 0 ? "+" : "−"}${Math.abs(sv[i])})`).join(", ");
const inf = (key, kind = "condition", ranks = 1) => ({ key, kind, ranks, label: key[0].toUpperCase() + key.slice(1) });
const ninSave = (seed, label, ab, extra = {}) => act(seed, label, "save", { save: { abilities: [ab], dc: { source: "nin" }, onSuccess: extra.half ? "half" : "none", resave: false },
  ...(extra.damage ? { damage: { parts: extra.damage } } : {}), ...(extra.inflicts ? { inflicts: extra.inflicts } : {}), ...(extra.text ? { text: extra.text } : {}) });
const ninAtk = (seed, label, formula, type, count = 1, text) => act(seed, label, "attack", { attack: { discipline: "nin", range: "melee", count, bonus: "0" },
  damage: { parts: [{ formula, type }] }, ...(text ? { text } : {}) });
const rankUp = (base, per, from) => `${base} + ${per} * max(0, @rankValue - ${from})`;
function inkSummon(seed, name, { jutsu, size = "medium", ac, hp, speed, fly = 0, m, sv, senses = { darkvision: 30 }, resist = [], immune = [], vuln = [], condImmune = [], stateImmune = [], dr = 0, extraBio = "", release = "Non-Elemental", dir = nonElemental }, items) {
  const a = actor(seed, name, dir._id, {
    details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: jutsu.startsWith(release) ? jutsu : `${release}: ${jutsu}`, summonRole: name,
      biography: html(`<p><em>${jutsu} (${release} Ninjutsu).</em> It uses your Ninjutsu attack bonus and save DC. You command it as a Bonus Action; it can take reactions it's able to, such as opportunity attacks.</p>`,
        `<p><strong>${size[0].toUpperCase() + size.slice(1)} Construct.</strong> <strong>Armor Class</strong> ${ac[0]} + ${ac[1]} for every rank above ${"EDCBAS"[ac[2]]}-Rank${dr ? `, DR ${dr}` : ""} · <strong>Hit Points</strong> ${hp[0]} + ${hp[1]} for every rank above ${"EDCBAS"[hp[2]]}-Rank · <strong>Speed</strong> ${speed} ft.${fly ? `, ${fly} ft. fly` : ""}.</p>`,
        `<p><strong>Abilities</strong> ${statLine(m, sv)}.${extraBio}</p>`,
        "<p><strong>Linked to you when summoned:</strong> AC and hit points by the rank you cast the jutsu at, and your Ninjutsu attack bonus and save DC.</p>") },
    abilities: mods(m),
    attributes: { ac: { calc: "flat", flat: ac[0], formula: "" }, init: { bonus: "" } },
    traits: { size, resist, immune, vuln, conditionImmune: condImmune, stateImmune, dr,
      speed: { walk: speed, climb: 0, swim: 0, fly, burrow: 0, hover: false }, senses },
    hpMax: hp[0], cpMax: 0, diesAtZero: true
  }, items, { "details.level": "@level", "attributes.ac.flat": rankUp(ac[0], ac[1], ac[2]), hpMax: rankUp(hp[0], hp[1], hp[2]), ...NIN }, "icons/svg/mystery-man-black.svg");
  return a;
}
const INKY = n => html(`The ${n} leaves an ink blotch on anything it hits. The blotch is noticeable and can't be removed without a deep cleaning lasting at least 1 hour.`);
const inkBat = inkSummon("ink-bat-snake", "Ink Bat/Snake", { jutsu: "Beast Imitating Art: Bat/Snake (D-Rank)", ac: [12, 2, 1], hp: [15, 8, 1], speed: 30, fly: 30,
  m: [3, 2, 2, -5, 0, 5], sv: [1, 1, 1, -5, 0, -5], condImmune: [...MENTAL, ...SENSORY], stateImmune: ["incapacitated"],
  extraBio: " <strong>Condition Immunities</strong> All Mental and Sensory, Incapacitated. <strong>Senses</strong> Darkvision 30 ft., passive Perception 10." }, id => [
  item(id, "Inky Body", "npcTraits", INKY("Ink Bat/Snake")),
  item(id, "Bite", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 1d6 + 3 piercing damage."),
    [ninAtk("ink-bat", "Bite", "1d6 + 3", "piercing")]),
  item(id, "Face Wrap", "npcAbilities", html("The Bat/Snake wraps around the head of a creature within 5 feet of it, forcing that creature to make a Dexterity saving throw. On a failed save, they become Blinded. They can remake the save at the end of each of their turns. The Bat/Snake can't use Body Wrap while it has something Face Wrapped."),
    [ninSave("ink-bat", "Face Wrap", "dex", { inflicts: [inf("blinded")], text: "Resave at the end of each of its turns." })]),
  item(id, "Body Wrap", "npcAbilities", html("The Bat/Snake wraps around the body of a creature within 5 feet of it, forcing that creature to make a Strength saving throw. On a failed save, they become Restrained. If the target has another creature adjacent to it, it can try to Restrain them both, but they make their saves at disadvantage. They can remake the save at the end of each of their turns. The Bat/Snake can't use Face Wrap while it has something Body Wrapped."),
    [ninSave("ink-bat", "Body Wrap", "str", { inflicts: [inf("restrained", "state")], text: "Resave at the end of each of its turns." })])
]);
const inkReptile = inkSummon("ink-reptile", "Ink Reptile", { jutsu: "Beast Imitating Art: Reptile (D-Rank)", ac: [13, 2, 1], hp: [20, 6, 1], speed: 30,
  m: [4, 2, 4, -5, 2, -5], sv: [2, 1, 2, -5, 1, -5], condImmune: [...MENTAL, ...SENSORY], stateImmune: ["incapacitated"],
  extraBio: " <strong>Condition Immunities</strong> All Mental and Sensory, Incapacitated. <strong>Senses</strong> Darkvision 30 ft., passive Perception 10." }, id => [
  item(id, "Inky Body", "npcTraits", INKY("Ink Reptile")),
  item(id, "Tackle", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 1d8 + 4 bludgeoning damage."),
    [ninAtk("ink-reptile", "Tackle", "1d8 + 4", "bludgeoning")]),
  item(id, "Stampede", "npcAbilities", html("The Reptile rushes forward at its full speed in a straight line. All creatures it passes through must make a Dexterity saving throw, taking 2d8 bludgeoning damage and being knocked Prone on a failed save, or half as much on a success. A Demoralized creature whose space it crosses makes the save at disadvantage."),
    [ninSave("ink-reptile", "Stampede", "dex", { half: true, damage: [{ formula: "2d8", type: "bludgeoning" }], inflicts: [inf("prone", "state")] })]),
  item(id, "Inky Screech (2 Charges)", "npcAbilities", html("All creatures but its summoner within 20 feet of it must make a Constitution saving throw, gaining a rank of Demoralized on a failure. A Prone creature makes the save at disadvantage."),
    [ninSave("ink-reptile", "Inky Screech", "con", { inflicts: [inf("demoralized")], text: "2 charges. Prone creatures at disadvantage." })])
]);
const inanimatePuppet = inkSummon("inanimate-puppet", "Inanimate Puppet", { jutsu: "Sealing Art: Inanimate Puppet (C-Rank)", ac: [15, 2, 2], hp: [20, 10, 2], speed: 30,
  m: [4, 2, 4, -5, 0, -5], sv: [2, 1, 2, -5, 0, -5], senses: {}, resist: ["bludgeoning"], immune: ["necrotic", "poison"], vuln: ["lightning"],
  condImmune: ["charmed", "exhaustion", "envenomed"], stateImmune: ["stunned"],
  extraBio: " <strong>Damage Immunities</strong> Necrotic, Poison. <strong>Damage Resistances</strong> Bludgeoning. <strong>Damage Vulnerabilities</strong> Lightning. <strong>Condition Immunities</strong> Charmed, Exhaustion, Stunned, Envenomed. <strong>Senses</strong> passive Perception 10." }, id => [
  item(id, "Unnatural Fortitude", "npcTraits", html("The Inanimate Puppet makes Constitution saving throws at advantage.")),
  item(id, "Slam", "npcStrikes", html("<em>Multiattack.</em> The Inanimate Puppet can attack a number of times equal to the jutsu's rank with its Slam attack. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 1d8 + 4 bludgeoning damage."),
    [ninAtk("inanimate-puppet", "Slam", "1d8 + 4", "bludgeoning", 1, "Multiattack: as many Slams as the jutsu's rank (set the number of attacks).")]),
  item(id, "SMASH (2 Charges)", "npcAbilities", html("The Inanimate Puppet slams the ground. All creatures within 10 feet of it must make a Dexterity saving throw. On a failed save, they take 3d8 bludgeoning damage and are knocked Prone and Dazed until the end of their next turn."),
    [ninSave("inanimate-puppet", "SMASH", "dex", { damage: [{ formula: "3d8", type: "bludgeoning" }], inflicts: [inf("prone", "state"), inf("dazed")], text: "2 charges." })])
]);
const inkPredator = inkSummon("ink-predator", "Ink Predator", { jutsu: "Beast Imitating Art: Predator (C-Rank)", ac: [14, 2, 1], hp: [30, 10, 1], speed: 40,
  m: [4, 4, 3, -5, 0, -5], sv: [2, 2, 1, -5, 0, -5], condImmune: [...MENTAL, ...SENSORY], stateImmune: ["incapacitated"],
  extraBio: " <strong>Condition Immunities</strong> All Mental and Sensory, Incapacitated. <strong>Senses</strong> Darkvision 30 ft., passive Perception 10." }, id => [
  item(id, "Inky Weapons", "npcTraits", html("The Ink Predator's attacks have a +2 bonus to their critical threat range.")),
  item(id, "Rend", "npcStrikes", html("<em>Multiattack.</em> The Ink Predator attacks twice with its Rend. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 1d12 + 4 slashing damage. If B-Rank or higher, a creature who takes damage from this attack must make a Constitution saving throw, gaining 1 rank of Bleed."),
    [ninAtk("ink-predator", "Rend", "1d12 + 4", "slashing", 2, "+2 critical range (Inky Weapons)."),
     ninSave("ink-predator", "Rend: Bleed (B-Rank+)", "con", { inflicts: [inf("bleed")], text: "B-Rank or higher, damaged by Rend." })]),
  item(id, "Body Block", "npcAbilities", html("As a reaction, the Ink Predator may interpose an attack targeting an allied creature within 30 feet of it. The triggering attack is treated as if it targeted the Ink Predator."), [], { activation: "reaction" }),
  item(id, "Maul (2 Charges)", "npcAbilities", html("As a bonus action, the Ink Predator enters a pouncing stance targeting a creature within 15 feet of it and leaps to maul it. Until the end of this turn, its Rend attacks against that creature are made at advantage."), [], { activation: "bonus" }),
  item(id, "Roar (2 Charges, B-Rank+)", "npcAbilities", html("As a bonus action, the Ink Predator roars. All creatures of your choice within 15 feet of it must make a Charisma saving throw. On a failed save, they gain 2 ranks of Fear."),
    [ninSave("ink-predator", "Roar", "cha", { text: "B-Rank or higher. Failure: 2 ranks of \"Fear\" (not a condition in the rules: apply by hand)." })])
]);
const inkOni = inkSummon("ink-oni", "Ink Oni", { jutsu: "Beast Imitating Art: Oni Twins (A-Rank)", size: "large", ac: [16, 2, 3], hp: [40, 15, 3], speed: 45, dr: 6,
  m: [7, 2, 6, -5, 0, -5], sv: [7, 1, 6, -5, 0, -5], condImmune: ["charmed", "chilled", "exhaustion", "envenomed"], stateImmune: ["stunned"],
  extraBio: " <strong>Condition Immunities</strong> Charmed, Chilled, Exhaustion, Stunned, Envenomed. <strong>Senses</strong> Darkvision 30 ft., passive Perception 10." }, id => [
  item(id, "Guard", "npcAbilities", html("As a reaction, the Ink Oni raises its guard protecting all creatures within 5 feet of it. Until the beginning of your next turn, all attacks that would target a creature within 5 feet of the Oni instead target the Oni."), [], { activation: "reaction" }),
  item(id, "Maul", "npcStrikes", html("<em>Multiattack.</em> The Ink Oni attacks twice with its Mauls. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 2d10 + 7 bludgeoning damage. A creature who takes damage from this attack twice must make a Constitution saving throw, being Dazed until the end of its next turn."),
    [ninAtk("ink-oni", "Maul", "2d10 + 7", "bludgeoning", 2),
     ninSave("ink-oni", "Maul: Dazed", "con", { inflicts: [inf("dazed")], text: "Damaged by both Mauls." })]),
  item(id, "Twin Oni Slam (2 Charges)", "npcAbilities", html("As an action, the Ink Oni may withhold its action. If both Ink Oni withhold their action, on the following turn you may command them to perform a Twin Oni Slam on a creature they are both within 10 feet of. Each Oni makes 2 Maul attacks at advantage. Each successful hit increases the damage by 1d10.")),
  item(id, "Oni Focus (2 Charges)", "npcAbilities", html("As a bonus action, the Oni focuses. Until the end of your turn, its next Maul attack scores a critical hit on a roll of 19 or 20."), [], { activation: "bonus" })
]);
inkOni.prototypeToken.width = inkOni.prototypeToken.height = 2;

// The Clone stat block (Summon Stat Blocks): every Clone jutsu uses it, with the adjustments its jutsu lists.
const cloneLinks = { ...bunshinLinks };
const clone = actor("clone", "Clone", nonElemental._id, {
  details: { build: "character", level: 1, template: "clone", creatureType: "construct", blurb: "Clone jutsu (Shadow Clone Technique and the release Clones)", summonRole: "Clone",
    biography: html("<p><em>Clone</em> (the Clone keyword: Shadow Clone Technique; Earth, Explosive, Water and Lightning Clones). You command a clone by spending your Action or Bonus Action as its jutsu says.</p>",
      "<p><strong>Medium Construct.</strong> <strong>Armor Class</strong> your Ninjutsu save DC, DR 6 · <strong>Hit Points</strong> 1 · <strong>Jutsu Slots</strong> 2 · <strong>Speed</strong> 30 ft. <strong>Abilities</strong> none (−). <strong>Senses</strong> the same special senses as its caster.</p>",
      "<p><strong>Clone adjustments.</strong> Shadow Clone Technique: at B-Rank or S-Rank, +1 Jutsu Slot; at A-Rank it can cast A-Rank jutsu; out of combat, clones can travel up to 1 mile from their caster. Earth Clone: 20 hit points; immune to Genjutsu, psychic and poison damage; resists bludgeoning, earth and cold; vulnerable to lightning; two Clone Strikes; Earth Release jutsu only. Explosive Clone: no Clone Strike; Fire Release jutsu only; detonates at 0 hit points (see the jutsu). Water Clone: Water Release Ninjutsu only; can concentrate on its jutsu (one clone at a time). Lightning Clone: Lightning Release Ninjutsu only; immune to Genjutsu, psychic and poison damage; speed equal to its summoner's or 50, whichever is higher; discharges at 0 hit points (see the jutsu).</p>",
      "<p><strong>Linked to you when summoned:</strong> its level, AC, attack bonuses, save DCs, skills and senses are set from yours.</p>") },
  abilities: Object.fromEntries(ABILITIES.map(k => [k, { value: 10 }])),
  attributes: { ac: { calc: "flat", flat: 10, formula: "" }, init: { bonus: "" } },
  traits: { size: "medium", dr: 6, speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false } },
  hpMax: 1, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Unison Command", "npcTraits", html("When more than one Clone is attacking or targeting the same target, you don't make multiple attacks and the target doesn't make multiple saving throws; consolidate them into a single attack roll or saving throw. Increase Clone Strike's or Clone Cast's damage by +2 for each Clone beyond the first.")),
  item(id, "Placement", "npcTraits", html("Clones can never be more than 60 feet away from you, otherwise they are dispelled.")),
  item(id, "Combat Synergy", "npcTraits", html("It uses its summoner's attack bonuses and save DCs for jutsu it casts, and its summoner's skill bonuses for skill-based actions.")),
  item(id, "Part of a Whole", "npcTraits", html("Clones can only make one attack per command, even if a jutsu normally allows more.")),
  item(id, "Fractional Strength", "npcTraits", html("Damage a clone deals with a jutsu it casts always defaults to an amount based on the jutsu's rank (D-Rank: 2d6, C-Rank: 3d6, B-Rank: 4d6, A-Rank: 5d6). If the jutsu affects an area, reduce the number of damage dice by 1.")),
  item(id, "Limitations", "npcTraits", html("Clones can't cast jutsu with the Clone, Fuinjutsu or Combination keyword, concentrate on jutsu they cast, inflict conditions under the Death, Dying or Disabled category, or force a creature to make more than 1 saving throw per round.")),
  item(id, "Clone Strike", "npcStrikes", html("<em>Melee or Ranged Weapon Attack:</em> your attack bonus with the clone's weapon to hit, reach (the weapon's range), one creature. <em>Hit:</em> 1d6 + your Ninjutsu modifier damage (the weapon's damage type)."),
    [act("clone", "Clone Strike", "attack", { attack: { discipline: "tai", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "1d6", type: "" }] }, text: "Add your Ninjutsu modifier to the damage; Unison Command: +2 per clone beyond the first." })]),
  item(id, "Clone Cast", "npcAbilities", html("The Clone casts a jutsu on its summoner's known list of one rank lower than the rank of the jutsu used to summon it. The jutsu can't be greater than B-Rank. Damage follows Fractional Strength."),
    [["D", "2d6"], ["C", "3d6"], ["B", "4d6"], ["A", "5d6"]].map(([r, f]) =>
      act("clone-cast", `${r}-Rank damage`, "damage", { damage: { parts: [{ formula: f, type: "" }] }, text: `The jutsu's damage at ${r}-Rank (an area: one die fewer).` })))
], cloneLinks, "icons/svg/mystery-man.svg");


// Medical Release: Supreme Poison Deity (S-Rank): the Summon Stat Blocks section (Medical Release Summons). Fixed numbers;
// your Ninjutsu attack bonus and save DC; its own initiative (your Ninjutsu modifier + proficiency).
const medical = folder("Medical Release", ninjutsu._id, "ninjutsu/medical-release");
const poisonDeity = actor("supreme-poison-deity", "Supreme Poison Deity", medical._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Medical Release: Supreme Poison Deity", summonRole: "Supreme Poison Deity",
    biography: html("<p><em>Medical Release: Supreme Poison Deity (S-Rank, concentration up to 1 minute).</em> A huge construct scorpion of poison, toxins and venom. It uses your Ninjutsu attack bonus and save DC, and rolls its own initiative using your Ninjutsu ability modifier + proficiency bonus.</p>",
      "<p><strong>Huge Construct.</strong> <strong>Armor Class</strong> 22, DR 8 · <strong>Hit Points</strong> 90 · <strong>Speed</strong> 60 ft.</p>",
      `<p><strong>Abilities</strong> ${statLine([8, 2, 5, -5, 0, -5], [8, 1, 5, -5, 0, -5])}. <strong>Damage Immunities</strong> Acid, Poison, Psychic, Cold, Bludgeoning, Piercing, Slashing. <strong>Damage Resistances</strong> Lightning, Wind. <strong>Damage Vulnerabilities</strong> Earth, Fire. <strong>Condition Immunities</strong> Charmed, Chilled, Bleeding, Shocked, Exhaustion, Stunned, Envenomed. <strong>Senses</strong> Darkvision 60 ft., passive Perception 10.</p>`,
      "<p><strong>Linked to you when summoned:</strong> your Ninjutsu attack bonus and save DC, and its initiative bonus.</p>") },
  abilities: mods([8, 2, 5, -5, 0, -5]),
  attributes: { ac: { calc: "flat", flat: 22, formula: "" }, init: { bonus: "" } },
  traits: { size: "huge", dr: 8, immune: ["acid", "poison", "psychic", "cold", "bludgeoning", "piercing", "slashing"], resist: ["lightning", "wind"], vuln: ["earth", "fire"],
    conditionImmune: ["charmed", "chilled", "bleed", "shocked", "exhaustion", "envenomed"], stateImmune: ["stunned"],
    speed: { walk: 60, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false }, senses: { darkvision: 60 } },
  hpMax: 90, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "One with Poison", "npcTraits", html("When the Deity is in contact with a body of water, regardless of size, it turns it into poison up to 100 feet out from it.")),
  item(id, "Stinger", "npcStrikes", html("<em>Multiattack.</em> The Supreme Poison Deity attacks 3 times: twice with its Stinger and once with its Pincer. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 15 ft., one creature. <em>Hit:</em> 2d8 + 8 poison damage. A creature hit must make a Constitution saving throw, gaining 2 ranks of Envenomed on a failure."),
    [ninAtk("poison-deity", "Stinger", "2d8 + 8", "poison", 2), ninSave("poison-deity", "Stinger: Envenomed", "con", { inflicts: [inf("envenomed", "condition", 2)], text: "A creature hit." })]),
  item(id, "Pincer", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 10 ft., one creature. <em>Hit:</em> 2d6 + 8 poison damage. A creature hit must make a Strength saving throw, being Grappled and Restrained on a failure; a Grappled creature can make a Strength saving throw, escaping on a success."),
    [ninAtk("poison-deity", "Pincer", "2d6 + 8", "poison"), ninSave("poison-deity", "Pincer: Grappled", "str", { inflicts: [inf("grappled", "state"), inf("restrained", "state")], text: "A creature hit; Strength save to escape." })]),
  item(id, "Poison Charges (6)", "npcAbilities", html("The Deity has 6 charges, which it can use to cast Ninjutsu with the Medical keyword that deal poison damage, spending charges equal to the jutsu's rank (D-Rank: 1, C-Rank: 2, B-Rank: 3)."))
], { "details.level": "@level", ...NIN, "attributes.init.bonus": "@attack.nin - 2" }, "icons/svg/mystery-man-black.svg");
poisonDeity.prototypeToken.width = poisonDeity.prototypeToken.height = 3;


// Earth Release summons (STD6f F8): Mud Wolf (C-Rank) and Stone Dragon (A-Rank), from the Summon Stat Blocks section.
// AC "+ your Ninjutsu ability modifier" links as @attack.nin - @prof (your Ninjutsu modifier and attack bonuses).
const earth = folder("Earth Release", ninjutsu._id, "ninjutsu/earth-release");
const NINMOD = "(@attack.nin - @prof)";
const mudWolf = actor("mud-wolf", "Mud Wolf", earth._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Earth Release: Mud Wolf", summonRole: "Mud Wolf",
    biography: html("<p><em>Earth Release: Mud Wolf (C-Rank, concentration up to 1 minute).</em> Two wolves (+1 per rank above C); Earthen Artifacts. They use your Ninjutsu attack bonus and save DC; you command them all as a Bonus Action.</p>",
      "<p><strong>Medium Construct.</strong> <strong>Armor Class</strong> 12 + your Ninjutsu ability modifier · <strong>Hit Points</strong> 25 + 10 for every rank above C-Rank · <strong>Speed</strong> 40 ft.</p>",
      `<p><strong>Abilities</strong> ${statLine([1, 1, 1, -5, 0, -5], [3, 3, 5, -5, 0, -5])}. <strong>Damage Immunities</strong> Acid, Poison, Psychic. <strong>Condition Immunities</strong> All Mental, Stunned, Petrified, Envenomed. <strong>Senses</strong> Darkvision 60 ft., passive Perception 10.</p>`,
      "<p><strong>Linked to you when summoned:</strong> AC from your Ninjutsu modifier, hit points by the rank you cast the jutsu at, your Ninjutsu attack bonus and save DC.</p>") },
  abilities: mods([1, 1, 1, -5, 0, -5]),
  attributes: { ac: { calc: "flat", flat: 12, formula: "" }, init: { bonus: "" } },
  traits: { size: "medium", immune: ["acid", "poison", "psychic"], conditionImmune: [...MENTAL, "petrified", "envenomed"], stateImmune: ["stunned"],
    speed: { walk: 40, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false }, senses: { darkvision: 60 } },
  hpMax: 25, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Pack Tactics", "npcTraits", html("While the Mud Wolf and an ally to the wolf are both within 5 feet of the same hostile creature, the wolf makes its attack at advantage.")),
  item(id, "Bite", "npcStrikes", html("<em>Natural Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one target. <em>Hit:</em> 1d8 + your Ninjutsu ability modifier earth damage."),
    [ninAtk("mud-wolf", "Bite", "1d8", "earth", 1, "Add your Ninjutsu ability modifier to the damage.")]),
  item(id, "Grab", "npcAbilities", html("If the target is hit by its Bite attack, it must make a Strength save. On a failed save it is knocked Prone."),
    [ninSave("mud-wolf", "Grab", "str", { inflicts: [inf("prone", "state")], text: "A creature hit by the Bite." })])
], { "details.level": "@level", ...NIN, "attributes.ac.flat": `12 + ${NINMOD}`, hpMax: rankUp(25, 10, 2) }, "icons/svg/mystery-man-black.svg");
const stoneDragon = actor("stone-dragon", "Stone Dragon", earth._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Earth Release: Stone Dragon", summonRole: "Stone Dragon",
    biography: html("<p><em>Earth Release: Stone Dragon (A-Rank, concentration up to 1 minute).</em> It uses your Ninjutsu attack bonus and save DC; you command it as a Bonus Action.</p>",
      "<p><strong>Large Construct.</strong> <strong>Armor Class</strong> 13 + your Ninjutsu ability modifier, DR 8 · <strong>Hit Points</strong> 80 + 20 for every rank above A-Rank · <strong>Speed</strong> 40 ft. fly.</p>",
      `<p><strong>Abilities</strong> ${statLine([5, 0, 8, -5, 0, -5], [9, 4, 12, -5, 0, -5])}. <strong>Damage Immunities</strong> Cold, Poison, Psychic, Bludgeoning, Piercing, Slashing. <strong>Damage Vulnerabilities</strong> Lightning. <strong>Condition Immunities</strong> All Mental, Stunned, Petrified, Envenomed. <strong>Senses</strong> Darkvision 60 ft., passive Perception 10.</p>`,
      "<p><strong>Linked to you when summoned:</strong> AC from your Ninjutsu modifier, hit points by the rank you cast the jutsu at, your Ninjutsu attack bonus and save DC.</p>") },
  abilities: mods([5, 0, 8, -5, 0, -5]),
  attributes: { ac: { calc: "flat", flat: 13, formula: "" }, init: { bonus: "" } },
  traits: { size: "large", dr: 8, immune: ["cold", "poison", "psychic", "bludgeoning", "piercing", "slashing"], vuln: ["lightning"],
    conditionImmune: [...MENTAL, "petrified", "envenomed"], stateImmune: ["stunned"],
    speed: { walk: 0, climb: 0, swim: 0, fly: 40, burrow: 0, hover: false }, senses: { darkvision: 60 } },
  hpMax: 80, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Bite", "npcStrikes", html("<em>Multiattack.</em> The Stone Dragon attacks 3 times with its Bite. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 10 ft., one creature. <em>Hit:</em> 2d10 + 5 earth damage."),
    [ninAtk("stone-dragon", "Bite", "2d10 + 5", "earth", 3)]),
  item(id, "Dust Breath (Recharge 7–8)", "npcAbilities", html("The dragon exhales dust in a 30-foot cone. Each creature in that cone must make a Dexterity saving throw, taking 55 (10d10) earth damage and becoming Bruised on a failed save, or half as much damage on a successful one."),
    [ninSave("stone-dragon", "Dust Breath", "dex", { half: true, damage: [{ formula: "10d10", type: "earth" }], inflicts: [inf("bruised")], text: "Recharge 7–8 (as written)." })])
], { "details.level": "@level", ...NIN, "attributes.ac.flat": `13 + ${NINMOD}`, hpMax: rankUp(80, 20, 4) }, "icons/svg/mystery-man-black.svg");
stoneDragon.prototypeToken.width = stoneDragon.prototypeToken.height = 2;


// Fire and Water Release summons (STD6f F9), from the Summon Stat Blocks section.
const fire = folder("Fire Release", ninjutsu._id, "ninjutsu/fire-release");
const water = folder("Water Release", ninjutsu._id, "ninjutsu/water-release");
const flameSpider = inkSummon("flame-spider", "Flame Spider", { jutsu: "Fire Release: Crimson Spider (D-Rank)", release: "Fire Release", dir: fire, ac: [10, 2, 1], hp: [18, 8, 1], speed: 40,
  m: [2, 3, 1, -5, 0, -5], sv: [2, 3, 0, -5, 0, -5], senses: {}, immune: ["fire", "psychic"], condImmune: [...MENTAL, "petrified", "envenomed"], stateImmune: ["stunned"],
  extraBio: " <strong>Damage Immunities</strong> Fire, Psychic. <strong>Condition Immunities</strong> All Mental, Stunned, Petrified, Envenomed. <strong>Senses</strong> passive Perception 10." }, id => [
  item(id, "Bite", "npcStrikes", html("<em>Multiattack.</em> The Flame Spider attacks 2 times with its Bite. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 2d4 + 2 fire damage (+2 for every rank above D-Rank it is summoned)."),
    [ninAtk("flame-spider", "Bite", "2d4 + 2", "fire", 2, "+2 damage per rank above D-Rank (add it by hand).")]),
  item(id, "Flame Web (Recharge 9–10)", "npcAbilities", html("<em>Ranged Weapon Attack:</em> your Ninjutsu attack bonus, range 30/60 ft., one creature. The target is covered in solidified flaming webs and is Restrained by them, taking 2d6 + 2 fire damage. As an action the Restrained target can make a Strength ability check, bursting from the webbing on a success. The webbing can also be attacked and destroyed (AC 10, 5 hit points; vulnerability to cold damage)."),
    [act("flame-spider", "Flame Web", "attack", { attack: { discipline: "nin", range: "ranged", count: 1, bonus: "0" }, damage: { parts: [{ formula: "2d6 + 2", type: "fire" }] }, text: "Recharge 9–10 (as written). On a hit: Restrained." }),
     act("flame-spider-web", "Webbed: Restrained", "effect", { effect: { name: "Flame Web", target: "targets", changes: [], expires: "", seconds: 0, inflicts: [inf("restrained", "state")] } })])
]);
const waterShark = inkSummon("water-shark", "Water Shark", { jutsu: "Water Release: Piranha Shark (D-Rank) and Shark Bomb (B-Rank)", release: "Water Release", dir: water, ac: [14, 1, 1], hp: [18, 10, 1], speed: 0,
  m: [4, 1, 3, -5, 0, -5], sv: [4, 1, 5, -5, 0, -5], senses: {}, immune: ["cold"], resist: ["fire"], vuln: ["earth"], condImmune: [...MENTAL, ...PHYSICAL, "exhaustion", "petrified", "envenomed"], stateImmune: ["stunned"],
  extraBio: " <strong>Speed</strong> fly 30 ft., swim 90 ft. <strong>Damage Immunities</strong> Cold. <strong>Damage Resistances</strong> Fire. <strong>Damage Vulnerabilities</strong> Earth. <strong>Condition Immunities</strong> All Mental, All Physical, Exhaustion, Stunned, Petrified, Envenomed. <strong>Senses</strong> passive Perception 10." }, id => [
  item(id, "Water Predator", "npcTraits", html("If the Water Shark and its target are submerged in a body of water, its attacks are made at advantage against its target.")),
  item(id, "Shark Trigger (Shark Bomb only)", "npcAbilities", html("When the Water Shark is reduced to 0 hit points, it explodes, forcing all creatures within 10 feet (excluding the caster) to make a Dexterity saving throw, taking 5d6 cold damage and 1 rank of Chilled on a failed save, or half as much damage and no further effect on a success."),
    [ninSave("water-shark", "Shark Trigger", "dex", { half: true, damage: [{ formula: "5d6", type: "cold" }], inflicts: [inf("chilled")], text: "Only if summoned by Shark Bomb; at 0 hit points." })]),
  item(id, "Bite", "npcStrikes", html("<em>Multiattack.</em> The Water Shark attacks 2 times with its Bite or Rip and Tear. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 2d4 cold damage + 2d4 piercing damage. On a hit the target must make a Strength saving throw, being Grappled by this Water Shark on a failure (one creature at a time)."),
    [act("water-shark", "Bite", "attack", { attack: { discipline: "nin", range: "melee", count: 2, bonus: "0" }, damage: { parts: [{ formula: "2d4", type: "cold" }, { formula: "2d4", type: "piercing" }] } }),
     ninSave("water-shark", "Bite: Grappled", "str", { inflicts: [inf("grappled", "state")] })]),
  item(id, "Rip and Tear (Shark Bomb only)", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 3d6 cold damage + 3d6 piercing damage. On a hit the target must make a Dexterity saving throw, gaining 1 rank of Bleed on a failure."),
    [act("water-shark-rip", "Rip and Tear", "attack", { attack: { discipline: "nin", range: "melee", count: 2, bonus: "0" }, damage: { parts: [{ formula: "3d6", type: "cold" }, { formula: "3d6", type: "piercing" }] }, text: "Only if summoned by Shark Bomb." }),
     ninSave("water-shark-rip", "Rip and Tear: Bleed", "dex", { inflicts: [inf("bleed")] })])
]);
waterShark.system.traits.speed = { walk: 0, climb: 0, swim: 90, fly: 30, burrow: 0, hover: false };
const jellyfish = inkSummon("medical-jellyfish", "Medical Jellyfish", { jutsu: "Water Release: Medical Jellyfish (C-Rank)", release: "Water Release", dir: water, size: "small", ac: [12, 2, 2], hp: [20, 8, 2], speed: 0,
  m: [0, 0, 0, -5, 0, -5], sv: [2, 2, 0, -5, 0, -5], senses: {}, immune: ["cold"], resist: ["bludgeoning", "poison"], vuln: ["earth"], condImmune: [...MENTAL, ...SENSORY],
  extraBio: " <strong>Speed</strong> fly 30 ft. <strong>Damage Immunities</strong> Cold. <strong>Damage Resistances</strong> Bludgeoning, Poison. <strong>Damage Vulnerabilities</strong> Earth. <strong>Condition Immunities</strong> All Mental, All Sensory. <strong>Senses</strong> passive Perception 10." }, id => [
  item(id, "Medical Pool", "npcTraits", html("The Medical Jellyfish has a pool of Medical Chakra equal to 20 + 5 for every rank above C-Rank it is summoned (track it by hand).")),
  item(id, "Jelly Sting", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 10 ft., one creature. <em>Hit:</em> 2d8 + 2 cold damage (+2 for every rank above C-Rank it is summoned)."),
    [ninAtk("medical-jellyfish", "Jelly Sting", "2d8 + 2", "cold", 1, "+2 damage per rank above C-Rank (add it by hand).")]),
  item(id, "Top Up Jelly Shot", "npcAbilities", html("The Medical Jellyfish places one of its cnidocytes on a willing creature, granting it 2d4 + 2 temporary hit points (+2 for every rank above C-Rank it is summoned)."),
    [act("medical-jellyfish", "Top Up Jelly Shot", "heal", { heal: { formula: "2d4 + 2", pool: "tempHp" }, text: "+2 per rank above C-Rank (add it by hand)." })]),
  item(id, "Aura of Recovery", "npcAbilities", html("The Medical Jellyfish releases an aura of Medical chakra across all creatures of its summoner's choice within a 10-foot radius. For each creature, it draws from its Medical Pool to restore hit points, up to the amount remaining in the pool."))
]);
jellyfish.system.traits.speed = { walk: 0, climb: 0, swim: 0, fly: 30, burrow: 0, hover: false };
const waterLion = actor("supreme-water-lion", "Supreme Water Lion", water._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Water Release: Supreme Water Lion", summonRole: "Supreme Water Lion",
    biography: html("<p><em>Water Release: Supreme Water Lion (S-Rank, concentration up to 1 minute).</em> It uses your Ninjutsu attack bonus and save DC; you command it as a Bonus Action, and can merge into its head (total cover) while touching it.</p>",
      "<p><strong>Huge Construct.</strong> <strong>Armor Class</strong> 23 · <strong>Hit Points</strong> 105 · <strong>Speed</strong> 40 ft.</p>",
      `<p><strong>Abilities</strong> ${statLine([6, 3, 9, -5, 0, 5], [9, 5, 5, -5, 0, -5])}. <strong>Damage Resistances</strong> Fire. <strong>Damage Vulnerabilities</strong> Earth. <strong>Condition Immunities</strong> All Mental, Sensory and Elemental, Incapacitated. <strong>Senses</strong> Darkvision 60 ft., passive Perception 10.</p>`,
      "<p><strong>Linked to you when summoned:</strong> your Ninjutsu attack bonus and save DC.</p>") },
  abilities: mods([6, 3, 9, -5, 0, 5]),
  attributes: { ac: { calc: "flat", flat: 23, formula: "" }, init: { bonus: "" } },
  traits: { size: "huge", resist: ["fire"], vuln: ["earth"], conditionImmune: [...MENTAL, ...SENSORY, ...ELEMENTAL], stateImmune: ["incapacitated"],
    speed: { walk: 40, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false }, senses: { darkvision: 60 } },
  hpMax: 105, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "One with Water", "npcTraits", html("When the lion is in contact with a body of water large enough for it to submerge itself, it gains a 250-foot swim speed and truesight 90 feet against other submerged creatures.")),
  item(id, "Claw", "npcStrikes", html("<em>Multiattack.</em> The Supreme Water Lion attacks 3 times: twice with its claws and once with its bite. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 10 ft., one creature. <em>Hit:</em> 3d6 + 6 cold damage."),
    [ninAtk("water-lion", "Claw", "3d6 + 6", "cold", 2)]),
  item(id, "Bite", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 6d6 + 6 cold damage. Once per turn, a creature hit must make a Strength saving throw. On a failure it is Grappled; until this grapple ends, the target is Restrained and the Lion can't bite another target."),
    [ninAtk("water-lion-bite", "Bite", "6d6 + 6", "cold"), ninSave("water-lion-bite", "Bite: Grappled", "str", { inflicts: [inf("grappled", "state"), inf("restrained", "state")], text: "Once per turn." })]),
  item(id, "Swallow", "npcAbilities", html("The Water Lion makes one bite attack against a Large or smaller creature it is grappling. If it hits, the target is swallowed and the grapple ends. The swallowed target is Restrained, fully visible in the Lion's belly, and can't be the target of any jutsu. It must be able to breathe underwater or it begins to drown: it survives rounds equal to its Constitution modifier (minimum 1), then falls unconscious; an unconscious drowning creature takes 6d6 + 6 cold damage at the start of its turn. A creature that's no longer drowning can be woken by another as a bonus action."),
    [act("water-lion-swallow", "Drowning (unconscious)", "damage", { damage: { parts: [{ formula: "6d6 + 6", type: "cold" }] }, text: "At the start of an unconscious drowning creature's turn." })]),
  item(id, "Hydro Discharge (2 Charges)", "npcAbilities", html("The Lion exhales pure Water Release chakra in a 60-foot cone. Each creature except its summoner in that cone must make a Dexterity saving throw, taking 10d10 cold damage and 2 ranks of Chilled on a failed save, or half as much damage on a success."),
    [ninSave("water-lion", "Hydro Discharge", "dex", { half: true, damage: [{ formula: "10d10", type: "cold" }], inflicts: [inf("chilled", "condition", 2)], text: "2 charges." })])
], { "details.level": "@level", ...NIN }, "icons/svg/mystery-man-black.svg");
waterLion.prototypeToken.width = waterLion.prototypeToken.height = 3;

// Lightning Release summons (STD6f F10), from the Summon Stat Blocks section.
const lightning = folder("Lightning Release", ninjutsu._id, "ninjutsu/lightning-release");
const lightningBeast = inkSummon("lightning-beast", "Lightning Beast", { jutsu: "Lightning Release: Beast Lightning (B-Rank)", release: "Lightning Release", dir: lightning, ac: [14, 4, 3], hp: [35, 7, 3], speed: 45,
  m: [2, 6, 0, -5, 0, -5], sv: [1, 9, 1, -5, 0, -5], senses: {}, immune: ["acid", "lightning", "earth", "psychic"], vuln: ["wind"], condImmune: [...MENTAL, ...SENSORY, "petrified", "envenomed"], stateImmune: ["incapacitated", "stunned"],
  extraBio: " <strong>Damage Immunities</strong> Acid, Lightning, Earth, Psychic. <strong>Damage Vulnerabilities</strong> Wind. <strong>Condition Immunities</strong> All Mental and Sensory, Incapacitated, Stunned, Petrified, Envenomed. <strong>Senses</strong> passive Perception 10." }, id => [
  item(id, "Kill Switch", "npcTraits", html("When the beast reaches 0 hit points it explodes. All creatures within 10 feet of it must make a Dexterity saving throw, taking 4d10 lightning damage and becoming Shocked on a failed save, or half as much and no additional effects on a successful one."),
    [ninSave("lightning-beast", "Kill Switch", "dex", { half: true, damage: [{ formula: "4d10", type: "lightning" }], inflicts: [inf("shocked")], text: "At 0 hit points." })]),
  item(id, "Static Rend", "npcStrikes", html("<em>Multiattack.</em> The Lightning Beast attacks twice with its Static Rend. <em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 4d8 lightning damage. If the target has ranks of Shocked, these attacks gain a +2 bonus to hit."),
    [ninAtk("lightning-beast", "Static Rend", "4d8", "lightning", 2, "+2 to hit against a Shocked target (add it by hand).")]),
  item(id, "Lightning Fang", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 3d12 lightning damage, and the creature must make a Constitution saving throw, gaining 1 rank of Shocked on a failed save."),
    [ninAtk("lightning-beast-fang", "Lightning Fang", "3d12", "lightning"), ninSave("lightning-beast-fang", "Lightning Fang: Shocked", "con", { inflicts: [inf("shocked")] })])
]);
const lightningDragon = actor("lightning-dragon", "Lightning Dragon", lightning._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Lightning Release: Lightning Dragon (Overcharge)", summonRole: "Lightning Dragon",
    biography: html("<p><em>Lightning Release: Lightning Dragon (A-Rank), when Overcharged.</em> It uses your Ninjutsu attack bonus and save DC; you command it as a Bonus Action.</p>",
      "<p><strong>Large Construct.</strong> <strong>Armor Class</strong> 22, DR 8 · <strong>Hit Points</strong> 60 · <strong>Speed</strong> 40 ft. fly.</p>",
      `<p><strong>Abilities</strong> ${statLine([7, 7, 3, -5, 0, 5], [10, 10, 6, -5, 0, -5])}. <strong>Damage Immunities</strong> Earth. <strong>Damage Vulnerabilities</strong> Wind. <strong>Condition Immunities</strong> All Mental, Sensory and Elemental, Incapacitated. <strong>Senses</strong> relies on the caster's senses.</p>`,
      "<p><strong>Linked to you when summoned:</strong> your Ninjutsu attack bonus and save DC.</p>") },
  abilities: mods([7, 7, 3, -5, 0, 5]),
  attributes: { ac: { calc: "flat", flat: 22, formula: "" }, init: { bonus: "" } },
  traits: { size: "large", dr: 8, immune: ["earth"], vuln: ["wind"], conditionImmune: [...MENTAL, ...SENSORY, ...ELEMENTAL], stateImmune: ["incapacitated"],
    speed: { walk: 0, climb: 0, swim: 0, fly: 40, burrow: 0, hover: false }, senses: {} },
  hpMax: 60, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Recharge", "npcTraits", html("When the Lightning Dragon takes lightning damage, it regains hit points equal to the damage dealt.")),
  item(id, "Lightning Charge", "npcAbilities", html("The Lightning Dragon charges forward, moving up to 80 feet in any direction, zig-zagging or turning corners. All creatures whose space it would pass become targets for its Lightning Bite attack.")),
  item(id, "Lightning Bite", "npcStrikes", html("<em>Melee Ninjutsu Attack:</em> your Ninjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 6d6 lightning damage."),
    [ninAtk("lightning-dragon", "Lightning Bite", "6d6", "lightning")]),
  item(id, "Lightning Breath (2 Charges)", "npcAbilities", html("The Dragon spews pure Lightning Release chakra in a 60-foot line. Each creature except its summoner in that line must make a Dexterity saving throw, taking 6d10 lightning damage and 2 ranks of Shocked on a failed save, or half as much damage on a successful one."),
    [ninSave("lightning-dragon", "Lightning Breath", "dex", { half: true, damage: [{ formula: "6d10", type: "lightning" }], inflicts: [inf("shocked", "condition", 2)], text: "2 charges." })])
], { "details.level": "@level", ...NIN }, "icons/svg/mystery-man-black.svg");
lightningDragon.prototypeToken.width = lightningDragon.prototypeToken.height = 2;

// Genjutsu summons (STD6f F11), from the Summon Stat Blocks section (Genjutsu Summons).
const genjutsuJutsu = folder("Genjutsu", null, "genjutsu");
const GEN = { "bonuses.attack.gen": "@attack.gen - @prof", "bonuses.saveDC.gen": "@dc.gen - 8 - @prof" };
const genSave = (seed, label, ab, extra = {}) => act(seed, label, "save", { save: { abilities: [ab], dc: { source: "gen" }, onSuccess: "none", resave: false, fourTier: true, tiers: extra.tiers ?? {} },
  ...(extra.inflicts ? { inflicts: extra.inflicts } : {}), ...(extra.text ? { text: extra.text } : {}) });
const darkPhantasm = actor("dark-phantasm", "Dark Phantasm", genjutsuJutsu._id, {
  details: { build: "character", level: 1, template: "summon", creatureType: "construct", blurb: "Genjutsu: Dance Macabre (A-Rank)", summonRole: "Dark Phantasm",
    biography: html("<p><em>Dance Macabre (A-Rank Genjutsu, concentration up to 10 minutes) conjures 4.</em> It uses your Genjutsu attack bonus and save DC; you command them as a Bonus Action, with the same or different orders.</p>",
      "<p><strong>Medium Construct.</strong> <strong>Armor Class</strong> 20 · <strong>Hit Points</strong> 10 · <strong>Speed</strong> 30 ft.</p>",
      `<p><strong>Abilities</strong> ${statLine([2, 6, 0, -5, 0, -5], [1, 9, 1, -5, 0, -5])}. <strong>Damage Immunities</strong> all except psychic, force and necrotic. <strong>Condition Immunities</strong> all. <strong>Senses</strong> Darkvision 60 ft., passive Perception 10.</p>`,
      "<p><strong>Linked to you when summoned:</strong> your Genjutsu attack bonus and save DC.</p>") },
  abilities: mods([2, 6, 0, -5, 0, -5]),
  attributes: { ac: { calc: "flat", flat: 20, formula: "" }, init: { bonus: "" } },
  traits: { size: "medium", immune: DAMAGE.filter(t => !["psychic", "force", "necrotic"].includes(t)), conditionImmune: CONDITIONS, stateImmune: STATES,
    speed: { walk: 30, climb: 0, swim: 0, fly: 0, burrow: 0, hover: false }, senses: { darkvision: 60 } },
  hpMax: 10, cpMax: 0, diesAtZero: true
}, id => [
  item(id, "Illusory Construct", "npcTraits", html("The phantasm can move through other creatures and objects as if they were difficult terrain. It takes 5 damage if it ends its turn inside an object.")),
  item(id, "Claws", "npcStrikes", html("<em>Melee Weapon Attack:</em> your Genjutsu attack bonus, reach 5 ft., one creature. <em>Hit:</em> 2d6 + 4 psychic damage. On a critical hit, the target gains +1 rank of Demoralized."),
    [act("dark-phantasm", "Claws", "attack", { attack: { discipline: "gen", range: "melee", count: 1, bonus: "0" }, damage: { parts: [{ formula: "2d6 + 4", type: "psychic" }] }, text: "Critical hit: +1 Demoralized (the effect)." }),
     act("dark-phantasm-crit", "Critical hit: Demoralized", "effect", { effect: { name: "Claws", target: "targets", changes: [], expires: "", seconds: 0, inflicts: [inf("demoralized")] } })]),
  item(id, "Phantom Fangs (1/Summon)", "npcAbilities", html("The Dark Phantasm opens its maw revealing a twisted jaw of incomprehensible darkness, teeth and misery. All creatures in a 15-foot cone from it that aren't Blinded must make a Wisdom saving throw against your Genjutsu save DC. Once it uses this ability, it dispels itself.",
    "<strong>Success:</strong> resists. <strong>Failure:</strong> 3d6 psychic damage and 1 rank of Berserk. <strong>Critical Failure:</strong> 4d6 psychic damage and 3 ranks of Berserk."),
    [genSave("dark-phantasm", "Phantom Fangs", "wis", { inflicts: [inf("berserk")], tiers: { critSuccess: "Critical Success: resists.", success: "Success: resists.", failure: "Failure: 3d6 psychic and 1 Berserk.", critFailure: "Critical Failure: 4d6 psychic and 3 Berserk." }, text: "Once per summon; it then dispels itself." }),
     act("dark-phantasm-fangs", "Phantom Fangs: failure", "damage", { damage: { parts: [{ formula: "3d6", type: "psychic" }] } }),
     act("dark-phantasm-fangs-cf", "Phantom Fangs: critical failure", "damage", { damage: { parts: [{ formula: "4d6", type: "psychic" }] } }),
     act("dark-phantasm-fangs-cf", "Critical failure: 3 Berserk", "effect", { effect: { name: "Phantom Fangs", target: "targets", changes: [], expires: "", seconds: 0, inflicts: [inf("berserk", "condition", 3)] } })])
], { "details.level": "@level", ...GEN }, "icons/svg/mystery-man-black.svg");

/* -------------------------------------------- */
export const SUMMONS = { bunshin, voidSoul, duplicity, phantasm, spider, bird, centipede, dragon, bloodDragon, steamImp, dokiBandaged, dokiClub, dokiClaw, crystalRabbit, crystalDeer, crystalDragon, broodMother, kujakuBeast, inkBat, inkReptile, inanimatePuppet, inkPredator, inkOni, clone, poisonDeity, mudWolf, stoneDragon, flameSpider, waterShark, jellyfish, waterLion, lightningBeast, lightningDragon, darkPhantasm, folders: [scout, cloning, voidHeart, genjutsu, beguiler, illusionist, bakuton, chinoike, hozuki, kashu, shoton, tsuchigumo, hoshi, ninjutsu, nonElemental, medical, earth, fire, water, lightning, genjutsuJutsu] };

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
  write("kashu/_folder.json", kashu);
  for ( const d of [dokiBandaged, dokiClub, dokiClaw] ) write(`kashu/${d.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "")}-${d._id}.json`, d);
  write("shoton/_folder.json", shoton);
  for ( const d of [crystalRabbit, crystalDeer, crystalDragon] ) write(`shoton/${d.name.toLowerCase().replace(/\s+/g, "-")}-${d._id}.json`, d);
  write("tsuchigumo/_folder.json", tsuchigumo);
  write(`tsuchigumo/brood-mother-${broodMother._id}.json`, broodMother);
  write("hoshi/_folder.json", hoshi);
  write(`hoshi/kujaku-beast-${kujakuBeast._id}.json`, kujakuBeast);
  write("ninjutsu/_folder.json", ninjutsu);
  write("ninjutsu/non-elemental/_folder.json", nonElemental);
  write("ninjutsu/medical-release/_folder.json", medical);
  write("ninjutsu/earth-release/_folder.json", earth);
  write("ninjutsu/fire-release/_folder.json", fire);
  write(`ninjutsu/fire-release/flame-spider-${flameSpider._id}.json`, flameSpider);
  write("ninjutsu/water-release/_folder.json", water);
  write("ninjutsu/lightning-release/_folder.json", lightning);
  write("genjutsu/_folder.json", genjutsuJutsu);
  write(`genjutsu/dark-phantasm-${darkPhantasm._id}.json`, darkPhantasm);
  for ( const d of [lightningBeast, lightningDragon] ) write(`ninjutsu/lightning-release/${d.name.toLowerCase().replace(/[^a-z]+/g, "-")}-${d._id}.json`, d);
  for ( const d of [waterShark, jellyfish, waterLion] ) write(`ninjutsu/water-release/${d.name.toLowerCase().replace(/[^a-z]+/g, "-")}-${d._id}.json`, d);
  write(`ninjutsu/earth-release/mud-wolf-${mudWolf._id}.json`, mudWolf);
  write(`ninjutsu/earth-release/stone-dragon-${stoneDragon._id}.json`, stoneDragon);
  write(`ninjutsu/medical-release/supreme-poison-deity-${poisonDeity._id}.json`, poisonDeity);
  for ( const d of [inkBat, inkReptile, inanimatePuppet, inkPredator, inkOni, clone] ) write(`ninjutsu/non-elemental/${d.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "")}-${d._id}.json`, d);
  console.log(`✓ summons: 34 NPCs (${[bunshin, voidSoul, duplicity, phantasm, spider, bird, centipede, dragon, bloodDragon, steamImp, dokiBandaged, dokiClub, dokiClaw, crystalRabbit, crystalDeer, crystalDragon, broodMother, kujakuBeast, inkBat, inkReptile, inanimatePuppet, inkPredator, inkOni, clone, poisonDeity, mudWolf, stoneDragon, flameSpider, waterShark, jellyfish, waterLion, lightningBeast, lightningDragon, darkPhantasm].map(d => `${d.name} ${d._id}`).join(", ")})`);
}
