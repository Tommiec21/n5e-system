#!/usr/bin/env python3
"""AMP1d (docs/AMP1_SPEC.md): Amp cards for the named Amp boxes in clan features.

King Q-A1: anything a clan provides is a Clan Amp; the box's own type (Battle Amp, Will Amp...) is
kept as namedType. Each card's box text is read from its clan feature at build time (word for word);
the start rules (action, duration, uses) come from the feature that grants it.

Automated: flat bonuses the text states (AC, speed, resistances, condition immunities, Mastery,
level-scaled damage and attack bonuses, temp HP at the start of a turn). Everything else is a note
on the card, played at the table.

Idempotent: card ids come from the key; rerunning rewrites the same files.
"""
import glob
import hashlib
import html
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AMPS = os.path.join(ROOT, "packs/_source/amps")
CLANS = os.path.join(ROOT, "packs/_source/clans")
FOLDER = "n5eAmpFoldClan01"

LR, SR = {"max": "1", "per": "lr"}, {"max": "1", "per": "sr"}
NO_USES = {"max": "", "per": ""}


def ch(key, value, mode=2):
    return {"key": key, "value": str(value), "mode": mode}


def note(text):
    return {"key": "note", "text": text}


def lvl_dmg(name, value, predicate=None, selector="damage"):
    r = {"key": "modifier", "selector": selector, "value": value, "label": name}
    if predicate:
        r["predicate"] = predicate
    return r


TARGET_ANY = lambda *keys: {"any": [f"target:status:{k}" for k in keys]}  # noqa: E731

