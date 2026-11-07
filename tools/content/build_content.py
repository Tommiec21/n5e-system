#!/usr/bin/env python3
"""
Build compendium source JSON from King's rule books (KB extracts).

Usage:
  python3 tools/content/build_content.py <KB folder>
    <KB folder> = ContextFile/N5e-Rules-KB (needs _source/full-with-boxes.md,
                  _source/classes/orochimaru-full.md, _data/jutsu-parsed.json)

Writes packs/_source/{classes,features,stances,feats,jutsu}/<slug>-<id>.json. Re-running replaces
only the files this script owns (flags.n5e.generated = true). Text is copied verbatim from the
books; mechanics (activation, cost, keywords, advancement) are filled from the tables.

Scope (Phase 2 content slice, King 2026-11-07):
  Scout-Nin 1-5 + Assault Scout, Ninjutsu Specialist 1-5 + Blaze Walker, every option those levels
  offer, all 24 Ch13 Fighting Stances, 4 random feats a 4th-level character can take, 10 jutsu.
"""
import hashlib
import html
import json
import os
import random
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "packs", "_source")
CORE_VERSION = "13.351"
SYSTEM_VERSION = "0.3.0"
OROCHIMARU = "Orochimaru's Observation Compendium"
CORE_BOOK = "Naruto 5e - Full Document"
JIRAIYA = "Jiraiya's Jutsu Compendium"

# --------------------------------------------------------------------------------------------- #
#  Helpers                                                                                      #
# --------------------------------------------------------------------------------------------- #

ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


def make_id(kind, name):
    """Deterministic 16-character Foundry id."""
    h = hashlib.sha256(f"{kind}:{name}".encode()).digest()
    return "n5e" + "".join(ALNUM[b % len(ALNUM)] for b in h[:13])


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("’", "")).strip("-")


def uuid(pack, _id):
    return f"Compendium.n5e.{pack}.Item.{_id}"


def lines_to_html(lines):
    """Book lines -> HTML. 'Name. text' lead-ins are bolded; [BOX] tables become asides."""
    out = []
    in_box = False
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if line == "[BOX]":
            in_box = True
            out.append('<aside class="n5e-box">')
            continue
        if line == "[/BOX]":
            in_box = False
            out.append("</aside>")
            continue
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            parts = [p.strip() for p in " / ".join(cells).split(" / ") if p.strip()]
            if parts and parts[0].startswith("#"):
                out.append(f"<h4>{html.escape(parts[0].lstrip('# ').strip())}</h4>")
                parts = parts[1:]
            out.extend(f"<p>{html.escape(p)}</p>" for p in parts)
            continue
        if line.startswith("#"):
            out.append(f"<h4>{html.escape(line.lstrip('# ').strip())}</h4>")
            continue
        m = re.match(r"^([A-Z][^.:]{1,60}?)([.:])\s+(.*)$", line)
        if m and len(m.group(1).split()) <= 7 and not in_box:
            out.append(f"<p><strong>{html.escape(m.group(1))}{m.group(2)}</strong> {html.escape(m.group(3))}</p>")
        else:
            out.append(f"<p>{html.escape(line)}</p>")
    return "\n".join(out)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read().split("\n")


def section(lines, heading, start=0, stop_level=None):
    """Lines under an exact heading line until the next heading of the same or higher level."""
    for i in range(start, len(lines)):
        if lines[i].strip() == heading:
            level = len(heading) - len(heading.lstrip("#"))
            stop = stop_level or level
            body = []
            for j in range(i + 1, len(lines)):
                s = lines[j].strip()
                if s.startswith("#") and not s.startswith("[") and (len(s) - len(s.lstrip("#"))) <= stop:
                    break
                body.append(lines[j])
            return body, i
    raise KeyError(f"heading not found: {heading!r}")


def find(lines, heading, after=0):
    return section(lines, heading, after)[0]


def stats(created=True):
    return {"coreVersion": CORE_VERSION, "systemId": "n5e", "systemVersion": SYSTEM_VERSION}


def doc(kind, pack, name, type_, system, img, effects=None):
    _id = make_id(kind, name)
    return {
        "_id": _id, "name": name, "type": type_, "img": img,
        "system": system, "effects": effects or [], "folder": None, "sort": 0,
        "ownership": {"default": 0}, "flags": {"n5e": {"generated": True}}, "_stats": stats(),
        "_key": f"!items!{_id}", "_pack": pack,
    }


