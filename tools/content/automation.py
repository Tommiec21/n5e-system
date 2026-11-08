#!/usr/bin/env python3
"""
Automation data for the imported content (0.7.1 automation pass).

Applied after build_content.py writes the books' text, and runnable on its own:
  python3 tools/content/automation.py

Each entry patches one document by pack + name: system fields (deep-merged), activities (replace the
text-parsed ones), transfer effects (applied while owned; a stance's only while it is the active
stance), flags (feature choices, cast options, stance die rules), and description additions.
The books' text is never rewritten.
"""
import copy
import glob
import hashlib
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "packs", "_source")
ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


def make_id(kind, name):
    h = hashlib.sha256(f"{kind}:{name}".encode()).digest()
    return "n5e" + "".join(ALNUM[b % len(ALNUM)] for b in h[:13])


# ------------------------------------------------------------------------------------------ #
#  Builders                                                                                  #
# ------------------------------------------------------------------------------------------ #

def act(type_, label, **kw):
    """Activity (fields not given take the schema defaults)."""
    a = {"id": make_id("activity", f"{label}:{kw.get('minLevel', 0)}")[:16], "type": type_, "label": label}
    a.update(kw)
    return a


def strike(label, kind="unarmed", minLevel=0, oncePerTurn=False, activation="", **s):
    extra = {k: s.pop(k) for k in ("save", "inflicts", "text", "cost") if k in s}
    return act("attack", label, minLevel=minLevel, oncePerTurn=oncePerTurn, activation=activation,
               attack={"discipline": "tai", "range": "melee", "count": 1}, strike={"kind": kind, **s}, **extra)


def save(ability, dc="tai", inflicts=None, resave=False, **kw):
    return {"save": {"abilities": [ability], "dc": {"source": dc}, "onSuccess": "none", "resave": resave},
            "inflicts": inflicts or [], **kw}


def cond(key, ranks=1, kind="condition", label=None):
    return {"key": key, "kind": kind, "ranks": ranks, "label": label or key.capitalize()}


def effect(label, changes=None, target="self", expires="", seconds=0, **kw):
    return act("effect", label, effect={"name": kw.pop("name", label), "target": target, "changes": changes or [],
                                        "expires": expires, "seconds": seconds, **{k: kw.pop(k) for k in list(kw) if k in ("tempHp", "state", "exclusive", "ampType")}}, **kw)


def ch(key, value, mode=2):
    return {"key": key, "value": str(value), "mode": mode}


def transfer(item_name, label, changes):
    eid = make_id("effect", f"{item_name}:{label}")
    return {"_id": eid, "name": label, "type": "generic", "img": "icons/svg/aura.svg", "transfer": True, "disabled": False,
            "system": {"category": "feature"}, "changes": [{**c, "priority": None} for c in changes], "duration": {},
            "description": "", "origin": None, "tint": "#ffffff", "statuses": [], "flags": {"n5e": {"automation": True}}, "sort": 0}


SD = {"pool": "superiorityDice", "amount": 1, "roll": True}

# ------------------------------------------------------------------------------------------ #
#  Stances                                                                                   #
# ------------------------------------------------------------------------------------------ #