# owner: ("feat", identifier) for the feature that grants it, or ("clan", identifier).
CARDS = [
    dict(key="nirvana", name="Nirvana", box="Nirvana", owner=("feat", "shi-hou-nirvana"), named="Battle", activation="",
         seconds=60, uses=LR, summary="Pick 3 of its 6 benefits when you enter. Inner Chi recovery, AC Mastery, chi damage reduction, save protection, every transformation, or save rerolls.",
         notes=["Start: at the beginning of your turn, spend 4 Inner Chi (once per long rest).", "Choose the 3 effects when you enter; they're played at the table."]),
    dict(key="caloric-ignition", name="Caloric Ignition", box="Caloric Ignition", owner=("feat", "akimichi-caloric-arts"), named="Battle", activation="bonus",
         seconds=60, cooldown=600, uses=NO_USES, summary="Unarmed die up one step and Mastery on Strength checks. Advantage to resist being moved, knocked prone, grappled, restrained or Exhausted while on the ground.",
         changes=[ch("n5e.unarmed.step", 1), ch("n5e.mastery.check.str", "Caloric Ignition")],
         notes=["Start: Bonus action, 2 Calories and an Akimichi food pill. Lasts 1 minute, then 10 minutes to recover before reuse.",
                "While standing on the ground: advantage on checks and saves to resist being moved, knocked prone, grappled, restrained or Exhausted."]),
    dict(key="cataclysm-knuckle", name="Cataclysm Knuckle", box="Cataclysm Knuckle", owner=("feat", "bakuton-bombfist-brawler"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="Immune to your own Primes and Bakuton effects. Unarmed hits Prime twice, and your crit range grows with the target's Primes.",
         notes=["Detonation Momentum: + crit range equal to the Primes on the target (at the table)."]),
    dict(key="grand-detonator", name="Grand Detonator", box="Grand Detonator", owner=("feat", "bakuton-explosive-art"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="Up to 8 Primes, one free detonation a turn, 3 Payloads per detonation, and detonations can leave difficult terrain."),
    dict(key="mirage-regent", name="Mirage Regent", box="Mirage Regent", owner=("feat", "hozuki-heir-of-the-mist"), named="Battle", activation="bonus",
         seconds=60, uses=SR, exclusive="hozuki-tidal-state",
         summary="A 30-foot mist moves with you: difficult terrain for foes, and you're heavily obscured beyond 10 feet. Attacks can miss on a d12, and your attacks can come from anywhere in the mist.",
         notes=["Start: Bonus action and 4 Hydration, for your chosen Tidal State (chosen each long rest). Once per rest."]),
    dict(key="tidal-gains", name="Tidal Gains", box="Tidal Gains", owner=("feat", "hozuki-heir-of-the-mist"), named="Battle", activation="bonus",
         seconds=60, uses=SR, exclusive="hozuki-tidal-state",
         summary="Large, Reach 1, advantage on Athletics. Resistance to bludgeoning, piercing, slashing, cold and fire; Water Release cold damage +1 die.",
         changes=[ch("n5e.resist", t) for t in ["bludgeoning", "piercing", "slashing", "cold", "fire"]],
         rules=[{"key": "advantage", "selector": "skill:ath", "label": "Tidal Gains: Colossus"}],
         notes=["Start: Bonus action and 4 Hydration, for your chosen Tidal State (chosen each long rest). Once per rest.",
                "Colossus: size Large and Reach 1 on melee weapon and unarmed attacks (at the table).",
                "Water Cannons (+1 cold die on Water Release jutsu) and Water Pressure: at the table."]),
    dict(key="ketsuryugan", name="Ketsuryugan", box="Ketsuryugan", owner=("feat", "chinoike-ketsuryugan"), named="Will", activation="bonus",
         seconds=600, cooldown=600, summary="30-foot Blood Sight (60 at 11th). Bleed can stand in for water, and Crimson Charges fuel Blood Detonation.",
         notes=["Lasts up to 10 minutes; 10 minutes of non-use before activating again."]),
    dict(key="crimson-pact", name="Crimson Pact", box="Crimson Pact", owner=("feat", "chinoike-crimson-pact"), named="Fortitude", activation="",
         seconds=0, until="dismissed", giveable=True, summary="A blood bond with one ally: you sense each other and share jutsu healing as temp HP. Either can lower max HP to keep the other up at 20 HP.",
         notes=["Formed over a long rest with a willing creature; both of you get this Amp. Ends when dismissed, on death, or when dispelled (B-Rank or lower)."]),
    dict(key="umbral-monarch", name="Umbral Monarch", box="Umbral Monarch", owner=("feat", "vesper-umbral-transmutation"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="Fly speed, Echolocation and free Pinging. Unarmed +2 (+4 at 15th) in Claws of the Night; Sonic Lance and Umbral Shockwave actions.",
         rules=[lvl_dmg("Umbral Monarch: Beast Claws", "lvl(1:2,15:4)", "self:stance:vesper-stance-claws-of-night", "damage:unarmed")],
         notes=["Nocturnal Wings: fly speed equal to your speed (set at the table).", "Entering again before a long rest: 1 rank of exhaustion."]),
    dict(key="well-rested", name="Well Rested", box="Well Rested", owner=("feat", "kurama-deep-sleep"), named="Will", activation="",
         seconds=0, until="rest", giveable=True,
         summary="Temp chakra equal to your level, advantage on your next initiative, +1 die on your first damage, and one free reaction. Ends once all are used.",
         notes=["Everyone who long rests with you becomes Well Rested.", "Each benefit is used once; when all are used, end it."]),
    dict(key="blazing", name="Blazing", box="Blazing", owner=("feat", "sarutobi-will-of-fire-incarnate"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="Regain 1 Will each turn, Unified Form costs 1 less Will, and +1 to Weapon and Taijutsu attacks with Flame Blessed weapons.",
         notes=["Start: Will of Fire Incarnate, a Bonus action; your Will blazes for 1 minute, once per long rest.",
                "Blazing Limits: +1 to Weapon and Taijutsu attacks with Flame Blessed weapons (at the table)."]),
    dict(key="torque", name="Torque", box="Torque", owner=("feat", "futton-steam-engine"), named="Battle", activation="",
         seconds=60, uses=SR, summary="Hold up to 6 Pressure and build 2 per turn.",
         notes=["Start: spend 2 Pressure (once per rest).", "Horse Power (1 Pressure at turn start): Deadly 2 (Deadly 4 at 15th) on unarmed and weapon attacks that turn."]),
    dict(key="signal-boosted", name="Signal Boosted", box="Signal Boosted", owner=("clan", "genwa"), named="Will", activation="",
         seconds=0, until="turnEnd", giveable=True, summary="The Genwa sees and casts through you. Allies within 10 feet get +1 to attacks and saves.",
         notes=["Ends at the end of the applying Genwa's turn, unless its source says otherwise.", "Team Link: +1 to allies' attacks and saves within 10 feet (at the table)."]),
    dict(key="white-wolf", name="White Wolf", box="White Wolf", owner=("feat", "hatake-white-wolf"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="Regain White Chakra or Command Dice each turn, crit Mastery from your affinity, an extra action, and a reaction to protect an ally."),
    dict(key="basilisks-blessing", name="Basilisk’s Blessing", box="Basilisk’s Blessing", owner=("feat", "hebi-blood-of-the-basilisk"), named="Fortitude", activation="bonus",
         seconds=60, uses=SR, endsOn=["unconscious"], summary="Regain 1 Viper Blood a turn and pay 1 less on big costs. Better Serpent Blood healing, and free Strikes on Hebi Hijutsu.",
         notes=["Start: Bonus action and 4 Viper Blood. Ends if you're incapacitated, or dismiss it on your turn."]),
    dict(key="kujaku-mode", name="Kujaku Mode", box="Kujaku Mode", owner=("feat", "hoshi-kujaku-peacock-plume"), named="Fortitude", activation="bonus",
         seconds=60, uses=SR, summary="Temp HP of twice your max Star Chakra, renewed each turn. +10 speed (+20 at 11th), Temporary Star Chakra each turn, and Star Sickness boons.",
         changes=[ch("system.bonuses.speed", "lvl(1:10,11:20)")],
         notes=["Cosmic Plumage: temp HP equal to twice your maximum Star Chakra; regain them if you start your turn without them.",
                "Star Sickness penalties are suppressed while it lasts."]),
    dict(key="kujaku-sanseijin", name="Kujaku Sanseijin", box="Kujaku Sanseijin", owner=("feat", "hoshi-irradiated-apex"), named="Fortitude", activation="trigger",
         seconds=0, until="nextTurnEnd", summary="Kujaku Mode's benefits, a Star Momentum special action, free Irradiated effects, and Star Chakra that doesn't cause Star Sickness.",
         changes=[ch("system.bonuses.speed", "lvl(1:10,11:20)")],
         notes=["Starts when you spend 6+ Star Chakra between the start of your last turn and the start of your next; lasts until the end of your next turn and can't be extended."]),
    dict(key="apex-predator", name="Apex Predator", box="Apex Predator", owner=("feat", "hoshigaki-apex-berserker"), named="Battle", activation="bonus",
         seconds=60, summary="Double speed swimming or water walking. +2 damage (+4 at 7th, +6 at 15th) to creatures with listed conditions; unarmed and weapon hits trigger Ravenous Chakra.",
         rules=[lvl_dmg("Apex Predator: Cold Blooded", "lvl(1:2,7:4,15:6)", TARGET_ANY("bleed", "concussed", "dazed", "demoralized", "grappled", "restrained", "shaken"))],
         notes=["Entering again before a long rest: 1 rank of exhaustion (once per rest free from 11th).",
                "Efficient Recovery: +4 temp HP once per turn (+6 at 7th, +8 at 15th) on temp HP you gain."]),
    dict(key="speed-sovereign", name="Speed Sovereign", box="Speed Sovereign", owner=("feat", "namikaze-sovereign-of-speed"), named="Reflex", activation="bonus",
         seconds=60, uses=LR, summary="Regain a Speed Seal each turn and blink to sealed creatures. Sealed can't stop your teleports, and you can't be teleported against your will."),
    dict(key="feral", name="Feral", box="Feral", owner=("feat", "inuzuka-savage-attacker"), named="Battle", activation="trigger",
         seconds=0, until="nextTurnEnd", summary="+2 AC and Dexterity saves, +1 damage die, and you sense wounded creatures within 60 feet. Ends at the end of your next turn.",
         changes=[ch("system.bonuses.ac", 2), ch("n5e.save.dex", 2)],
         notes=["Starts when you or your Nin-Dog score a critical hit.", "From 11th: below half HP, Feral for 1 minute ignoring Calming (once per rest).",
                "Ferocious: +1 damage die (the largest size) on your damage."]),
    dict(key="synthetic-chakra-mode", name="Synthetic Chakra Mode", box="Synthetic Chakra Mode", owner=("feat", "jinzo-synthetic-battle-aura"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="+1 (+2 at 15th) to unarmed and Jinzo Hijutsu attacks, +20 speed and immunity to Slowed. Branch and Bio-Pet benefits on the card text.",
         changes=[ch("n5e.attack.unarmed", "lvl(1:1,15:2)"), ch("system.bonuses.speed", 20), ch("n5e.conditionImmune", "slowed")],
         notes=["Synthetic Surge also applies to attacks made by Jinzo Hijutsu (at the table).", "Your speed can't be reduced by hostile effects."]),
    dict(key="battle-lust", name="Battle Lust", box="Battle Lust", owner=("clan", "kaguya"), named="Battle", activation="",
         seconds=0, until="combatEnd", summary="Ranks up to 5: +5 speed and an extra opportunity-attack reaction per rank. +2 damage (+4 at 11th) to bleeding creatures.",
         rules=[lvl_dmg("Battle Lust: Violent Desire", "lvl(1:2,11:4)", "target:status:bleed")],
         notes=["Ranks come from Shikotsumyaku Stance, Desire for Battle and Dance of the Pale Tyrant; Kaguya Hijutsu spend them.",
                "Per rank: +5 speed and one extra reaction for opportunity attacks (at the table).",
                "Calming Down: lose a rank if you neither dealt nor took damage by the end of your turn."]),
    dict(key="event-horizon", name="Event Horizon", box="Event Horizon", owner=("feat", "keton-event-horizon"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="Nothing within 40 feet is invisible, and you're immune to Blinded and Dazzled. Extra Starlights and Stellar Charges, plus benefits for each Starlight consumed.",
         changes=[ch("n5e.conditionImmune", "blinded"), ch("n5e.conditionImmune", "dazzled")],
         notes=["Start: Bonus action, 4 Stellar Charges, and consume up to 4 Starlights (their benefits stack by count)."]),
    dict(key="mercury-foundry", name="Mercury Foundry", box="Mercury Foundry", owner=("feat", "konjiki-liquid-mercury-foundry"), named="Battle", activation="bonus",
         seconds=60, uses=SR, summary="An Ingot and 8 temp HP each turn, DR set to 12 (or +2 if higher). Your metal weapons count as any group, and armor takes a second trait.",
         rules=[{"key": "heal", "on": "turnStart", "formula": "8", "pool": "tempHp", "label": "Mercury Foundry"}],
         notes=["DR becomes 12; if it's already higher, +2 (at the table)."]),
    dict(key="black-okami", name="Black Okami", box="Black Okami", owner=("feat", "kuru-stance-black-fang"), named="Battle", activation="bonus",
         seconds=60, uses=LR, endsOn=["stanceLeave", "unconscious"], summary="+1 to saves you aren't proficient in. Yin-Arts strikes force saves even on a miss, and Yin-Seals become stuns and Finishers.",
         notes=["Start: Bonus action and 4 Foresight, with the Miraigan active and in Black Fang stance. Ends if either stops, or if you're incapacitated.",
                "Okami's Resilience: +1 to saving throws you're not proficient in (at the table)."]),
    dict(key="miraigan", name="Miraigan", box="Miraigan", owner=("feat", "kuru-miraigan"), named="Will", activation="bonus",
         seconds=600, cooldown=600, startOnInitiative="ask", summary="You can't be surprised, and being unseen gives foes no advantage on you. Free Read the Enemy or Identify, and Mastery on Insight, Identify and Read the Enemy.",
         changes=[ch("n5e.mastery.skill.ins", "Miraigan")],
         notes=["At initiative it lasts until combat ends; as a Bonus action, 10 minutes, then 10 minutes of non-use.",
                "Eyes of the Wolf: 1 rank of Mastery (2 at 7th, 3 at 15th); add the extra ranks at the table."]),
    # combat-coordinated: King Q-E4 (AMP1e), a condition card (conditions pack), not an Amp.
    dict(key="ultra-focus", name="Ultra Focus", box="Ultra Focus", owner=("feat", "non-clan-nindo-always-go-beyond"), named="Fortitude", activation="trigger",
         seconds=0, until="dismissed", uses=SR, summary="+2 damage (+4 at 11th), Drive for an extra Action, and advantage to resist grapples, restraints, stuns and Staggered. A DC 20 Con check each turn keeps it going.",
         changes=[ch("n5e.stateResist", "grappled"), ch("n5e.stateResist", "restrained"), ch("n5e.stateResist", "stunned"), ch("n5e.conditionResist", "staggered")],
         rules=[lvl_dmg("Ultra Focus: Uncapped Strength", "lvl(1:2,11:4)")],
         notes=["Starts the first time you fall below half your hit or chakra points.", "Stress: at the end of each of your turns, a DC 20 Constitution check; on a failure it ends."]),
    dict(key="dragons-rage", name="Dragons Rage", box="Dragons Rage", owner=("feat", "non-clan-latent-latent-ryu-latent-dragons-rage-i-variant-1"), named="Battle", activation="action",
         seconds=60, summary="+1 AC and +10 speed (+2 and +20 at 15th). Dragon Claws take your release's damage type and Wyrm Surge adds conditions; more at 7th and 15th.",
         changes=[ch("system.bonuses.ac", "lvl(1:1,15:2)"), ch("system.bonuses.speed", "lvl(1:10,15:20)")],
         notes=["Can't be ended early.", "Dragon Claws: unarmed attacks can use Constitution in place of Strength."]),
    dict(key="scorching-heat", name="Scorching Heat", box="Scorching Heat", owner=("clan", "shakuton"), named="Battle", activation="trigger",
         seconds=60, summary="+2 fire damage (+4 at 7th, +6 at 15th). Wind or fire damage turns Burned into Immolation, and Scorch Charges fuel Scorch effects.",
         rules=[lvl_dmg("Scorching Heat: Hotter Still", "lvl(1:2,7:4,15:6)", None, "damage:fire")],
         notes=["You're in this state while you have Scorch Charges (they fade after 1 minute). From 15th (Scorching Dominion), always."]),
    dict(key="origami-angel-demon", name="Origami Angel/Demon", box="Origami Angel/Demon", owner=("feat", "shikigami-kamis-salvation-akumas-damnation"), named="Battle", activation="bonus",
         seconds=60, uses=SR, summary="2 Rei and temp HP equal to your proficiency bonus each turn. Angel or Demon benefits by your first Canvas Type.",
         rules=[{"key": "heal", "on": "turnStart", "formula": "@prof", "pool": "tempHp", "label": "Origami: Paper Shroud"}]),
    dict(key="sharingan", name="Sharingan", box="Sharingan", owner=("feat", "uchiha-sharingan"), named="Reflex", activation="bonus",
         seconds=60, startOnInitiative="ask", summary="30-foot Chakra Sight (60 at 11th). Mastery on See Through Lies, Sense Motive and Search (as bonus actions), and +4 to Read the Enemy.",
         notes=["At initiative it lasts until combat ends; as a Bonus action, 1 minute."]),
    dict(key="arachnid", name="Arachnid", box="Arachnid", owner=("feat", "tsuchigumo-web-walker"), named="Battle", activation="bonus",
         seconds=60, uses=SR, summary="Six arms: free Web Anchors, two more web weapons and hand signs with full hands. Two extra Silk Weaves, and Spider Sense against unseen attackers.",
         notes=["Spider Sense: hidden or unseen creatures get no advantage on attacks against you."]),
    dict(key="lava-chakra-mode", name="Lava Chakra Mode", box="Lava Chakra Mode", owner=("feat", "yoton-lava-chakra-mode"), named="Battle", activation="bonus",
         seconds=60, uses=LR, summary="+2 AC and two Molten Terrains at once. Melee attackers take 10 fire damage, and your Earth and Fire jutsu turn molten.",
         changes=[ch("system.bonuses.ac", 2)],
         notes=["Also: a Bonus action inside two overlapping Molten Terrains (dispelling both), once per long rest.", "Hostile creatures that damage you with a melee attack take 10 fire damage (at the table)."]),
]


def text(h):
    h = re.sub(r"<br\s*/?>|</p>|</li>|</h\d>|</tr>|</div>|</td>|</th>", "\n", h or "")
    h = re.sub(r"<[^>]+>", "", h)
    return html.unescape(h)


def load_clan_texts():
    out = []
    for f in glob.glob(os.path.join(CLANS, "**/*.json"), recursive=True):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        if not isinstance(d, dict):
            continue
        desc = d.get("system", {}).get("description", {})
        desc = desc.get("value") if isinstance(desc, dict) else desc
        if desc:
            out.append((d, text(desc)))
    return out


def box_lines(name, texts):
    """The box's lines (type line first). Boxes are stored as one paragraph: "| #### Name / Battle Amp / line / line |"."""
    pat = re.compile(r"\|\s*(?:#+\s*)?" + re.escape(name) + r"\s*/\s*((?:Battle|Will|Fortitude|Reflex|Clan) Amp[^/|]*?)\s*/(.*?)\|", re.S)
    best = None
    for d, t in texts:
        m = pat.search(t)
        if m and (best is None or len(m.group(2)) > len(best.group(2))):
            best = m
    if not best:
        raise SystemExit(f"box not found: {name}")
    lines = [re.sub(r"\s+", " ", l).strip() for l in best.group(2).split(" / ") if l.strip()]
    return [best.group(1).strip(), *lines]


def card_id(key):
    return "n5eAmp" + hashlib.md5(("clan:" + key).encode()).hexdigest()[:10]


def main():
    texts = load_clan_texts()
    feats = {d.get("system", {}).get("identifier") for d, _ in texts}
    for i, c in enumerate(CARDS):
        kind, oid = c["owner"]
        if kind == "feat" and oid not in feats:
            raise SystemExit(f"owner feature not found: {oid}")
        box = box_lines(c["box"], texts)
        notes = c.get("notes", [])
        desc = "".join(f"<p>{'<b>' + html.escape(t) + '</b>' if j == 0 else html.escape(t)}</p>" for j, t in enumerate(box))
        cid = card_id(c["key"])
        doc = {
            "_id": cid, "name": c["name"], "type": "amp", "img": "icons/svg/upgrade.svg", "folder": FOLDER, "sort": (i + 1) * 100,
            "ownership": {"default": 0},
            "system": {
                "identifier": c["key"], "description": desc,
                "source": {"book": "N5e 4.0 Clans", "page": "", "version": "4.0", "custom": ""},
                "ampType": "clan", "namedType": f"{c['named']} Amp", "owner": {"kind": kind, "id": oid, "subclass": ""},
                "summary": c["summary"], "activation": c.get("activation", ""), "giveable": bool(c.get("giveable")),
                "startOnInitiative": c.get("startOnInitiative", ""),
                "duration": {"seconds": c.get("seconds", 60), "until": c.get("until", ""), "concentration": False},
                "uses": dict(c.get("uses", NO_USES)), "cooldown": c.get("cooldown", 0), "exclusive": c.get("exclusive", ""), "state": "",
                "tempHp": "", "endsOn": c.get("endsOn", []), "changes": c.get("changes", []), "aura": {}
            },
            "effects": [],
            "flags": {"n5e": {"rules": [*c.get("rules", []), *[note(n) for n in notes]], "amp1d": True}},
            "_stats": {"coreVersion": "13.351", "systemId": "n5e", "systemVersion": "0.66.0"},
            "_key": f"!items!{cid}"
        }
        slug = re.sub(r"[^a-z0-9]+", "-", c["key"])
        with open(os.path.join(AMPS, f"clan-{slug}-{cid}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    print(f"{len(CARDS)} clan Amp cards")


if __name__ == "__main__":
    main()