def adv(level, type_, title, uuids=None, count=1, key="", value="", aid=None):
    return {"id": aid or slug(f"{type_}-{level}-{title}")[:40], "level": level, "type": type_, "title": title,
            "uuids": uuids or [], "count": count, "key": key, "value": value, "branch": "", "chosen": []}


def source(book, page=""):
    return {"book": book, "page": page, "version": "4.0", "custom": ""}


def activation(t="", trigger=""):
    t = t.lower()
    if "reaction" in t:
        typ = "reaction"
    elif "bonus" in t:
        typ = "bonus"
    elif "full" in t and "turn" in t:
        typ = "fullTurn"
    elif "action" in t:
        typ = "action"
    elif "special" in t:
        typ = "special"
    elif "minute" in t or "hour" in t:
        typ = "long"
    else:
        typ = "none"
    return {"type": typ, "value": 1, "unit": "", "trigger": {"event": "", "text": trigger}}


def feature(name, cls_ident, level, body_lines, *, category="classFeature", act="", tags=(), pools=None,
            book=OROCHIMARU, img="icons/svg/upgrade.svg", passive=None, kind="feature"):
    text_lc = " ".join(body_lines).lower()
    a = activation(act) if act else {"type": "none", "value": 1, "unit": "", "trigger": {"event": "", "text": ""}}
    is_passive = passive if passive is not None else a["type"] == "none"
    system = {
        "identifier": slug(name), "description": lines_to_html(body_lines), "source": source(book),
        "activation": a, "featureType": "passive" if is_passive else "active",
        "category": category, "requirement": {"level": level, "class": cls_ident, "clan": ""},
        "tags": list(tags), "resourcePools": pools or [],
    }
    return doc(kind, "features", name, "feat", system, img)


# --------------------------------------------------------------------------------------------- #
#  Stances (Ch13)                                                                               #
# --------------------------------------------------------------------------------------------- #

STANCE_GROUPS = [("### Taijutsu Stances", "taijutsu"), ("### Bukijutsu Stances", "bukijutsu"),
                 ("### Chakra Stances(s)", "chakra")]


def build_stances(core):
    ch13 = core.index("# Chapter 13: Customization Options")
    out = []
    for heading, cat in STANCE_GROUPS:
        body, at = section(core, heading, ch13)
        names = [ln.strip()[5:] for ln in body if ln.strip().startswith("#### ")]
        for name in names:
            text = find(core, f"#### {name}", at)
            req = next((ln.split(":", 1)[1].strip() for ln in text if ln.strip().lower().startswith("requirement")), "")
            desc = [ln for ln in text if not ln.strip().lower().startswith("requirement")]
            system = {
                "identifier": slug(name), "description": lines_to_html(desc), "source": source(CORE_BOOK, "Ch13"),
                "activation": {"type": "bonus", "value": 1, "unit": "", "trigger": {"event": "", "text": ""}},
                "featureType": "active", "categories": [cat], "requirement": req,
            }
            img = {"taijutsu": "icons/svg/combat.svg", "bukijutsu": "icons/svg/sword.svg", "chakra": "icons/svg/aura.svg"}[cat]
            out.append(doc("stance", "stances", name if name.endswith(("Stance", "Killing")) else name, "stance", system, img))
    return out


# --------------------------------------------------------------------------------------------- #
#  Feats (Ch13): 4 at random that a 4th-level character can take                                #
# --------------------------------------------------------------------------------------------- #

FEAT_GROUPS = {"### General Feats": "general", "### Skill Feats": "skill", "### Ninjutsu Feats": "ninjutsu",
               "### Taijutsu Feats": "taijutsu", "### Genjutsu Feats": "genjutsu"}
ABIL = {"strength": "str", "dexterity": "dex", "constitution": "con", "intelligence": "int", "wisdom": "wis",
        "charisma": "cha"}


