"""AMP1f (docs/AMP1F_SPEC.md): Amp cards for the jutsu King confirmed, in review batches.

King's answers (2026-11-20):
  Q-F1  every upcast that changes an Amp gets its own card per cast rank ("[Name] (B-Rank)"), with
        every effect valid at that rank; picks the caster must make open an options menu (choose).
  Q-F2  Hijutsu are jutsu, not Clan Amps.   Q-F3  typeless for now.   Q-F4  temporary-HP jutsu are Amps.
  Q-F5  Chakra Skin and Geo Breastplate are not Amps (Amp-less buffs, stat overrides).

Writes packs/_source/amps/jutsu-<id>[-<rank>].json, points each jutsu's activity at its card ({amp: key})
and marks rejected jutsu with flags.n5e.notAmp. Idempotent.

    python3 tools/content/build-jutsu-amp-cards.py
"""
import glob
import hashlib
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AMPS = os.path.join(ROOT, "packs/_source/amps")
FOLDER = "n5eAmpFoldOther1"
RANKS = ["E", "D", "C", "B", "A", "S"]

note = lambda text: {"key": "note", "text": text}
ch = lambda key, value, mode=2: {"key": key, "value": str(value), "mode": mode}
resist = lambda *types: [ch("n5e.resist", t) for t in types]
immune = lambda *types: [ch("n5e.immune", t) for t in types]
CONC = dict(seconds=60, until="", concentration=True)
MINUTE = dict(seconds=60, until="", concentration=False)
BPS = ("bludgeoning", "piercing", "slashing")


def V(rank, lines, changes=(), rules=(), notes=(), tempHp="", duration=None, level=0, choose=None, aura=None, outside=False):
    """One version of a jutsu's Amp: its rank (and character level for AMP1g level versions).
    aura {radius, who, includeSelf, amp}: the card is an aura applying the Amp card `amp` to creatures in it
    (King Q-F6); the aura card itself is outside the limits (outside=True), the applied Amp counts."""
    return dict(rank=rank, lines=lines, changes=list(changes), rules=list(rules), notes=list(notes), tempHp=tempHp,
                duration=duration, level=level, choose=choose, aura=aura, outside=outside)


def menu(prompt, options, count=1, changeable=False):
    """An options menu (King Q-F1): options are (label, changes, rules) or dicts; count picks (Q-F7); changeable (Q-F9)."""
    opts = []
    for o in options:
        if isinstance(o, dict):
            opts.append({"label": o["label"], "changes": o.get("changes", []), "rules": o.get("rules", []),
                         **({"duration": o["duration"]} if o.get("duration") else {}), **({"tempHp": o["tempHp"]} if o.get("tempHp") else {})})
        else:
            label, changes, rules = o
            opts.append({"label": label, "changes": list(changes), "rules": list(rules)})
    return {"prompt": prompt, "count": count, "changeable": changeable, "options": opts}


