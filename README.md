# N5e 4.0 for Foundry VTT

The Naruto 5e (N5e 4.0) game system for Foundry Virtual Tabletop v13.

**Status:** alpha, in active development. See [CHANGELOG.md](CHANGELOG.md) for what each release added.

What works today: character and NPC sheets (with a Combat tab), level-up from 1st level, item sheets,
d20 rolls with breakdowns, casting with cost/upcast/Moldings/Maneuvers, attacks, damage application
(DR, Pierce, resistances, interception, 0 HP and death saves), conditions with ranks and their
lifecycle, rests and the optional Ration Pool, combat trackers (Chain, concentration, stance, Combo,
Fury, Marks, Amps, 8-Inner Gates), a GM Party Overview, and an N5e Rules panel where the GM can turn
every automated rule on or off.

## Install

In Foundry: **Game Systems → Install System**, paste the manifest URL, Install:

```
https://github.com/Tommiec21/n5e-system/releases/latest/download/system.json
```

Foundry checks that URL for updates, so every published release shows up as an update.

> The system id is `n5e`, the same as the V3.1 system, so existing worlds upgrade in place.
> **Back up your worlds before installing.** The first time a GM opens an old world, the system
> asks before saving the converted data.

## Development

See [docs/DEVELOPER.md](docs/DEVELOPER.md): how the code is organized, how data flows, and recipes for
the common changes (adding a condition, a rule toggle, a sheet button, automation for a feature).
[docs/RULES_MAP.md](docs/RULES_MAP.md) maps each rule to the code that implements it, and
[docs/DATA_REFERENCE.md](docs/DATA_REFERENCE.md) lists every stored field, flag, setting and hook.
