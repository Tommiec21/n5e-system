# ATK1 function spec: weapon attacks

Status: **awaiting King's approval and answers to Q1–Q3.**

Closes plan findings:
- R23: weapon attacks add only ability + proficiency + condition penalties.
- R24: the Unarmed Strike uses Str only.
- R25: strikes pick the first equipped weapon; there is no Light extra attack, no long-range disadvantage and no ranged-in-melee disadvantage.

It also makes the Chapter 5 weapon properties imported in DATA2 work in attacks.

Sources: Chapter 5 "Weapon Properties" (KB 08) and Chapter 8 "Making an Attack" (KB 03).

## Releases

| Release | Content |
| --- | --- |
| ATK1a `0.17.0-alpha.1` | Bonuses and Mastery, Unarmed Strike Str/Dex/Finesse, crits (Critical X, Deadly X), Heavy, Volatile, Versatile, range and reach (long range, ranged in melee), throwing and the thrown d4 Ammunition Die, Returning |
| ATK1b `0.17.0-alpha.2` | Multiattack bonus-action attack, the Light extra attack (Q1), strikes that choose a weapon by keyword, group or property, Evocation (Combat Scrolls) |

## ATK1a

### Bonuses (R23)

| Function | File | Behaviour |
| --- | --- | --- |
| `bonuses.attack.weapon`, `bonuses.attack.unarmed` (new) | `data/actor/creature.mjs` | Flat attack bonuses that Active Effects can target with ADD, like the discipline ones. |
| `bonuses.damage.weapon`, `bonuses.damage.unarmed` (new) | same | Flat damage bonuses. |
| `n5e.attack.weapon` / `n5e.attack.unarmed`, `n5e.damage.weapon` / `n5e.damage.unarmed` (new change keys) | `rules/change-keys.mjs` | Same as the flat bonuses, from n5e effects; listed in the effect editor. |
| Mastery on weapon attacks | `creature.mjs` | Mastery sources with target `attack.weapon` or `attack.unarmed` add their rank value to the attack, as for discipline attacks. |
| `weaponAttackSpec` (changed) | `workflow/attack.mjs` | Adds the bonuses, effects and Mastery above to the attack's Breakdown and the damage bonus to the damage. Rule elements with selectors `attack:weapon`, `attack:unarmed` and `damage:weapon` already apply (no change). |

### Unarmed Strike (R24)

| Function | File | Behaviour |
| --- | --- | --- |
| `unarmedAbility(actor)` | `rules/unarmed.mjs` (pure) | Str, or the better of Str and Dex when the creature casts Taijutsu with Dex (`disciplines.tai.ability === "dex"`). |
| `hasFinesse(actor, weapon)` | same | True for Finesse weapons and for the Unarmed Strike ("treated as finesse for features, feats and jutsu"). Features that ask for a finesse weapon use it. |
| `unarmedSpec` (changed) | same | Uses `unarmedAbility` for the modifier. |

### Crits

| Function | File | Behaviour |
| --- | --- | --- |
| `weaponCritBonus(weapon)` | `rules/weapon-properties.mjs` (new, pure) | Critical X: +X crit range for attacks with this weapon. It is added to the actor's crit range for the roll, and the total still stops at +3. |
| `deadlyDice(weapon)` | same | Deadly X: on a crit, +X of the weapon's own damage dice (see the note below). The Critical damage button rolls them. |

