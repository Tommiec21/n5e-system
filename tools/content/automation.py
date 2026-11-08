#!/usr/bin/env python3
"""
Automation data for the imported content (0.7.1 automation pass).

Applied after build_content.py writes the books' text, and runnable on its own:
  python3 tools/content/automation.py

Each entry patches one document by pack + name: system fields (deep-merged), activities (replace the
text-parsed ones), transfer effects (applied while owned; a stance's only while it is the active
stance), flags (feature choices, cast options, stance die rules), and description additions.
The books' text is never rewritten.

Automating an item (recipe):
  1. Find its pack and exact name (packs/_source/<pack>/*.json "name").
  2. Add an entry to the matching table below (STANCES, FEATURES, FEATS, JUTSU) keyed by that name.
     Use the builders: strike() for attacks with a stepped die / extra dice / Pierce / several
     attacks, act("save", ...) + save() for saves with conditions, effect() for buffs and penalties
     (self or targets, with an ending), act("roll", ...) for "roll this and add it", act("heal", ...).
     "effects" (transfer, always on while owned; a stance's only while active) take (label, [ch(...)]).
     "flags" carry feature choices (choice) and cast-dialog options (castOption / castOptions).
  3. Run `python3 tools/content/automation.py`, then `npm test`.
  Level-scaled numbers: "lvl(1:1d8,5:2d8,11:3d8)". A rolled pool die: "@poolRoll". A chosen amount:
  "@amount". Effect keys: any n5e.* key (module/rules/change-keys.mjs) or system.bonuses.*.
  Activity fields are listed in module/data/fields/shared.mjs (activityFields): a field missing
  there is dropped when Foundry loads the item.
"""
import copy
import re
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
    """Activity (fields not given take the schema defaults). The id is derived from the label, so it is
    stable across runs; give activities on one item distinct labels."""
    a = {"id": make_id("activity", f"{label}:{kw.get('minLevel', 0)}")[:16], "type": type_, "label": label}
    a.update(kw)
    return a


def strike(label, kind="unarmed", minLevel=0, oncePerTurn=False, activation="", **s):
    """An Unarmed (kind="unarmed") or weapon (kind="weapon") strike. Strike options go in **s:
    dieSteps, extraDice ("@wdie" = one more weapon die), pierce, maximize, attacks. save=, inflicts=,
    text= and cost= are passed through to the activity instead."""
    extra = {k: s.pop(k) for k in ("save", "inflicts", "text", "cost") if k in s}
    return act("attack", label, minLevel=minLevel, oncePerTurn=oncePerTurn, activation=activation,
               attack={"discipline": "tai", "range": "melee", "count": 1}, strike={"kind": kind, **s}, **extra)


def save(ability, dc="tai", inflicts=None, resave=False, **kw):
    """Keyword arguments for a save activity: the ability, whose DC (nin/tai/gen), and what a failure
    offers to apply (a list of cond(...))."""
    return {"save": {"abilities": [ability], "dc": {"source": dc}, "onSuccess": "none", "resave": resave},
            "inflicts": inflicts or [], **kw}


def cond(key, ranks=1, kind="condition", label=None):
    """A condition (kind="condition", key from CONFIG.N5E.conditions) or state (kind="state") to apply."""
    return {"key": key, "kind": kind, "ranks": ranks, "label": label or key.capitalize()}


def effect(label, changes=None, target="self", expires="", seconds=0, **kw):
    """An effect activity. target: self | targets. expires: turnStart (until the start of your next
    turn) | turnEnd | nextTurnEnd, or seconds for a plain duration. Extra effect fields in **kw:
    tempHp, state, exclusive, ampType, name; everything else goes on the activity (cost, text...)."""
    return act("effect", label, effect={"name": kw.pop("name", label), "target": target, "changes": changes or [],
                                        "expires": expires, "seconds": seconds, **{k: kw.pop(k) for k in list(kw) if k in ("tempHp", "state", "exclusive", "ampType")}}, **kw)


def ch(key, value, mode=2):
    """An Active Effect change. mode 2 = ADD, 4 = UPGRADE, 5 = OVERRIDE (Foundry's numbering)."""
    return {"key": key, "value": str(value), "mode": mode}


def chk(skill, label=None, **kw):
    """A skill check button (Hunters Exploits: "Make a Perception check vs the target's AC")."""
    return act("check", label or f"{SKILL_LABELS.get(skill, skill)} check", check={"skill": skill}, **kw)


def gain(pool, label, amount=1, **kw):
    """A button that adds to a counter pool (Carnage, Momentum, Blight...), capped at its max."""
    return act("roll", label, cost={"pool": pool, "amount": amount, "gain": True}, roll={"formula": "", "note": kw.pop("note", "")}, **kw)


def spend(pool, label, amount=1, note="", formula="", roll=False, **kw):
    """A button that spends a pool and optionally rolls something (or the pool's die with roll=True)."""
    return act("roll", label, cost={"pool": pool, "amount": amount, **({"roll": True} if roll else {})},
               roll={"formula": formula, "note": note}, **kw)


def pool(pid, label, mx, die="", recovery=(("lr", "all", "", ""),)):
    """A resource pool definition for an item (system.resourcePools). recovery: (on, amount, formula, requires).
    on="event" makes it a counter that starts empty (gained during play)."""
    return {"id": pid, "label": label, "value": 0, "max": mx, "die": die, "steps": [], "step": 0,
            "recovery": [{"on": on, "amount": amt, "formula": f, "requires": req} for on, amt, f, req in recovery]}


