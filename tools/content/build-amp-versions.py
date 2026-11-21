#!/usr/bin/env python3
"""AMP1g (King 2026-11-20): every Amp that grows by level is a separate card per version.

"Anytime an Amp would upgrade/grow in power, there should be a separate version of these amps."
King Q-G1: the level is character level. Q-G2: versions are named "[Name] (level)".

Run after build-amp-cards.py and build-clan-amp-cards.py. For each card in VERSIONS:
  - the base card keeps its key and name and shows the numbers of its first version only;
  - each later version is a new card "<key>-<level>", named "<Name> (<level>th)", with
    system.series = the base key and system.level = the level it starts at;
  - text: SUBS lists, per growing line, the text of each version (None: line unchanged, "": line
    removed). A key starting with "^" matches a whole line by its start. Summary and notes too.
  - level-scaled values (lvl(...)) in changes and rules become the version's fixed number;
  - ADD gives a version extra changes (Mastery ranks).
The Amps panel and the feature buttons offer the highest version a character's level reaches
(rules/amp-cards.mjs ampVersionFor).

Idempotent: the base cards are rebuilt by the card builders; this script rewrites from them.
"""
import copy
import glob
import hashlib
import html
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AMPS = os.path.join(ROOT, "packs/_source/amps")

KEEP = "\x00keep"  # the original line, unchanged, in this version
CRASH_DICE = ["+1d10", "+2d10", "+3d10", "+4d10", "+5d10"]
CRASH_NOTE = "+1d10 damage (2d10 at 7th, 3d10 at 11th, 4d10 at 15th, 5d10 at 19th; half the dice for an area)"
CRASH_NOTE_V = [f"{d} damage (half the dice for an area)" for d in CRASH_DICE]


def mastery(target, label):
    return {"key": f"n5e.mastery.{target}", "value": label, "mode": 2}


