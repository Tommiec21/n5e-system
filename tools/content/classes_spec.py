"""
Class specs for the data-driven class builder (build_class in build_content.py), levels 1-5.

One dict per class. Everything here is either copied from the class's Proficiencies block and table
(Orochimaru's Observation Compendium) or names a heading in the book; the text itself is always
read from the book. To import more levels later, raise MAX_LEVEL in build_content.py and add the
new core features to "core" (subclass features and option counts already follow the book).

Keys
  name, ident, heading           class name, identifier (slug), its "## " heading in the book
  table                          the start of its table's header row (unique in the book)
  hitDie, chakraDie, tier        dice and jutsu tier
  saves, skills, tools           proficiencies (skills/tools: fixed, choose, from)
  armor, weapons
  columns                        [(key, label, column index, "num" | "dice")]; "dice" stores the dice
                                 count ("2d8" -> 2) for @scale.<classCamelCase>.<key>
  jutsuCol                       column index of Jutsu Known
  stance                         (level, stance list key) the class's stance pick, or None
  grantStance                    (level, stance name) a stance granted outright (Hunter-Nin: Silent Killing)
  core                           [(level, "### Heading", options)] options: act, img, pools, split
                                 (drop the "#### " sub-options from the text: they're imported as options),
                                 id (keep an existing document id), name (display name if not the heading's)
  subclass                       {group, level, levels, label}: "## " group heading whose "### " entries
                                 are subclasses; their "#### " features carry their level in the text
  options                        [{key, label, region, prefix, counts | column}] option lists:
                                   region   heading whose items are the options
                                   prefix   "#### " or "### " (the options' heading level)
                                   counts   {level: how many to pick}, or column: (index, first level)
  extra                          extra advancement entries: (level, type, title, values, count, key)
"""

ACT_ICON = "icons/svg/upgrade.svg"

POOL = lambda pid, label, mx, die="", recovery=(("lr", "all", "", ""),): {
    "id": pid, "label": label, "value": 0, "max": mx, "die": die, "steps": [], "step": 0,
    "recovery": [{"on": on, "amount": amt, "formula": f, "requires": req} for on, amt, f, req in recovery]}