STANCES = {
    "Blade Stance": {"activities": [
        strike("Bleeding Edge", "weapon", minLevel=5, text="+2 damage for each rank of Bleeding the target has.")]},
    "Drunken Fist Stance": {"activities": [
        act("roll", "Drunken Fist: reduce damage", activation="reaction",
            roll={"formula": "{@unarmed,@unarmed}kh", "note": "Subtract this from the damage you take (Unarmed Damage rolled twice, higher)."})]},
    "Flailing Stance": {"activities": [
        strike("Reaping Swing", "weapon", oncePerTurn=True, **save("dex", "tai")),
        effect("Reaping Swing: DR penalty", [ch("n5e.dr", "lvl(1:-2,10:-4)")], target="targets", expires="turnStart",
               name="Reaping Swing (DR)", text="On a failed Dexterity save.")]},
    "Great Weapon Stance": {"flags": {"weaponDie": {"mod": "r<3", "property": "heavy"}}, "activities": [
        strike("Savage Attack", "weapon", minLevel=5, extraDice="@wdie", text="Advantage against a creature that damaged you since your last turn."),
        act("save", "Savage Attack: knock Prone", minLevel=10, **save("str", "tai", [cond("prone", kind="state", label="Prone")]))]},
    "Guardian Stance": {"activities": [strike("Guardian Strike", "weapon", minLevel=5,
        text="Until the start of your next turn, the first damage it deals to an ally within 5 ft of you is reduced by your Weapon Damage die result.")]},
    "Iron Fist Stance": {"system": {"unarmedAlt": {"die": "1d8", "item": "Combat Bracers", "ability": "str"}}, "activities": [
        strike("Bone Breaking Strike", minLevel=5, oncePerTurn=True, **save("str", "tai", [cond("bruised", label="Bruised")])),
        effect("Bone Breaking Strike: AC penalty", [ch("system.bonuses.ac", "lvl(5:-1,10:-2)")], target="targets", expires="turnStart",
               minLevel=5, name="Bone Breaking Strike (AC)", text="On a failed Strength save.")]},
    "Lion Fist Stance": {"activities": [strike("Roaring Strike", minLevel=10,
        text="All hostile creatures within 15 ft become targets of Demoralize, using this attack's result.")]},
    "Polearm Stance": {"activities": [
        strike("Opposite end", "weapon", dieSteps=-1, activation="bonus", text="After taking the Attack action."),
        strike("Sweeping Attack", "weapon", minLevel=5, text="One roll against every creature in a cone as long as your reach; move them 5 ft."),
        act("save", "Knock Prone", minLevel=10, **save("str", "tai", [cond("prone", kind="state", label="Prone")]))]},
    "Power Stance": {"activities": [strike("Raiding Strike", "weapon", minLevel=5, pierce=4,
        text="Pierce 8 against an interposing construct, structure or creature.")]},
    "Rabbit Fist Stance": {"effects": [("Rabbit Fist: speed", [ch("system.bonuses.speed", 10)])], "activities": [
        strike("Bunny Roundhouse", minLevel=5, oncePerTurn=True, text="One roll against every hostile creature in your unarmed range.")]},
    "Serpent Fist Stance": {"system": {"unarmedType": "piercing"}, "activities": [
        strike("Serpent Grasp", minLevel=5, oncePerTurn=True, text="On a hit, grapple it with one hand."),
        act("save", "Serpents Rattle", minLevel=5, damage={"parts": [{"formula": "@unarmed + 2d6", "type": "piercing"}]},
            **save("str", "tai"), text="On a failure, swing it into another creature: both take the damage.")]},
    "Sharpshooter Stance": {"activities": [strike("Pinpoint Shot", "weapon", minLevel=5, maximize=True,
        text="The die is maximized only if the target is unaware of you, you're hidden from it, or it's at your furthest range.")]},
    "Silent Killing": {"system": {"unarmedDie": "1d6", "unarmedType": "slashing", "unarmedAlt": {"die": "1d8", "item": "Iron Claws"}}, "activities": [
        strike("Assassination Strike", minLevel=5, oncePerTurn=True, maximize=True, text="Against a creature you are hidden from.")]},
    "Titan Fist Stance": {"effects": [("Titan Fist: Reinforced", [ch("n5e.reinforced", 2)])], "activities": [
        effect("Titan Guard", [ch("system.bonuses.ac", 2), ch("n5e.dr", 2)], expires="turnStart", minLevel=5, activation="reaction")]},
    "Two-Weapon Stance": {"activities": [strike("Flutter Attack", "weapon", minLevel=5, attacks="2",
        **save("dex", "tai", [cond("dazed", label="Dazed")]), text="One attack with each Dancer Weapon; the save only if both hit.")]},
    "Wolf Fist Stance": {"activities": [strike("Wolf Fang Fist", dieSteps=1, attacks="lvl(1:2,10:3)", activation="action",
        text="5th: battle cry, allies within 30 ft get +1 (10th: +2) to their next attack or save.")]},
}

# ------------------------------------------------------------------------------------------ #
#  Class features and options                                                                #
# ------------------------------------------------------------------------------------------ #

FLOW_BOX = ("<aside class=\"n5e-box\"><p><b>Flow</b> (Will Amp)</p><p>Flow symbolizes you controlling and refining your chakra, making slight "
            "adjustments to it as the battle progresses.</p><p>You gain a +1 bonus to your Ninjutsu Save DC. This bonus increases to +2 at 11th "
            "level and +3 at 19th level.</p><p>When you being your turn in this state, you regain 1 Focus.</p><p>You make Concentration checks to "
            "maintain Ninjutsu at advantage.</p><p>You cannot benefit from Jutsu or features that boosts the damage you deal with Ninjutsu.</p></aside>")