def build_feats(core, seed=20261107):
    ch13 = core.index("# Chapter 13: Customization Options")
    feats_at = core.index("## Feats", ch13)
    pool = []
    for heading, cat in FEAT_GROUPS.items():
        try:
            body, at = section(core, heading, feats_at)
        except KeyError:
            continue
        for name in [ln.strip()[5:] for ln in body if ln.strip().startswith("#### ")]:
            text = find(core, f"#### {name}", at)
            prereq = next((ln.split(":", 1)[1].strip() for ln in text if ln.strip().lower().startswith("prerequisite")), "")
            pool.append((cat, name, prereq, text))

    def ok(p):
        pre = p[2].lower()
        if not pre:
            return True
        m = re.search(r"level\s*(\d+)", pre)
        if m and int(m.group(1)) > 4:
            return False
        return not re.search(r"affinity|release|clan|feat|proficien|mastery|stance|know", pre)

    eligible = [p for p in pool if ok(p) and len(p[3]) >= 2]
    rng = random.Random(seed)
    picks = rng.sample(eligible, 4)
    out = []
    for cat, name, prereq, text in picks:
        level = int(re.search(r"level\s*(\d+)", prereq.lower()).group(1)) if re.search(r"level\s*(\d+)", prereq.lower()) else 0
        asi = []
        for ln in text:
            if "score by 1" in ln.lower() or "+1" in ln and "score" in ln.lower():
                asi = sorted({v for k, v in ABIL.items() if k in ln.lower()}, key=list(ABIL.values()).index)
                break
        desc = [ln for ln in text if not ln.strip().lower().startswith("prerequisite")]
        system = {
            "identifier": slug(name), "description": lines_to_html(desc), "source": source(CORE_BOOK, "Ch13"),
            "activation": {"type": "none", "value": 1, "unit": "", "trigger": {"event": "", "text": ""}},
            "featureType": "passive", "category": cat, "prerequisites": [prereq] if prereq else [],
            "requirement": {"level": level, "class": "", "clan": ""},
            "asi": {"options": asi, "amount": 1 if asi else 0},
        }
        out.append(doc("feat", "feats", name, "feat", system, "icons/svg/book.svg"))
    return out, [p[1] for p in picks]


# --------------------------------------------------------------------------------------------- #
#  Jutsu (Jiraiya's Jutsu Compendium, parsed)                                                   #
# --------------------------------------------------------------------------------------------- #

KEYWORD_MAP = {"ninjutsu": "ninjutsu", "genjutsu": "genjutsu", "taijutsu": "taijutsu", "bukijutsu": "bukijutsu",
               "combo": "combo", "finisher": "finisher", "chain": "chain", "fuinjutsu": "fuinjutsu",
               "sensory": "sensory", "clash": "clash", "barrier": "barrier", "stable": "stable",
               "efficient": "efficient", "interrupt": "interrupt", "clone": "clone", "construct": "construct",
               "hijutsu": "hijutsu", "kinjutsu": "kinjutsu", "medical": "medical", "earth release": "earthRelease",
               "wind release": "windRelease", "fire release": "fireRelease", "water release": "waterRelease",
               "lightning release": "lightningRelease"}
STIMULI = {"visual": "visual", "auditory": "auditory", "inhale": "inhaled", "inhaled": "inhaled", "tactile": "tactile"}
SECTION_MAP = {"Non-Elemental": "nonElemental", "Medical Release": "medical", "Earth Release": "earth",
               "Wind Release": "wind", "Fire Release": "fire", "Water Release": "water",
               "Lightning Release": "lightning", "Phantasm": "phantasm", "Trickery": "trickery",
               "Psionic": "psionic", "Hallucinogenic": "hallucinogenic", "Taijutsu": "taijutsu",
               "Shinobi Basics": "shinobiBasics", "Blade": "blade", "Flail": "flail", "Polearm": "polearm",
               "Power": "power", "Ammunition": "ammunition"}
DISC = {"Ninjutsu": "nin", "Genjutsu": "gen", "Taijutsu": "tai", "Bukijutsu": "buki"}
JUTSU_IMG = {"nin": "icons/svg/fire.svg", "gen": "icons/svg/eye.svg", "tai": "icons/svg/combat.svg",
             "buki": "icons/svg/sword.svg"}


def parse_range(text):
    t = (text or "").strip()
    low = t.lower()
    area = {"shape": "", "size": None, "width": None, "height": None}
    m = re.search(r"(\d+)[- ]?(?:foot|feet|ft)[- ]?(cone|cube|sphere|radius|line|cylinder)", low)
    if m:
        shape = {"radius": "sphere"}.get(m.group(2), m.group(2))
        area = {"shape": shape, "size": int(m.group(1)), "width": None, "height": None}
    if low.startswith("self"):
        rng = {"type": "self", "value": None, "long": None, "text": t}
        m2 = re.search(r"\((\d+)[- ]?(?:foot|feet)\)", low)
        if m2 and not area["shape"]:
            area = {"shape": "sphere", "size": int(m2.group(1)), "width": None, "height": None}
    elif low.startswith("touch"):
        rng = {"type": "touch", "value": None, "long": None, "text": ""}
    else:
        m = re.match(r"(\d+)\s*(feet|foot|ft|miles?)", low)
        if m:
            rng = {"type": "miles" if m.group(2).startswith("mile") else "feet", "value": int(m.group(1)),
                   "long": None, "text": ""}
        else:
            rng = {"type": "special", "value": None, "long": None, "text": t}
    return {"range": rng, "area": area}


