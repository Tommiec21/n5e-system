"""AMP1c (docs/AMP1_SPEC.md): Amp cards for every feature whose button started an Amp.

Writes packs/_source/amps/<key>-<id>.json (one card per Amp, the book box as its description, its
mechanics as changes and rule elements) and points each button at its card ({amp: key}) in the class
automation tables (content/automation/*.json, applied by tools/content/apply-automation.mjs) or, for
features without a table, in the pack source itself.

Idempotent: a button already pointing at a card keeps it; mechanics come from the CARDS table below,
plus whatever the button carried before it was converted (read from git history is not needed: the
first run moves them onto the card and later runs read them back from the card file).

AMP1e (docs/AMP1E_SPEC.md): self-buff states (DYNAMIC FORM!, Flawless) become typeless cards outside
the Amp limits (King Q-E3). Their buttons were state effects, so they're found by their state
(legacyState) instead of an Amp type.

    python3 tools/content/build-amp-cards.py
"""
import glob
import hashlib
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AMPS = os.path.join(ROOT, "packs/_source/amps")
CLASS_FOLDER = "n5eAmpFoldClass1"
SELF_BUFF_FOLDER = "n5eAmpFoldOther1"

L = lambda *pairs: "lvl(" + ",".join(f"{a}:{b}" for a, b in pairs) + ")"
note = lambda text: {"key": "note", "text": text}
NO_COST_REDUCTION = {"key": "costReduction", "selector": "cast", "value": 0, "label": "Crash: no cost reduction"}
CRASH_NOTES = [
    note("Once per casting, Ninjutsu you cast deal +1d10 damage (2d10 at 7th, 3d10 at 11th, 4d10 at 15th, 5d10 at 19th; half the dice for an area). This is added automatically when you cast."),
    note("You can use two or more Moldings on one casting; you can use the Draw Reserves skill action as an Action."),
]

# key, name, owner (kind, id, subclass), type, legacy button name (to find and convert), extra fields

# The feature whose box the card comes from, where the button sits on another feature.
OWNER_FEATURE = {"battle-medic": "chakra-enhanced-combat-combat-medic"}


def ch(key, value, mode=2):
    return {"key": key, "value": str(value), "mode": mode}