FEATURES = {
    "Brutish Momentum": {"activities": [
        effect("Mark Combat Rival", target="targets", seconds=3600, state="combatRival", name="Combat Rival"),
        effect("Relentless Durability", expires="turnEnd", cost=SD, tempHp="@poolRoll * lvl(3:1,10:2,17:3)", oncePerTurn=True,
               activation="reaction", text="When you take damage.")]},
    "Chakra Compression": {"flags": {"castOption": {"label": "Chakra Compression (cost −rank)", "appliesTo": {"discipline": "nin", "activation": "action"},
        "oncePerTurn": True, "costDelta": "-rank"}}},
    "Chakra Surge": {"appendDescription": FLOW_BOX, "activities": [
        effect("Enter Crash", seconds=60, state="crash", exclusive="surge", ampType="will", name="Chakra Surge: Crash", activation="bonus"),
        effect("Enter Flow", [ch("n5e.saveDC.nin", "lvl(3:1,11:2,19:3)")], seconds=60, state="flow", exclusive="surge", ampType="will",
               name="Chakra Surge: Flow", activation="bonus")],
        "flags": {"castOption": {"label": "Crash: bonus damage", "requiresState": "crash", "auto": True,
            "appliesTo": {"discipline": "nin", "requiresDamage": True},
            "damage": {"formula": "lvl(3:1d10,7:2d10,11:3d10,15:4d10,19:5d10)", "halfForArea": True}}}},
    "Jack of All": {"flags": {"choice": {"label": "Generalization", "options": {"warfare": "Warfare", "seize": "Seize", "tactics": "Tactics"}}}},
    "Warfare": {"activities": [
        act("damage", "Warfare: attack bonus", damage={"parts": [{"formula": "lvl(2:1d8,11:2d8,20:3d8)", "type": ""}]}, cost={"pool": "superiorityDice", "amount": 1},
            oncePerTurn=True, text="Unarmed or weapon attack (half the dice, rounded up).")],
        "flags": {"castOption": {"label": "Warfare (+d8s, 1 Superiority Die)", "requiresChoice": {"feature": "jack-of-all", "value": "warfare"},
            "oncePerTurn": True, "cost": {"pool": "superiorityDice", "amount": 1},
            "damage": {"formula": "lvl(2:1d8,5:2d8,11:3d8,15:4d8,20:5d8)", "halfForArea": True}}}},
    "Seize": {"activities": [act("roll", "Seize: add to a contested check", cost=SD, roll={"formula": "", "note": "Add the Superiority Die to your contested check."})]},
    "Tactics": {"activities": [act("roll", "Tactics: skill action bonus", cost={"pool": "superiorityDice", "amount": 1},
        roll={"formula": "lvl(2:2,11:3,20:4)", "note": "Add this to the skill-based action's check."})]},
    "Switch Hitter": {"flags": {"choice": {"label": "Primary discipline", "options": {"nin": "Ninjutsu", "gen": "Genjutsu", "tai": "Taijutsu", "buki": "Bukijutsu"}}},
        "activities": [
            effect("Follow Up", target="targets", expires="nextTurnEnd", name="Follow Up",
                   text="+1 (11th +2, 19th +3) to hit or to your save DC against it with your next non-Primary jutsu."),
            effect("Set-Up (AC)", [ch("system.bonuses.ac", "lvl(2:-1,11:-2,19:-3)")], target="targets", expires="turnStart", name="Set-Up (AC)"),
            effect("Set-Up (saves)", [ch("system.bonuses.save", "lvl(2:-1,11:-2,19:-3)")], target="targets", expires="turnStart", name="Set-Up (saves)")]},
    "Meditation": {"activities": [act("heal", "Group meditation", heal={"formula": "lvl(5:1d8,11:2d8,17:3d8)", "pool": "cp"},
        text="You and participating allies (select their tokens); once per Short Rest each.")]},
    "Path of the Swift": {"effects": [("Boosted Athleticism", [ch("system.bonuses.speed", 10)])]},
    "Pyroclasm": {"activities": [
        act("save", "Detonate", damage={"parts": [{"formula": "(2*@amount)d6", "type": "fire"}]}, cost={"pool": "pyroclasm", "choose": True},
            **save("dex", "nin", [cond("burned", label="Burned")]), activation="action",
            text="10 ft around you. Failed save: the damage and 1 rank of Burned per Pyroclasm spent.")],
        "flags": {"castOptions": [
            {"label": "Hellrend (Pyroclasm)", "appliesTo": {"keywords": ["fireRelease"], "requiresDamage": True}, "cost": {"pool": "pyroclasm", "choose": True},
             "effect": {"name": "Hellrend (DR)", "target": "targets", "changes": [{"key": "n5e.dr", "value": "-2*@amount", "mode": 2}], "expires": "nextTurnEnd"}},
            {"label": "Devastation (1 Pyroclasm)", "appliesTo": {"keywords": ["fireRelease"], "requiresDamage": True}, "cost": {"pool": "pyroclasm", "amount": 1},
             "roll": "1d6", "note": "Maximize that many damage dice, halved (round down), minimum 1."}]}},
    "Limit Breaker": {"activities": [effect("Limit Breaker", expires="turnStart", cost=SD,
        text="Until your next turn: can't drop below 1 HP from attacks or jutsu; add the die to your first attack roll each turn; the first attack against you each turn has advantage. More uses before a rest cost +1 die each.")]},
    "Arresting Strike": {"activities": [act("save", "Arresting Strike", cost=SD, **save("str", "tai", [cond("prone", kind="state", label="Prone")]),
        text="Failed save: speed halved, Prone, standing also costs its Bonus Action until the end of its next turn.")]},
    "Menacing Assault": {"activities": [act("save", "Menacing Assault", cost=SD, **save("wis", "tai", [cond("demoralized", label="Demoralized")]),
        text="Creatures of your choice within 20 ft; failure: Demoralized ranks = half the Superiority Die.")]},
    "Rending Critical": {"activities": [effect("Rending Critical", [ch("system.bonuses.ac", "-floor(@poolRoll/2)"), ch("n5e.dr", "-floor(@poolRoll/2)")],
        target="targets", expires="turnStart", cost=SD, text="Your Combat Rival on a critical hit; it can't gain jutsu bonuses to AC or DR meanwhile.")]},
    "Staggering Will": {"activities": [act("roll", "Staggering Will", cost=SD, roll={"formula": "", "note": "Add the die to your failed save; if you now succeed, hostiles within 20 ft make a Wisdom save or are Dazed."})]},
    "Knock Back": {"activities": [act("roll", "Knock Back", cost=SD, roll={"formula": "", "note": "Push 10 ft × the die, ending Prone; 2d6 bludgeoning per structure it breaks through."})]},
    "Whirlwind Strike": {"activities": [act("roll", "Whirlwind Strike", cost=SD, roll={"formula": "", "note": "That many creatures within 10 ft: if your attack hits their AC, they take half the damage."})]},
    "Relentless Retaliation": {"activities": [act("roll", "Relentless Retaliation", cost={"pool": "superiorityDice", "amount": 2}, activation="reaction",
        roll={"formula": "", "note": "Attack or cast at the triggering creature; repeat on a hit or failed save (−4 to hit / +4 to its save, growing by 2)."})]},
    "Superior Momentum": {"activities": [act("roll", "Superior Momentum", cost={"pool": "superiorityDice", "amount": 2},
        roll={"formula": "", "note": "One extra action this turn to cast a jutsu of a different discipline. Each further use before a rest costs +1 die."})]},
    "Tenacious Ninjutsu": {"activities": [act("roll", "Tenacious Ninjutsu: clash bonus", activation="reaction",
        roll={"formula": "1d10", "note": "Add to your clash check; the DC to counter, dispel or interrupt this jutsu rises by 2."})]},
}