# key: {tiers: [base level, later levels...], subs: [(old, [text per tier])], add: {level: [changes]}}
VERSIONS = {
    "ascension": dict(tiers=[1, 10], subs=[
        ("1 Hit Die + their Constitution Modifier (2 Hit Die at 10th level)", ["1 Hit Die + their Constitution Modifier", "2 Hit Die + their Constitution Modifier"]),
        ("1 Hit Die + Con (2 Hit Die at 10th)", ["1 Hit Die + Con", "2 Hit Die + Con"])]),
    "battle-medic": dict(tiers=[1, 6, 10], subs=[
        ("+1 bonus to their critical threat range. This becomes +2 at 10th level.", ["+1 bonus to their critical threat range.", None, "+2 bonus to their critical threat range."]),
        ("of D-Rank or lower gain the Medical keyword. This becomes C-Rank at 6th and B-Rank at 10th level.",
         ["of D-Rank or lower gain the Medical keyword.", "of C-Rank or lower gain the Medical keyword.", "of B-Rank or lower gain the Medical keyword."]),
        ("Taijutsu you cast of D-Rank or lower gain the Medical keyword (C-Rank at 6th, B-Rank at 10th).",
         ["Taijutsu you cast of D-Rank or lower gain the Medical keyword.", "Taijutsu you cast of C-Rank or lower gain the Medical keyword.", "Taijutsu you cast of B-Rank or lower gain the Medical keyword."]),
        ("+1 critical range on unarmed and Taijutsu (+2 at 10th)", ["+1 critical range on unarmed and Taijutsu", None, "+2 critical range on unarmed and Taijutsu"])]),
    "battle-trance": dict(tiers=[1, 6, 10, 14, 17], subs=[
        ("You have resistance to one damage type of your choice, which you pick when you enter Battle Trance. This increases to two choices at 10th and three choices at 17th.",
         ["You have resistance to one damage type of your choice, which you pick when you enter Battle Trance."] * 2
         + ["You have resistance to two damage types of your choice, which you pick when you enter Battle Trance."] * 2
         + ["You have resistance to three damage types of your choice, which you pick when you enter Battle Trance."]),
        ("^Level 6 — Frenzied Assault.", ["",
         "Frenzied Assault. When you deal damage with an attack or Bukijutsu that uses Polearm or Flail weapons, you add +2 damage. At the start of your turn, you can forgo this damage bonus to gain advantage on the first attack you make that uses a Polearm or Flail weapon.",
         "Frenzied Assault. When you deal damage with an attack or Bukijutsu that uses Polearm or Flail weapons, you add +2 damage. At the start of your turn, you can forgo this damage bonus to gain advantage on the first attack you make that uses a Polearm or Flail weapon.",
         "Frenzied Assault. When you deal damage with an attack or Bukijutsu that uses Polearm or Flail weapons, you add +4 damage. At the start of your turn, you can forgo this damage bonus to gain advantage on the first attack you make that uses a Polearm or Flail weapon.",
         "Frenzied Assault. When you deal damage with an attack or Bukijutsu that uses Polearm or Flail weapons, you add +4 damage. At the start of your turn, you can forgo this damage bonus to gain advantage on the first attack you make that uses a Polearm or Flail weapon."]),
        ("resistance to one damage type you pick on entering (two at 10th, three at 17th)",
         ["resistance to one damage type you pick on entering"] * 2 + ["resistance to two damage types you pick on entering"] * 2 + ["resistance to three damage types you pick on entering"]),
        ("^6th level: forgo Frenzied Assault", ["", "Forgo Frenzied Assault at the start of your turn for advantage on your first Polearm or Flail attack. Frenzy Roar (Reaction, 2 Discipline) and Undying Frenzy (3 Discipline: drop to 1 HP instead, ending the trance) are on the feature."] + [None] * 3),
        ("resistance to damage types you pick; from 6th, +2 (+4 at 14th) Polearm and Flail damage.",
         ["resistance to one damage type you pick.", "resistance to one damage type you pick; +2 Polearm and Flail damage.", "resistance to two damage types you pick; +2 Polearm and Flail damage.",
          "resistance to two damage types you pick; +4 Polearm and Flail damage.", "resistance to three damage types you pick; +4 Polearm and Flail damage."])]),
    "chakra-surge-crash": dict(tiers=[1, 7, 11, 15, 19], subs=[
        ("you gain a +1d10 bonus to damage you deal with Ninjutsu you cast. This increases to +2d10 at 7th, 3d10 at 11th, 4d10 at 15th and 5d10 at 19th level.",
         [f"you gain a {d} bonus to damage you deal with Ninjutsu you cast." for d in CRASH_DICE]),
        (CRASH_NOTE, CRASH_NOTE_V)]),
    "chakra-surge-flow": dict(tiers=[1, 11, 19], subs=[
        ("You gain a +1 bonus to your Ninjutsu Save DC. This bonus increases to +2 at 11th level and +3 at 19th level.",
         ["You gain a +1 bonus to your Ninjutsu Save DC.", "You gain a +2 bonus to your Ninjutsu Save DC.", "You gain a +3 bonus to your Ninjutsu Save DC."]),
        ("+1 Ninjutsu save DC (+2 at 11th, +3 at 19th)", ["+1 Ninjutsu save DC", "+2 Ninjutsu save DC", "+3 Ninjutsu save DC"])]),
    "crash-duality": dict(tiers=[1, 11, 19], subs=[
        ("you gain a +1d10 bonus to damage you deal with Ninjutsu you cast. This increases to +2d10 at 11th, and 3d10 at 19th level.",
         ["you gain a +1d10 bonus to damage you deal with Ninjutsu you cast.", "you gain a +2d10 bonus to damage you deal with Ninjutsu you cast.", "you gain a +3d10 bonus to damage you deal with Ninjutsu you cast."]),
        ("+1d10 Ninjutsu damage (2d10 at 11th, 3d10 at 19th)", ["+1d10 Ninjutsu damage", "+2d10 Ninjutsu damage", "+3d10 Ninjutsu damage"])]),
    "flow-duality": dict(tiers=[1, 15], subs=[
        ("You gain a +1 bonus to your Ninjutsu Save DC. This bonus increases to +2 at 15th level.", ["You gain a +1 bonus to your Ninjutsu Save DC.", "You gain a +2 bonus to your Ninjutsu Save DC."]),
        ("+1 Ninjutsu save DC (+2 at 15th)", ["+1 Ninjutsu save DC", "+2 Ninjutsu save DC"])]),
    "crash-overheat": dict(tiers=[1, 7, 10, 11, 15, 18, 19], subs=[
        ("gain a +2 bonus to the damage it deals. This increases to +4 at 10th level and +6 at 18th level.",
         ["gain a +2 bonus to the damage it deals."] * 2 + ["gain a +4 bonus to the damage it deals."] * 3 + ["gain a +6 bonus to the damage it deals."] * 2),
        ("+2 Fire Release Ninjutsu damage (+4 at 10th, +6 at 18th)", ["+2 Fire Release Ninjutsu damage"] * 2 + ["+4 Fire Release Ninjutsu damage"] * 3 + ["+6 Fire Release Ninjutsu damage"] * 2),
        ("+2 (+4 at 10th, +6 at 18th) damage on Fire Release Ninjutsu", ["+2 damage on Fire Release Ninjutsu"] * 2 + ["+4 damage on Fire Release Ninjutsu"] * 3 + ["+6 damage on Fire Release Ninjutsu"] * 2),
        (CRASH_NOTE, [CRASH_NOTE_V[0], CRASH_NOTE_V[1], CRASH_NOTE_V[1], CRASH_NOTE_V[2], CRASH_NOTE_V[3], CRASH_NOTE_V[3], CRASH_NOTE_V[4]])]),
    "flash": dict(tiers=[1, 9], subs=[
        ("You gain a +1 bonus to your Dexterity saving throws and your AC. This increases to +2 at 9th level.",
         ["You gain a +1 bonus to your Dexterity saving throws and your AC.", "You gain a +2 bonus to your Dexterity saving throws and your AC."]),
        ("+1 to Dexterity saves and AC (+2 at 9th)", ["+1 to Dexterity saves and AC", "+2 to Dexterity saves and AC"])]),
    "elemental-cloak": dict(tiers=[1, 10, 17], subs=[
        ("^Earth Release: You gain +4 DR.", ["Earth Release: You gain +4 DR. This DR cannot be reduced by any means.",
         "Earth Release: You gain +4 DR. This DR cannot be reduced by any means. You gain 30 feet of tremor sense.",
         "Earth Release: You gain +6 DR. This DR cannot be reduced by any means. You gain 30 feet of tremor sense."]),
        ("^Wind Release: You gain a +1 Bonus to AC", ["Wind Release: You gain a +1 Bonus to AC, and damage you deal with Taijutsu penetrates 2 of a creature's DR.",
         "Wind Release: You gain a +1 Bonus to AC, and damage you deal with Taijutsu penetrates 2 of a creature's DR. You have immunity to the Grappled and Restrained conditions.",
         "Wind Release: You gain a +2 Bonus to AC, and damage you deal with Taijutsu penetrates 4 of a creature's DR. You have immunity to the Grappled and Restrained conditions."]),
        ("^Fire Release: You gain a rank of Mastery", ["Fire Release: You gain a rank of Mastery to [Unarmed Damage].", "Fire Release: You gain two ranks of Mastery to [Unarmed Damage].", "Fire Release: You gain three ranks of Mastery to [Unarmed Damage]."]),
        ("^Water Release: Your unarmed attacks gain", ["Water Release: Your unarmed attacks gain the Reach 1 and Trip weapon properties.",
         "Water Release: Your unarmed attacks gain the Reach 1 and Trip weapon properties. The first time each turn you deal [Unarmed Damage] to a creature you can move them up to 10 feet in any direction of your choice.",
         "Water Release: Your unarmed attacks gain the Reach 1 and Trip weapon properties. The first time each turn you deal [Unarmed Damage] to a creature you can move them up to 10 feet in any direction of your choice. Creatures cannot gain jutsu based bonuses to their saving throws vs Taijutsu you cast."]),
        ("^Lightning Release: Your unarmed and Taijutsu attacks", ["Lightning Release: Your unarmed and Taijutsu attacks gain a +1 bonus to their critical threat range and a +10 to speed.",
         "Lightning Release: Your unarmed and Taijutsu attacks gain a +1 bonus to their critical threat range and a +10 to speed. When you score a critical with an unarmed attack, you may add 1 unarmed damage die to the result.",
         "Lightning Release: Your unarmed and Taijutsu attacks gain a +1 bonus to their critical threat range and a +10 to speed. When you score a critical with an unarmed attack, you may add 1 unarmed damage die to the result. [Unarmed Damage] you deal cannot have its damage intercepted."]),
        ("^Earth: +4 DR that can't be reduced", [
         "Earth: +4 DR that can't be reduced. Wind: +1 AC and Taijutsu pierce 2 DR. Fire: a rank of Mastery to [Unarmed Damage]. Water: unarmed attacks gain Reach 1 and Trip. Lightning: +1 critical range on unarmed and Taijutsu and +10 speed.",
         "Earth: +4 DR that can't be reduced; 30 ft tremor sense. Wind: +1 AC and Taijutsu pierce 2 DR; immune to Grappled and Restrained. Fire: two ranks of Mastery to [Unarmed Damage]. Water: unarmed attacks gain Reach 1 and Trip; push 10 ft the first time each turn. Lightning: +1 critical range on unarmed and Taijutsu and +10 speed; +1 unarmed die on a crit.",
         "Earth: +6 DR that can't be reduced; 30 ft tremor sense. Wind: +2 AC and Taijutsu pierce 4 DR; immune to Grappled and Restrained. Fire: three ranks of Mastery to [Unarmed Damage]. Water: unarmed attacks gain Reach 1 and Trip; push 10 ft the first time each turn; no jutsu bonuses to saves vs your Taijutsu. Lightning: +1 critical range on unarmed and Taijutsu and +10 speed; +1 unarmed die on a crit; your [Unarmed Damage] can't be intercepted."])]),
    # Clan Amps (character level).
    "apex-predator": dict(tiers=[1, 7, 11, 15], subs=[
        ("increase the damage they take from you by +2. This increases to +4 at 7th level and +6 at 15th levels",
         ["increase the damage they take from you by +2", "increase the damage they take from you by +4", "increase the damage they take from you by +4", "increase the damage they take from you by +6"]),
        ("increase Temporary Hit points gained from allied or self-sourced effects by +4. This increases to +6 at 7th level and +8 at 15th level.",
         ["increase Temporary Hit points gained from allied or self-sourced effects by +4.", "increase Temporary Hit points gained from allied or self-sourced effects by +6.",
          "increase Temporary Hit points gained from allied or self-sourced effects by +6.", "increase Temporary Hit points gained from allied or self-sourced effects by +8."]),
        ("+4 temp HP once per turn (+6 at 7th, +8 at 15th)", ["+4 temp HP once per turn", "+6 temp HP once per turn", "+6 temp HP once per turn", "+8 temp HP once per turn"]),
        ("1 rank of exhaustion (once per rest free from 11th).", ["1 rank of exhaustion.", "1 rank of exhaustion.", "1 rank of exhaustion (once per rest free).", "1 rank of exhaustion (once per rest free)."]),
        ("+2 damage (+4 at 7th, +6 at 15th)", ["+2 damage", "+4 damage", "+4 damage", "+6 damage"])]),
    "battle-lust": dict(tiers=[1, 11], subs=[
        ("is increased by +2. This increases to +4 at 11th level.", ["is increased by +2.", "is increased by +4."]),
        ("+2 damage (+4 at 11th)", ["+2 damage", "+4 damage"])]),
    "dragons-rage": dict(tiers=[7, 15], subs=[
        ("You gain a +1 bonus to your AC and a +10 bonus to your speed. This increases to +2 AC and +20 speed at 15th level.",
         ["You gain a +1 bonus to your AC and a +10 bonus to your speed.", "You gain a +2 bonus to your AC and a +20 bonus to your speed."]),
        ("will always inflict 1 rank of their associated condition on a failed save or if the attack is a critical hit, unless the jutsu already inflicts the associated condition on a failure. This increases to 2 ranks at 7th and 3 ranks at15th level.",
         ["will always inflict 2 ranks of their associated condition on a failed save or if the attack is a critical hit, unless the jutsu already inflicts the associated condition on a failure.",
          "will always inflict 3 ranks of their associated condition on a failed save or if the attack is a critical hit, unless the jutsu already inflicts the associated condition on a failure."]),
        ("you gain a rank of Mastery to the check. This increases to two ranks at 15th level.", ["you gain a rank of Mastery to the check.", "you gain two ranks of Mastery to the check."]),
        ("Ascended (7th Level +)", ["Ascended", "Ascended"]),
        ("Awakened (15th Level +)", ["", "Awakened"]),
        ("^Unbound Savagery.", ["", KEEP]),
        ("^Draconic Supremacy.", ["", KEEP]),
        ("+1 AC and +10 speed (+2 and +20 at 15th)", ["+1 AC and +10 speed", "+2 AC and +20 speed"]),
        ("adds conditions; more at 7th and 15th.", ["adds 2 ranks of conditions.", "adds 3 ranks of conditions; Ryu Hijutsu damage can't be reduced, and D-Rank Ryu Hijutsu cost no chakra."])]),
    "ketsuryugan": dict(tiers=[1, 11], subs=[
        ("This special sense does not penetrate walls or barriers. This increases to 60-feet at 11th level.", ["This special sense does not penetrate walls or barriers.", "This special sense does not penetrate walls or barriers."]),
        ("You gain 30-Feet of Blood Sight", ["You gain 30-Feet of Blood Sight", "You gain 60-Feet of Blood Sight"]),
        ("30-foot Blood Sight (60 at 11th)", ["30-foot Blood Sight", "60-foot Blood Sight"])]),
    "kujaku-mode": dict(tiers=[1, 7, 11, 15], subs=[
        ("You gain a +10 bonus to your speed. This increases to +20 at 11th level.", ["You gain a +10 bonus to your speed.", "You gain a +10 bonus to your speed.", "You gain a +20 bonus to your speed.", "You gain a +20 bonus to your speed."]),
        ("by 1d6 force damage. This increases to 2d6 at 7th level and 3d6 at 15th level.", ["by 1d6 force damage.", "by 2d6 force damage.", "by 2d6 force damage.", "by 3d6 force damage."]),
        ("+10 speed (+20 at 11th)", ["+10 speed", "+10 speed", "+20 speed", "+20 speed"])]),
    "kujaku-sanseijin": dict(tiers=[1, 11], subs=[]),
    "miraigan": dict(tiers=[1, 7, 15], add={7: [mastery("skill.ins", "Miraigan (2nd rank)")], 15: [mastery("skill.ins", "Miraigan (2nd rank)"), mastery("skill.ins", "Miraigan (3rd rank)")]}, subs=[
        ("You gain a rank of Mastery to Insight checks and checks to Identify Jutsu and Read the Enemy. This increases to 2 ranks at 7th level and 3 ranks at 15th level.",
         ["You gain a rank of Mastery to Insight checks and checks to Identify Jutsu and Read the Enemy.", "You gain 2 ranks of Mastery to Insight checks and checks to Identify Jutsu and Read the Enemy.",
          "You gain 3 ranks of Mastery to Insight checks and checks to Identify Jutsu and Read the Enemy."]),
        ("^Eyes of the Wolf: 1 rank of Mastery", ["Eyes of the Wolf: the Mastery on Identify Jutsu and Read the Enemy is applied at the table (Insight is automatic).",
         "Eyes of the Wolf: the 2 ranks of Mastery on Identify Jutsu and Read the Enemy are applied at the table (Insight is automatic).",
         "Eyes of the Wolf: the 3 ranks of Mastery on Identify Jutsu and Read the Enemy are applied at the table (Insight is automatic)."])]),
    "scorching-heat": dict(tiers=[1, 7, 15], subs=[
        ("You gain a +2 bonus to fire damage you deal. This increases to +4 at 7th and +6 at 15th levels", ["You gain a +2 bonus to fire damage you deal.", "You gain a +4 bonus to fire damage you deal.", "You gain a +6 bonus to fire damage you deal."]),
        ("+2 fire damage (+4 at 7th, +6 at 15th)", ["+2 fire damage", "+4 fire damage", "+6 fire damage"]),
        ("(they fade after 1 minute). From 15th (Scorching Dominion), always.", ["(they fade after 1 minute).", "(they fade after 1 minute).", "(they fade after 1 minute). With Scorching Dominion, always."])]),
    "sharingan": dict(tiers=[1, 11], subs=[
        ("You gain 30-Feet of Chakra Sight. This increases to 60-feet at 11th level.", ["You gain 30-Feet of Chakra Sight.", "You gain 60-Feet of Chakra Sight."]),
        ("30-foot Chakra Sight (60 at 11th)", ["30-foot Chakra Sight", "60-foot Chakra Sight"])]),
    "synthetic-chakra-mode": dict(tiers=[1, 15], subs=[
        ("You gain a +1 bonus to Unarmed Attacks, or Attacks made as a result of Jinzo Hijutsu. This increases to +2 at 15th level.",
         ["You gain a +1 bonus to Unarmed Attacks, or Attacks made as a result of Jinzo Hijutsu.", "You gain a +2 bonus to Unarmed Attacks, or Attacks made as a result of Jinzo Hijutsu."]),
        ("Finally, you gain benefits based on which Bio-Pet you have beginning at 15th level.", ["", "Finally, you gain benefits based on which Bio-Pet you have."]),
        ("^Bio-Amphibian", ["", KEEP]), ("^Oil Field.", ["", KEEP]), ("^Bio-Serpent", ["", KEEP]), ("^Chakra Serpent Projection.", ["", KEEP]), ("^Chakra Serpent.", ["", KEEP]),
        ("+1 (+2 at 15th) to unarmed", ["+1 to unarmed", "+2 to unarmed"]),
        ("Branch and Bio-Pet benefits on the card text.", ["Branch benefits on the card text.", "Branch and Bio-Pet benefits on the card text."])]),
    "ultra-focus": dict(tiers=[1, 11], subs=[
        ("You gain a +2 bonus to damage you deal. This increases to +4 at 11th level.", ["You gain a +2 bonus to damage you deal.", "You gain a +4 bonus to damage you deal."]),
        ("+2 damage (+4 at 11th)", ["+2 damage", "+4 damage"])]),
    "umbral-monarch": dict(tiers=[1, 15], subs=[
        ("increases by +2. This increases to +4 at 15th level.", ["increases by +2.", "increases by +4."]),
        ("Unarmed +2 (+4 at 15th)", ["Unarmed +2", "Unarmed +4"])]),
    "feral": dict(tiers=[1, 11], subs=[
        ("^From 11th: below half HP", ["", "Below half HP: Feral for 1 minute, ignoring Calming (once per rest)."])]),
    "torque": dict(tiers=[1, 15], subs=[
        ("Deadly 2 (Deadly 4 at 15th)", ["Deadly 2", "Deadly 4"])]),
    "elemental-flux": dict(tiers=[1, 6], subs=[
        ("^From 6th (Elemental Aura)", ["", "Elemental Aura: resistance to your current Flux type's damage."])]),
}