def parse_duration(text):
    low = (text or "").lower().strip().rstrip(".")
    conc = "concentration" in low
    m = re.search(r"(\d+)\s*(round|minute|hour|day|turn)", low)
    if m:
        return {"value": int(m.group(1)), "unit": m.group(2), "concentration": conc, "text": ""}
    if low.startswith("instant"):
        return {"value": None, "unit": "instant", "concentration": conc, "text": ""}
    return {"value": None, "unit": "special", "concentration": conc, "text": text or ""}


def parse_cost(text):
    low = (text or "").lower()
    m = re.search(r"(\d+)", low)
    if "none" in low or not low:
        return {"mode": "none", "value": 0, "text": ""}
    if m:
        return {"mode": "chakra", "value": int(m.group(1)), "text": ""}
    return {"mode": "special", "value": 0, "text": text}


def parse_components(text):
    t = (text or "").upper()
    tool = re.search(r"NT\s*\(([^)]*)\)", text or "")
    return {
        "hs": bool(re.search(r"\bHS\b", t)), "cm": bool(re.search(r"\bCM\b", t)),
        "cs": bool(re.search(r"\bCS\b", t)), "m": bool(re.search(r"\bM\b", t)),
        "weapon": {"required": bool(re.search(r"\bW\b", t)), "groups": [], "any": False, "range": "", "count": 1,
                   "dualWield": False, "text": ""},
        "tool": {"required": bool(tool), "kit": "", "charges": 0, "text": tool.group(1) if tool else ""},
    }


def split_riders(desc):
    """Pull 'Finisher:'/'Chain N:'/'At Higher Ranks' paragraphs out of the description."""
    main, finisher, chain, upcast, overcharge = [], [], {1: [], 2: [], 3: []}, [], []
    cur = main
    for ln in desc.split("\n"):
        s = ln.strip()
        low = s.lower()
        m = re.match(r"chain\s*(\d)\s*[.:]\s*(.*)", low)
        if low.startswith("finisher") and (":" in s[:12] or "." in s[:12]):
            cur = finisher
            s = s.split(":", 1)[1].strip() if ":" in s[:12] else s.split(".", 1)[1].strip()
        elif m and int(m.group(1)) in chain:
            cur = chain[int(m.group(1))]
            s = re.split(r"[.:]", s, 1)[1].strip()
        elif low.startswith(("at higher rank", "at higher-rank", "upcast")):
            cur = upcast
            s = re.split(r"[.:]", s, 1)[1].strip() if re.search(r"[.:]", s[:30]) else s
        elif low.startswith("overcharge"):
            cur = overcharge
            s = re.split(r"[.:]", s, 1)[1].strip() if re.search(r"[.:]", s[:14]) else s
        if s:
            cur.append(s)
    h = lambda ls: lines_to_html(ls) if ls else ""
    return h(main), h(finisher), {str(k): h(v) for k, v in chain.items()}, h(upcast), h(overcharge)


JUTSU_PICKS = ["Fire Release: Flame Whip", "Fire Release: Fox Fire", "Chakra Shield", "Ink Clone",
               "Beast Fist: Forceful Bull", "Butterfly Kick", "Snake Constricting Grip",
               "Lotus: Anxious Petals", "Glamor Tongue", "Transform"]