# jutsu identifier, card name, target ("self" | "targets": given to others), default duration, versions
JUTSU = [
    dict(id="gaslight", name="Gaslight", target="self", duration=CONC,
         choose={"prompt": "Gaslight: how was it cast?", "options": [
             {"label": "As an Action (concentration, up to 1 minute)", "changes": [], "rules": [note("Can't be cast as an Action again for 10 minutes.")],
              "duration": {"seconds": 60, "until": "", "concentration": True}},
             {"label": "As a Reaction (until the end of your next turn)", "changes": [], "rules": [note("Can't be cast as a Reaction again for 1 minute.")],
              "duration": {"seconds": 0, "until": "nextTurnEnd", "concentration": False}}]},
         versions=[V("E", [f"+{b} to Charisma skill checks directed at one creature that isn't hostile to you and can hear you within 10 feet."],
                     rules=[{"key": "modifier", "selector": "check", "predicate": "ability:cha", "value": b, "label": "Gaslight"}],
                     notes=["Only on checks directed at the creature you chose.",
                            "If it beats a contested check or a save from this social encounter by 5 or more, it realizes a jutsu influenced it when the jutsu ends."],
                     level=lv) for lv, b in [(0, 2), (5, 3), (11, 4), (17, 5)]]),
    dict(id="hebi-basilisk-art-adaptive-camouflage", name="Basilisk Art: Adaptive Camouflage", target="self", duration=CONC,
         versions=[V("D", ["+4 to checks made with the Hide and Sneak actions.", "You can't be tracked without the aid of a jutsu.",
                           "Serpent Coil: when you deal [Weapon Damage] to a creature you're Hidden from, roll the damage twice and keep the higher."],
                     rules=[{"key": "modifier", "selector": "check", "predicate": "key:ste", "value": 4, "label": "Adaptive Camouflage"}],
                     notes=["You leave no tracks or traces of your movement.", "Serpent Coil: against a creature you're Hidden from, roll [Weapon Damage] twice and keep the higher."])]),
    dict(id="futton-boil-release-erupting-steam-wall", name="Boil Release: Erupting Steam Wall", target="self", duration=CONC,
         versions=[V(r, [f"{hp} temporary hit points; at the start of each of your turns you regain them up to {hp}.",
                         f"A creature that hits you with a melee attack takes {acid} acid damage."]
                        + (["When you take damage from an attack, you can expel the barrier as a shockwave: each creature within 10 feet takes the acid damage."] if r in "BAS" else []),
                     tempHp=str(hp),
                     rules=[{"key": "heal", "on": "turnStart", "formula": str(hp), "pool": "tempHp", "who": "self", "label": "Erupting Steam Wall"}],
                     notes=[f"A creature that hits you with a melee attack takes {acid} acid damage."]
                     + ([f"When you take damage from an attack, you can expel the barrier outward: each creature within 10 feet takes {acid} acid damage."] if r in "BAS" else []))
                   for r, hp, acid in [("D", 10, 5), ("C", 20, 10), ("B", 30, 15), ("A", 40, 20), ("S", 50, 25)]]),
    dict(id="shoton-crystal-release-crystal-armor", name="Crystal Release: Crystal Armor", target="self", duration=CONC,
         versions=[V("D", ["Resistance to bludgeoning, piercing and slashing damage."], changes=resist(*BPS)),
                   V("B", ["Resistance to bludgeoning, piercing, slashing, earth, fire, cold and wind damage."], changes=resist(*BPS, "earth", "fire", "cold", "wind")),
                   V("S", ["Immunity to bludgeoning, piercing and slashing damage; resistance to earth, fire, cold and wind damage."],
                     changes=immune(*BPS) + resist("earth", "fire", "cold", "wind"))]),
    dict(id="hanami-hanami-style-sapping-fist", name="Hanami Style: Sapping Fist", target="self", duration=CONC,
         versions=[V(r, ["Once per turn, when you deal [Unarmed Damage], you gain temporary hit points equal to it." if r != "S"
                         else "Twice per turn, when you deal [Unarmed Damage], you gain temporary hit points equal to it (they stack)."]
                        + (["You also regain hit points equal to the [Unarmed Damage] dealt."] if r in "BS" else [])
                        + ["Monstrous Burst: your [Unarmed Damage] can be necrotic; each 5 or 6 on the die adds 1d6 (up to 4 times a turn).",
                           "Healers Touch: when you deal [Unarmed Damage], a willing creature within 10 feet gains temporary hit points equal to it."],
                     notes=[("Once per turn" if r != "S" else "Twice per turn (they stack)") + ": when you deal [Unarmed Damage], gain temporary hit points equal to it."]
                     + (["You also regain hit points equal to the [Unarmed Damage] dealt."] if r in "BS" else [])
                     + ["Monstrous Burst: your [Unarmed Damage] can be necrotic. Each 5 or 6 on the Unarmed die adds 1d6, up to 4 times each turn.",
                        "Healers Touch: when you deal [Unarmed Damage], one willing creature within 10 feet gains temporary hit points equal to it."])
                   for r in ["D", "B", "S"]]),
    dict(id="jiton-magnet-release-dust-coat", name="Magnet Release: Dust Coat", target="self", duration=CONC,
         versions=[V(r, [f"+{b} AC and +{b} DR.", f"At the start of each of your turns, a Barrier with {bar} hit points."]
                        + (["Lasts up to 1 hour."] if r in "AS" else []),
                     changes=[ch("system.bonuses.ac", b), ch("n5e.dr", b)],
                     duration=dict(seconds=3600, until="", concentration=True) if r in "AS" else None,
                     notes=[f"At the start of each of your turns, you generate a Barrier with {bar} hit points (with another Barrier, choose which one counts).",
                            "Ends early if you don Heavy armor, or as a Bonus action on your turn."])
                   for r, b, bar in [("D", 2, 8), ("C", 2, 10), ("B", 3, 10), ("A", 3, 10), ("S", 4, 10)]]),
    dict(id="beast-fist-forceful-bull", name="Beast Fist: Forceful Bull", target="self", duration=CONC,
         versions=[V("D", ["Your Strength score becomes 18 if it is lower.", "8 temporary hit points; a Bonus action refreshes them when below 8."],
                     changes=[ch("system.abilities.str.value", 18, 4)], tempHp="8",
                     notes=["Refresh: as a Bonus action, refresh the 8 temporary hit points when you have fewer (the Refresh button)."])]),
    dict(id="beast-fist-graceful-cat", name="Beast Fist: Graceful Cat", target="self", duration=CONC,
         versions=[V("D", ["Your Dexterity score becomes 18 if it is lower.", "+10 speed; no fall damage from falls under 30 feet.",
                           "When you cast a Combo Taijutsu, +10 speed until the end of that turn."],
                     changes=[ch("system.abilities.dex.value", 18, 4), ch("system.bonuses.speed", 10)],
                     notes=["You take no fall damage from falls of less than 30 feet.", "When you cast a Taijutsu with the Combo keyword, +10 speed until the end of that turn."])]),
    dict(id="beast-fist-rushing-lion", name="Beast Fist: Rushing Lion", target="self", duration=CONC,
         choose={"prompt": "Rushing Lion: which ability becomes 18?", "options": [
             {"label": "Strength", "changes": [ch("system.abilities.str.value", 18, 4)], "rules": [note("You can't make Strength checks at disadvantage.")]},
             {"label": "Dexterity", "changes": [ch("system.abilities.dex.value", 18, 4)], "rules": [note("You can't make Dexterity checks at disadvantage.")]}]},
         versions=[V("D", ["Your Strength or Dexterity score (your pick) becomes 18 if it is lower; you can't make checks with it at disadvantage.",
                           "Your jump height is doubled.", "Taijutsu you cast that affect an area and force a save: +5 feet to the area."],
                     rules=[{"key": "areaSize", "selector": "cast", "predicate": "jutsu:discipline:tai", "value": 5, "label": "Rushing Lion"}],
                     notes=["Your jump height is doubled.", "The +5 feet applies to Taijutsu areas that force a saving throw."])]),
    dict(id="beast-fist-wise-turtle", name="Beast Fist: Wise Turtle", target="self", duration=CONC,
         versions=[V("D", ["Your Strength score becomes 18 if it is lower.", "Your lifting strength is doubled; a rank of Mastery with Strength checks.",
                           "Taijutsu with a range of Touch or 5 feet: +5 feet of range."],
                     changes=[ch("system.abilities.str.value", 18, 4), ch("n5e.mastery.check.str", "Wise Turtle")],
                     notes=["Your lifting strength is doubled.", "Taijutsu you cast with a range of Touch or 5 feet gain +5 feet of range."])]),
    dict(id="cloak-of-shadows", name="Cloak of Shadows", target="targets", duration=CONC,
         versions=[V(r, ["+1d4 to Hide or Sneak attempts against creatures that rely on sight.",
                         "Cast in dim light or darkness: Identify Genjutsu checks against it are at disadvantage."] + extra,
                     duration=dur, notes=["+1d4 to Hide or Sneak attempts against creatures that rely on sight (add it at the table).",
                                          "If cast in dim light or darkness, Identify Genjutsu checks against it are made at disadvantage."] + extra)
                   for r, dur, extra in [("D", None, []),
                                         ("B", dict(seconds=600, until="", concentration=True), ["Concentration up to 10 minutes, with no chakra to maintain it."]),
                                         ("A", dict(seconds=3600, until="", concentration=False), ["Lasts 1 hour, with no concentration."])]]),
    dict(id="earth-release-jade-devotion", name="Earth Release: Jade Devotion", target="targets", duration=MINUTE,
         versions=[V(r, [f"{d}d6 temporary hit points.", "Resistance to bludgeoning, piercing and slashing while you have them.",
                         "You count as an Earthen Artifact created by the caster while you have them."],
                     tempHp=f"{d}d6", changes=resist(*BPS),
                     notes=["The resistance lasts only while you have temporary hit points from this jutsu: end the Amp when they're gone.",
                            "While you have them, you count as an Earthen Artifact created by the caster."])
                   for r, d in [("D", 3), ("C", 4), ("B", 5), ("A", 6), ("S", 7)]]),
    dict(id="enhanced-blocking", name="Enhanced Blocking", target="self", duration=CONC,
         versions=[V(r, [f"Your Polearm weapon gains Blocking {n}.", "You can add your Blocking bonus to Strength or Dexterity saving throws."],
                     notes=[f"Your Polearm weapon gains the Blocking {n} property.", "You may add your Blocking bonus to Strength or Dexterity saving throws you make."])
                   for r, n in [("D", 2), ("B", 3)]]),
    dict(id="environmental-affinity", name="Environmental Affinity", target="self", duration=CONC,
         versions=[V(r, ["Out of combat: 1 hour, and your next initiative roll is at advantage.",
                         "In combat: attacks and jutsu that target you treat you as in half cover" + (" (no concentration)." if r == "B" else " (concentration, up to 1 minute).")],
                     choose={"prompt": "Environmental Affinity: where was it cast?", "options": [
                         {"label": "Out of combat (1 hour)", "changes": [],
                          "rules": [{"key": "advantage", "selector": "initiative", "endsOnUse": True, "label": "Environmental Affinity"}],
                          "duration": {"seconds": 3600, "until": "", "concentration": False}},
                         {"label": "In combat" + (" (1 minute)" if r == "B" else " (concentration, up to 1 minute)"), "changes": [],
                          "rules": [note("Creatures that target you with an attack or a jutsu treat you as if you are in half cover.")],
                          "duration": {"seconds": 60, "until": "", "concentration": r != "B"}}]},
                     notes=["In industrial terrain (concrete, steel), a creature makes a Wisdom (Illusions) check against your Genjutsu save DC at advantage; on a success it is immune for the duration."])
                   for r in ["D", "B"]]),
    dict(id="lightning-release-spark", name="Lightning Release: Spark", target="targets", duration=MINUTE,
         versions=[V(r, [f"{d}d6 + your Ninjutsu modifier temporary hit points for 1 minute (and 1 hit point).",
                         "Resistance to lightning damage while you have them.",
                         "Overcharge: the first time you'd take lightning damage, gain bonus temporary hit points equal to half of it instead."],
                     tempHp=f"{d}d6 + @disciplines.nin.mod", changes=resist("lightning"),
                     notes=["The creature also gains 1 hit point (the jutsu's own heal).",
                            "The resistance lasts only while it has temporary hit points from this jutsu: end the Amp when they're gone.",
                            "Overcharge: the first time it would take lightning damage, it instead gains temporary hit points equal to half the damage."])
                   for r, d in [("D", 2), ("C", 3), ("B", 4), ("A", 5), ("S", 6)]]),
    dict(id="medical-release-acid-armor", name="Medical Release: Acid Armor", target="self", duration=CONC,
         versions=[V(r, [f"{hp} temporary hit points.", f"While you have them, a creature that damages you with a melee attack takes {acid} acid damage.",
                         f"While you have them, a Bonus action Acid Tail: a 15-foot cone, {tail}d6 + 6 acid, Constitution save or Corroded."],
                     tempHp=str(hp),
                     notes=[f"While you have temporary hit points from this jutsu, a creature that damages you with a melee attack takes {acid} acid damage.",
                            f"Acid Tail (Bonus action, while you have them): one melee ninjutsu attack against all creatures in a 15-foot cone; {tail}d6 + 6 acid and a Constitution save against Corroded."])
                   for r, hp, acid, tail in [("D", 10, 6, 2), ("C", 15, 9, 3), ("B", 20, 12, 4), ("A", 25, 15, 5), ("S", 30, 18, 6)]]),
    dict(id="medical-release-grim-mask", name="Medical Release: Grim Mask", target="self", duration=MINUTE,
         versions=[V("D", ["Your attacks deal +2 necrotic damage (+4 against a creature with ranks of an Elemental or Physical condition).",
                           "On a critical hit, you may double this bonus."],
                     rules=[{"key": "damage", "selector": "damage", "predicate": "kind:attack", "formula": "2", "damageType": "necrotic", "label": "Grim Mask"}],
                     notes=["Against a creature with ranks of an Elemental or Physical condition the bonus is +4: add 2 more.", "On a critical hit you may double this bonus."])]),
    dict(id="psionics-fortress", name="Psionics: Fortress", target="self", duration=CONC,
         versions=[V(r, ["+1 AC (+2 against Genjutsu attacks).",
                         "A creature that hits you with a melee weapon or Taijutsu attack makes an Intelligence save: on a failure it falls Prone and drops its weapon; on a critical failure its speed is also 0 until the end of its next turn."
                         + (f" It also takes {dmg} psychic damage ({crit} on a critical failure)." if dmg else "")]
                        + ([f"{dr} DR against psychic damage."] if dr else []),
                     changes=[ch("system.bonuses.ac", 1)],
                     rules=[{"key": "modifier", "selector": "attack", "direction": "against", "predicate": "jutsu:discipline:gen", "value": -1, "label": "Fortress"}],
                     notes=["Psychic feedback: a creature that hits you with a melee weapon or Taijutsu attack makes an Intelligence save (your Genjutsu DC). Failure: it falls Prone and drops its weapon. Critical failure: also speed 0 until the end of its next turn."
                            + (f" It takes {dmg} psychic damage on a failure, {crit} on a critical failure." if dmg else "")]
                     + ([f"You have {dr} DR against psychic damage."] if dr else []))
                   for r, dr, dmg, crit in [("D", 0, "", ""), ("B", 5, "2d6", "4d6"), ("S", 10, "4d6", "8d6")]]),
    dict(id="psionics-keen-meditation", name="Psionics: Keen Meditation", target="self", duration=CONC,
         versions=[V(r, [f"{'A rank' if m == 1 else 'Two ranks'} of Mastery with Genjutsu attacks.", f"A critical hit with a Genjutsu attack adds {c}d12 psychic damage."]
                        + (["Once per creature per long rest, psychic damage that would reduce it to 0 can leave it unconscious at 1 hit point."] if r == "A" else []),
                     changes=[ch("n5e.mastery.attack.gen", "Keen Meditation" + (" ×2" if m == 2 else ""))],
                     notes=[f"A critical hit with a Genjutsu attack adds {c}d12 psychic damage."]
                     + (["The first time you'd reduce a creature to 0 hit points with psychic damage, you can have it fall unconscious at 1 hit point instead (once per creature, per long rest)."] if r == "A" else []))
                   for r, m, c in [("D", 1, 1), ("C", 1, 2), ("B", 2, 2), ("A", 2, 2)]]),
    dict(id="semblance-of-dread", name="Semblance of Dread", target="self", duration=CONC,
         versions=[V(r, [f"Creatures within {ft} feet can't willingly move closer to you without a Wisdom save at the start of their turn (constructs and undead are immune).",
                         "Advantage on saving throws against Demoralized and Shaken."],
                     changes=[ch("n5e.conditionResist", "demoralized"), ch("n5e.conditionResist", "shaken")],
                     notes=[f"Any creature within {ft} feet can't willingly move closer to you unless it succeeds on a Wisdom saving throw at the start of its turn. Constructs and undead are immune."])
                   for r, ft in [("D", 20), ("C", 25), ("B", 30), ("A", 35), ("S", 40)]]),
    dict(id="warriors-zone", name="Warriors Zone", target="self", duration=CONC,
         versions=[V(r, [f"+{dr} DR.", f"A creature crossing into your weapon's reach takes your [Weapon Damage] + {d}d6, once per turn" + (" (you choose which creatures)." if r != "D" else "."),
                         "Chain 1: the first weapon attack each turn with this weapon can attack a second creature as part of the same action."]
                        + (["Bukijutsu you cast with this weapon gain a rank of Mastery to the attack."] if r in "AS" else []),
                     changes=[ch("n5e.dr", dr)],
                     notes=[f"A creature that crosses into your weapon's reach takes your [Weapon Damage] + {d}d6, once per turn" + (" (you choose which creatures)." if r != "D" else "."),
                            "Chain 1: the first time each turn you declare a weapon attack with this weapon, you can make a second attack against a second creature as part of the same action."]
                     + (["Bukijutsu you cast with the same weapon gain a rank of Mastery to the attack."] if r in "AS" else []))
                   for r, dr, d in [("D", 4, 1), ("C", 4, 2), ("B", 6, 3), ("A", 6, 4), ("S", 8, 5)]]),
    dict(id="water-release-viscous-water-mass", name="Water Release: Viscous Water Mass", target="targets", duration=CONC,
         versions=[V(r, [f"+{ac} AC and +{dr} DR (double DR against fire damage)."]
                        + (["When you take damage, you can end it on yourself to gain resistance to that damage type."] if r in "BAS" else [])
                        + (["Cast at S-Rank, it affects every willing creature of the caster's choice within a 30-foot radius."] if r == "S" else []),
                     changes=[ch("system.bonuses.ac", ac), ch("n5e.dr", dr)],
                     notes=[f"Against fire damage, the DR from this jutsu is doubled ({2 * dr})."]
                     + (["When you take damage, you can end this jutsu on yourself early to gain resistance to the triggering damage type."] if r in "BAS" else []))
                   for r, ac, dr in [("D", 1, 4), ("C", 2, 6), ("B", 2, 6), ("A", 4, 10), ("S", 4, 10)]]),
    dict(id="wind-release-zephyr-strike", name="Wind Release: Zephyr Strike", target="self", duration=CONC,
         versions=[V(r, ["Your movement doesn't provoke opportunity attacks; +20 speed."]
                        + (["+1 AC."] if r != "D" else []) + (["The Friction Break special action at the start of each of your turns."] if r in "BAS" else [])
                        + (["+2 to Dexterity saving throws."] if r in "AS" else []) + (["Lasts 1 minute, with no concentration."] if r == "S" else []),
                     changes=[ch("system.bonuses.speed", 20)] + ([ch("system.bonuses.ac", 1)] if r != "D" else []) + ([ch("n5e.save.dex", 2)] if r in "AS" else []),
                     duration=MINUTE if r == "S" else None,
                     notes=["Your movement doesn't provoke opportunity attacks."]
                     + (["Friction Break (a special action at the start of each of your turns): make one additional Weapon Attack, Dash, or use an object action."] if r in "BAS" else []))
                   for r in ["D", "C", "B", "A", "S"]]),
]