# The Crash variants carry Crash's dice note: their versions follow Crash's dice.
for k in ["crash-abyss", "crash-burnout", "crash-herald", "crash-maelstrom", "crash-typhoon"]:
    VERSIONS[k] = dict(tiers=[1, 7, 11, 15, 19], subs=[(CRASH_NOTE, CRASH_NOTE_V)])
# The Perfected versions exist only at 20th: one version, Crash's 20th-level dice.
VERSIONS["chakra-surge-crash-perfected"] = dict(tiers=[20], subs=[(CRASH_NOTE, [CRASH_NOTE_V[4]])])


def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def level_value(table, level):
    """The value at this level; below the table's first step, its first value (the card only exists
    once the character has the feature, so the base version shows its starting number)."""
    steps = re.findall(r"(\d+)\s*:\s*(-?\d+)", table)
    out = int(steps[0][1]) if steps else 0
    for l, v in steps:
        if level >= int(l):
            out = int(v)
    return out


def resolve(value, level):
    """lvl(...) tables in a value become the number for this level."""
    if isinstance(value, str):
        return re.sub(r"lvl\(([^)]*)\)", lambda m: str(level_value(m.group(1), level)), value)
    if isinstance(value, list):
        return [resolve(v, level) for v in value]
    if isinstance(value, dict):
        return {k: resolve(v, level) for k, v in value.items()}
    return value