def build_jutsu(parsed):
    by_name = {j["name"]: j for j in parsed}
    out = []
    for name in JUTSU_PICKS:
        j = by_name[name]
        disc = DISC[j["discipline"]]
        kws, stim = [], []
        for raw in re.split(r"[,()]", j.get("keywords", "")):
            k = raw.strip().lower()
            if k in KEYWORD_MAP:
                kws.append(KEYWORD_MAP[k])
            elif k in STIMULI:
                stim.append(STIMULI[k])
        main, fin, chain, upcast, over = split_riders(j["description"])
        time = j.get("time", "")
        trig = time.split(",", 1)[1].strip() if "reaction" in time.lower() and "," in time else ""
        system = {
            "identifier": slug(name), "description": main, "source": source(JIRAIYA),
            "activation": activation(time, trig), "target": parse_range(j.get("range")),
            "duration": parse_duration(j.get("duration")),
            "uses": {"max": "", "spent": 0, "per": "", "staminaEligible": False},
            "activities": [], "featureType": "active",
            "rank": j["rank"][0].upper(), "discipline": disc, "section": SECTION_MAP.get(j["section"], ""),
            "keywords": kws, "stimuli": stim, "unaware": "unaware" in j.get("keywords", "").lower(),
            "ability": "", "cost": parse_cost(j.get("cost")), "components": parse_components(j.get("components")),
            "upcast": {"preset": "standard3", "costPerRank": None, "perRank": [], "thresholds": {"B": "", "A": "", "S": ""},
                       "text": upcast},
            "riders": [], "chainEffects": chain, "finisher": {"only": False, "text": fin},
            "overcharge": {"text": over}, "hijutsu": {"clan": "", "branch": ""},
            "learned": {"mode": "known", "grantedBy": ""},
        }
        if "finisher" in kws and not fin:
            system["finisher"]["text"] = ""
        out.append(doc("jutsu", "jutsu", name, "jutsu", system, JUTSU_IMG[disc]))
    return out


# --------------------------------------------------------------------------------------------- #
#  Classes                                                                                      #
# --------------------------------------------------------------------------------------------- #

RANKS = ["D"] * 4 + ["C"] * 4 + ["B"] * 4 + ["A"] * 4 + ["S"] * 4


def table_rows(lines, header_start):
    rows = []
    started = False
    for ln in lines:
        s = ln.strip()
        if s.startswith(header_start):
            started = True
            continue
        if started:
            if not s.startswith("|"):
                break
            rows.append([c.strip() for c in s.strip("|").split("|")])
    return rows


def col(rows, idx):
    return [("0" if r[idx] in ("-", "", "–") else re.sub(r"[^\d]", "", r[idx]) or "0") for r in rows]