# ------------------------------------------------------------------------------------------ #
#  Feats                                                                                     #
# ------------------------------------------------------------------------------------------ #

FEATS = {
    "Illusionist Research": {"system": {"asi": {"options": ["int", "wis"], "amount": 1}, "grants": {"proficiencies": ["skill.ill"]}}},
    "Light Step Mastery": {"activities": [effect("Light Step: +1 AC", [ch("system.bonuses.ac", 1)], expires="turnStart", activation="reaction",
        text="When an attack misses you (light or no armor): move 10 ft without provoking; your next attack on it deals +1d6 (once per turn).")]},
    "Master of Disguise": {"system": {"grants": {"proficiencies": ["tool.disguise"]}}},
}

# ------------------------------------------------------------------------------------------ #
#  Jutsu                                                                                     #
# ------------------------------------------------------------------------------------------ #

JUTSU = {
    "Beast Fist: Forceful Bull": {"activities": [
        effect("Forceful Bull", [ch("system.abilities.str.value", 18, 4)], seconds=60, tempHp="8",
               text="Strength becomes 18 if lower; 8 temporary HP."),
        act("heal", "Refresh temporary HP", heal={"formula": "8", "pool": "tempHp"}, activation="bonus")]},
    "Fire Release: Fox Fire": {"activities": [
        act("attack", "Fox Fire attack", attack={"discipline": "nin", "range": "ranged", "count": 1}),
        effect("Glowing", target="targets", expires="nextTurnEnd", name="Glowing (Fox Fire)",
               text="On a hit: melee attacks against it have advantage.")]},
    "Glamor Tongue": {"activities": [effect("Glamor Tongue", target="targets", seconds=600, name="Glamor Tongue",
        text="Advantage on Make an Impression checks.")]},
}