COUNTER = (("event", "all", "", ""),)
SKILL_LABELS = {"acr": "Acrobatics", "ani": "Animal Handling", "ath": "Athletics", "cha": "Chakra Control", "dec": "Deception",
                "his": "History", "ill": "Illusions", "ins": "Insight", "itm": "Intimidation", "inv": "Investigation",
                "mar": "Martial Arts", "med": "Medicine", "nat": "Nature", "nin": "Ninshou", "prc": "Perception",
                "prf": "Performance", "per": "Persuasion", "slt": "Sleight of Hand", "ste": "Stealth", "sur": "Survival"}
SKILL_KEYS = {v.lower(): k for k, v in SKILL_LABELS.items()}


def transfer(item_name, label, changes, levels=None, stance=None):
    """A transfer effect stored on the item (applies to the owner). Marked automation=True so re-runs
    replace it without touching effects added by hand. levels=(min, max) limits it to those character
    levels (0 = no limit), read by module/documents/active-effect.mjs isSuppressed."""
    eid = make_id("effect", f"{item_name}:{label}")
    flags = {"automation": True}
    if levels:
        flags["levels"] = {"min": levels[0] or 0, "max": levels[1] or 0}
    if stance:
        flags["requiresStance"] = stance           # only while in a stance of this category
    return {"_id": eid, "name": label, "type": "generic", "img": "icons/svg/aura.svg", "transfer": True, "disabled": False,
            "system": {"category": "feature"}, "changes": [{**c, "priority": None} for c in changes], "duration": {},
            "description": "", "origin": None, "tint": "#ffffff", "statuses": [], "flags": {"n5e": flags}, "sort": 0}


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

# Classes imported 1-5 with build_class (Genjutsu Specialist, Hunter-Nin, Medical-Nin, Taijutsu
# Specialist, Weapon Specialist). Pools come from the class specs (tools/content/classes_spec.py);
# Martial Techniques, Katas and Skilled Exploits pay their pool through rules/resource-cost.mjs tags.
ACT = {"pool": "actualizationDice", "amount": 1}
FEATURES.update({
    # Genjutsu Specialist
    "Actualization": {
        "activities": [act("roll", "Actualization Die: skill check", cost={**ACT, "roll": True},
                           roll={"formula": "", "note": "Add it to a Deception, Insight, Perception or Persuasion check."})],
        "flags": {"castOptions": [
            {"label": "Actualization: +rank d6 damage (1 die)", "appliesTo": {"discipline": "gen", "requiresDamage": True},
             "cost": ACT, "damage": {"formula": "(@rankValue)d6"}},
            {"label": "Actualization: −1 to targets' save per die", "appliesTo": {"discipline": "gen"},
             "cost": {"pool": "actualizationDice", "choose": True}, "note": "Targets' saving throws −@amount."}]}},
    "Chakra Disruption": {"activities": [effect("Chakra Disruption", [ch("n5e.cost.all", "lvl(1:2,5:4,9:6,13:8,17:10)")], target="targets",
        expires="nextTurnEnd", oncePerTurn=True, name="Chakra Disruption (+cost)",
        text="Creatures affected by your Genjutsu: their next jutsu costs more.")]},
    # Hunter-Nin
    "Swift Response": {"effects": [("Swift Response: Initiative Mastery", [ch("n5e.mastery.initiative", "Swift Response", 2)])]},
    "Lethal Attack": {"activities": [
        act("damage", "Lethal Attack", damage={"parts": [{"formula": "(@scale.hunterNin.lethalAttack)d8", "type": ""}]}, oncePerTurn=True,
            text="On a hit with advantage, or with an ally within 5 ft of the target."),
        act("damage", "Lethal Attack (Attack action / weapon: half)", damage={"parts": [{"formula": "(ceil(@scale.hunterNin.lethalAttack/2))d8", "type": ""}]},
            oncePerTurn=True)]},
    "Primary Target": {"activities": [effect("Mark Primary Target", target="targets", seconds=3600, state="primaryTarget",
        name="Primary Target", text="Until it reaches 0 HP or you mark another creature.")]},
    # Medical-Nin
    "Medical Domain": {"activities": [
        act("roll", "Preserve Life", cost={"pool": "domainCharges", "amount": 1},
            roll={"formula": "", "note": "Healing dice equal to the jutsu's rank are treated as their maximum (in combat; not undead or constructs)."}),
        act("roll", "Sustain Life", cost={"pool": "domainCharges", "amount": 1}, activation="action",
            roll={"formula": "", "note": "Touch a willing creature: it regains CP equal to one of its Chakra Dice + its Con modifier, without spending the die (in combat)."}),
        act("damage", "Take Life", damage={"parts": [{"formula": "5 + @level", "type": ""}]}, cost={"pool": "domainCharges", "amount": 1},
            text="Added to a Medical jutsu's damage.")]},
    # Taijutsu Specialist
    "Martial Technique": {"effects": [("Martial Technique (AC)", [ch("system.attributes.ac.calc", "martialTechnique", 5)])]},
    "Enhanced Movement": {"effects": [("Enhanced Movement +10", [ch("system.bonuses.speed", 10)], (1, 4)),
                                      ("Enhanced Movement +15", [ch("system.bonuses.speed", 15)], (5, 10))]},
    # Weapon Specialist
    "Discipline": {"activities": [
        act("roll", "Deflection", cost={"pool": "discipline", "amount": 1}, activation="reaction",
            roll={"formula": "lvl(1:1d12,11:2d12,20:3d12)", "note": "Reduce the damage you take by this."}),
        act("damage", "Chakra Strike", damage={"parts": [{"formula": "lvl(1:1d12,5:2d12,11:3d12,15:4d12,20:5d12)", "type": ""}]},
            cost={"pool": "discipline", "amount": 1}, oncePerTurn=True, text="Added to a Bukijutsu's [Weapon Damage]; half the dice for areas (min 1)."),
        act("roll", "Chained Momentum", cost={"pool": "discipline", "amount": 1},
            roll={"formula": "", "note": "A non-Chain Bukijutsu gains Chain and maintains it (or 2 Discipline: raise or lower Chain by 1)."})]},
})

