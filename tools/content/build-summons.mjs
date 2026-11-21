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
const duplicityLinks = {
  "details.level": "@level",
  "attributes.ac.flat": "@dc.gen",
  "traits.speed.walk": "@speed"
};
const duplicityBio = html(
  "<p><em>Beguiling Duplicity (Beguiler, 2nd level).</em> A perfect visual illusion of yourself, summoned as a Bonus Action into an unoccupied space you can see within 15 feet. It lasts 1 minute, or until you dismiss it on your turn (no action) or are incapacitated. Up to 3 at once; you command one at a time. It's intangible, doesn't occupy its space, and is a Genjutsu you cast of the highest rank you can cast.</p>",
  "<p><strong>Armor Class</strong> your Genjutsu save DC · <strong>Hit Points</strong> 1 (at 0 it's dispelled) · <strong>Speed</strong> your speed (no flying unless you can fly).</p>",
  "<p><strong>Linked to you when summoned:</strong> its level, AC and speed are set from yours.</p>");
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
export const SUMMONS = { bunshin, voidSoul, duplicity, phantasm, folders: [scout, cloning, voidHeart, genjutsu, beguiler, illusionist] };

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
  console.log(`✓ summons: 4 NPCs (Bunshin ${bunshin._id}, Void Soul ${voidSoul._id}, Duplicity ${duplicity._id}, Phantasm ${phantasm._id}) in 6 folders`);
}