def build_scout(oro, stance_uuids):
    at = oro.index("## Scout-Nin")
    rows = table_rows(oro[at:at + 40], "| Level | Proficiency Bonus | Features | Superiority Dice")
    items = []
    F = lambda name, lvl, heading, **kw: feature(name, "scout-nin", lvl, find(oro, heading, at), **kw)

    # Options.
    paths_body, paths_at = section(oro, "### Shinobi’s Path", at)
    path_names = [ln.strip()[5:] for ln in paths_body if ln.strip().startswith("#### Path")]
    paths = [feature(n, "scout-nin", 1, find(oro, f"#### {n}", paths_at), category="classOption",
                     tags=["scout-path"], img="icons/svg/direction.svg") for n in path_names]
    intro = []
    for ln in paths_body:
        if ln.strip().startswith("####"):
            break
        intro.append(ln)
    shinobi_path = feature("Shinobi’s Path", "scout-nin", 1, intro, img="icons/svg/direction.svg")

    jack_body, jack_at = section(oro, "### Jack of all", at)
    gens = [feature(n, "scout-nin", 2, find(oro, f"#### {n}", jack_at), category="classOption",
                    tags=["scout-generalization"], img="icons/svg/target.svg") for n in ("Warfare", "Seize", "Tactics")]
    jack_intro = [ln for ln in jack_body if not ln.strip().startswith("####")][:2]

    general = F("General Technique", 1, "### General Technique", img="icons/svg/combat.svg")
    adaptive = F("Adaptive Initiative", 1, "### Adaptive Initiative")
    superior = feature("Superior Technique", "scout-nin", 2, find(oro, "### Superior Technique", at),
                       img="icons/svg/d20-grey.svg")
    switch = F("Switch Hitter", 2, "### Switch Hitter", img="icons/svg/sun.svg")
    jack = feature("Jack of All", "scout-nin", 2, jack_intro, act="bonus action", img="icons/svg/target.svg")
    scouting = F("Scouting Technique", 3, "### Scouting Technique")
    extra = F("Extra Attack", 5, "### Extra Attack", img="icons/svg/sword.svg")
    momentum = F("Superior Momentum", 5, "### Superior Momentum", act="special", img="icons/svg/lightning.svg")
    items += [shinobi_path, general, adaptive, superior, switch, jack, scouting, extra, momentum, *paths, *gens]

    # Assault Scout (subclass) and its maneuvers.
    sa = oro.index("### Assault Scout", at)
    s_assault = feature("Superior Assault", "scout-nin", 3, find(oro, "#### Superior Assault", sa), img="icons/svg/sword.svg")
    brutish = feature("Brutish Momentum", "scout-nin", 3, find(oro, "#### Brutish Momentum", sa), img="icons/svg/skull.svg")
    man_body, man_at = section(oro, "### Assault Maneuvers", sa)
    man_names = [ln.strip()[5:] for ln in man_body if ln.strip().startswith("#### ")]
    maneuvers = [feature(n, "scout-nin", 3, find(oro, f"#### {n}", man_at), category="classOption",
                         tags=["assault-maneuver"], act="special", img="icons/svg/explosion.svg") for n in man_names]
    items += [s_assault, brutish, *maneuvers]
    assault_intro = []
    for ln in oro[sa + 1:]:
        if ln.strip().startswith("#"):
            break
        assault_intro.append(ln)
    man_known = [int(x) for x in col(rows, 4)]
    man_adv = []
    for lvl in range(3, 6):
        gain = man_known[lvl - 1] - man_known[lvl - 2]
        if gain > 0:
            man_adv.append(adv(lvl, "itemChoice", "Assault Maneuvers", [uuid("features", m["_id"]) for m in maneuvers],
                               count=gain, key="assault-maneuver"))
    assault = doc("subclass", "classes", "Assault Scout", "subclass", {
        "identifier": "assault-scout", "description": lines_to_html(assault_intro), "source": source(OROCHIMARU),
        "classIdentifier": "scout-nin", "resourcePools": [],
        "advancement": [adv(3, "feature", "Assault Scout features", [uuid("features", i["_id"]) for i in (s_assault, brutish)]),
                        *man_adv],
    }, "icons/svg/sword.svg")

    U = lambda d: uuid("features", d["_id"])
    cls_intro = []
    for ln in oro[at + 24:]:
        if ln.strip().startswith("### Class Features"):
            break
        if not ln.strip().startswith("|") and ln.strip() not in ("[BOX]", "[/BOX]"):
            cls_intro.append(ln)
    scout = doc("class", "classes", "Scout-Nin", "class", {
        "identifier": "scout-nin", "description": lines_to_html(cls_intro), "source": source(OROCHIMARU),
        "levels": 1, "hitDie": "d8", "chakraDie": "d10", "jutsuTier": "medium",
        "saves": ["str", "con", "int"],
        "skills": {"fixed": [], "choose": 4, "from": [], "chosen": []},
        "tools": {"fixed": [], "choose": 2, "from": [], "chosen": []},
        "armorProficiencies": ["light", "medium", "heavy"], "weaponProficiencies": ["simple", "martial"],
        "jutsuKnown": [int(x) for x in col(rows, 5)], "maxRank": RANKS,
        "columns": [{"key": "superiorityDice", "label": "Superiority Dice", "values": col(rows, 3)},
                    {"key": "maneuversKnown", "label": "Maneuvers Known", "values": col(rows, 4)}],
        "resourcePools": [{"id": "superiorityDice", "label": "Superiority Dice", "value": 0,
                           "max": "@scale.scoutNin.superiorityDice", "die": "d8", "steps": [], "step": 0,
                           "recovery": [{"on": "rest10m", "amount": "all", "formula": ""}]}],
        "subclassLevel": 3, "subclassFeatureLevels": [3, 6, 10, 14, 17], "stanceGrant": "any",
        "subclasses": [uuid("classes", assault["_id"])],
        "advancement": [
            adv(1, "feature", "1st-level features", [U(shinobi_path), U(general), U(adaptive)]),
            adv(1, "itemChoice", "Shinobi’s Path", [U(p) for p in paths], key="scout-path"),
            adv(1, "itemChoice", "General Technique stance", stance_uuids["all"], key="stance"),
            adv(2, "feature", "2nd-level features", [U(superior), U(switch), U(jack)]),
            adv(2, "option", "Switch Hitter: Primary discipline", ["nin", "gen", "tai", "buki"], key="primaryDiscipline"),
            adv(2, "itemChoice", "Jack of All: Generalization", [U(g) for g in gens], key="scout-generalization"),
            adv(3, "feature", "3rd-level features", [U(scouting)]),
            adv(5, "feature", "5th-level features", [U(extra), U(momentum)]),
        ],
    }, "icons/svg/direction.svg")
    return [scout, assault, *items]


MOLDING_ICON = "icons/svg/lightning.svg"