DAMAGE = ["bludgeoning", "piercing", "slashing", "acid", "cold", "earth", "fire", "lightning", "poison", "wind", "chakra", "force", "necrotic", "psychic"]
CONDITIONS = ["exhaustion", "envenomed", "burned", "chilled", "corroded", "shocked", "petrified", "bruised", "staggered", "bleed", "dazed", "shaken",
              "weakened", "concussed", "demoralized", "berserk", "charmed", "confused", "slowed", "sealed", "blinded", "dazzled", "deafened"]
cap = lambda k: k[0].upper() + k[1:]
BIOLOGY = [(f"{cap(d)} damage", [ch("n5e.resist", d)], []) for d in DAMAGE] + [(f"{cap(c)} (condition)", [ch("n5e.conditionResist", c)], []) for c in CONDITIONS]
TEMPOS = [("Moderato", [], [note("Moderato: the first time each turn you deal damage with an attack from a Breath of Sound Bukijutsu, +1 damage die.")]),
          ("Allegretto", [], [note("Allegretto: Breath of Sound Bukijutsu you cast have their save DC increased by +1.")]),
          ("Vivacissimo", [], [note("Vivacissimo: advantage on your first melee weapon attack or Breath of Sound Bukijutsu each turn.")]),
          ("Andante", [], [note("Andante: a special reaction when you'd take damage, reducing it by your weapon's damage.")])]