# ------------------------------------------------------------------------------------------ #
#  Class features, subclass features and options (0.8.1 pass)                                 #
#  Each entry automates what the text makes mechanical; the rest stays as the book's text.    #
# ------------------------------------------------------------------------------------------ #

AD = "actualizationDice"
MD = "martialDice"
DISC = "discipline"
def MIN_AMP(label, amp, state, **kw):
    """A 1-minute Bonus Action amplification state (Reality Shift, Ascension, Battle Trance...)."""
    return effect(label, seconds=60, state=state, ampType=amp, activation="bonus", **kw)

FEATURES.update({
    # ---- Genjutsu Specialist ---------------------------------------------------------------
    "Alteration of Reality": {"activities": [MIN_AMP("Enter Reality Shift", "will", "realityShift", name="Reality Shift",
        changes=[ch("n5e.saveDC.gen", 1)], cost={"pool": AD, "amount": 1},
        text="1 minute; Genjutsu save DC as AC and Wisdom saves are applied by hand. 10 minutes before reuse.")]},
    "Mental Refocus": {"activities": [gain(AD, "Regain 1 Actualization Die", note="Once per round, on succeeding a save against a hostile creature.")]},
    "Mind Over Matter": {"flags": {"castOption": {"label": "Mind Over Matter (with Actualization)", "appliesTo": {"discipline": "gen", "requiresDamage": True},
        "damage": {"formula": "@disciplines.gen.mod", "type": "psychic"}, "note": "Only when you use an Actualization effect on this Genjutsu."}}},
    "Rending Thoughts": {"activities": [
        act("save", "Rending Thoughts", activation="action", **save("wis", "gen")),
        act("damage", "Rending Thoughts: success", damage={"parts": [{"formula": "1d6", "type": "psychic"}]}),
        act("damage", "Rending Thoughts: failure", damage={"parts": [{"formula": "2d6", "type": "psychic"}]},
            text="Also a 1d4 penalty to its next attack roll before your next turn."),
        act("damage", "Rending Thoughts: critical failure", damage={"parts": [{"formula": "3d6", "type": "psychic"}]})]},
    "Phantasm": {"activities": [spend(AD, "Recharge a Phantasm ability", note="One of its Recharge abilities is ready again.")]},
    "Phantom Vapors": {"system": {"grants": {"proficiencies": ["tool.alchemist"]},
        "resourcePools": [pool("phantomVapors", "Phantom Vapor Charges", "1 + @prof", recovery=(("rest", "all", "", ""),))]},
        "activities": [spend("phantomVapors", "Throw a Phantom Vapor vial", activation="bonus", note="A thin cloud at a point within 30 ft (see the text)."),
                       gain("phantomVapors", "Recharge with 1 Actualization Die", note="Spend 1 Actualization Die (or 10 minutes) to regain a charge.")]},
    "Venom Strike Adept": {"activities": [spend("phantomVapors", "Coat a weapon in poison", note="Its damage becomes poison; Phantom Weapon and Hallucinatory Flurry are available.")]},
    "Hallucinatory Instrument": {"activities": [effect("Tune the Instrument", seconds=60, activation="bonus", name="Hallucinatory Instrument (tuned)",
        text="Auditory Genjutsu without an attack: Self 20-ft cone or 10-ft radius. 10 minutes before retuning.")]},
    "Illusory Weapon": {"activities": [
        act("attack", "Illusory Weapon (melee)", attack={"discipline": "gen", "range": "melee", "count": 1},
            damage={"parts": [{"formula": "1d8 + @disciplines.gen.mod", "type": "psychic"}]}),
        act("attack", "Illusory Weapon (ranged, 30 ft)", attack={"discipline": "gen", "range": "ranged", "count": 1},
            damage={"parts": [{"formula": "1d6 + @disciplines.gen.mod", "type": "psychic"}]})]},
    "Reality Marble": {"activities": [effect("Awaken the Reality Marble", seconds=60, activation="bonus", name="Reality Marble (awakened)",
        text="Each Genjutsu stores a Reality Mote; spend one to mark a reality relay.")]},
    "Temporal Stopwatch": {"activities": [
        spend(AD, "Shift initiative", roll=True, note="Raise or lower one creature's initiative by the roll (once per initiative)."),
        effect("Wind the Stopwatch", seconds=60, activation="bonus", name="Temporal Stopwatch (wound)",
               text="Once per turn, a Genjutsu cast also grants Dash or Disengage.")]},
    "Beguiling Influence": {"effects": [("Beguiling Influence", [ch("n5e.mastery.skill.dec", "Beguiling Influence"), ch("n5e.mastery.skill.per", "Beguiling Influence")])]},
    "Illusionary Vigor": {"effects": [("Illusionary Vigor", [ch("n5e.mastery.skill.ath", "Illusionary Vigor"), ch("n5e.mastery.skill.acr", "Illusionary Vigor")])]},
    "Demon Sight": {"effects": [("Demon Sight", [ch("system.traits.senses.darkvision", 120, 4)])]},
    "Cloak of Chains": {"activities": [effect("Cloak of Chains", seconds=60, activation="bonus", cost={"pool": AD, "amount": 1},
        text="5-ft aura: hostile creatures starting their turn in it take 4 psychic damage.")]},
    "Decelerate": {"activities": [act("save", "Decelerate", activation="action", **save("wis", "gen", [cond("slowed", label="Slowed")]),
        text="The creature spends its Reaction to repeat the save, ending it on a success.")]},
    "Book of Stolen Secrets": {"activities": [act("save", "Book of Stolen Secrets", **save("wis", "gen"))]},
    "Psyche Drinker": {"activities": [spend(AD, "Psyche Drinker", note="Gain the damage dealt as temporary HP until the end of your next turn (once per turn).")]},
    "Relentless Pain": {"activities": [spend(AD, "Relentless Pain", activation="reaction", note="Deal psychic damage equal to the damage you took.")]},
    "Muddled Movements": {"activities": [effect("Muddled Movements", [ch("system.bonuses.speed", -10)], target="targets", expires="nextTurnEnd",
        text="On a hit with a Genjutsu attack.")]},

    # ---- Hunter-Nin ------------------------------------------------------------------------
    "Warden’s Proficiency": {"system": {"grants": {"proficiencies": ["skill.ath", "skill.itm"]}}},
    "Brutal Proficiency": {"system": {"grants": {"proficiencies": ["skill.ath"]}}, "effects": [("Brutal Proficiency: speed", [ch("system.bonuses.speed", 10)])]},
    "Medical Proficiency": {"system": {"grants": {"proficiencies": ["skill.med", "tool.medicine"]}}},
    "Stalkers Proficiency": {"system": {"grants": {"proficiencies": ["skill.slt", "skill.dec"]}},
        "effects": [("Stalkers Proficiency: Blindsight", [ch("system.traits.senses.blindsight", 20, 4)])]},
    "Void Proficiency": {"system": {"grants": {"proficiencies": ["skill.nin"]}}},
    "Wolf’s Proficiency": {"system": {"grants": {"proficiencies": ["skill.mar", "skill.sur"]},
        "resourcePools": [pool("posture", "Posture", "3", recovery=COUNTER)]},
        "activities": [gain("posture", "Gain Posture", note="Once per turn, when you reduce or resist damage with a reaction feature or jutsu.")]},
    "Carnage": {"system": {"resourcePools": [pool("carnage", "Carnage", "3", recovery=COUNTER)]},
        "activities": [gain("carnage", "Gain Carnage", oncePerTurn=True, note="When you deal or take damage from a creature (Executioners Drive)."),
                       spend("carnage", "Guillotine Cleave", note="A melee weapon attack against every creature in reach."),
                       spend("carnage", "Butchers Momentum", note="On a hit: 30 ft of bonus movement.")]},
    "Decaying Compound": {"system": {"resourcePools": [pool("blackMedicineArray", "Black Medicine Array", "4", recovery=(("rest", "all", "", ""),))]},
        "activities": [spend("blackMedicineArray", "Infuse a jutsu", note="A Poison or Necrotic save jutsu gains a Decaying Compound effect."),
                       spend("blackMedicineArray", "Putrefy a weapon", activation="bonus")]},
    "Shadow stalker": {"system": {"resourcePools": [pool("dreadArsenal", "Dread Arsenal", "@prof",
        recovery=(("lr", "all", "", ""), ("sr", "formula", "2", "")))]},
        "activities": [spend("dreadArsenal", "Summon a Dread Weapon", activation="bonus", note="Lasts 1 minute; a W component for Shinobi Basics and Blade Bukijutsu.")]},
    "Shinobi’s Prosthetic": {"system": {"resourcePools": [pool("prostheticUses", "Prosthetic uses", "4", recovery=(("rest10m", "all", "", ""),))]},
        "activities": [spend("prostheticUses", "Use a Prosthetic Tool", note="No more than 4 times every 10 minutes.")]},
    "Void Anchor": {"activities": [effect("Place a Void Anchor", target="targets", seconds=60, activation="bonus", name="Void Anchor",
        text="Up to 4 at a time; the oldest fades when you place a fifth.")]},
    "Cunning Action": {"activities": [chk("ste", "Stealth (Hide/Sneak/Conceal, +2)", text="Add +2 for hiding, sneaking or concealing.")]},

    # ---- Medical-Nin -----------------------------------------------------------------------
    "Channeled Healing": {"flags": {"castOption": {"label": "Channeled Healing", "auto": True, "oncePerTurn": True,
        "appliesTo": {"keywords": ["medical"], "requiresHealing": True},
        "heal": {"formula": "@scale.medicalNin.channeledHealing", "pool": "hp"}}}},
    "Rejuvenating Rest": {"activities": [act("roll", "Rejuvenating Rest", roll={"formula": "lvl(1:1d6,5:2d6,10:3d6,15:4d6)",
        "note": "Add to the HP you and your allies regain at the end of a Short Rest."})]},
    "Talented Support": {"flags": {"castOptions": [
        {"label": "Talented Support: 4 temporary HP (no conditions)", "appliesTo": {"keywords": ["medical"]}, "heal": {"formula": "4", "pool": "tempHp"}},
        {"label": "Talented Support: cost −rank (target has a condition)", "appliesTo": {"keywords": ["medical"]}, "costDelta": "-rank"}]}},
    "Hematoxic Touch": {"flags": {"castOption": {"label": "Hematoxic Touch (+rank damage)", "auto": True,
        "appliesTo": {"keywords": ["medical"], "requiresDamage": True}, "damage": {"formula": "@rankValue"},
        "note": "Reroll 1s and 2s on its damage dice."}}},
    "Toxic Chakra": {"system": {"resourcePools": [pool("blight", "Blight", "3", recovery=COUNTER)]},
        "activities": [gain("blight", "Gain Blight", oncePerTurn=True, note="Bonus Action, or when you inflict Envenomed or Corroded."),
                       spend("blight", "Spend Blight", note="Septic Detonation and the other Blight abilities (Ninjutsu save DC).")]},
    "Healing Ascension": {"system": {"resourcePools": [pool("healingSurges", "Healing Surges", "3", recovery=COUNTER)]},
        "activities": [MIN_AMP("Enter Ascension", "will", "ascension", name="Ascension", text="In combat; 10 minutes of meditation before reuse."),
                       gain("healingSurges", "Gain a Healing Surge", oncePerTurn=True, note="When a jutsu you cast restores HP or grants temporary HP."),
                       spend("healingSurges", "Spend a Healing Surge", note="Battle Surge and the other Surge abilities.")]},
    "Transfigured Technique": {"activities": [
        effect("Transfigure an ally", target="targets", seconds=60, activation="bonus", ampType="fortitude", name="Transfigured",
               text="One ally at a time; pick its designation from the Transfiguration box."),
        act("save", "Transfigure an enemy", activation="bonus", **save("con", "nin"))]},
    "Yin Seal: Storage": {"system": {"resourcePools": [pool("byakugouSeals", "Byakugou Seals", "4", "d12", recovery=(("rest10m", "all", "", ""),))]},
        "activities": [effect("Enter Battle Medic", seconds=60, activation="bonus", state="battleMedic", name="Battle Medic",
                              text="In combat; 10 minutes before reuse."),
                       spend("byakugouSeals", "Spend a Byakugou Seal", roll=True, note="Crimson Lotus Missile and the other Battle Medic techniques."),
                       gain("byakugouSeals", "Regain a Byakugou Seal", oncePerTurn=True, note="On a melee unarmed or Taijutsu critical hit.")]},
    "Bladed Chakra Scalpel": {"activities": [
        effect("Coat your hands", seconds=60, activation="bonus", name="Chakra Scalpel", text="Attack action attacks become melee Ninjutsu attacks."),
        act("attack", "Chakra Scalpel", attack={"discipline": "nin", "range": "melee", "count": 1},
            damage={"parts": [{"formula": "1d8 + @scale.medicalNin.channeledHealing", "type": "slashing"}]})]},
    "Mystical Palm": {"activities": [effect("Mystical Palm", seconds=600, activation="bonus", name="Mystical Palm",
        text="For your next Medicine Kit activity.")]},

    # ---- Taijutsu Specialist ---------------------------------------------------------------
    "Chakra Valves": {"activities": [act("damage", "Sustained Pressure", damage={"parts": [{"formula": "1d6", "type": ""}]},
        cost={"pool": MD, "amount": 1}, text="This and every later unarmed attack this turn adds a Martial Die.")],
        "flags": {"castOption": {"label": "Valve Break (1 Martial Die: +rank Martial Dice)", "appliesTo": {"discipline": "tai", "requiresDamage": True},
            "cost": {"pool": MD, "amount": 1}, "damage": {"formula": "(@rankValue)d6"}, "note": "The first time you deal damage this turn."}}},
    "Path of The Tyrant": {"flags": {"castOption": {"label": "Brutal Taijutsu (+damage)", "appliesTo": {"discipline": "tai", "requiresDamage": True, "stance": "taijutsu"},
        "oncePerTurn": True, "auto": True, "damage": {"formula": "lvl(1:2,11:4)"}}}},
    "Path of The Genius": {"effects": [("The New Era: +1 Taijutsu DC", [ch("n5e.saveDC.tai", 1)], None, "taijutsu")],
        "flags": {"castOption": {"label": "Elite Taijutsu (+1 to hit)", "appliesTo": {"discipline": "tai", "stance": "taijutsu"}, "oncePerTurn": True, "auto": True,
            "note": "+1 to its attack rolls."}}},
    "Path of The Savage": {"flags": {"castOption": {"label": "Devastating Taijutsu (+1 crit range)", "appliesTo": {"discipline": "tai", "stance": "taijutsu"},
        "oncePerTurn": True, "auto": True, "note": "+1 critical threat range on this Taijutsu."}}},
    "Path of The Predator": {"activities": [effect("Can't Run", [ch("system.bonuses.speed", -5)], target="targets", expires="nextTurnEnd",
        text="Each time you deal unarmed damage to it.")],
        "flags": {"castOption": {"label": "Furious Taijutsu (DR −2 per hit)", "appliesTo": {"discipline": "tai", "requiresDamage": True, "stance": "taijutsu"},
            "oncePerTurn": True, "auto": True,
            "effect": {"name": "Furious (DR)", "target": "targets", "changes": [{"key": "n5e.dr", "value": "-2", "mode": 2}], "expires": "nextTurnEnd"}}}},
    "Path of The Hero": {"flags": {"castOption": {"label": "Protective Taijutsu (ally +1 AC)", "appliesTo": {"discipline": "tai", "stance": "taijutsu"},
        "oncePerTurn": True, "auto": True,
        "effect": {"name": "Protected (+AC)", "target": "targets", "changes": [{"key": "system.bonuses.ac", "value": "1", "mode": 2}], "expires": "turnStart"},
        "note": "An ally within 10 ft gains +1 AC per instance of damage (max +2): target the ally."}}},
    "Path of The Technician": {"flags": {"castOption": {"label": "Technical Taijutsu", "appliesTo": {"discipline": "tai", "stance": "taijutsu"},
        "oncePerTurn": True, "note": "Martial Arts checks in place of Chakra Control to keep its concentration."}}},
    "Arresting Technique": {"activities": [act("save", "Arresting Technique", **save("dex", "tai", [cond("prone", kind="state", label="Prone")]),
        text="Failure: speed 0 and Prone until the start of your next turn.")]},
    "Forceful Strike": {"activities": [act("save", "Forceful Strike", **save("str", "tai")),
        act("roll", "Push distance", roll={"formula": "5 * 1d6", "note": "Feet pushed on a failure (1d6 per bludgeoning per 5 ft short if stopped)."})]},
    "Drowsy Strike": {"activities": [act("roll", "Drowsy Strike", roll={"formula": "1d6 * 10", "note": "At or above its current HP: unconscious for 10 minutes."})]},
    "Martial Guard": {"activities": [act("roll", "Martial Guard", activation="reaction", roll={"formula": "1d6", "note": "Reduce the triggering damage by this."})]},
    "Parry The Shot": {"activities": [act("roll", "Parry The Shot", activation="reaction", cost={"pool": MD, "choose": True},
        roll={"formula": "(@amount)d6 + @level", "note": "Reduce the damage taken by this (up to 3 Martial Dice)."})]},
    "Delayed Fall": {"activities": [act("roll", "Delayed Fall", cost={"pool": MD, "choose": True},
        roll={"formula": "(@amount)d6 * 2", "note": "Fewer falling damage dice by this many (up to 3 Martial Dice)."})]},
    "Precise Technique": {"flags": {"castOption": {"label": "Precise Technique (+1 to hit per die)", "appliesTo": {"discipline": "tai"},
        "cost": {"pool": MD, "choose": True}, "note": "+@amount to hit."}}},
    "Raw Technique": {"flags": {"castOption": {"label": "Raw Technique (+1 DC per die)", "appliesTo": {"discipline": "tai"},
        "cost": {"pool": MD, "choose": True}, "note": "+@amount to its DC."}}},
    "Technical Technique": {"flags": {"castOption": {"label": "Technical Technique (1 Martial Die)", "appliesTo": {"discipline": "tai"},
        "cost": {"pool": MD, "amount": 1}, "roll": "1d6", "note": "Concentration upkeep reduced by half the roll."}}},
    "Shockwave Strike": {"flags": {"castOption": {"label": "Shockwave Strike (1 Martial Die)", "appliesTo": {"discipline": "tai"},
        "cost": {"pool": MD, "amount": 1}, "note": "Creatures within 5 ft of the target: Dexterity save or half the damage."}}},
    "Quivering Strike": {"activities": [act("save", "Quivering Strike", damage={"parts": [{"formula": "5d6", "type": "bludgeoning"}], "ignoreDR": True},
        **save("con", "tai", resave=True), text="At the end of each of its turns; can't be reduced; a success ends it.")]},
    "Regenerative Surge": {"activities": [act("heal", "Regenerative Surge", heal={"formula": "2d6 + @disciplines.tai.mod", "pool": "hp"},
        activation="bonus", text="Once per rest.")]},
    "Hurricane Strikes": {"activities": [strike("Hurricane Strikes", extraDice="4d6", activation="action", cost={"pool": MD, "amount": 4},
        **save("con", "tai", [cond("staggered", label="Staggered")]), text="One roll against up to 4 creatures, then teleport next to one.")]},
    "Step of Savagery": {"activities": [act("save", "Step of Savagery", cost={"pool": MD, "choose": True},
        damage={"parts": [{"formula": "@unarmed + (@amount)d6", "type": "bludgeoning"}]}, **save("dex", "tai", [cond("prone", kind="state", label="Prone")]),
        activation="action", text="Up to 4 Martial Dice; creatures in the line are dragged along.")]},
    "Bone Breaker": {"activities": [act("save", "Bone Breaker", **save("str", "tai")),
        effect("Bone Broken", target="targets", expires="turnStart", name="Bone Broken", text="On a failed save (ends at the end of its turn).")]},
    "Balance Breaker": {"activities": [act("save", "Balance Breaker", **save("con", "tai")),
        effect("Balance Broken", target="targets", expires="turnStart", name="Balance Broken", text="On a failed save (ends at the end of its turn).")]},
    "Flow Breaker": {"activities": [act("save", "Flow Breaker", **save("dex", "tai")),
        effect("Flow Broken", target="targets", expires="turnStart", name="Flow Broken", text="On a failed save (ends at the end of its turn).")]},
    "Disturbance Flurry": {"system": {"resourcePools": [pool("momentum", "Momentum", "4", recovery=COUNTER)]},
        "activities": [gain("momentum", "Gain Momentum", oncePerTurn=True, note="When you deal unarmed damage; lasts 1 minute."),
                       spend("momentum", "Blitzing Momentum", note="+10 speed; move 10 ft with each reaction until your next turn.")]},
    "Never Ending Combo": {"system": {"resourcePools": [pool("tempo", "Tempo", "3", recovery=COUNTER)]},
        "activities": [gain("tempo", "Gain Tempo", note="Each Combo Taijutsu in DYNAMIC FORM!; lose 1 at the end of a turn without one.")]},
    "Genius Talent": {"system": {"resourcePools": [pool("perfection", "Perfection", "4", recovery=COUNTER)]},
        "activities": [gain("perfection", "Gain Perfection", oncePerTurn=True, note="When you spend at least 1 Martial Die (Flawless state)."),
                       spend("perfection", "Spend Perfection", amount=2, note="Flawless Disturbance and the other Perfection abilities.")]},
    "Nature enhanced Combat": {"activities": [MIN_AMP("Enter Elemental Cloak", "fortitude", "elementalCloak", name="Elemental Cloak",
        cost={"pool": MD, "amount": 1}, text="10 minutes of meditation before reuse.")]},

    # ---- Weapon Specialist -----------------------------------------------------------------
    "Eye for Skill": {"activities": [chk("mar", "Eye for Skill: Martial Arts check", activation="bonus", text="Against the creature's Level DC.")]},
    "Critical Focus": {"effects": [("Critical Focus", [ch("n5e.critRange.buki", 1)])]},
    "Enduring Augmentation": {"activities": [spend(DISC, "Enduring Augmentation", amount=2, note="Advantage on this Strength or Constitution save.")]},
    "Psyche Augmentation": {"activities": [spend(DISC, "Psyche Augmentation", amount=2, note="Advantage on this Wis/Cha save against a Genjutsu or mental effect.")]},
    "Tactical Augmentation": {"activities": [spend(DISC, "Tactical Augmentation", note="Advantage on this Intelligence or Wisdom skill check.")]},
    "Mobile Augmentation": {"activities": [spend(DISC, "Mobile Augmentation", formula="5 * 1d12", note="Extra speed (feet); Dash as a Bonus Action this turn.")]},
    "Restorative Augmentation": {"activities": [act("heal", "Restorative Augmentation", heal={"formula": "lvl(1:1d12,9:2d12,15:3d12)", "pool": "hp"},
        activation="bonus", cost={"pool": DISC, "amount": 1}, text="In combat; not again until the end of your next turn.")]},
    "Sensory Augmentation": {"activities": [effect("Sensory Augmentation", [ch("system.traits.senses.blindsight", 30, 4)], expires="turnStart",
        cost={"pool": DISC, "amount": 1}, text="Blindsight shown; pick Tremor Sense instead if you prefer. Out of combat it lasts 1 minute.")]},
    "Battle Boast": {"activities": [act("save", "Battle Boast", **save("wis", "tai"), text="Hostile creatures in a 20-ft cone.")]},
    "Disorienting Strike": {"activities": [act("save", "Disorienting Strike", **save("wis", "tai", resave=True), text="Pick one of the three effects for 1 minute.")]},
    "Horrid Aggression": {"activities": [act("save", "Horrid Aggression", **save("str", "tai",
        [cond("bruised", label="Bruised"), cond("weakened", label="Weakened"), cond("dazzled", label="Dazzled"), cond("concussed", label="Concussed")]),
        text="Pick one condition on a failure.")]},
    "Muted Strike": {"activities": [act("save", "Muted Strike", **save("con", "tai"), text="Failure: no jutsu of D-Rank or lower until the end of its next turn.")]},
    "Battle Medic": {"activities": [act("roll", "Battle Medic", roll={"formula": "2d12", "note": "10+: remove 1 Physical condition rank; doubles remove all ranks."})]},
    "Persistent Will": {"activities": [act("roll", "Persistent Will", roll={"formula": "1d12", "note": "Add to your concentration check."})]},
    "Pressure Build": {"activities": [effect("Pressure Build", [ch("n5e.dr", 1)], expires="turnStart", text="+1 DR for each instance of [Weapon Damage] you deal.")]},
    "Unbound Ferocity": {"activities": [effect("Unbound Ferocity", target="targets", expires="turnStart", name="Unbound Ferocity",
        text="You have advantage on Taijutsu attacks against it; it has advantage against you.")]},
    "Elite Focus": {"activities": [effect("Elite Focus", seconds=60, activation="bonus", name="Elite Focus",
        text="Concentration as a B-Rank jutsu; pick two benefits; 2 Discipline at the start of each turn.")]},
    "Hidden hand": {"effects": [("Hidden Hand", [ch("n5e.mastery.skill.ste", "Hidden Hand")])]},
    "Efficient Bukijutsu": {"flags": {"castOption": {"label": "Efficient Bukijutsu (1 Discipline: cost −rank)", "appliesTo": {"discipline": "buki"},
        "oncePerTurn": True, "cost": {"pool": DISC, "amount": 1}, "costDelta": "-rank"}}},
    "Disciplined Illusions": {"activities": [act("roll", "Gain Discipline (Genjutsu)", cost={"pool": DISC, "choose": True, "gain": True},
        roll={"formula": "", "note": "D/C-Rank 1, B/A-Rank 2, S-Rank 3."})]},
    "Disciplined Ninshou": {"activities": [act("roll", "Gain Discipline (Ninjutsu)", cost={"pool": DISC, "choose": True, "gain": True},
        roll={"formula": "", "note": "D/C-Rank 1, B/A-Rank 2, S-Rank 3."})]},
    "Disciplined Strikes": {"activities": [act("roll", "Gain Discipline (attacks)", cost={"pool": DISC, "choose": True, "gain": True},
        roll={"formula": "", "note": "1 per attack made with the Attack action."})]},
    "Disciplined Maneuvers": {"activities": [gain(DISC, "Gain Discipline (skill action)", note="Once per turn (2 at 11th, 3 at 20th).")]},
    "Efficient Chain": {"activities": [act("roll", "Gain Discipline (sustained Chain)", cost={"pool": DISC, "choose": True, "gain": True},
        roll={"formula": "", "note": "Equal to the Chain rank you sustained."})]},
    "Fang Breaker Fury": {"activities": [MIN_AMP("Enter Battle Trance", "battle", "battleTrance", name="Battle Trance",
        cost={"pool": DISC, "amount": 1}, text="10 minutes before reuse (or +1 Discipline per extra use).")]},
    "Dazzling Dances": {"activities": [
        effect("Waltz", seconds=60, activation="bonus", state="waltz", exclusive="dance", ampType="battle", name="Waltz"),
        effect("Samba", seconds=60, activation="bonus", state="samba", exclusive="dance", ampType="battle", name="Samba")]},
    "Converging Vector": {"activities": [effect("Vector Seal", target="targets", seconds=60, activation="bonus", cost={"pool": DISC, "amount": 1},
        name="Vector Seal", text="One at a time.")]},
    "Reavers Quarry": {"activities": [effect("Mark your Quarry", target="targets", seconds=60, activation="bonus", state="quarry", name="Quarry",
        text="+1 [Weapon Damage] against it (+2 at 10th, +3 at 17th).")]},
    "Obsidian Ward": {"system": {"resourcePools": [pool("obsidianWard", "Obsidian Ward", "11 + @level", recovery=(("sr", "all", "", ""), ("lr", "all", "", "")))]},
        "activities": [act("roll", "Ward Restoration", roll={"formula": "lvl(3:1d12,10:2d12,17:3d12)", "note": "The ward regains this (when you spend Discipline, once per turn)."})]},
    "Warden Techniques": {"activities": [effect("Provoke", target="targets", expires="turnStart", cost={"pool": DISC, "amount": 1}, name="Provoked")]},
    "Savage Assault": {"activities": [act("save", "Okuri-Inu Fang", cost={"pool": DISC, "amount": 2}, **save("str", "tai", [cond("shaken", label="Shaken")]))]},
})

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


