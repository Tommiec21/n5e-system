# SHEETS1 function spec: optional character sheet designs

Status: **approved 2026-11-15 (King: "Spend time building them all"). All five designs built in 0.54.0-alpha.1; see the build notes at the end. Mockups on the "N5e Alternate Character Sheets" canvas.**

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
- **The look is emulated faithfully (King 2026-11-15):** the shapes, colours and borders are design, not proprietary, so the Classic sheet copies them closely:
  - the hexagonal ability score tabs with their dark score box;
  - the dark character card holding the portrait, the AC shield with pips on each side, and the Initiative, Speed and Proficiency lozenges;
  - the HP bar with its TMP slot;
  - the notched double-bordered Skills and Saving Throws frames;
  - the maroon header with the level medallion and XP bar;
  - the vertical icon tabs down the right edge.
- **Asset files:** the shapes are drawn in CSS and inline SVG rather than shipping dnd5e's image files. Wizards of the Coast art (`ui/official`) and D&D names and marks stay out.
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

## SHEETS1c: Ink & Paper (King 2026-11-15: keep the first draft as its own design)

- **Layout:** the first Classic draft (mockup artboard 3), kept as its own design.
  - Dark ink header with a hexagon level badge.
  - Rounded ability tabs showing the score and save.
  - A cream card with the portrait and AC shield, pill lozenges, HP and Chakra bars, dice, favorites and conditions.
  - Pill tabs, skills with proficiency dots, traits as pills, and class resource pips.

## SHEETS1d: Shinobi Scroll (a Pf2e-style layout with ninja flair; King 2026-11-15)

- **The scroll (left):** a hanging paper scroll with wooden rods top and bottom and a coloured cord, in place of a banner. It holds:
  - HP and Chakra blocks: temp / current / max, the current boxed in colour.
  - Death save pips and dice.
  - The AC shield with DR beside it, speed and proficiency.
  - Initiative with its ability choice.
  - The six saves with mastery badges.
  - Immunities, weaknesses and resistances, each with an Edit button.
- **Header (right):** a crimson band with the name, Will of Fire pips, and a forehead-protector plate as the level badge, plus the XP bar.
- **Tab strip:** a navy band with gold rules, the section name and round icon tabs.
- **Body:** subtabs (Known Jutsu, Moldings, Activations). A crimson section bar shows the discipline with attack, save DC and mastery. Jutsu are grouped by rank, each row with a keyword chip, action symbol, defense, cost and a Cast button, and "Learn a Jutsu" sits at the bottom.
- **Fonts:** Shippori Mincho B1 for headings (SIL Open Font License), bundled.
- The Pf2e system's art and marks are not used; the layout is reworked for N5e.

## SHEETS1e: One UI style (King 2026-11-15)

- **Principles (Samsung One UI):** a large, calm viewing area at the top (portrait, big name, origins) and the controls in reach below it; rounded cards (26 px) on a soft grey ground; one accent blue; a bottom navigation bar with icons and labels.
- **Layout:** header (viewing area, XP, rest and level buttons as pills) · left column of cards (HP and CP, stat tiles, dice and death saves, resources, conditions) · main tab cards (favorites, abilities as round modifier buttons, saves, disciplines, skills) · bottom tab bar.
- **Dark mode:** follows Foundry's dark application theme, as One UI follows the phone's dark mode (mockup's dark variant).

## Later designs (proposals; King picks the order)

- **Scroll:** ink-on-paper, a shinobi scroll feel.
- **Minimal:** clean and spacious, few borders.
- **High contrast:** large type, strong contrast, for low vision.
- **Compact:** play-focused, everything on one screen, for veteran players.

Each is a new design folder and stylesheet on the same logic.

## Questions for King

- **Q-SH1 (answered):** per character: "Players can pick by changing their character sheet selection" (Foundry's Sheet menu). No world or user default setting.
- **Q-SH2 (answered):** vertical icon tabs down the right edge, as in dnd5e.
- **Q-SH3 (answered):** Glass keeps a dark background with a dark orange accent glow (#C2561A).
- **Q-SH4 (answered):** "Spend time building them all."
- **Q-SH5 (open):** the build restyles the other tabs (Combat, Jutsu, Inventory, Features, Effects, Biography) through each design's colours but keeps their layout. Should any design get its own layout for one of them next (for example the Scroll's jutsu table with rank groups and subtabs from mockup 4)?

## Progress log

- 2026-11-15 Claude: studied dnd5e release-5.3.3 (v13) sheet structure and licences; spec and two mockups written. Widened cube 10 ft applied (King).
- 2026-11-15 King: the first Classic mockup didn't emulate the hexagonal ability tabs, the dark character card, the shield, the bordered skill and save frames or the vertical tabs, and treated non-proprietary design as off-limits. Mockup redone to match the dnd5e sheet closely, vertical tabs included.
- 2026-11-15 King: keep the first draft as a third design and add a fourth, Pf2e-style with a scroll; many designs for different players. Mockups 3 (Ink & Paper) and 4 (Shinobi Scroll) added; designs are never overwritten from now on, each new idea is a new artboard.
- 2026-11-15 King: fifth design inspired by Samsung One UI; per-character choice; Glass dark with an orange glow; build them all. Mockup 5 added.
- 2026-11-15 Claude: built all five (0.54.0-alpha.1).

## Build notes (0.54.0-alpha.1)

- **Code:** `module/applications/actor/sheet-designs.mjs` (the list: id, label, window size, parts, shared partials) and `character-designs.mjs` (`designSheet(id)`, a `CharacterSheet` subclass per design, registered in `n5e.mjs` with `makeDefault: false`). Each design replaces the four chrome parts (header, tabs, rail, main) and keeps every other tab. Its chrome parts see all three chrome view models (`d.header`, `d.rail`, `d.main`), so a design can move a block, for example the Scroll puts the saves on the scroll and Glass and One UI put the portrait in the header.
- **Templates:** `templates/actor/designs/<id>/{header,tabs,rail,main}.hbs` and the shared blocks in `templates/actor/designs/shared/` (identity, xp, abilities, tabs, meters, stats, header buttons, pins, saves, disciplines, skills, extras, resources, conditions, death saves, dice). The shared blocks carry the buttons, rolls and fields, so a design is layout and style only.
- **Styles:** one file, `styles/designs.css`, a section per design scoped by `.n5e-design-<id>` (the spec said a file per design; one file keeps `system.json` short). Each section sets the `--n5e-*` colours, the window grid and the shapes, all in CSS (no images). Glass and dark One UI also tint the few light backgrounds the shared tabs hard-code.
- **Parity:** `tests/sheet-designs.test.mjs` renders the default chrome and each design's chrome in play and edit mode and checks the same buttons (action, roll type and key, rest type) and the same fields, each field once (a field twice would save as a list); it also compares the template text with the partials expanded, so blocks the test actor does not show (death saves, pins, level down) are covered.
- **Not built (spec items left for later):** client settings for a Glass accent picker and blur toggle; bundled fonts (the designs load Google Fonts like the default sheet and fall back to system fonts offline); Scroll's initiative ability choice and the immunities/weaknesses rows with Edit buttons (no such data in the system yet; not invented); a per-design layout for the tabs other than Main (Q-SH5).
- **Untested in Foundry:** checked with static renders in a browser (Playwright, without Foundry or Font Awesome). Worth a look in Foundry: the tab icons, the Glass blur, and One UI's dark mode under Foundry's theme setting.