JUTSU += [
    # AMP1f batch 2 (C-Rank), King 2026-11-20.
    dict(id="ryu-conquerors-art-wyrmcallers-pulse", name="Conqueror’s Art: Wyrmcaller’s Pulse", target="targets", duration=CONC,
         versions=[V(r, ["A Wyrmling: +1 AC and " + str(t) + " temporary hit points."], changes=[ch("system.bonuses.ac", 1)], tempHp=str(t),
                     notes=["The caster isn't affected. Prey (hostile creatures) make the jutsu's Wisdom save instead."])
                   for r, t in [("C", 14), ("B", 18), ("A", 22), ("S", 26)]]),
    dict(id="shoton-crystal-release-crystal-wheel", name="Crystal Release: Crystal Wheel", target="self", duration=CONC,
         versions=[V(r, [f"+{spd} speed; you ignore difficult and special terrain.", f"A creature that makes an opportunity attack against you takes {d}d6 earth damage."]
                        + (["Advantage on saving throws against effects that affect an area."] if r in "BAS" else [])
                        + (["The first time each turn you move within 5 feet of a hostile creature, or it moves within 5 feet of you, it takes 4d6 earth damage."] if r == "S" else []),
                     changes=[ch("system.bonuses.speed", spd)],
                     notes=["You ignore difficult and special terrain.", f"A creature that makes an opportunity attack against you takes {d}d6 earth damage."]
                     + (["Advantage on saving throws against effects that affect an area."] if r in "BAS" else [])
                     + (["The first time each turn you move within 5 feet of a hostile creature, or one moves within 5 feet of you, it takes 4d6 earth damage."] if r == "S" else []))
                   for r, spd, d in [("C", 30, 3), ("B", 30, 4), ("A", 30, 5), ("S", 60, 6)]]),
    dict(id="hanami-hanami-style-defensive-cloak", name="Hanami Style: Defensive Cloak", target="self", duration=CONC,
         versions=[V(r, [f"A creature that hits you with a melee attack takes {d}d6 necrotic damage; you gain temporary hit points equal to {'the' if full else 'half the'} necrotic damage (twice per turn).",
                         "Monstrous Burst: it splashes onto all creatures of your choice within 10 feet instead.",
                         "Healers Touch: it also triggers when an ally within 10 feet takes damage from a melee attack, affecting the attacker."],
                     notes=[f"Twice per turn: a creature that hits you with a melee attack takes {d}d6 necrotic damage, and you gain temporary hit points equal to {'the full' if full else 'half the'} necrotic damage.",
                            "Monstrous Burst: each time you're hit with a melee attack, it affects all creatures of your choice within 10 feet instead.",
                            "Healers Touch: when an ally within 10 feet takes damage from a melee attack, it triggers against the attacker."])
                   for r, d, full in [("C", 2, False), ("B", 3, False), ("A", 4, True), ("S", 5, True)]]),
    dict(id="jinzo-synthetic-art-adaptive-biology", name="Synthetic Art: Adaptive Biology", target="self", duration=CONC,
         versions=[V("C", ["Resistance to one damage type or condition you've experienced this initiative."],
                     choose=menu("Adaptive Biology: a damage type or condition you've experienced this initiative", BIOLOGY)),
                   V("A", ["Resistance to up to two damage types or conditions you've experienced this initiative."],
                     choose=menu("Adaptive Biology: up to two damage types or conditions you've experienced this initiative", BIOLOGY, count=2))]),
    dict(id="uzumaki-uzumaki-art-red-hot-blooded-vitality", name="Uzumaki Art: Red Hot-Blooded Vitality", target="self", duration=CONC,
         versions=[V("C", ["A rank of Mastery to all Strength, Dexterity and Constitution checks.", "Advantage on Concentration checks."],
                     changes=[ch("n5e.mastery.check.str", "Red Hot-Blooded Vitality"), ch("n5e.mastery.check.dex", "Red Hot-Blooded Vitality"), ch("n5e.mastery.check.con", "Red Hot-Blooded Vitality")],
                     rules=[{"key": "advantage", "selector": "check", "predicate": "concentration", "label": "Red Hot-Blooded Vitality"}])]),
    dict(id="breath-of-sound-score", name="Breath of Sound: Score", target="self", duration=CONC,
         versions=[V("C", ["A tempo of your choice (Moderato, Allegretto, Vivacissimo or Andante); you can change it at the start of each of your turns."],
                     choose=menu("Score: choose a tempo", TEMPOS, changeable=True),
                     notes=["Instead of spending chakra to maintain this jutsu, spend a Bonus action.", "At the start of each of your turns you can choose a different tempo (the Change button)."])]),
    dict(id="earth-release-sand-armor", name="Earth Release: Sand Armor", target="self", duration=dict(seconds=3600, until="", concentration=False),
         versions=[V(r, [f"{t} temporary hit points, resistant to piercing, slashing, bludgeoning and cold damage.", "Lightning damage ends the jutsu before the damage is calculated."],
                     tempHp=str(t),
                     notes=["These temporary hit points are resistant to piercing, slashing, bludgeoning and cold damage (halve that damage before it reaches them).",
                            "If you'd take lightning damage, the jutsu ends first, with all its benefits; end the Amp."])
                   for r, t in [("C", 16), ("B", 24), ("A", 32), ("S", 40)]]),
    dict(id="fire-release-flame-armor", name="Fire Release: Flame Armor", target="self", duration=dict(seconds=3600, until="", concentration=False),
         versions=[V(r, [f"{t} temporary hit points.", "While you have them: wind damage can't take you below 1 of them, resistance to fire damage, immunity to Burned.",
                         f"While you have them, melee attacks that strike you deal {t} fire damage to the attacker."],
                     tempHp=str(t), changes=resist("fire") + [ch("n5e.conditionImmune", "burned")],
                     notes=["The fire resistance and Burned immunity last only while you have temporary hit points from this jutsu: end the Amp when they're gone.",
                            "Wind damage can't reduce you below 1 temporary hit point from this jutsu.", f"Melee attacks that strike you deal {t} fire damage to the attacker."])
                   for r, t in [("C", 12), ("B", 16), ("A", 20), ("S", 24)]]),
    dict(id="guardian-knight", name="Guardian Knight", target="self", duration=CONC,
         versions=[V("C", ["Benefits by the armor you're wearing (light, medium or heavy)."],
                     choose=menu("Guardian Knight: what armor are you wearing?", [
                         ("Light Guardian", [ch("system.bonuses.speed", 10), ch("n5e.save.dex", 2)],
                          [note("Light Guardian: as a reaction to taking damage, reduce it by your proficiency bonus.")]),
                         ("Moderate Guardian", [ch("system.bonuses.ac", 1), ch("n5e.reinforced", 4)],
                          [note("Moderate Guardian: as a reaction when an ally within 20 feet takes damage, move next to it; it gets +1 AC and +2 DR against that damage.")]),
                         ("Heavy Metal", [ch("n5e.reinforced", 6)],
                          [note("Heavy Metal: as a reaction when an ally within 15 feet takes damage, move next to it and take the damage instead, applying your Reinforce value.")])]))]),
    dict(id="lightning-release-jolt", name="Lightning Release: Jolt", target="targets", duration=MINUTE, drop=("sourceRoll1",),
         versions=[V(r, [f"{d}d8 temporary hit points for 1 minute (and 5 hit points).", f"While you have them: +{spd} speed and +2 to Dexterity saving throws.",
                         "A dying creature also gains an additional Bonus action until the end of its next turn."],
                     tempHp=f"{d}d8", changes=[ch("system.bonuses.speed", spd), ch("n5e.save.dex", 2)],
                     choose=menu("Jolt: was it Overcharged?", [{"label": "Not Overcharged", "tempHp": f"{d}d8"}, {"label": "Overcharged (d10s)", "tempHp": f"{d}d10"}]),
                     notes=["The creature also gains 5 hit points (the jutsu's own heal).",
                            "The speed and save bonus last only while it has temporary hit points from this jutsu: end the Amp when they're gone.",
                            "A dying creature gains an additional Bonus action until the end of its next turn."])
                   for r, d, spd in [("C", 4, 10), ("B", 5, 15), ("A", 6, 20), ("S", 7, 25)]]),
    dict(id="lightning-release-lightning-chakra-armor", name="Lightning Release: Lightning Chakra Armor", target="self", duration=CONC,
         versions=[V(r, [f"Overdrive: +{ac} AC, +{spd} speed, a rank of Mastery in Dexterity saves; Dash as a Bonus action."]
                        + ([f"+{dmg}d10 lightning damage on your unarmed, Ninjutsu and Taijutsu attacks, twice per turn."] if dmg else [])
                        + (["+4 DR (+8 against earth or lightning damage)."] if r in "AS" else []),
                     changes=[ch("system.bonuses.ac", ac), ch("system.bonuses.speed", spd), ch("n5e.mastery.save.dex", "Lightning Chakra Armor")] + ([ch("n5e.dr", 4)] if r in "AS" else []),
                     notes=["Overcharge: you can take the Dash action as a Bonus action."]
                     + ([f"Twice per turn, +{dmg}d10 lightning damage on your unarmed, Ninjutsu and Taijutsu attacks."] if dmg else [])
                     + (["Against earth or lightning damage, the DR is +8: add 4 more."] if r in "AS" else []))
                   for r, ac, spd, dmg in [("C", 1, 20, 0), ("B", 1, 30, 1), ("A", 1, 40, 1), ("S", 2, 50, 2)]]),
    # King Q-F6: an aura that applies the Amp: the jutsu starts the aura (outside the limits); each
    # creature in it (the caster too) gets the Amp card, which counts as theirs.
    dict(id="lightning-release-lightning-kings-mantle", name="Lightning Release: Lightning King’s Mantle", target="self", duration=CONC, drop=("parsed1",),
         versions=[V(r, [f"An aura with a {ft}-foot radius, moving with you: you and creatures of your choice in it get Lightning King’s Mantle."],
                     aura={"radius": ft, "amp": "jutsu-lightning-release-lightning-kings-mantle-aura" + ("-b" if r != "C" else "")}, outside=True,
                     notes=["The aura gives the Amp; this card itself doesn't count toward Rule of 3's."])
                   for r, ft in [("C", 10), ("B", 20), ("A", 30), ("S", 40)]]),
    dict(id="lightning-release-lightning-kings-mantle", key="jutsu-lightning-release-lightning-kings-mantle-aura", button=False,
         name="Lightning King’s Mantle (in the aura)", target="self", duration=CONC,
         versions=[V(r, ["When you deal your [Weapon Damage], add +1d6 lightning damage."] + (["Your [Weapon Damage] penetrates 4 DR; a critical hit with it gives the target +1 rank of Shocked."] if r == "B" else []),
                     rules=[{"key": "damage", "selector": "damage", "predicate": "kind:attack", "formula": "1d6", "damageType": "lightning", "label": "Lightning King’s Mantle"}],
                     notes=["Only on [Weapon Damage]."] + (["Your [Weapon Damage] penetrates 4 DR.", "A critical hit with a weapon gives the target +1 rank of Shocked."] if r == "B" else []))
                   for r in ["C", "B"]]),
    dict(id="medical-release-medical-aura", name="Medical Release: Medical Aura", target="self", duration=CONC,
         versions=[V("C", ["An aura with a 15-foot radius, moving with you: you and non-hostile creatures in it get Medical Aura."],
                     aura={"radius": 15, "amp": "jutsu-medical-release-medical-aura-aura"}, outside=True,
                     notes=["The aura gives the Amp; this card itself doesn't count toward Rule of 3's."])]),
    dict(id="medical-release-medical-aura", key="jutsu-medical-release-medical-aura-aura", button=False, name="Medical Aura (in the aura)", target="self", duration=CONC,
         versions=[V("C", ["Resistance to necrotic damage and immunity to Bleeding.", "A living creature that starts its turn here at 0 hit points regains 1 (once per casting)."],
                     changes=resist("necrotic") + [ch("n5e.conditionImmune", "bleed")],
                     notes=["A non-hostile, living creature that starts its turn in the aura at 0 hit points regains 1 hit point (once per casting)."])]),
    dict(id="royal-flush", name="Royal Flush", target="self", duration=CONC,
         versions=[V(r, ["+2 to the Royal Shield charges you gain from jutsu.", "Taijutsu that increase your AC: +1 more.", "Taijutsu that grant temporary hit points: +1 die."]
                        + (["Royal Guard costs half."] if r == "S" else []),
                     notes=["Jutsu that grant Royal Shield charges grant 2 more.", "Taijutsu you cast that increase your AC increase it by 1 more.",
                            "Taijutsu you cast that grant temporary hit points grant 1 more die."] + (["Royal Guard costs half."] if r == "S" else []))
                   for r in ["C", "S"]]),
    dict(id="sparking-flail", name="Sparking Flail", target="self", duration=CONC,
         versions=[V("C", ["A haze around you: the chosen hostile creature can't see through it, and you're fully obscured from it.",
                           "Chain 1: your first weapon or Taijutsu attack each turn has +1 critical threat range.",
                           "Chain 2: on a critical hit, invisibility and +20 speed until the end of the turn."],
                     notes=["The haze fills your weapon's range around you and follows you; the chosen creature (one more per rank above C) can't see through it.",
                            "Chain 1: your first weapon or Taijutsu attack each turn has a +1 bonus to its critical threat range.",
                            "Chain 2: when you score a critical hit, you become invisible and gain +20 speed until the end of the current turn."])]),
    dict(id="water-release-blessing-of-poseidon", name="Water Release: Blessing of Poseidon", target="self", duration=CONC,
         versions=[V(r, ["Swim speed 60 ft, water breathing, tremorsense 60 ft.", "Creatures you deal cold damage to become Shaken until the start of your next turn.",
                         "Underwater: no disadvantage on attacks and full range.", f"Atlantean Trident in place of a weapon attack: melee {m}d8 or ranged {rg}d8 + Ninjutsu modifier cold."]
                        + (["The Trident has +1 critical threat range; against a creature with 2+ ranks of Chilled, its ranks can become Shaken (an Elemental condition)."] if r == "A" else []),
                     notes=["You have a 60-foot swim speed, breathe underwater and have 60 feet of tremorsense.",
                            "Creatures you deal cold damage to become Shaken until the beginning of your next turn.",
                            "Attacks made underwater aren't at disadvantage and keep their full range.",
                            f"Atlantean Trident (in place of a weapon attack): melee Ninjutsu attack, reach 5 ft, {m}d8 + Ninjutsu modifier cold; ranged, 60 ft, {rg}d8 + Ninjutsu modifier cold."]
                     + (["Atlantean Trident: +1 critical threat range; cold damage to a creature with 2 or more ranks of Chilled can change them to as many ranks of Shaken (an Elemental condition)."] if r == "A" else []))
                   for r, m, rg in [("C", 2, 1), ("A", 3, 2)]]),
    dict(id="wind-release-wind-rider", name="Wind Release: Wind Rider", target="self", duration=CONC,
         versions=[V(r, ["30 ft flying speed" + (", floating down to 1 foot off the ground at the end of your turn." if r == "C" else " (you no longer need to descend)."),
                         "You take no falling damage and can't be knocked Prone."] + (["When you Dash, +60 fly speed until the end of the turn."] if r == "A" else []),
                     notes=["You have a 30-foot flying speed" + (". At the end of your turn you float down, ending within 1 foot of the ground." if r == "C" else "; you no longer need to end within 1 foot of the ground."),
                            "You can't take falling damage or be knocked Prone, and always float at least 1 foot off the ground."]
                     + (["When you take the Dash action, +60 fly speed until the end of the current turn."] if r == "A" else []))
                   for r in ["C", "B", "A"]]),
]