def build_ninjutsu(oro, stance_uuids):
    at = oro.index("## Ninjutsu Specialist")
    table_at = max(i for i in range(at) if oro[i].strip() == "Ninjutsu Specialist")
    rows = table_rows(oro[table_at:table_at + 30], "| Level | Proficiency Bonus | Features | Moldings Known")
    F = lambda name, lvl, heading, **kw: feature(name, "ninjutsu-specialist", lvl, find(oro, heading, at), **kw)

    # Refined Focus text carries the Crash/Flow boxes; keep prose, move boxes to Chakra Surge.
    rf = find(oro, "### Refined Focus", at)
    rf_text, boxes, in_box, buf = [], [], False, []
    for ln in rf:
        s = ln.strip()
        if s == "[BOX]":
            in_box, buf = True, [ln]
        elif s == "[/BOX]":
            in_box = False
            boxes.append(buf + [ln])
        elif in_box:
            buf.append(ln)
        else:
            rf_text.append(ln)
    cc = find(oro, "### Chakra Compression", at)
    cc_text = []
    in_box = False
    for ln in cc:
        s = ln.strip()
        if s == "[BOX]":
            in_box, buf = True, [ln]
        elif s == "[/BOX]":
            in_box = False
            if "Flow" in " ".join(buf) and "Perfected" not in " ".join(buf):
                boxes.append(buf + [ln])
        elif not in_box:
            cc_text.append(ln)
    refined = feature("Refined Focus", "ninjutsu-specialist", 1, rf_text, img=MOLDING_ICON, pools=[])
    compression = feature("Chakra Compression", "ninjutsu-specialist", 1, cc_text, act="special", img="icons/svg/fire.svg")
    stance = F("Chakra Stance", 1, "### Chakra Stance", img="icons/svg/aura.svg")
    tradition = F("Ninjutsu Tradition", 2, "### Ninjutsu Tradition")
    scholar = F("Scholar", 2, "### Scholar", img="icons/svg/book.svg")
    surge_lines = find(oro, "### Chakra Surge", at) + [x for b in boxes for x in b]
    surge = feature("Chakra Surge", "ninjutsu-specialist", 3, surge_lines, act="bonus action", img="icons/svg/explosion.svg")
    tenketsu = F("Tenketsu Refinement", 5, "### Tenketsu Refinement")
    meditation = F("Meditation", 5, "### Meditation", act="10 minutes", img="icons/svg/regen.svg")

    mold_body, mold_at = section(oro, "### Refined Focus - Moldings", at)
    mold_names = [ln.strip()[5:] for ln in mold_body if ln.strip().startswith("#### ")]
    moldings = [feature(n, "ninjutsu-specialist", 1, find(oro, f"#### {n}", mold_at), category="classOption",
                        tags=["nin-molding"], act="special", img=MOLDING_ICON) for n in mold_names]

    # Blaze Walker (subclass), 2nd-level features.
    bw = oro.index("### Blaze Walker", at)
    fire = feature("Fire Release (Blaze Walker)", "ninjutsu-specialist", 2, find(oro, "#### Fire Release", bw), img="icons/svg/fire.svg")
    pyro = feature("Pyroclasm", "ninjutsu-specialist", 2, find(oro, "#### Pyroclasm", bw), act="action", img="icons/svg/fire.svg")
    bw_intro = []
    for ln in oro[bw + 1:]:
        if ln.strip().startswith("#"):
            break
        bw_intro.append(ln)
    blaze = doc("subclass", "classes", "Blaze Walker", "subclass", {
        "identifier": "blaze-walker", "description": lines_to_html(bw_intro), "source": source(OROCHIMARU),
        "classIdentifier": "ninjutsu-specialist",
        "resourcePools": [{"id": "pyroclasm", "label": "Pyroclasm", "value": 0, "max": "3", "die": "", "steps": [],
                           "step": 0, "recovery": [{"on": "event", "amount": "all", "formula": ""}]}],
        "advancement": [adv(2, "feature", "Blaze Walker features", [uuid("features", fire["_id"]), uuid("features", pyro["_id"])]),
                        adv(2, "trait", "Fire Release affinity", ["fire"], count=0, key="affinity")],
    }, "icons/svg/fire.svg")

    U = lambda d: uuid("features", d["_id"])
    mk = [int(x) for x in col(rows, 3)]
    mold_adv = [adv(1, "itemChoice", "Moldings", [U(m) for m in moldings], count=mk[0], key="nin-molding")]
    for lvl in range(2, 6):
        if mk[lvl - 1] > mk[lvl - 2]:
            mold_adv.append(adv(lvl, "itemChoice", "Moldings", [U(m) for m in moldings], count=mk[lvl - 1] - mk[lvl - 2],
                                key="nin-molding"))
    cls_intro = []
    for ln in oro[at + 1:]:
        if ln.strip().startswith("### Class Features"):
            break
        cls_intro.append(ln)
    nin = doc("class", "classes", "Ninjutsu Specialist", "class", {
        "identifier": "ninjutsu-specialist", "description": lines_to_html(cls_intro), "source": source(OROCHIMARU),
        "levels": 1, "hitDie": "d6", "chakraDie": "d12", "jutsuTier": "high", "saves": ["int", "wis", "cha"],
        "skills": {"fixed": ["nin"], "choose": 4, "from": ["ins", "inv", "his", "ste", "prc", "cha"], "chosen": []},
        "tools": {"fixed": ["alchemist", "hackers"], "choose": 0, "from": [], "chosen": []},
        "armorProficiencies": ["light"], "weaponProficiencies": ["simple", "Combat Scrolls", "Giant Combat Scrolls"],
        "jutsuKnown": [int(x) for x in col(rows, 4)], "maxRank": RANKS,
        "columns": [{"key": "moldingsKnown", "label": "Moldings Known", "values": col(rows, 3)}],
        "resourcePools": [{"id": "focus", "label": "Focus", "value": 0, "max": "1 + @prof", "die": "", "steps": [],
                           "step": 0, "recovery": [{"on": "lr", "amount": "all", "formula": ""},
                                                   {"on": "sr", "amount": "setHalf", "formula": ""}]}],
        "subclassLevel": 2, "subclassFeatureLevels": [2, 6, 10, 14, 18], "stanceGrant": "chakra",
        "subclasses": [uuid("classes", blaze["_id"])],
        "advancement": [
            adv(1, "feature", "1st-level features", [U(refined), U(compression), U(stance)]),
            adv(1, "itemChoice", "Chakra Stance", stance_uuids["chakra"], key="stance"),
            *mold_adv,
            adv(2, "feature", "2nd-level features", [U(tradition), U(scholar)]),
            adv(2, "mastery", "Scholar: Ninshou Mastery", [], count=1, key="skill.nin"),
            adv(3, "feature", "3rd-level features", [U(surge)]),
            adv(5, "feature", "5th-level features", [U(tenketsu), U(meditation)]),
        ],
    }, "icons/svg/fire.svg")
    return [nin, blaze, refined, compression, stance, tradition, scholar, surge, tenketsu, meditation, *moldings,
            fire, pyro]