Note: crits double the dice and the ability modifier (King's ruling). Deadly adds X more of the weapon's own die after doubling: Katana 1d8, Deadly 1 → crit 2d8 + 1d8 + 2 × mod.

### Heavy, Volatile, Versatile

| Function | File | Behaviour |
| --- | --- | --- |
| `heavyPenalty(actor, weapon)` | `rules/weapon-properties.mjs` | Heavy and Str below 16 (the property's `strRequirement`): a disadvantage source "Heavy" on the attack. |
| `heavyDamage(actor, weapon)` | same | Heavy: half the Str modifier (rounded down) added to weapon damage. Whether this is on top of the normal ability modifier is Q3. |
| `volatileCheck(weapon, natural)` | same | Volatile X: no ability modifier on damage. A natural d20 at or below X backfires: the attack stops and the weapon is jammed. |
| `flags.n5e.jammed` on the weapon | `workflow/attack.mjs` | A jammed weapon can't attack or be used in a Bukijutsu. The weapon row and its card show **Unjam (Action)**, which spends the Action and clears the flag. |
| Versatile two-handed use | `view-models/combat.mjs`, `attack.mjs` | A Versatile weapon gets a second Combat-tab entry, "(two hands)", which rolls the Versatile die. |

### Range, reach and throwing (R25)

| Function | File | Behaviour |
| --- | --- | --- |
| `attackRange(weapon, mode)` | `rules/weapon-properties.mjs` | Melee: reach = 5 ft + 5 per Reach rank. Thrown or ranged: `{normal, long}`. |
| `attackMode(weapon, distance)` | same | `melee`, `thrown` or `ranged`. A weapon that is both melee and thrown is thrown when the target is beyond its reach, or when the attack was started from its "(thrown)" entry. Ranged weapons are always ranged. |
| `rangeSources(mode, range, distance, closeHostiles)` | same | Beyond normal range: disadvantage "Long range". Beyond long range: the attack is refused with a warning. Ranged or thrown within 5 ft of a hostile that isn't incapacitated: disadvantage "Ranged in melee". |
| `closeHostiles(token)` | `workflow/attack.mjs` | Hostile-disposition tokens within 5 ft that aren't Incapacitated, Stunned, Unconscious, Petrified or Blinded ("can see you"). |
| Ability by mode (changed) | `weaponAttackSpec` | Melee Str; ranged Dex; Finesse or thrown use the better of Str and Dex. The Thrown property text says thrown attacks use Strength; see Q2. |
| Thrown Ammunition Die | `tools/content/build-weapons.mjs` | Thrown weapons without the Ammunition property get a d4 Ammunition Die (d4 > 1 > gone). |
| `rollAmmo` (changed caller) | `attack.mjs` | The Ammunition Die is rolled only on thrown and ranged attacks, never on a melee swing ("only counts for ranged attacks"). |
| Returning | same | A Returning weapon thrown within 60 ft is called back and caught, so its Ammunition Die isn't rolled. |
| Combat tab | `view-models/combat.mjs` | Melee weapons with Thrown get a second entry, "(thrown)", showing the thrown range. |

## ATK1b

| Function | File | Behaviour |
| --- | --- | --- |
| Multiattack | `view-models/combat.mjs`, `attack.mjs` | A Multiattack weapon gets an entry "(bonus action)": one attack that spends the Bonus Action and adds no ability modifier to damage. |
| Light extra attack | same | Depends on Q1. |
| `pickWeapon(actor, need)` | `rules/weapon-properties.mjs` + `attack.mjs` | Strikes may name `need = {keywords, groups, properties}`. Equipped weapons that match are candidates. With one, it is used; with several, a small chooser opens. With none, the strike says which weapon it needs. Replaces "the first equipped weapon". |
| Evocation (Combat Scrolls) | `data/item/equipment.mjs`, item sheet, `attack.mjs` | New `system.evocation = {discipline: nin|gen|tai, type}`, set on the item sheet (the sealed echo). Attacks use that discipline's attack bonus (Taijutsu for a Weapon echo), add no ability modifier, allow 1 attack per Attack action, and the die grows to 2d/3d/4d at levels 5, 11 and 17. As a Bukijutsu's [Weapon Damage] it uses half the die. |

## Not in ATK1

- Disarm and Trip replacing an attack with the skill action (Chapter 5): a later batch, with CARD1's single action card.
- Battle Wire traps and Hiya Taihou's area attack: CARD1, which places areas from cards.
- Hidden (advantage on Sleight of Hand to conceal): stays a note on the item.
- Cover: KB 03 already lists it; it needs the GM's call per attack and stays manual.

## Tests

- `tests/weapon-attacks.test.mjs`: bonuses, effects and Mastery in the Breakdown; Unarmed Str/Dex; Critical and Deadly; Heavy below Str 16 and its damage; Volatile backfire and jam; Versatile die; reach, long range, beyond long range, ranged in melee; thrown mode and the thrown d4 die; Returning; Multiattack damage without the modifier; `pickWeapon` with zero, one and several matches; Evocation bonus and dice by level.
- Existing attack tests stay as they are.

## Questions for King

- **Q1. Light weapons.** The rules text gives two different versions:
  - Chapter 5, Light property: "While dual-wielding light weapons, you may make one extra attack with your off-hand weapon once per turn, when you take the Attack action." This reads as an extra attack inside the Attack action, with no Bonus Action.
  - Chapter 8, Two-Weapon Fighting: after the Attack action with a light weapon, "you can use a bonus action to attack with a different light weapon held in the other hand", without the ability modifier on damage.
  Which one applies? If it's the Chapter 5 one, does that extra attack add the ability modifier to damage?
- **Q2. Thrown ability.** Chapter 5's Thrown property says thrown attacks use Strength for attack and damage. Chapter 8 says Finesse or Thrown weapons can use either Str or Dex. Should throwing use Strength only, or the better of the two? (Kunai, Sai and other Finesse throwing weapons can use Dex either way.)
- **Q3. Heavy damage.** "Creatures add half of their Strength modifier to this [Weapons Damage] rolls." Is that half added on top of the normal ability modifier (Str +4 → damage + 4 + 2), or in place of it (+2 only)?