# King's batch 1 verdicts: not Amps.

JUTSU += [
    # AMP1f batch 3 (B-Rank), King 2026-11-20: Q-F10 Twin Rising Dragons not an Amp; Q-F11 a Parrying stance
    # button on Blade Heart's Amp; Q-F12 Misleading Duplicate's invisibility is an Amp; Q-F13 Strength of 100
    # leaves a unique condition when it ends; Q-F14 Light Binding Step's A-Rank reaction line is leftover text.
    dict(id="keton-plasma-release-light-binding-step", name="Plasma Release: Light Binding Step", target="self", duration=CONC,
         versions=[V("B", ["Your speed is increased by +30.", "Ranged attacks that target you have disadvantage."],
                     changes=[ch("system.bonuses.speed", 30)],
                     rules=[{"key": "disadvantage", "selector": "attack", "direction": "against", "predicate": "attack:ranged", "label": "Light Binding Step"}],
                     notes=["In the light of one of your Starlights: the bolt of light (an Action, Charisma save) is on the jutsu."]),
                   V("S", ["Your speed is tripled.", "Ranged attacks that target you have disadvantage."],
                     changes=[ch("system.attributes.speed.walk", 3, 1)],
                     rules=[{"key": "disadvantage", "selector": "attack", "direction": "against", "predicate": "attack:ranged", "label": "Light Binding Step"}],
                     notes=["Your speed is tripled (set here as your walking speed ×3).",
                            "In the light of one of your Starlights: the bolt of light (an Action, Charisma save) is on the jutsu."])]),
    dict(id="jugo-full-sage-nature-transfiguration", name="Full Sage: Nature Transfiguration", target="self", duration=CONC,
         choose={"prompt": "Nature Transfiguration: was it Amplified?", "options": [
             {"label": "Not Amplified (concentration, up to 1 minute)", "changes": [], "rules": [], "duration": {"seconds": 60, "until": "", "concentration": True}},
             {"label": "Amplified: 6 Natural Energy (1 minute, no concentration)", "changes": [], "rules": [], "duration": {"seconds": 60, "until": "", "concentration": False}}]},
         versions=[V("B", ["AC increases by +2.", "Resistance to bludgeoning, piercing and slashing damage.",
                           "Jugo Clan Hijutsu with a casting time of Special halve the Nature Energy cost of their Amplify effects (minimum 1).",
                           "With the Nature Endurance bonus: advantage on Strength and Constitution saving throws.",
                           "With the Feral Endurance instinct: hostile creatures can't reduce your DR, ignore your resistances or treat your immunities as resistance."],
                     changes=[ch("system.bonuses.ac", 2)] + resist(*BPS),
                     notes=["Jugo Clan Hijutsu with a casting time of Special: Amplify costs half the Nature Energy (minimum 1).",
                            "With the Nature Endurance bonus: advantage on Strength and Constitution saving throws (at the table).",
                            "With the Feral Endurance instinct: your DR, resistances and immunities can't be reduced or ignored."])]),
    dict(id="hebi-basilisk-art-pythons-gaze", name="Basilisk Art: Pythons Gaze", target="self", duration=CONC,
         versions=[V("B", ["Your melee weapon attacks and Hebi clan Bukijutsu can't be made at disadvantage.",
                           "Creatures within range can't gain advantage against your Hebi clan Bukijutsu."],
                     notes=["Your melee weapon attacks and Hebi clan Bukijutsu can't be made at disadvantage (at the table).",
                            "Creatures within range can't gain advantage against your Hebi clan Bukijutsu (at the table)."])]),
    dict(id="ryu-conquerors-art-dragon-cloak", name="Conqueror’s Art: Dragon Cloak", target="self", duration=CONC,
         versions=[V(r, [f"{d}d12 + 15 temporary hit points that last for the duration.", "Your [Unarmed Damage] die becomes a d10.",
                         "All Ryu Clan Hijutsu gain the Wyrm Surge keyword (see Dragons Rage).",
                         "In your Dragon Rage State: if you begin your turn with less than 5 temporary hit points, you regain 2d12."],
                     tempHp=f"{d}d12 + 15", changes=[ch("n5e.unarmed.die", "1d10", 0)],
                     notes=["All Ryu Clan Hijutsu gain the Wyrm Surge keyword (see Dragons Rage).",
                            "In your Dragon Rage State: if you begin your turn with less than 5 temporary hit points, you regain 2d12 (at the table)."])
                   for r, d in [("B", 2), ("A", 3), ("S", 4)]]),
    dict(id="blade-heart", name="Blade Heart", target="self", duration=CONC,
         buttons=[{"label": "Parrying stance", "activation": "bonus", "text": "As a Bonus action on your turn, or a reaction to taking damage: +2 AC and Dexterity saves until the start of your next turn.",
                   "effect": {"name": "Blade Heart: Parrying stance", "target": "self", "changes": [ch("system.bonuses.ac", 2), ch("n5e.save.dex", 2)], "expires": "turnStart", "seconds": 0}}],
         versions=[V("B", ["As a Bonus action on your turn, or as a reaction to taking damage, you can assume your Parrying stance until the beginning of your next turn: +2 AC and Dexterity saving throws.",
                           "When you score a critical hit with your weapon with a weapon or Taijutsu attack, the target gains 1 rank of Bleed.",
                           "If you are disarmed, this jutsu ends."],
                     notes=["Parrying stance: the button on this Amp (+2 AC and Dexterity saves until the start of your next turn).",
                            "A critical hit with your weapon (weapon or Taijutsu attack): the target gains 1 rank of Bleed.",
                            "Ends if you are disarmed."])]),
    dict(id="misleading-duplicate", name="Misleading Duplicate", target="self", duration=CONC, statuses=["invisible"],
         versions=[V("B", ["You are invisible. The invisibility ends if you attack or cast a jutsu.",
                           "An illusory double of you appears where you stood (moved with your Action, up to twice your speed; up to 120 feet away)."],
                     notes=["You are invisible while the Amp lasts. Attacking or casting a jutsu ends the invisibility: end this Amp then (the double stays with the jutsu).",
                            "Switching to the double's senses (a Bonus action) leaves you Blinded and Deafened to your own surroundings."])]),
    dict(id="fire-release-investiture-of-flame", name="Fire Release: Investiture of Flame", target="self", duration=dict(seconds=600, until="", concentration=True),
         versions=[V("B", ["You are immune to fire and wind damage.", "Resistance to bludgeoning, piercing and slashing damage.", "Vulnerability to cold damage.",
                           "Bright light in a 30-foot radius and dim light for a further 20 feet.",
                           "As a Bonus action: a 15-foot cone of fire, Dexterity save, 3d10 + 3 fire damage and Burned (half on a success)."],
                     changes=immune("fire", "wind") + resist(*BPS) + [ch("n5e.vulnerable", "cold")],
                     notes=["You shed bright light in a 30-foot radius and dim light for a further 20 feet.",
                            "As a Bonus action: a 15-foot cone of fire; each creature makes a Dexterity save, taking 3d10 + 3 fire damage and Burned on a failure, or half on a success."])]),
    dict(id="medical-release-investiture-of-acid", name="Medical Release: Investiture of Acid", target="self", duration=dict(seconds=600, until="", concentration=True),
         versions=[V("B", ["You are immune to acid damage.", "Resistance to bludgeoning, piercing and slashing damage.", "Vulnerability to earth damage.",
                           "You cross difficult terrain on solid ground without extra movement.",
                           "The ground within 10 feet of you is acid: difficult terrain for creatures other than you, moving with you.",
                           "As an Action: a 15-foot cone of acid, Constitution save, 4d8 acid damage and Corroded (half on a success)."],
                     changes=immune("acid") + resist(*BPS) + [ch("n5e.vulnerable", "earth")],
                     notes=["You cross difficult terrain on solid ground without spending extra movement.",
                            "The ground within 10 feet of you is acid: difficult terrain for creatures other than you; it moves with you.",
                            "As an Action: a 15-foot cone of acid; each creature makes a Constitution save, taking 4d8 acid damage and Corroded on a failure, or half on a success."])]),
    dict(id="medical-release-strength-of-100", name="Medical Release: Strength of 100", target="self", duration=CONC,
         onEnd="medical-release-strength-of-100-overexerted",
         versions=[V("B", ["Your Strength becomes 20.", "Your jump height and distance are doubled.",
                           "Advantage on Strength and Constitution ability checks, skill checks and saving throws.", "Your [Unarmed Damage] die becomes 2d8.",
                           "When it ends: Strength of 100: Overexerted (disadvantage on Strength ability and skill checks for 1 hour or until a short rest)."],
                     changes=[ch("system.abilities.str.value", 20, 5), ch("n5e.unarmed.die", "2d8", 0)],
                     rules=[{"key": "advantage", "selector": ["check", "save"], "predicate": {"any": ["ability:str", "ability:con"]}, "label": "Strength of 100"}],
                     notes=["Your jump height and distance are doubled.",
                            "When it ends, you gain the condition Strength of 100: Overexerted (applied automatically)."])]),
    dict(id="bestial-art-hunter", name="Bestial Art: Hunter", target="self", duration=CONC,
         choose={"prompt": "Bestial Art: Hunter: which score changes?", "options": [
             {"label": "Strength becomes 22", "changes": [ch("system.abilities.str.value", 22, 5)], "rules": [note("Your unarmed attacks can use Strength.")]},
             {"label": "Dexterity becomes 18", "changes": [ch("system.abilities.dex.value", 18, 5)], "rules": [note("Your unarmed attacks can use Dexterity.")]}]},
         versions=[V(r, ["Your Strength becomes 22 or your Dexterity becomes 18 (your choice).",
                         "Your [Unarmed Damage] die becomes 2d8 slashing, using the changed ability for your unarmed attacks.", "+20 speed.",
                         "Opportunity attacks you make are at advantage.",
                         "When you take the Attack action, you make two attacks instead of one; if you already can, one additional unarmed attack."]
                        + (["You can't be seen by Chakra Sight or sensed by effects that sense chakra."] if r in "AS" else [])
                        + (["It lasts 1 minute without concentration."] if r == "S" else []),
                     changes=[ch("n5e.unarmed.die", "2d8", 0), ch("system.bonuses.speed", 20)],
                     rules=[{"key": "attacks", "value": 2, "label": "Bestial Art: Hunter"}],
                     duration=MINUTE if r == "S" else None,
                     notes=["Your unarmed damage is slashing.", "Opportunity attacks you make are at advantage.",
                            "If you already make two or more attacks with the Attack action, you instead make one additional unarmed attack (at the table)."]
                     + (["You can't be seen by Chakra Sight or sensed by effects that sense chakra."] if r in "AS" else []))
                   for r in ["B", "A", "S"]]),
    dict(id="sealing-art-gift-of-the-apex", name="Sealing Art: Gift of the Apex", target="self", duration=CONC,
         choose={"prompt": "Gift of the Apex: which beast?", "options": [
             {"label": "Bear's Endurance", "changes": [], "rules": [{"key": "advantage", "selector": "save:con", "label": "Bear's Endurance"},
              note("Kuma Fortitude (reaction): when saving against a Physical, Elemental or Sensory condition, gain 1 rank fewer of one condition type that can have ranks.")]},
             {"label": "Bull's Strength", "changes": [], "rules": [{"key": "advantage", "selector": "save:str", "label": "Bull's Strength"},
              note("Bulls Rush: in place of an attack, an unarmed attack within 5 feet for 2d12 + Strength piercing; the target makes a Strength save against the damage or is knocked Prone.")]},
             {"label": "Cat's Grace", "changes": [], "rules": [{"key": "advantage", "selector": "save:dex", "label": "Cat's Grace"},
              note("Cats Pounce (once per turn, with the Attack action): an unarmed attack for 2d8 + Dexterity slashing; the target makes a Dexterity save against the damage or gains 1 rank of Bleed.")]},
             {"label": "Eagle's Splendor", "changes": [], "rules": [{"key": "advantage", "selector": "save:wis", "label": "Eagle's Splendor"},
              note("Eagle Eye: the Search skill action as a Bonus action, seeing clearly up to 500 feet without obstructions.")]},
             {"label": "Fox's Cunning", "changes": [], "rules": [{"key": "advantage", "selector": "save:int", "label": "Fox's Cunning"},
              note("You can concentrate on one additional jutsu.")]},
             {"label": "Lion's Presence", "changes": [], "rules": [{"key": "advantage", "selector": "save:cha", "label": "Lion's Presence"},
              note("Tora Growl: Coerce, Demoralize and Make an Impression can't be made at disadvantage; creatures contesting them take a −2 penalty.")]}]},
         versions=[V("B", ["You gain one beast's traits: advantage on one kind of saving throw and that beast's ability (Bear, Bull, Cat, Eagle, Fox or Lion)."])]),
]