CARDS = [
    dict(key="reality-shift", name="Reality Shift", owner=("subclass", "genjutsu-specialist", "layered-reality"), type="will", legacy="Reality Shift",
         summary="+1 Genjutsu save DC; your Genjutsu save DC can be your AC; Genjutsu saves can become Intelligence.", state="realityShift",
         cooldown=600, endsOn=["unconscious"],
         rules=[note("You can use your Genjutsu Save DC as your AC (at the table)."), note("Genjutsu you cast can have their saving throw changed to Intelligence (choose when casting).")],
         box=["Will Amp", "You gain a +1 bonus to your Genjutsu Save DC.", "You can use your Genjutsu Save DC as your AC.", "All Genjutsu you cast can have its saving throw changed to Intelligence.",
              "Lasts 1 minute, until you end it (no action) or are incapacitated. Once used, not again until 10 minutes have passed."]),
    dict(key="chakra-surge-crash", name="Chakra Surge: Crash", owner=("class", "ninjutsu-specialist", ""), type="will", legacy="Chakra Surge: Crash",
         summary="Ninjutsu deal +1d10 to +5d10 once per casting; several Moldings at once; Draw Reserves as an Action; no cost reduction.",
         state="crash", exclusive="surge", cooldown=600, rules=[NO_COST_REDUCTION, *CRASH_NOTES],
         box=["Will Amp", "Crash symbolizes you releasing the limits on your chakra coils, empowering the jutsu you cast.",
              "Once per casting, you gain a +1d10 bonus to damage you deal with Ninjutsu you cast. This increases to +2d10 at 7th, 3d10 at 11th, 4d10 at 15th and 5d10 at 19th level. Reduce the dice rolled by half (rounded up) if the jutsu affects an area.",
              "You can use two or more Moldings at once as part of the same casting.", "You can use the Draw Reserves skill Action, as an Action.",
              "You cannot benefit from any source of cost reduction. Casting a Jutsu at 0 Cost does not count as cost reduction.",
              "Crash and Flow share 1 minute; a Bonus Action swaps once per turn; 10 minutes of rest or meditation before entering again."]),
    dict(key="chakra-surge-flow", name="Chakra Surge: Flow", owner=("class", "ninjutsu-specialist", ""), type="will", legacy="Chakra Surge: Flow",
         summary="+1 Ninjutsu save DC (+2 at 11th, +3 at 19th); regain 1 Focus at the start of your turn; advantage on Ninjutsu concentration checks.",
         state="flow", exclusive="surge", cooldown=600, rules=[note("You cannot benefit from jutsu or features that boost the damage you deal with Ninjutsu.")],
         box=["Will Amp", "Flow symbolizes you controlling and refining your chakra, making slight adjustments to it as the battle progresses.",
              "You gain a +1 bonus to your Ninjutsu Save DC. This bonus increases to +2 at 11th level and +3 at 19th level.", "When you begin your turn in this state, you regain 1 Focus.",
              "You make Concentration checks to maintain Ninjutsu at advantage.", "You cannot benefit from Jutsu or features that boosts the damage you deal with Ninjutsu."]),
    dict(key="chakra-surge-crash-perfected", name="Chakra Surge: Crash (Perfected)", owner=("class", "ninjutsu-specialist", ""), type="will", legacy="Chakra Surge: Crash (Perfected)",
         summary="Perfected Crash (20th level, 4 Focus): Crash's benefits, perfected for 1 minute.", state="crash", exclusive="surge", cooldown=600, rules=[NO_COST_REDUCTION, *CRASH_NOTES],
         box=["Will Amp", "Starting at 20th level, when you would enter your Crash state, you can spend 4 Focus, perfecting it for the next minute. Once you do this, you cannot do so again for 10 minutes."]),
    dict(key="chakra-surge-flow-perfected", name="Chakra Surge: Flow (Perfected)", owner=("class", "ninjutsu-specialist", ""), type="will", legacy="Chakra Surge: Flow (Perfected)",
         summary="Perfected Flow (20th level, 4 Focus): Flow's benefits, perfected for 1 minute.", state="flow", exclusive="surge", cooldown=600, rules=[],
         box=["Will Amp", "Starting at 20th level, when you would enter your Flow state, you can spend 4 Focus, perfecting it for the next minute. Once you do this, you cannot do so again for 10 minutes."]),
    dict(key="crash-overheat", name="Crash: Overheat", owner=("subclass", "ninjutsu-specialist", "blaze-walker"), type="will", legacy="Chakra Surge: Crash (Overheat)",
         summary="Crash, plus +2 (+4 at 10th, +6 at 18th) damage on Fire Release Ninjutsu; take 1d6 fire at the end of each of your turns.", state="crash", exclusive="surge", cooldown=600,
         rules=[NO_COST_REDUCTION, *CRASH_NOTES],
         box=["Will Amp", "When you enter your Crash state, by spending 1 Pyroclasm, you begin to Overheat for the duration of the Crash state.",
              "While overheating, Ninjutsu you cast with the Fire Release keyword gain a +2 bonus to the damage it deals. This increases to +4 at 10th level and +6 at 18th level.",
              "While overheating, you take 1d6 fire damage at the end of each of your turns. This damage cannot be reduced or resisted by any means."]),
    dict(key="crash-burnout", name="Crash: Burnout", owner=("subclass", "ninjutsu-specialist", "blaze-walker"), type="will", legacy="Chakra Surge: Crash (Burnout)",
         summary="Overheat, plus 1 Pyroclasm at the end of each turn and Detonate as a Bonus Action; take 3d6 fire at the end of each of your turns.", state="crash", exclusive="surge", cooldown=600,
         rules=[NO_COST_REDUCTION, *CRASH_NOTES],
         box=["Will Amp", "When you would enter Overheat, by spending 2 Focus, you enter Burnout. You gain the benefits of Overheat, you gain 1 Pyroclasm at the end of each of your turns and you may use the Detonate ability as a bonus action, treating it as a Ninjutsu with the Release being cast.",
              "While in Burnout, you take 3d6 fire damage at the end of each of your turns. This damage cannot be reduced, resisted or ignored by any means."]),
    dict(key="crash-herald", name="Crash: Herald", owner=("subclass", "ninjutsu-specialist", "storm-terror"), type="will", legacy="Chakra Surge: Crash (Herald)",
         summary="Crash, plus a 40-foot fly speed; hostile creatures get +1 to attack you.", state="crash", exclusive="surge", cooldown=600,
         rules=[NO_COST_REDUCTION, *CRASH_NOTES, note("Herald: you may halve Crash's damage dice and apply the halved amount to two separate jutsu cast in this state.")],
         box=["Will Amp", "When you enter your Crash state, by spending 1 Pressure, you become a Herald of storms. You gain a 40-foot fly speed and you may halve the damage dice granted by Crash, applying the halved amount to two separate jutsu cast while in this state.",
              "While a Herald, hostile creatures gain a +1 bonus to their attack rolls when attacking you."]),
    dict(key="crash-typhoon", name="Crash: Typhoon", owner=("subclass", "ninjutsu-specialist", "storm-terror"), type="will", legacy="Chakra Surge: Crash (Typhoon)",
         summary="Herald, plus 1 Pressure at the end of each turn and a free Gale Burst, Sharpening or Dragwind once per turn; hostiles get +2 to attack you and +1 critical range.", state="crash", exclusive="surge", cooldown=600,
         rules=[NO_COST_REDUCTION, *CRASH_NOTES],
         box=["Will Amp", "When you would act as a Herald, by spending 2 Focus, you instead become a Typhoon. You gain the benefits of being a Herald, you gain 1 Pressure at the end of each of your turns and you may use the base effects of Gale Burst, Sharpening or Dragwind once per turn at no Pressure cost.",
              "While a Typhoon, hostile creatures gain a +2 bonus to their attack rolls and +1 critical threat range when attacking you."]),
    dict(key="crash-maelstrom", name="Crash: Maelstrom", owner=("subclass", "ninjutsu-specialist", "tsunami"), type="will", legacy="Chakra Surge: Crash (Maelstrom)",
         summary="Crash, plus two Shift Tides stances at once and Tidal Draw from Water Release cold damage once per turn.", state="crash", exclusive="surge", cooldown=600,
         rules=[NO_COST_REDUCTION, *CRASH_NOTES],
         box=["Will Amp", "When you enter your Crash state, by spending 1 Focus, you become a Maelstrom. You can benefit from two stances from Shift Tides at once, and once per turn, when you deal Cold damage to a creature with a Water Release Ninjutsu, you can inflict one of the affected creatures with Tidal Draw until the beginning of your next turn."]),
    dict(key="crash-abyss", name="Crash: Abyss", owner=("subclass", "ninjutsu-specialist", "tsunami"), type="will", legacy="Chakra Surge: Crash (Abyss)",
         summary="Maelstrom, plus Tidal Draw on every creature your Water Release Ninjutsu affect and 1 Focus per chakra damage dealt; take +4 from each instance of damage.", state="crash", exclusive="surge", cooldown=600,
         rules=[NO_COST_REDUCTION, *CRASH_NOTES],
         box=["Will Amp", "When you would become a Maelstrom, by spending 2 Focus, you instead become an Abyss. You gain the benefits of being a Maelstrom, you can inflict Tidal Draw on all creatures affected by a Water Release Ninjutsu you cast and each time you deal Chakra damage to a creature, you regain 1 Focus.",
              "While an Abyss, you increase each instance of damage you take by +4."]),
    dict(key="battle-medic", name="Battle Medic", owner=("subclass", "medical-nin", "combat-medic"), type="fortitude", legacy="Battle Medic",
         summary="Unarmed die d12; +1 critical range on unarmed and Taijutsu (+2 at 10th); low-rank Taijutsu gain Medical; heal at the start of your turn while at half HP or less.",
         state="battleMedic", exclusive="battleMedic", cooldown=600, rules=[note("Taijutsu you cast of D-Rank or lower gain the Medical keyword (C-Rank at 6th, B-Rank at 10th).")],
         box=["Fortitude Amp", "Your [Unarmed Damage] die becomes a d12.", "Your unarmed and Taijutsu attacks gain a +1 bonus to their critical threat range. This becomes +2 at 10th level.",
              "Taijutsu you cast, of D-Rank or lower gain the Medical keyword. This becomes C-Rank at 6th and B-Rank at 10th level.",
              "If you begin your turn with half or fewer hit points, you regain hit points equal to your Channeled Healing bonus.", "Lasts 1 minute; 10 minutes before you can enter it again."]),
    dict(key="battle-medic-strength-of-100", name="Battle Medic: Strength of 100", owner=("subclass", "medical-nin", "combat-medic"), type="fortitude", legacy="Battle Medic: Strength of 100",
         summary="Battle Medic, plus a 2d12 unarmed die, Strength Mastery, and a 10-foot push once per turn.", state="battleMedic", exclusive="battleMedic", cooldown=600,
         rules=[note("Constructs and structures are vulnerable to your [Unarmed Damage]. Once per turn, when you hit with an attack dealing [Unarmed Damage], you can push the target 10 feet in any direction except up.")],
         box=["Fortitude Amp (Strength of 100 Enhancement)", "Your [Unarmed Damage] die becomes 2d12.", "You gain a rank of Mastery with Strength based checks and Saves.",
              "Constructs and Structures are Vulnerable to your [Unarmed Damage].", "Once per turn, when you hit a creature with an attack that deals [Unarmed Damage] you can push the target 10 feet in any direction, except upwards."]),
    dict(key="battle-medic-strength-of-1000", name="Battle Medic: Strength of 1000", owner=("subclass", "medical-nin", "combat-medic"), type="fortitude", legacy="Battle Medic: Strength of 1000",
         summary="Battle Medic, plus a 2d12 unarmed die, two Strength Mastery ranks, a 10-foot push and DR equal to your Channeled Healing bonus.", state="battleMedic", exclusive="battleMedic", cooldown=600,
         rules=[note("Constructs and structures are vulnerable to your [Unarmed Damage]. Once per turn, when you hit with an attack dealing [Unarmed Damage], you can push the target 10 feet in any direction except up.")],
         box=["Fortitude Amp (Strength of 1000 Enhancement)", "Your [Unarmed Damage] die becomes 2d12.", "You gain 2 ranks of Mastery with Strength based checks and Saves.",
              "Constructs and Structures are Vulnerable to your [Unarmed Damage].", "Once per turn, when you hit a creature with an attack that deals [Unarmed Damage] you can push the target 10 feet in any direction, except upwards.",
              "You gain DR (Damage reduction) vs all Damage, equal to your Channeled Healing bonus."]),
    dict(key="waltz", name="Waltz", owner=("subclass", "weapon-specialist", "battle-dancer"), type="battle", legacy="Waltz",
         summary="Dance with a Partner: Move in Tandem, Battle Step, Cascade Step (−2 AC), Defensive Dance (resistance). For the rest of combat.",
         state="waltz", exclusive="dance", until="combatEnd", giveable=True,
         rules=[note("Waltz: at the start of your turn pick a willing Partner you can see. When you begin your turn within 10 feet of them, you both gain: Move in Tandem (1 Discipline: share a turn), Battle Step (move together instead of moving), Cascade Step (1 Discipline: a Dex save vs the Weapon Specialist's Taijutsu DC or −2 AC until your next turn), Defensive Dance (Reaction + 2 Discipline: resistance to the triggering damage)."),
                note("Give this Amp to your Partner too (drag the card onto them); a Partner without Discipline spends the Weapon Specialist's.")],
         box=["Battle Amp", "You perform a smooth dance filled with elegant steps, but you can't do it alone. You require a Partner. At the beginning of your turn, you select a Partner: a willing creature you can see, until the beginning of your next turn. You can only have 1 Partner at a time.",
              "When you begin your turn within 10 feet of your willing partner you both gain: Move in Tandem, Battle Step, Cascade Step and Defensive Dance (see the feature).",
              "You can dance for the duration of combat and end it early at no action on your turn. A Bonus Action switches your dance."]),
    dict(key="samba", name="Samba", owner=("subclass", "weapon-specialist", "battle-dancer"), type="battle", legacy="Samba",
         summary="Whisk (reroll Bukijutsu damage), Spin Step (attack all in reach), Technical Step (advantage; a crit gives an extra action). For the rest of combat.",
         state="samba", exclusive="dance", until="combatEnd",
         rules=[note("Whisk: as part of dealing Bukijutsu damage, 1 Discipline to reroll it and take the higher."),
                note("Spin Step: as part of a weapon attack, 2 Discipline to target every hostile creature in reach (ranged or thrown: within 15 feet)."),
                note("Technical Step: once per turn, a Bonus Action and 2 Discipline: your next attack has advantage, and a critical hit with it gives you an extra action this turn.")],
         box=["Battle Amp", "You move rhythmically, with a swift and decisive dance, making it hard to foresee your next move.",
              "Whisk. As part of dealing damage with a Bukijutsu, you can spend 1 Discipline. You can reroll the damage dealt, taking the highest result.",
              "Spin Step. As part of a weapon attack, you can spend 2 Discipline to make the attack target all hostile creatures within your weapon's range. If your weapon is a ranged weapon or has the Thrown property, you instead target all hostile creatures within 15 feet of you.",
              "Technical Step. Once per turn, as a bonus action you can spend 2 Discipline to perform a special sequence. The next attack you make is at advantage. If this attack scores a critical hit you gain an additional action this turn.",
              "You can dance for the duration of combat and end it early at no action on your turn. A Bonus Action switches your dance."]),
    dict(key="battle-trance", name="Battle Trance", owner=("subclass", "weapon-specialist", "fang-breaker"), type="battle", legacy="Battle Trance",
         summary="Advantage on checks and saves with your Taijutsu ability; resistance to damage types you pick; from 6th, +2 (+4 at 14th) Polearm and Flail damage.",
         state="battleTrance", cooldown=600, endsOn=["unconscious"],
         rules=[{"key": "advantage", "selector": ["check", "save"], "predicate": "ability:tai", "label": "Battle Trance: Furious Advantage"},
                {"key": "modifier", "selector": "damage", "predicate": {"any": ["weapon:group:polearm", "weapon:group:flail"]}, "value": L((1, 0), (6, 2), (14, 4)), "label": "Battle Trance: Frenzied Assault"},
                note("Furious Resilience: resistance to one damage type you pick on entering (two at 10th, three at 17th): add it as Damage Resistance on this Amp's effect, or at the table."),
                note("Furious Focus: you can't maintain concentration on effects that aren't Taijutsu or Bukijutsu."),
                note("6th level: forgo Frenzied Assault at the start of your turn for advantage on your first Polearm or Flail attack. Frenzy Roar (Reaction, 2 Discipline) and Undying Frenzy (3 Discipline: drop to 1 HP instead, ending the trance) are on the feature.")],
         box=["Battle Amp", "Furious Advantage. You have advantage on Checks and saving throws using your Taijutsu Ability score.",
              "Furious Resilience. You have resistance to one damage type of your choice, which you pick when you enter Battle Trance. This increases to two choices at 10th and three choices at 17th.",
              "Furious Focus. You cannot maintain concentration on non Taijutsu or Bukijutsu based effects for the duration of your Battle Trance.",
              "Level 6 — Frenzied Assault. When you deal damage with an attack or Bukijutsu that uses Polearm or Flail weapons, you add +2 damage. This increases to +4 at 14th level. At the start of your turn, you can forgo this damage bonus to gain advantage on the first attack you make that uses a Polearm or Flail weapon.",
              "Frenzy Roar and Undying Frenzy: see the feature.", "Lasts 1 minute or until you fall unconscious; 10 minutes of meditation before entering again (or +1 Discipline per extra use)."]),
    dict(key="ascension", name="Ascension", owner=("subclass", "medical-nin", "adept-medic"), type="will", legacy="Ascension",
         summary="Gain Healing Surges (max 3) when your jutsu heal; spend them on Battle Surge, Healing Burst or Vitality Guard.", state="ascension", cooldown=600,
         rules=[note("Once per turn, when a jutsu you cast restores HP or grants temporary HP, gain 1 Healing Surge (max 3)."),
                note("Battle Surge (Action, 1 surge): allies of your choice within 15 feet gain 1 Battle Surge, usable in place of 1 class or subclass resource. Healing Burst (Bonus Action, 1 surge): willing allies within 20 feet regain 1 Hit Die + Con (2 Hit Die at 10th). Vitality Guard (Reaction, 1 surge): an ally within 30 feet gains resistance to the triggering damage.")],
         box=["Will Amp", "Once per turn, when you restore hit points or grant temporary hit points to a creature with a Jutsu you cast, you gain 1 Healing Surge (Max 3).",
              "Battle Surge. As an Action, by spending 1 surge, all allied creatures of your choice, excluding yourself, within a 15-foot radius gain 1 Battle Surge (Max 1) for 1 minute or until used, usable in place of any 1 Class or Subclass based special resource. A creature can benefit from Battle Surge once every other turn.",
              "Healing Burst. As a bonus action, by spending 1 surge, all willing allied creatures of your choice within 20 feet regain Hit points equal to 1 Hit Die + their Constitution Modifier (2 Hit Die at 10th level). Not on creatures at 0 Hit points.",
              "Vitality Guard. When an allied creature within 30 feet of you takes damage, you can spend your Reaction and 1 Surge to grant it resistance to the triggering damage.",
              "Lasts 1 minute; 10 minutes of meditation and recovery before entering again."]),
    dict(key="elemental-cloak", name="Elemental Cloak", owner=("subclass", "taijutsu-specialist", "nin-tai"), type="fortitude", legacy="Elemental Cloak",
         summary="Taijutsu deal your chosen release's damage type; your release's cloak benefit (Earth DR, Wind AC, Fire Mastery, Water Reach and Trip, Lightning crit and speed).", state="elementalCloak", cooldown=600,
         rules=[note("Your Taijutsu deal your chosen nature release's damage type."),
                note("Earth: +4 DR that can't be reduced (+6 at 17th); 30 ft tremor sense at 10th. Wind: +1 AC and Taijutsu pierce 2 DR (+2 and 4 at 17th); immune to Grappled and Restrained at 10th. Fire: a rank of Mastery to [Unarmed Damage] (two at 10th, three at 17th). Water: unarmed attacks gain Reach 1 and Trip; at 10th push 10 ft the first time each turn; at 17th no jutsu bonuses to saves vs your Taijutsu. Lightning: +1 critical range on unarmed and Taijutsu and +10 speed; at 10th +1 unarmed die on a crit; at 17th your [Unarmed Damage] can't be intercepted."),
                note("Add your release's numbers as changes on this Amp's effect (or a copy of this card per release) to automate them.")],
         box=["Fortitude Amp", "Taijutsu you cast deal its nature release's associated damage type and your chosen nature release grants your cloak different benefits.",
              "Earth Release: You gain +4 DR. This DR cannot be reduced by any means. When you reach 10th, you gain 30 feet of tremor sense. Increase DR to +6 at 17th level.",
              "Wind Release: You gain a +1 Bonus to AC, and damage you deal with Taijutsu penetrates 2 of a creature's DR. At 10th level, you gain immunity to the Grappled and Restrained conditions. At 17th level, your bonuses become +2 to AC and penetrate 4 DR.",
              "Fire Release: You gain a rank of Mastery to [Unarmed Damage]. This becomes two ranks of Mastery at 10th and three ranks at 17th level.",
              "Water Release: Your unarmed attacks gain the Reach 1 and Trip weapon properties. Beginning at 10th level the first time each turn you deal [Unarmed Damage] to a creature you can move them up to 10 feet in any direction of your choice. At 17th level, creatures cannot gain jutsu based bonuses to their saving throws vs Taijutsu you cast.",
              "Lightning Release: Your unarmed and Taijutsu attacks gain a +1 bonus to their critical threat range and a +10 to speed. Beginning at 10th level, when you score a critical with an unarmed attack, you may add 1 unarmed damage die to the result. At 17th level, [Unarmed Damage] you deal cannot have its damage intercepted.",
              "Lasts 1 minute or until you end it with a Bonus Action; 10 minutes of meditation before entering again."]),
    dict(key="transfigured", name="Transfigured", owner=("subclass", "medical-nin", "transmuter"), type="fortitude", namedNote="Special Amp (Fortitude)", legacy="Transfigured",
         summary="An ally's body takes a designation the Medical-Nin picks: Avian (fly), Carnivoran (+damage), Herbivore (DR), Insectoid (darkvision, chakra resistance).", giveable=True,
         rules=[note("Pick the designation when applying: Avian (a flying speed equal to your speed, land at the end of your turn; immune to fall damage; can't be knocked prone), Carnivoran (+[Unarmed Damage] and [Weapon Damage] equal to the Medical-Nin's Channeled Healing bonus), Herbivore (DR equal to the Channeled Healing bonus), Insectoid (Darkvision and Chakra Sight 60 ft, resistance to chakra damage)."),
                note("Only one ally at a time: transfiguring another ally ends the oldest. Chimeric designations (Aberration, Demonic, Monstrosity) at 10th and Sage Beast at 18th: see the Transmuter features.")],
         box=["Special Amp (Fortitude)", "You are temporarily Transfigured, having your cells, organs and biological makeup slightly adjusted to better match one of the following designations chosen by the allied Medical-Nin that applied this effect.",
              "Avian: You gain a flying speed equal to your movement speed, but must land at the end of your turn. You gain immunity to fall damage and cannot be knocked prone.",
              "Carnivoran: You gain a bonus to your [Unarmed Damage] and [Weapon Damage] equal to the Medical-Nin's Channeled Healing bonus.",
              "Herbivore: You gain DR equal to the Medical-Nin's Channeled Healing bonus.", "Insectoid: You gain Darkvision and Chakra Sight out to 60ft and resistance to Chakra Damage.",
              "Lasts 1 minute. Only one allied creature at a time."]),
    # AMP1d (King 2026-11-20): the class Amp boxes with no button before.
    dict(key="elemental-flux", name="Elemental Flux", owner=("subclass", "scout-nin", "elemental-scout"), type="battle", legacy="Elemental Flux",
         summary="Benefits by your Flux type (the nature release you last cast) and the discipline you cast. Lasts until the end of your next turn.",
         activation="trigger", until="nextTurnEnd",
         rules=[note("Starts in combat when you cast a jutsu with a nature release keyword. The same release again extends it by 1 round; a different release changes the type and resets the duration."),
                note("From 6th (Elemental Aura): resistance to your current Flux type's damage."),
                note("Once per turn, a jutsu that applies or benefits from Follow Up or Set-Up while in Flux regains 1 Superiority Die.")],
         box=["Battle Amp", "Your flux type is equal to the nature release that you most recently cast. You benefit from the associated effect based on the keyword listed.",
              "Earth Release Type", "Taijutsu/Bukijutsu. Taijutsu and Bukijutsu you cast grants you a minor barrier of defensive chakra, granting you an amount of temporary hit points equal to the rank of the jutsu cast (D-Rank: 4, C-Rank: 8, B-Rank: 12, A-Rank: 16, S-Rank: 20).",
              "Ninjutsu. You create a 10-foot radius of difficult terrain around you, which you and allied creatures are immune to.",
              "Genjutsu. Heavy stone weighs down the thoughts of one affected creature. That creature cannot take the dash action and has its movement speed reduced by 20 feet until the end of their next turn as they believe their weight has multiplied.",
              "Wind Release Type", "Taijutsu/Bukijutsu. Taijutsu and Bukijutsu you cast, grants you a +20 bonus to speed and you can move as part of its casting, either before or after its attacks/effects are applied.",
              "Ninjutsu. You create a zone of turbulence in a 5-foot radius around you. All attacks that would target a creature within 5 feet of you, suffer a -2 penalty to hit. This turbulence lasts until the end of your next turn.",
              "Genjutsu. Whispering wind distorts thoughts; Select one creature you can see. Creatures affected by this Genjutsu must target the selected creature with hostile effects it until the beginning of your next turn.",
              "Fire Release Type", "Taijutsu/Bukijutsu. Taijutsu and Bukijutsu you cast, grants you a +1 bonus to your critical threat range.",
              "Ninjutsu. Ninjutsu you cast ignores 4 of a creatures DR.",
              "Genjutsu. Your illusion manifests smothering heat in the mind of the enemy. Until the beginning of your next turn, all affected creatures suffer disadvantage on chakra control checks.",
              "Water Release Type", "Taijutsu/Bukijutsu. Affected creatures suffer a -10 penalty to their speed and cannot gain bonuses to their speed until the beginning of your next turn.",
              "Ninjutsu. Ninjutsu you cast with the same nature release as your Flux type, reduces their cost by an amount equal to their ranks. (D-Rank: 1, C-Rank: 2, B-Rank: 3, A-Rank: 4, S-Rank: 5)",
              "Genjutsu. Genjutsu you cast that affects a creature increases the next jutsu they cast before the start of your next turn by +4.",
              "Lightning Release Type", "Taijutsu/Bukijutsu. Taijutsu and Bukijutsu you cast, ignores resistance once per turn.",
              "Ninjutsu. Ninjutsu you cast with the same nature release as your Flux type, that scores a critical hit, increases the damage they deal by Xd6 lightning damage, where X is based on the rank the jutsu was cast at. (D-Rank: 1, C-Rank: 2, B-Rank: 3, A-Rank: 4, S-Rank: 5)",
              "Genjutsu. Your illusions create false shocks and jolts in the body of your foes. Affected creatures increase the chakra cost to maintain jutsu they are concentrating on by +8, until the beginning of your next turn."]),
    dict(key="flash", name="Flash", owner=("subclass", "scout-nin", "pathfinder-scout"), type="reflex", legacy="Flash",
         summary="+10 speed, Mastery on Dexterity checks, and +1 to Dexterity saves and AC (+2 at 9th). Lasts 1 minute.",
         activation="bonus",
         changes=[ch("system.bonuses.speed", 10), ch("n5e.mastery.check.dex", "Flash"), ch("n5e.save.dex", "lvl(1:1,9:2)"), ch("system.bonuses.ac", "lvl(1:1,9:2)")],
         rules=[note("Start: a Bonus action on your turn, or when you cast a jutsu granted by Mobile Savant."),
                note("Ends early with Speed Blitz (an attack with Jack of All: Combat that can't be reacted to) or Burst Rush (Dash as a teleport, bringing an adjacent willing ally).")],
         box=["Reflex Amp", "Your movement speed is increased by +10.", "You gain a Rank of Mastery to Dexterity based checks.",
              "You gain a +1 bonus to your Dexterity saving throws and your AC. This increases to +2 at 9th level."]),
    # King 2026-11-25: the book's "Unique Amp" box becomes a card (typeless; its barrier's hit points stay
    # the Chakra Barrier pool on the feature).
    dict(key="chakra-barrier", name="Chakra Barrier", owner=("subclass", "scout-nin", "barrier-scout"), type="", namedNote="Unique Amp", legacy="Chakra Barrier",
         summary="A barrier with its own hit points (twice your level) that intercepts your damage first, and a rank of Mastery on Chakra Control checks (2 at 9th, 3 at 17th). Ends when the barrier has 0 hit points.",
         activation="trigger", until="dismissed",
         changes=[ch("n5e.mastery.skill.cha", "Chakra Barrier")],
         rules=[note("Start: when you finish a short or long rest (Create Chakra Barrier on the feature)."),
                note("Its hit points are the Chakra Barrier pool on the feature: it intercepts damage you would take, sharing your resistances and immunities; it regains 1 hit point per temporary hit point you transfer, or 2 per DR you sacrifice from jutsu. At 0 hit points, end this Amp.")],
         box=["Unique Amp", "You have a special barrier with its own hit points that always intercepts damage you would take until the barrier itself has no more hit points remaining. It shares and resistances or immunities you have.",
              "Your barrier has a number of hit points equal to twice your level, and its hit points cannot exceed that value.",
              "You gain a Rank of Mastery to Chakra Control Checks. This increases to 2 Ranks of mastery at 9th level and 3 ranks at 17th level.",
              "Your barrier can regain hit points by doing one of the following;",
              "Transferring Temporary hit points, you have to it, granting it 1 hit point for every 1 temporary hit point you transfer.",
              "Sacrifice the DR (Damage Reduction) you would gain from jutsu, granting it 2 hit points for every 1 DR you sacrifice.",
              "While your barrier has 0 hit points, you lose the benefits of this Amp."]),
    dict(key="chained-cascade", name="Chained Cascade", owner=("subclass", "weapon-specialist", "primal-weapon"), type="battle", legacy="Chained Cascade",
         summary="Temp chakra of twice the Chain rank, Mastery on Ninjutsu attacks and +1 Ninjutsu save DC. Lasts until the end of your next turn.",
         activation="trigger", until="nextTurnEnd",
         changes=[ch("n5e.mastery.attack.nin", "Chained Cascade"), ch("n5e.saveDC.nin", 1)],
         rules=[note("Starts after the Bukijutsu cast with the Chained Cascade feature (3 Discipline). Entering it again extends it by 1 round."),
                note("Chained Empowerment: temporary chakra equal to twice the Chain rank you benefited from; it fades when the state ends."),
                note("Protective Barrier: as a reaction, give your remaining Chained Cascade temporary points to an ally within 10 feet who takes damage.")],
         box=["Battle Amp", "Your chakra surges outward in a relentless cascade.",
              "Chained Empowerment. You gain a number of temporary Chakra equal to twice the Chain rank you benefitted from as part of the Bukijutsu cast with your Chained Cascade feature. These temporary chakra points dissipate when this state ends.",
              "Cascading Chakra. You gain a rank of Mastery to your Ninjutsu attacks and a +1 bonus to your Ninjutsu save DC.",
              "Protective Barrier. As a reaction to an allied creature within 10 feet of you taking damage you can transfer all remaining temporary hit points granted by Chained Cascade to them, allowing the transferred temporary hit points to be applied to the triggering damage."]),
    dict(key="crash-duality", name="Crash Duality", owner=("subclass", "ninjutsu-specialist", "summoner"), type="will", legacy="Crash Duality",
         summary="Once per casting +1d10 Ninjutsu damage (2d10 at 11th, 3d10 at 19th), two or more Moldings, Draw Reserves as an Action, no cost reduction.",
         activation="", state="crashDuality", exclusive="surge", cooldown=600,
         rules=[NO_COST_REDUCTION, note("Start: when you enter Crash or Flow, spend 1 Focus; your Bonded creature enters Flow Duality (give it that card). It loses 2 jutsu slots at the end of each of your turns."),
                note("The bonus damage is added automatically when you cast.")],
         box=["Will Amp", "Once per casting, you gain a +1d10 bonus to damage you deal with Ninjutsu you cast. This increases to +2d10 at 11th, and 3d10 at 19th level.",
              "You can use two or more Moldings at once as part of the same casting.", "You can use the Draw Reserves skill Action, as an Action.",
              "You do not benefit from the cost reduction any source. Casting a Jutsu at 0 Cost does not count as cost reduction."]),
    dict(key="flow-duality", name="Flow Duality", owner=("subclass", "ninjutsu-specialist", "summoner"), type="will", legacy="Flow Duality",
         summary="+1 Ninjutsu save DC (+2 at 15th), 1 Focus at the start of your turn (a Bonded creature: a jutsu slot), Ninjutsu concentration at advantage, no damage boosts.",
         activation="", state="flow", exclusive="surge", cooldown=600, giveable=True,
         changes=[ch("n5e.saveDC.nin", "lvl(1:1,15:2)")],
         rules=[{"key": "advantage", "selector": "check", "predicate": ["concentration", "concentration:discipline:nin"], "label": "Flow Duality"},
                note("Start: when you enter Crash or Flow, spend 1 Focus; your Bonded creature enters Crash Duality (give it that card)."),
                note("A Bonded creature regains 1 jutsu slot instead of Focus at the start of its turn (at the table)."),
                note("You cannot benefit from jutsu, features or traits that boost the damage you deal with Ninjutsu.")],
         box=["Will Amp", "You gain a +1 bonus to your Ninjutsu Save DC. This bonus increases to +2 at 15th level.", "When you being your turn in this state, you regain 1 Focus.",
              "If you are a Bonded creature, you instead regain 1 Jutsu Slot.", "You make Concentration checks to maintain Ninjutsu at advantage.",
              "You cannot benefit from Jutsu, features or traits that boosts the damage you deal with Ninjutsu."]),
    # AMP1e (King Q-E3): typeless self-buff states, outside the Amp limits.
    dict(key="dynamic-form", name="DYNAMIC FORM!", owner=("subclass", "taijutsu-specialist", "passionate"), type="", legacy="DYNAMIC FORM!", legacyState="dynamicForm",
         summary="A combat rhythm: Combo Taijutsu build Tempo (max 3), a Finisher spends it. Ends when you cast a Finisher or initiative ends.",
         activation="trigger", until="combatEnd", endsOn=["finisherCast"], state="dynamicForm", outsideLimits=True, folder=SELF_BUFF_FOLDER,
         rules=[note("Starts when you cast a Taijutsu with the Combo keyword."),
                note("Tempo is tracked on the Tempo pool (Gain Tempo, Spend Tempo). Its bonuses depend on how much Tempo you have, so they stay with the pool.")],
         box=["No type · doesn't count toward Rule of 3's",
              "When you cast a Taijutsu with the Combo keyword, you enter a state of combat rhythm you call your DYNAMIC FORM!. Which lasts until you cast a Taijutsu with the Finisher keyword or initiative ends, whichever happens first.",
              "While in your DYNAMIC FORM! state, each time you cast a Taijutsu with the Combo keyword, you gain 1 Tempo (Max 3). You lose 1 Tempo at the end of each of your turns, where you didn’t cast a Taijutsu with the Combo keyword.",
              "Passive Tempo Benefits. 1 Tempo: a rank of Mastery with Athletics and Acrobatics based skill actions, and you can ignore difficult terrain. 2 Tempo: you can move through enemy spaces, and attacks of opportunity against you are made at disadvantage. 3 Tempo: a +1 bonus to your Taijutsu attacks' critical threat range and your Taijutsu save DC.",
              "Finisher Tempo Benefits. When you cast a Taijutsu finisher, you spend all tempo you have, gaining cumulative benefits for each tempo spent. 1 Tempo: one Martial Technique at no Martial Die cost. 2 Tempo: if the jutsu requires an attack, compare the attack result to the AC of all creatures in a 5-foot radius around the original target (10 feet at 10th level, 15 feet at 17th). 3 Tempo: on a critical hit, or a failed save by 5 or more, you regain the action spent casting the jutsu."]),
    dict(key="flawless", name="Flawless", owner=("subclass", "taijutsu-specialist", "talented-genius"), type="", legacy="Flawless", legacyState="flawless",
         summary="Instinctual self-weaponization for the whole combat: gain Perfection (max 4) when you spend Martial Dice and spend it on Flawless abilities.",
         activation="initiative", until="combatEnd", startOnInitiative="auto", state="flawless", outsideLimits=True, folder=SELF_BUFF_FOLDER,
         rules=[note("Perfection is tracked on the Perfection pool: once per turn, gain 1 when you spend at least 1 Martial Die (max 4)."),
                note("Spend Perfection with the Flawless buttons on Genius Talent.")],
         box=["No type · doesn't count toward Rule of 3's",
              "When you roll initiative, your body naturally drifts into a state of instinctual self-weaponization known as becoming Flawless. You remain in this state for the duration of combat, exiting it when combat ends.",
              "While in your Flawless state you gain access to Perfection. Once per turn, when you spend at least 1 Martial Die, you gain a Perfection, of which, you can maintain up to 4.",
              "Flawless Disturbance (2 Perfection), Flawless Focus (1), Flawless Stances (1), Flawless Technique (1) and Flawless Tempo (2): see Genius Talent."]),
]
LEGACY_STATES = {c["legacyState"]: c for c in CARDS if c.get("legacyState")}


