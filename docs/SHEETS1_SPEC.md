# SHEETS1 function spec: optional character sheet designs

Status: **spec written 2026-11-15 (King: fork the dnd5e character sheet design into a second sheet, then alternative designs such as glass). Mockups on the "N5e Alternate Character Sheets" canvas. Awaiting answers and approval.**

Goal (King): aesthetically pleasing character sheets that players can choose, with the same (or nearly the same) functionality, for different kinds of players.

## Design

- **One sheet logic, many designs.** Each design is a subclass of the current `CharacterSheet` (same context, view-models, actions, drag and drop, rolls, edit and play modes). It differs only in its parts (templates) and its stylesheet.
- **Where things live:**
  - Templates: `templates/actor/designs/<design>/`.
  - Styles: `styles/designs/<design>.css`, scoped to `.n5e-design-<design>` on the window.
  - Shared row partials (a jutsu row, an inventory row, a condition chip) are reused, so no design loses a button.
- **Choosing a design:** each design is registered as a selectable character sheet ("N5e Character: Classic", "N5e Character: Glass"). A player picks one from the sheet's Sheet menu (Foundry's own setting, saved per character), and a client setting gives each user's default for new sheets (Q-SH1). The current sheet stays the system default.
- **Parity check:** a test renders each design's parts against the same view-model and checks that every `data-action` the current sheet has also appears in the design (nothing silently missing).

## SHEETS1a: Classic (a fork of the dnd5e character sheet layout)

- **Source:** dnd5e `release-5.3.3` (the last line for Foundry v13): `templates/actors/character-*.hbs`, `templates/actors/tabs/*`, `less/v2/character.less` and `sheets.less`. The dnd5e software is MIT (© 2021 Andrew Clayton); the forked templates and styles keep that notice in `THIRD-PARTY-NOTICES.md` and in each forked file's header.
- **Not taken from dnd5e:** its artwork and badges are under other terms (Wizards of the Coast art under `ui/official`, icon licences, textures with no stated licence). The AC shield, level badge, lozenges and textures are redrawn in CSS. No D&D names or marks appear anywhere.
- **Fonts:** Roboto Slab and Roboto Condensed (Apache 2.0), bundled with their licence so the sheet works offline.
- **Layout (mockup artboard 1):**
  - Header: dark band with the name, "clan · class level · subclass", rest buttons, Play/Edit, XP bar and level badge.
  - Ability score tabs hanging under the header: modifier, score, save.
  - Left card:
    - Portrait with the AC shield.
    - Lozenges: Initiative, Speed, Proficiency, DR.
    - HP and Chakra bars, Hit Dice and Chakra Dice.
    - Favorites, then conditions.
  - The body holds the tabs: Details (skills with proficiency dots and passives, traits as pills, class resources as pips), Combat, Jutsu, Inventory, Features, Effects, Biography.
- **N5e in place of dnd5e:** Chakra beside HP, DR beside AC, Jutsu in place of Spells, class resource pools in place of spell slots, and condition ranks.

## SHEETS1b: Glass

- **Layout:** the same parts in frosted panels over a dark ground with soft light (mockup artboard 2): translucent panels, blurred backdrop, light borders, white type, rounded controls, and bigger touch targets for tablet players.
- **Accent:** a light colour each player picks (a client setting).
- **Contrast:** text is checked against the darkest backdrop it can sit on.
- **Performance:** backdrop blur is used on the five large panels only, never on list rows, and can be turned off (a client setting) for slower machines.

## Later designs (proposals; King picks the order)

- **Scroll:** ink-on-paper, a shinobi scroll feel.
- **Minimal:** clean and spacious, few borders.
- **High contrast:** large type, strong contrast, for low vision.
- **Compact:** play-focused, everything on one screen, for veteran players.

Each is a new design folder and stylesheet on the same logic.

## Questions for King

- **Q-SH1:** Should players choose per character (Foundry's Sheet menu), with a personal default for new sheets? Or should the GM set one design for the world?
- **Q-SH2:** Tabs on the Classic sheet: dnd5e puts them as icons down the right edge of the window. The mockup keeps them as a row above the body. Which do you want?
- **Q-SH3:** Glass: a fixed dark ground with one accent glow, or should players pick their own background image?
- **Q-SH4:** After Classic and Glass, which design comes next?

## Progress log

- 2026-11-15 Claude: studied dnd5e release-5.3.3 (v13) sheet structure and licences; spec and two mockups written. Widened cube 10 ft applied (King).