NOT_AMPS = {
    "Misty Hallucination": "An area attack; allies being immune only excludes them (King, AMP1f batch 1).",
    "Chakra Skin": "An Amp-less buff / stat override (King Q-F5).",
    "Earth Release: Bedrock Coffin": "Restrains a target; the hit points and resistances are the coffin's (King, AMP1f batch 1).",
    "Earth Release: Geo Breastplate": "An Amp-less buff / stat override (King Q-F5).",
    "Earth Release: Resonating Geo Isotoma": "An aura around an Earthen Artifact, not on a creature (King, AMP1f batch 1).",
    "Fire Release: Fox Fire": "A light and an attack (King, AMP1f batch 1).",
    "Sealing Art: Chakra Mark": "A mark for tracking (King, AMP1f batch 1).",
    # Batch 2 (C-Rank).
    "Adamantine Barrier": "A barrier zone; its 5-Pronged Seal box is a condition (King, AMP1f batch 2).",
    "Magnet Release: Dust Mesh": "Terrain in an area (King, AMP1f batch 2).",
    "Test Cutting: Senta Piercing": "An instant attack; its temporary hit points and chakra have no lasting rider (King, AMP1f batch 2).",
    "Fire Release: Heated Body": "An Amp-less buff, like Chakra Skin (King Q-F8).",
    "Outflank": "It marks a foe (King, AMP1f batch 2).",
    "Shadow Clone Technique": "It summons clones (King, AMP1f batch 2).",
    "Water Release: Heavenly Mirror of Pain": "It binds a foe's reflection (King, AMP1f batch 2).",
    "Wind Release: Vacuum Field": "A hazard zone (King, AMP1f batch 2).",
    # Batch 3 (B-Rank).
    "Lava Release: Rubber Wall Enhancement": "A wall (King, AMP1f batch 3).",
    "Spider Art: Silk Burial": "It cocoons foes (King, AMP1f batch 3).",
    "Kujaku Art: Star Wall": "A wall (King, AMP1f batch 3).",
    "Twin Rising Dragons": "It grants an attack action; floating is positioning (King Q-F10).",
    "Encroaching Darkness": "A darkness zone; the chosen creatures' immunity is part of the zone (King, AMP1f batch 3).",
    "Memory Domination": "It charms a foe (King, AMP1f batch 3).",
}