def card_id(key):
    return "n5eAmp" + hashlib.md5(key.encode()).hexdigest()[:10]


def card_files(key):
    """The card files whose identifier is exactly this key (not every file sharing the prefix)."""
    out = []
    for f in [f for f in glob.glob(os.path.join(AMPS, "*-n5eAmp*.json")) if not os.path.basename(f).startswith("_folder")]:
        if json.load(open(f)).get("system", {}).get("identifier") == key:
            out.append(f)
    return out


def existing_card(key):
    for f in card_files(key):
        return json.load(open(f))
    return None


def find_buttons():
    """Every Amp button: (file, holder dict, effect dict) in the automation tables and the packs."""
    out = []
    files = sorted(glob.glob(os.path.join(ROOT, "content/automation/*.json"))) + sorted(glob.glob(os.path.join(ROOT, "packs/_source/**/*.json"), recursive=True))
    for f in files:
        if "/amps/" in f:
            continue
        data = json.load(open(f))
        found = []

        def walk(o):
            if isinstance(o, dict):
                e = o.get("effect")
                if isinstance(e, dict) and (e.get("ampType") or e.get("amp") or e.get("state") in LEGACY_STATES):
                    found.append((o, e))
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(data)
        if found:
            out.append((f, data, found))
    return out


def main():
    os.makedirs(AMPS, exist_ok=True)
    by_legacy = {c["legacy"]: c for c in CARDS}
    by_key = {c["key"]: c for c in CARDS}
    carried = {}
    buttons = find_buttons()
    for f, data, found in buttons:
        for holder, eff in found:
            card = by_key.get(eff.get("amp")) or by_legacy.get(eff.get("name")) or LEGACY_STATES.get(eff.get("state"))
            if not card:
                print("no card for", f, eff.get("name"))
                continue
            if not eff.get("amp"):
                carried[card["key"]] = {"changes": eff.get("changes") or [], "rules": eff.get("rules") or [], "seconds": eff.get("seconds") or 60,
                                        "target": eff.get("target") or "self"}
    granting = {}
    for f, data, found in buttons:
        for holder, eff in found:
            k = eff.get("amp") or (by_legacy.get(eff.get("name")) or LEGACY_STATES.get(eff.get("state")) or {}).get("key")
            ident = data.get("system", {}).get("identifier")
            if k and ident and "/packs/" in f:
                granting.setdefault(k, ident)
    written = 0
    for i, c in enumerate(CARDS):
        old = existing_card(c["key"])
        prev = carried.get(c["key"])
        if prev is None and old:
            # Later runs: the mechanics moved from the button live on the card.
            # AMP1g: a versioned base keeps its unversioned changes and rules in versionSource.
            vs = old["flags"]["n5e"].get("versionSource") or {}
            prev = {"changes": vs.get("changes", old["system"].get("changes", [])), "rules": [r for r in vs.get("rules", old["flags"]["n5e"].get("rules", [])) if r.get("label") != "__amp1c"],
                    "seconds": old["system"]["duration"]["seconds"], "target": "self"}
            prev["rules"] = [r for r in prev["rules"] if r not in c.get("rules", [])]
        prev = prev or {"changes": [], "rules": [], "seconds": 60, "target": "self"}
        cid = card_id(c["key"])
        kind, oid, sub = c["owner"]
        # King 2026-11-20: a card belongs to the feature that grants it, so it appears only once the
        # character has that feature (Perfected at 20th, Overheat at its level), not for the whole class.
        owner = {"kind": "feat", "id": OWNER_FEATURE.get(c["key"]) or granting.get(c["key"]) or "", "subclass": ""}
        if not owner["id"]:
            owner = {"kind": "class", "id": oid, "subclass": sub}
        rules = []
        for r in [*prev["rules"], *c.get("rules", [])]:
            if r not in rules:
                rules.append(r)
        prev["changes"] = [*prev["changes"], *[x for x in c.get("changes", []) if x not in prev["changes"]]]
        prev["changes"] = [x for i2, x in enumerate(prev["changes"]) if x not in prev["changes"][:i2]]
        desc = "".join(f"<p>{'<b>' + t + '</b>' if j == 0 else t}</p>" for j, t in enumerate(c["box"]))
        doc = {
            "_id": cid, "name": c["name"], "type": "amp", "img": "icons/svg/upgrade.svg", "folder": c.get("folder", CLASS_FOLDER), "sort": (i + 1) * 100,
            "ownership": {"default": 0},
            "system": {
                "identifier": c["key"], "description": desc,
                "source": {"book": "Orochimaru's Observation Compendium", "page": "", "version": "4.0", "custom": ""},
                "ampType": c["type"], "namedType": c.get("namedNote", ""), "owner": owner, "summary": c["summary"],
                "activation": c.get("activation", "bonus"), "giveable": bool(c.get("giveable")), "startOnInitiative": c.get("startOnInitiative", ""),
                "duration": {"seconds": 0 if c.get("until") else prev["seconds"], "until": c.get("until", ""), "concentration": False},
                "uses": {"max": "", "per": ""}, "cooldown": c.get("cooldown", 0), "exclusive": c.get("exclusive", ""), "state": c.get("state", ""),
                "tempHp": "", "endsOn": c.get("endsOn", []), "changes": prev["changes"], "aura": {},
                **({"outsideLimits": True} if c.get("outsideLimits") else {})
            },
            "effects": [],
            "flags": {"n5e": {"rules": rules, "amp1c": True}},
            "_stats": {"coreVersion": "13.351", "systemId": "n5e", "systemVersion": "0.61.0"},
            "_key": f"!items!{cid}"
        }
        slug = re.sub(r"[^a-z0-9]+", "-", c["key"])
        for stale in card_files(c["key"]):
            if not stale.endswith(f"{slug}-{cid}.json"):
                os.remove(stale)
        with open(os.path.join(AMPS, f"{slug}-{cid}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
        written += 1
    # Point every button at its card (keep the button's label, cost and activation).
    for f, data, found in buttons:
        changed = False
        for holder, eff in found:
            card = by_key.get(eff.get("amp")) or by_legacy.get(eff.get("name")) or LEGACY_STATES.get(eff.get("state"))
            if not card:
                continue
            new = {"name": card["name"], "target": "targets" if card.get("giveable") and eff.get("target") == "targets" else "self", "amp": card["key"]}
            if eff != new:
                holder["effect"] = new
                changed = True
        if changed:
            with open(f, "w") as fh:
                json.dump(data, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
    print(f"{written} Amp cards; buttons in {sum(1 for b in buttons)} files")


if __name__ == "__main__":
    main()
