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


def V(rank, lines, changes=(), rules=(), notes=(), tempHp="", duration=None, level=0, choose=None):
    """One version of a jutsu's Amp: its rank (and character level for AMP1g level versions)."""
    return dict(rank=rank, lines=lines, changes=list(changes), rules=list(rules), notes=list(notes), tempHp=tempHp,
                duration=duration, level=level, choose=choose)


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

# King's batch 1 verdicts: not Amps.
NOT_AMPS = {
    "Misty Hallucination": "An area attack; allies being immune only excludes them (King, AMP1f batch 1).",
    "Chakra Skin": "An Amp-less buff / stat override (King Q-F5).",
    "Earth Release: Bedrock Coffin": "Restrains a target; the hit points and resistances are the coffin's (King, AMP1f batch 1).",
    "Earth Release: Geo Breastplate": "An Amp-less buff / stat override (King Q-F5).",
    "Earth Release: Resonating Geo Isotoma": "An aura around an Earthen Artifact, not on a creature (King, AMP1f batch 1).",
    "Fire Release: Fox Fire": "A light and an attack (King, AMP1f batch 1).",
    "Sealing Art: Chakra Mark": "A mark for tracking (King, AMP1f batch 1).",
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
        base = "jutsu-" + j["id"]
        first = j["versions"][0]
        for n, v in enumerate(j["versions"]):
            is_base = n == 0
            rank_tag = "" if is_base or v["level"] else v["rank"].lower()
            key = base if is_base else (f"{base}-{v['level']}" if v["level"] else f"{base}-{rank_tag}")
            name = j["name"] if is_base else (f"{j['name']} ({v['level']}th)" if v["level"] else f"{j['name']} ({v['rank']}-Rank)")
            dur = v["duration"] or j["duration"]
            cid = card_id(key)
            choose = v["choose"] or j.get("choose")
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
                    "endsOn": [], "changes": v["changes"], "aura": {}, "outsideLimits": False,
                    "series": "" if is_base else base, "level": v["level"], "rank": v["rank"] if not v["level"] else "",
                    "choose": choose or {"prompt": "", "options": []}
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
        # The jutsu's button starts its card (the placeholder "Resolve the source instructions" goes;
        # a temporary-HP heal the card now gives goes; an effect button that built the buff by hand is replaced).
        acts = jutsu["system"].get("activities") or []
        acts = [a for a in acts if a.get("id") != "sourceUtility" and not (a.get("type") == "heal" and (a.get("heal") or {}).get("pool") == "tempHp" and not a.get("activation"))
                and not (a.get("type") == "effect" and not (a.get("effect") or {}).get("amp"))
                and not (a.get("type") == "roll" and str(a.get("id", "")).startswith("sourceRoll") and j["id"] in ("cloak-of-shadows", "lightning-release-spark", "medical-release-grim-mask", "warriors-zone"))]
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