CLASSES = [
    {
        "name": "Genjutsu Specialist", "ident": "genjutsu-specialist", "heading": "## Genjutsu Specialist",
        "table": "| Level | Proficiency Bonus | Features | Malleable Mirages", "hitDie": "d6", "chakraDie": "d12", "tier": "high",
        "saves": ["con", "wis", "cha"],
        "skills": {"fixed": ["ill"], "choose": 3, "from": ["cha", "dec", "his", "ins", "itm", "inv", "prc", "per", "ste"]},
        "tools": {"fixed": ["disguise", "poison"], "choose": 0, "from": []},
        "armor": ["light"], "weapons": ["simple", "Combat Scrolls", "Giant Combat Scrolls"],
        "columns": [("malleableMirages", "Malleable Mirages", 3, "num")], "jutsuCol": 4,
        "stance": (1, "chakra"),
        "core": [
            (1, "### Actualization", {"img": "icons/svg/daze.svg",
                "pools": [POOL("actualizationDice", "Actualization Dice", "1 + @prof", "d6",
                               (("lr", "all", "", ""), ("sr", "formula", "lvl(5:2,11:3,17:4)", "mental-refocus")))]}),
            (1, "### Chakra Disruption", {"act": "special"}),
            (1, "### Chakra Stance", {"img": "icons/svg/aura.svg"}),
            (2, "### Genjutsu Pledge", {}),
            (2, "### Malleable Mirages", {}),
            (3, "### Genjutsu Inception", {}),
            (3, "### Keen Awareness", {}),
            (5, "### Mind Over Matter", {}),
            (5, "### Mental Refocus", {}),
        ],
        "subclass": {"group": "## Genjutsu Pledges", "level": 2, "levels": [2, 6, 10, 14, 18], "label": "Genjutsu Pledge"},
        "options": [
            {"key": "gen-mirage", "label": "Malleable Mirages", "region": "## Malleable Mirages", "prefix": "#### ", "column": (3, 2)},
            {"key": "gen-inception", "label": "Genjutsu Inception", "region": "## Genjutsu Inception", "prefix": "### ", "counts": {3: 1}},
        ],
        "extra": [(1, "mastery", "Actualization: Illusions Mastery", [], 1, "skill.ill")],
    },
    {
        "name": "Hunter-Nin", "ident": "hunter-nin", "heading": "## Hunter-Nin",
        "table": "| Level | Proficiency Bonus | Features | Lethal Attack", "hitDie": "d10", "chakraDie": "d8", "tier": "low",
        "saves": ["dex", "int", "wis"],
        "skills": {"fixed": ["ste"], "choose": 4, "from": []},
        "tools": {"fixed": ["disguise", "forensics", "forgery"], "choose": 0, "from": []},
        "armor": ["light"],
        "weapons": ["simple", "Broadsword", "Iron Claw", "Jitte", "Katana", "Odachi", "Scythe", "Battle Wire", "Knuckle Blades",
                    "Chakram", "Longbow", "Fuma-Shuriken"],
        "columns": [("lethalAttack", "Lethal Attack", 3, "dice"), ("exploits", "Exploits", 4, "num")], "jutsuCol": 5,
        "stance": None, "grantStance": (1, "Silent Killing"),
        "core": [
            (1, "### Swift Response", {}),
            (1, "### Lethal Precision", {}),
            (1, "### Lethal Attack", {"act": "special", "img": "icons/svg/blood.svg"}),
            (2, "### Cunning Action", {"act": "bonus action"}),
            (2, "### Hunters Exploits", {"pools": [POOL("skilledExploits", "Skilled Exploits", "@prof")]}),
            (2, "### Primary Target", {"act": "bonus action", "img": "icons/svg/target.svg"}),
            (3, "### Hunter Creed", {}),
            (5, "### Uncanny Dodge", {"act": "reaction"}),
            (5, "### Mastery", {"name": "Mastery (Hunter-Nin)"}),
        ],
        "subclass": {"group": "## Hunters Creeds", "level": 3, "levels": [3, 6, 10, 14, 17], "label": "Hunter Creed"},
        "options": [
            {"key": "hunter-exploit", "label": "Hunters Exploits", "region": "## Hunters Exploits", "prefix": "#### ", "column": (4, 2)},
        ],
        "extra": [(1, "option", "Lethal Precision: cast with Dexterity", ["tai", "buki"], 1, "lethalPrecision"),
                  (5, "mastery", "Mastery: a skill or toolkit you're proficient in", [], 1, "")],
    },
    {
        "name": "Medical-Nin", "ident": "medical-nin", "heading": "## Medical-Nin",
        "table": "| Level | Proficiency Bonus | Features | Channeled Healing", "hitDie": "d8", "chakraDie": "d10", "tier": "high",
        "saves": ["str", "wis", "cha"],
        "skills": {"fixed": ["med", "cha"], "choose": 2, "from": ["his", "ins", "prc", "ill", "nin"]},
        "tools": {"fixed": ["medicine", "poison"], "choose": 0, "from": []},
        "armor": ["light", "medium"], "weapons": ["simple"],
        "columns": [("channeledHealing", "Channeled Healing", 3, "num")], "jutsuCol": 4,
        "stance": None,
        "core": [
            (1, "### Medical Release", {"img": "icons/svg/regen.svg"}),
            (1, "### Rejuvenating Rest", {}),
            (1, "### Channeled Healing", {"img": "icons/svg/regen.svg"}),
            (2, "### Tenets of Medicine", {}),
            (3, "### Medical Domain", {"img": "icons/svg/heal.svg",
                "pools": [POOL("domainCharges", "Domain Charges", "lvl(3:4,11:5,17:6)", "",
                               (("sr", "all", "", ""), ("lr", "all", "", "")))]}),
            (5, "### Bladed Chakra Scalpel", {"act": "bonus action", "img": "icons/svg/sword.svg"}),
            (5, "### Mystical Palm", {"act": "bonus action", "img": "icons/svg/regen.svg"}),
        ],
        "subclass": {"group": "## Tenets of Medicine", "level": 2, "levels": [2, 6, 10, 14, 18], "label": "Tenet of Medicine"},
        "options": [],
        "extra": [(1, "mastery", "Medical Release: Medicine Mastery", [], 1, "skill.med")],
    },
    {
        "name": "Taijutsu Specialist", "ident": "taijutsu-specialist", "heading": "## Taijutsu Specialist", "id": "n5eTaiSpecClass1",
        "table": "| Level | Proficiency Bonus | Features | Martial Die", "hitDie": "d12", "chakraDie": "d6", "tier": "low",
        "saves": ["str", "dex", "cha"],
        "skills": {"fixed": ["mar"], "choose": 3, "from": ["acr", "ath", "cha", "his", "ins", "inv", "nat", "ste", "prc", "med"]},
        "tools": {"fixed": ["disguise", "trappers"], "choose": 0, "from": []},
        "armor": ["light", "medium"], "weapons": ["simple", "Combat Bracers", "Iron Claws", "Nunchaku", "Tonfa", "Knuckle Blades", "Battle Wire"],
        "columns": [("martialDie", "Martial Die", 3, "num"), ("martialTechniques", "Martial Techniques", 4, "num")], "jutsuCol": 5,
        "stance": (1, "taijutsu"),
        "core": [
            (1, "### Martial Technique", {"id": "n5eMartialTech01", "img": "icons/skills/melee/unarmed-punch-fist.webp"}),
            (1, "### Enhanced Movement", {}),
            (1, "### Martial Adept", {"pools": [POOL("martialDice", "Martial Dice", "@scale.taijutsuSpecialist.martialDie", "d6",
                                                    (("turn", "all", "", ""),))]}),
            (2, "### Chakra Valves", {"act": "special"}),
            (2, "### Physical Genius", {}),
            (2, "### Student of Perfection", {"split": True}),
            (3, "### Taijutsu Style", {}),
            (5, "### Extra Attack", {}),
            (5, "### Moment of Stillness", {"split": True, "act": "special"}),
        ],
        "subclass": {"group": "## Taijutsu Style", "level": 3, "levels": [3, 6, 10, 14, 17], "label": "Taijutsu Style"},
        "options": [
            {"key": "tai-technique", "label": "Martial Techniques", "region": "## Martial Techniques", "prefix": "#### ", "column": (4, 1)},
            {"key": "tai-perfection", "label": "Paths of Perfection", "region": "### Student of Perfection", "prefix": "#### ", "counts": {2: 1}},
            {"key": "tai-stillness", "label": "Moment of Stillness", "region": "### Moment of Stillness", "prefix": "#### ", "counts": {5: 1}},
        ],
        "extra": [],
    },
    {
        "name": "Weapon Specialist", "ident": "weapon-specialist", "heading": "## Weapon Specialist",
        "table": "| Level | Proficiency Bonus | Features | Discipline", "hitDie": "d10", "chakraDie": "d8", "tier": "low",
        "saves": ["str", "dex", "con"],
        "skills": {"fixed": ["mar"], "choose": 3, "from": ["acr", "ath", "his", "itm", "prc", "slt", "ste", "sur"]},
        "tools": {"fixed": ["trappers", "poison", "smiths"], "choose": 0, "from": []},
        "armor": ["light", "medium", "heavy"], "weapons": ["simple", "martial", "one exotic"],
        "columns": [("discipline", "Discipline", 3, "num"), ("katasKnown", "Katas Known", 4, "num")], "jutsuCol": 5,
        "stance": (1, "bukijutsu"),
        "core": [
            (1, "### Weapon Focus", {}),
            (1, "### Discipline", {"img": "icons/svg/sword.svg",
                "pools": [POOL("discipline", "Discipline", "@scale.weaponSpecialist.discipline", "d12",
                               (("sr", "all", "", ""), ("lr", "all", "", "")))]}),
            (1, "### Weapon Stance", {"img": "icons/svg/aura.svg"}),
            (2, "### Katas", {}),
            (2, "### Augmentation", {"split": True}),
            (2, "### Eye for Skill", {"act": "bonus action"}),
            (3, "### Combat Doctrine", {}),
            (5, "### Extra Attack", {}),
            (5, "### Critical Focus", {}),
        ],
        "subclass": {"group": "## Combat Doctrines", "level": 3, "levels": [3, 6, 10, 14, 17], "label": "Combat Doctrine"},
        "options": [
            {"key": "weapon-kata", "label": "Katas", "region": "## Kata", "prefix": "#### ", "column": (4, 2)},
            {"key": "weapon-augmentation", "label": "Augmentations", "region": "### Augmentation", "prefix": "#### ", "counts": {2: 1}},
        ],
        "extra": [(1, "option", "Weapon Focus: weapon group", ["Blade", "Flail", "Polearm", "Power", "Thrown/Ammunition"], 1, "weaponFocus")],
    },
]