def apply_subs(text, subs, i):
    """One version's text: each growing piece replaced (None keeps it, "" removes the whole line)."""
    for old, versions in subs:
        # None: the same text as the version before (the original text for the first version).
        new = next((v for v in reversed(versions[:i + 1]) if v is not None), None)
        if new is None or new == KEEP:
            continue
        if old.startswith("^"):
            if text.startswith(old[1:]):
                return new
        elif old in text:
            if new == "" and text.strip() == old:
                return ""
            text = text.replace(old, new)
    return text


def rewrite_desc(desc, subs, i):
    paras = re.findall(r"<p>(.*?)</p>", desc, re.S)
    out = []
    for p in paras:
        bold = p.startswith("<b>")
        plain = html.unescape(re.sub(r"</?b>", "", p))
        new = apply_subs(plain, subs, i)
        if new == "":
            continue
        out.append(f"<p>{'<b>' + html.escape(new) + '</b>' if bold else html.escape(new)}</p>")
    return "".join(out)


def card_files():
    out = {}
    for f in glob.glob(os.path.join(AMPS, "*.json")):
        if os.path.basename(f).startswith("_folder"):
            continue
        d = json.load(open(f))
        out[d["system"]["identifier"]] = (f, d)
    return out


def version_id(key):
    return "n5eAmp" + hashlib.md5(("version:" + key).encode()).hexdigest()[:10]


