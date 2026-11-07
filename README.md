# N5e 4.0 for Foundry VTT

The Naruto 5e (N5e 4.0) game system for Foundry Virtual Tabletop v13.

**Status: 0.1.0-alpha.1 (Phase 1).** Every data model, rules registry, derived number, and the V3.1
migration are in. Sheets are placeholders; rolling, casting, and automation arrive in later phases.

## Install

In Foundry: **Game Systems → Install System**, paste the manifest URL, Install:

```
https://github.com/<owner>/<repo>/releases/latest/download/system.json
```

Foundry checks that URL for updates, so every published release shows up as an update.

> The system id is `n5e`, the same as the V3.1 system, so existing worlds upgrade in place.
> **Back up your worlds before installing.** The first time a GM opens an old world, the system
> asks before saving the converted data.

## What's in alpha.1

- Actor types: `character`, `npc` (summons, clones, companions are NPC templates).
- Item types: jutsu, weapon, armor, consumable, toolkit, container, loot, class, subclass, clan,
  background, feat, stance.
- Effect types: condition (ranked), state, amp, stance, concentration, generic.
- Derived: proficiency, Mastery (with level caps), HP/CP, AC formulas, initiative, saves, skills,
  passives, discipline attack/DC, inventory slots and Encumbered, Bloodied/Drained, live jutsu cost,
  DC, attack, and upcast range.
- `CONFIG.N5E` registries for every rule list; `game.n5e.api.register*()` for homebrew.
- Custom Active Effect keys: `n5e.mastery.*`, `n5e.dr`, `n5e.pierce`, `n5e.critRange.*`,
  `n5e.cost.*`, `n5e.saveDC.*`, `n5e.attack.*`, `n5e.disciplineAbility.*`, `n5e.saveTier.shift`,
  `n5e.concentration.max`, `n5e.upkeep.*`, `n5e.dice.all`.
- Sample compendium content for testing (Taijutsu Specialist, Martial Technique, Uchiha,
  Dynamic Entry, Leaf Hurricane, Kunai, Shinobi Jacket, Shinobi Backpack).

## Development

See [docs/DEVELOPER.md](docs/DEVELOPER.md).