def card_id(key):
    return "n5eAmp" + hashlib.md5(key.encode()).hexdigest()[:10]


def jutsu_files():
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "packs/_source/**/*.json"), recursive=True)):
        if "/amps/" in f or os.path.basename(f).startswith("_folder"):
            continue
        d = json.load(open(f))
        if d.get("type") == "jutsu":
            out.setdefault(d["system"].get("identifier"), (f, d))
            out.setdefault("name:" + d["name"], (f, d))
    return out


def write(path, data):
    with open(path, "w") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def main():
    files = jutsu_files()
    written = 0
    keep = set()
    for i, j in enumerate(JUTSU):
        f, jutsu = files[j["id"]]
        base = j.get("key") or "jutsu-" + j["id"]
        first = j["versions"][0]
        for n, v in enumerate(j["versions"]):
            is_base = n == 0
            rank_tag = "" if is_base or v["level"] else v["rank"].lower()
            key = base if is_base else (f"{base}-{v['level']}" if v["level"] else f"{base}-{rank_tag}")
            name = j["name"] if is_base else (f"{j['name']} ({v['level']}th)" if v["level"] else f"{j['name']} ({v['rank']}-Rank)")
            dur = v["duration"] or j["duration"]
            cid = card_id(key)
            choose = v["choose"] or j.get("choose")
            if choose:
                choose = {"prompt": choose["prompt"], "count": choose.get("count", 1), "changeable": choose.get("changeable", False), "options": choose["options"]}
            aura = {"radius": v["aura"]["radius"], "who": v["aura"].get("who", "friendly"), "includeSelf": v["aura"].get("includeSelf", True),
                    "effect": {"amp": v["aura"]["amp"]}} if v.get("aura") else {}
            rank_versions = [x["rank"] for x in j["versions"] if not x["level"]]
            if v["level"] or any(x["level"] for x in j["versions"]):
                where = f"{v['level']}th level" if v["level"] else "1st level"
            else:
                top = (RANKS.index(rank_versions[rank_versions.index(v["rank"]) + 1]) - 1) if rank_versions.index(v["rank"]) + 1 < len(rank_versions) else len(RANKS) - 1
                span = RANKS[RANKS.index(v["rank"]):top + 1]
                where = f"cast at {span[0]}-Rank" if len(span) == 1 else f"cast at {span[0]}-Rank to {span[-1]}-Rank"
            doc = {
                "_id": cid, "name": name, "type": "amp", "img": jutsu.get("img") or "icons/svg/upgrade.svg", "folder": FOLDER, "sort": 100000 + i * 100 + n,
                "ownership": {"default": 0},
                "system": {
                    "identifier": key,
                    "description": f"<p><b>{jutsu['name']}</b> · {where} · no type</p>"
                                   + "".join(f"<p>{t}</p>" for t in v["lines"]),
                    "source": jutsu["system"].get("source", {"book": "", "page": "", "version": "4.0", "custom": ""}),
                    "ampType": "", "namedType": "", "owner": {"kind": "jutsu", "id": j["id"], "subclass": ""},
                    "summary": " ".join(v["lines"])[:300],
                    "activation": "", "giveable": j["target"] == "targets", "startOnInitiative": "",
                    "duration": {"seconds": dur["seconds"], "until": dur["until"], "concentration": dur["concentration"]},
                    "uses": {"max": "", "per": ""}, "cooldown": 0, "exclusive": "", "state": "", "tempHp": v["tempHp"],
                    "endsOn": [], "changes": v["changes"], "aura": aura, "outsideLimits": bool(v.get("outside")),
                    "series": "" if is_base else base, "level": v["level"], "rank": v["rank"] if not v["level"] else "",
                    "choose": choose or {"prompt": "", "options": []},
                    # AMP1f batch 3: buttons on the active Amp (Q-F11) and a condition when it ends (Q-F13).
                    "buttons": j.get("buttons", []), "onEnd": {"condition": j.get("onEnd", "")}, "statuses": j.get("statuses", [])
                },
                "effects": [],
                "flags": {"n5e": {"rules": [*v["rules"], *[note(t) for t in v["notes"]]], "amp1f": True}},
                "_stats": {"coreVersion": "13.351", "systemId": "n5e", "systemVersion": "0.70.0"},
                "_key": f"!items!{cid}"
            }
            slug = re.sub(r"[^a-z0-9]+", "-", key)
            path = os.path.join(AMPS, f"{slug}-{cid}.json")
            keep.add(path)
            write(path, doc)
            written += 1
        if not j.get("button", True):
            continue
        # The jutsu's button starts its card (the placeholder "Resolve the source instructions" goes;
        # a temporary-HP heal the card now gives goes; an effect button that built the buff by hand is replaced).
        acts = jutsu["system"].get("activities") or []
        acts = [a for a in acts if a.get("id") != "sourceUtility" and not (a.get("type") == "heal" and (a.get("heal") or {}).get("pool") == "tempHp" and not a.get("activation"))
                and not (a.get("type") == "effect" and not (a.get("effect") or {}).get("amp"))
                and not (a.get("type") == "roll" and str(a.get("id", "")).startswith("sourceRoll") and j["id"] in ("cloak-of-shadows", "lightning-release-spark", "medical-release-grim-mask", "warriors-zone"))
                and a.get("id") not in j.get("drop", ())]
        button = {"id": "amp" + hashlib.md5(j["id"].encode()).hexdigest()[:13], "type": "effect", "label": j["name"],
                  "effect": {"name": j["name"], "target": j["target"], "amp": base},
                  "text": "Starts the jutsu's Amp at the rank it was cast at." + (" Target the creatures first." if j["target"] == "targets" else "")}
        acts = [button] + [a for a in acts if (a.get("effect") or {}).get("amp") != base]
        jutsu["system"]["activities"] = acts
        jutsu.setdefault("flags", {}).setdefault("n5e", {}).pop("notAmp", None)
        write(f, jutsu)
    # Stale cards from earlier runs of this script.
    for path in glob.glob(os.path.join(AMPS, "jutsu-*.json")):
        if path not in keep:
            os.remove(path)
    marked = 0
    for name, why in NOT_AMPS.items():
        f, d = files["name:" + name]
        d.setdefault("flags", {}).setdefault("n5e", {})["notAmp"] = why
        write(f, d)
        marked += 1
    print(f"{written} jutsu Amp cards for {len(JUTSU)} jutsu; {marked} jutsu marked not Amps")


if __name__ == "__main__":
    main()