# --------------------------------------------------------------------------------------------- #
#  Main                                                                                         #
# --------------------------------------------------------------------------------------------- #

def write(docs):
    owned = {}
    for pack in ("classes", "features", "stances", "feats", "jutsu"):
        folder = os.path.join(OUT, pack)
        os.makedirs(folder, exist_ok=True)
        for fn in os.listdir(folder):
            p = os.path.join(folder, fn)
            with open(p, encoding="utf-8") as f:
                if json.load(f).get("flags", {}).get("n5e", {}).get("generated"):
                    os.remove(p)
    for d in docs:
        pack = d.pop("_pack")
        p = os.path.join(OUT, pack, f"{slug(d['name'])}-{d['_id']}.json")
        if p in owned:
            raise SystemExit(f"duplicate output {p}")
        owned[p] = True
        with open(p, "w", encoding="utf-8") as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
            f.write("\n")
    return len(owned)


def main():
    kb = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("N5E_KB", "")
    if not kb:
        raise SystemExit(__doc__)
    core = read(os.path.join(kb, "_source", "full-with-boxes.md"))
    oro = read(os.path.join(kb, "_source", "classes", "orochimaru-full.md"))
    with open(os.path.join(kb, "_data", "jutsu-parsed.json"), encoding="utf-8") as f:
        parsed = json.load(f)
    stances = build_stances(core)
    stance_uuids = {
        "all": [uuid("stances", s["_id"]) for s in stances],
        "chakra": [uuid("stances", s["_id"]) for s in stances if "chakra" in s["system"]["categories"]],
    }
    feats, feat_names = build_feats(core)
    docs = [*build_scout(oro, stance_uuids), *build_ninjutsu(oro, stance_uuids), *stances, *feats, *build_jutsu(parsed)]
    n = write(docs)
    print(f"wrote {n} documents ({len(stances)} stances; feats: {', '.join(feat_names)})")


if __name__ == "__main__":
    main()