def skilled_exploit(doc):
    """Hunters Exploits of type "Skilled Exploit": a check button for the skill named on the "Skill:"
    line, with the activation the text names. Combat exploits keep the text parser's buttons."""
    tags = doc.get("system", {}).get("tags", [])
    if "hunter-exploit" not in tags:
        return None
    text = re.sub(r"<[^>]+>", " ", doc["system"].get("description", ""))
    if not re.search(r"Exploit Type:\s*Skilled", text):
        return None
    m = re.search(r"Skill:\s*([A-Za-z ]+?)\s{2,}", text)
    key = SKILL_KEYS.get(m.group(1).strip().lower()) if m else None
    if not key:
        return None
    low = text.lower()
    activation = "reaction" if "as a reaction" in low else "bonus" if "bonus action" in low else "action" if "as an action" in low else ""
    return {"activities": [chk(key, f"{doc['name']}: {SKILL_LABELS[key]} check", activation=activation)]}


def deep_merge(dst, src):
    """Merge src into dst recursively (dicts merge; anything else replaces)."""
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v)
        else:
            dst[k] = copy.deepcopy(v)


def apply():
    """Patch every document named in the tables, plus the class patches. Idempotent."""
    changed = 0
    for pack, table in PACKS.items():
        for path in glob.glob(os.path.join(SRC, pack, "*.json")):
            if os.path.basename(path).startswith("_folder"):
                continue
            with open(path, encoding="utf-8") as f:
                doc = json.load(f)
            spec = table.get(doc["name"])
            if not spec and pack == "features":
                spec = skilled_exploit(doc)
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
                for entry in spec["effects"]:
                    # (label, changes[, (minLevel, maxLevel)[, stance category]])
                    label, changes, levels, stance = (*entry, None, None)[:4]
                    e = transfer(doc["name"], label, changes, levels, stance)
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