def main():
    cards = card_files()
    # Old version files are rewritten from the base each run.
    for key, (f, d) in list(cards.items()):
        # Only this script's level versions (their base is in VERSIONS); the jutsu rank versions
        # (build-jutsu-amp-cards.py, AMP1f) also carry a series and must stay.
        if d["system"].get("series") in VERSIONS and d["system"]["series"] != key and not d["flags"]["n5e"].get("amp1f"):
            os.remove(f)
            del cards[key]
    made = 0
    for key, spec in VERSIONS.items():
        if key not in cards:
            raise SystemExit(f"no card {key}")
        f, base = cards[key]
        # The base as the card builders wrote it (kept on the base card, so reruns start from it).
        src = base["flags"]["n5e"].get("versionSource") or {
            "description": base["system"]["description"], "summary": base["system"]["summary"],
            "changes": base["system"]["changes"], "rules": base["flags"]["n5e"]["rules"], "name": base["name"]}
        base = copy.deepcopy(base)
        base["system"].update({"description": src["description"], "summary": src["summary"], "changes": src["changes"]})
        base["flags"]["n5e"]["rules"] = src["rules"]
        base["name"] = src["name"]
        tiers = spec["tiers"]
        for i, level in enumerate(tiers):
            doc = copy.deepcopy(base)
            doc["flags"]["n5e"].pop("versionSource", None)
            s = doc["system"]
            s["description"] = rewrite_desc(s["description"], spec["subs"], i)
            s["summary"] = apply_subs(s["summary"], spec["subs"], i)
            s["changes"] = resolve(s["changes"], level) + spec.get("add", {}).get(level, [])
            rules = []
            for r in resolve(doc["flags"]["n5e"]["rules"], level):
                if isinstance(r.get("value"), str) and re.fullmatch(r"-?\d+", r["value"]) and "lvl(" in json.dumps(src["rules"]):
                    r = {**r, "value": int(r["value"])}
                if r.get("key") == "note":
                    t = apply_subs(r["text"], spec["subs"], i)
                    if not t:
                        continue
                    r = {**r, "text": t}
                elif r.get("key") == "modifier" and str(r.get("value")) == "0":
                    continue
                rules.append(r)
            doc["flags"]["n5e"]["rules"] = rules
            s["series"] = key
            s["level"] = level if i else 0
            if i == 0:
                out = f
                doc["flags"]["n5e"]["versionSource"] = src
            else:
                vkey = f"{key}-{level}"
                vid = version_id(vkey)
                doc["_id"], doc["_key"] = vid, f"!items!{vid}"
                doc["name"] = f"{base['name']} ({ordinal(level)})"
                doc["sort"] = base.get("sort", 0) + i
                s["identifier"] = vkey
                out = os.path.join(AMPS, f"{re.sub(r'[^a-z0-9]+', '-', vkey)}-{vid}.json")
            with open(out, "w") as fh:
                json.dump(doc, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            made += 1 if i else 0
    print(f"{len(VERSIONS)} Amps versioned; {made} version cards")


if __name__ == "__main__":
    main()