PACKS = {"stances": STANCES, "features": FEATURES, "feats": FEATS, "jutsu": JUTSU}

# Class data: Focus's Short Rest recovery needs Tenketsu Refinement; Scholar's later Mastery ranks.
CLASS_PATCHES = {
    "Ninjutsu Specialist": {"poolRequires": {"focus": {"sr": "tenketsu-refinement"}},
                            "masteryAt": [(7, "Scholar: Ninshou Mastery", "skill.nin"), (13, "Scholar: Ninshou Mastery", "skill.nin")]},
}


def deep_merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v)
        else:
            dst[k] = copy.deepcopy(v)


def apply():
    changed = 0
    for pack, table in PACKS.items():
        for path in glob.glob(os.path.join(SRC, pack, "*.json")):
            if os.path.basename(path).startswith("_folder"):
                continue
            with open(path, encoding="utf-8") as f:
                doc = json.load(f)
            spec = table.get(doc["name"])
            if not spec:
                continue
            sysd = doc.setdefault("system", {})
            if "system" in spec:
                deep_merge(sysd, spec["system"])
            if "activities" in spec:
                sysd["activities"] = copy.deepcopy(spec["activities"])
            if "appendDescription" in spec and spec["appendDescription"] not in sysd.get("description", ""):
                sysd["description"] = sysd.get("description", "") + spec["appendDescription"]
            if "flags" in spec:
                doc.setdefault("flags", {}).setdefault("n5e", {}).update(copy.deepcopy(spec["flags"]))
            if "effects" in spec:
                keep = [e for e in doc.get("effects", []) if not e.get("flags", {}).get("n5e", {}).get("automation")]
                for label, changes in spec["effects"]:
                    e = transfer(doc["name"], label, changes)
                    e["_key"] = f"!items.effects!{doc['_id']}.{e['_id']}"
                    keep.append(e)
                doc["effects"] = keep
            with open(path, "w", encoding="utf-8") as f:
                json.dump(doc, f, indent=2, ensure_ascii=False)
                f.write("\n")
            changed += 1
    for path in glob.glob(os.path.join(SRC, "classes", "*.json")):
        if os.path.basename(path).startswith("_folder"):
            continue
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        spec = CLASS_PATCHES.get(doc.get("name"))
        if not spec:
            continue
        sysd = doc["system"]
        for pool in sysd.get("resourcePools", []):
            for rec in pool.get("recovery", []):
                req = spec.get("poolRequires", {}).get(pool.get("id"), {}).get(rec.get("on"))
                if req:
                    rec["requires"] = req
        adv = sysd.setdefault("advancement", [])
        for level, title, key in spec.get("masteryAt", []):
            aid = f"mastery-{level}-scholar"
            if not any(a.get("id") == aid for a in adv):
                adv.append({"id": aid, "level": level, "type": "mastery", "title": title, "uuids": [], "count": 1, "key": key,
                            "value": "", "branch": "", "chosen": []})
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)
            f.write("\n")
        changed += 1
    return changed


if __name__ == "__main__":
    print(f"automation applied to {apply()} documents")
