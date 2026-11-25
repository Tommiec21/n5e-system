# Shinobi Dossier — SD01/SD02

2026-11-25. Owner: Codex. Based on main 328af7b2 / 0.109.0-alpha.1. Approved reference and full plan: Codex/N5e System/Reports/Shinobi Dossier.

## SD01 control map

| Surface | Dossier placement | Source of behavior |
| --- | --- | --- |
| Name, origin pick/swap/open, level | Header identity and level label | shared identity partial; current CharacterSheet |
| Level up/down/history, ability scores, rest/edit controls | Header buttons | shared header-buttons; current handlers |
| XP, six abilities | Header strip | shared XP/abilities; current view models |
| Portrait, AC/DR/speed/initiative/proficiency | Persistent rail | shared stats and existing portrait action |
| HP/CP/temp, dice, resources | Persistent rail | shared meters/dice/resources |
| Conditions/ranks/end/remove and conditional death saves | Persistent rail | shared conditions/death-saves |
| Pins and drag/drop zone | Main top | shared pins |
| Saves and disciplines | Two Main sections | shared saves/disciplines |
| Skills/mastery, passives, toolkits, optional callouts | Main lower area | shared skills/extras |
| Combat/Jutsu/Inventory/Features/Effects/Biography | Existing seven-tab navigation | unchanged native tab templates/handlers |

The image's sample values, portrait and conditional death saves do not override real Actor data. Current shared controls take priority over any omission in the mockup; source parity checks cover play/edit controls and single field occurrences.

## SD02 implementation

New optional registry entry dossier, localized label N5e Character: Shinobi Dossier, four templates under templates/actor/designs/dossier and scoped CSS in styles/designs.css. Uses existing designSheet inheritance without changing handlers, view models, shared partials or game rules. Existing designs/default selection are unchanged. Journal artwork is reused as packaged files only; no dependency on the Journal Desk application.

Static preview uses actual templates and a fixture Actor at 1180x900; not live Foundry verification. First preview harness attempt failed on its helper import path; second succeeded, third confirmed save/condition layout corrections. Stop further preview runs for this batch. No live instance or local installation.

All 15 existing sheet-design parity checks passed once, including Dossier play/edit, action equality, unique fields, registration and labels. PR/main CI reserved as attempts 2/3. Static preview does not establish full drag/drop, tooltip or editor behavior in Foundry.

## Remaining batches

- SD03: detailed Combat and Jutsu styling; existing templates remain usable now.
- SD04: detailed Inventory and Features styling.
- SD05: detailed Effects and Biography styling.
- SD06: smaller-window/edge-case inspection and user acceptance finish. Current CSS includes initial wrapping/scrolling; minimum-size visual acceptance is not yet certified.

Secondary-tab specification: retain shared rows and actions, apply Dossier typography and compact dividers; never replace gameplay handlers for appearance. Inventory keeps numeric columns aligned; Jutsu keeps filters/costs/casts/learning; Effects keeps management; Biography retains native editor. No feature is intentionally removed.

Current minimum width: 740px; default 1180x900. Main content scrolls; resources remain in their own rail. Complete all seven tab styling batches before claiming the full approved design is finished.

Font steering: user supplied Ninja Naruto ZIP. Original njnaruto.ttf and readme bundled unchanged; its readme permits free unmodified distribution and prohibits selling the font alone or with a product. Dossier-scoped headings, jutsu/feature names and stat labels use it; numbers/body text retain ordinary fonts. No other sheet design is restyled. SD03–SD05 still cover detailed secondary-tab layouts.

PR CI attempt 2 failed one startup test because it hard-coded five optional designs (13 sheets total). Replaced that count with base-sheet count plus the design registry and an explicit Dossier assertion. No gameplay failure found. All 15 parity checks had passed. A revised PR check would be parity attempt 3; main release verification would require one additional authorized run. No further checks run yet.
