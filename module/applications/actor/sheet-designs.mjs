/**
 * The optional character sheet designs (SHEETS1), as data: no Foundry imports, so tests can read it.
 * The sheet classes are built in character-designs.mjs.
 */

/** The designs: id → {label, size}. The order is the order in the Sheet menu. */
export const SHEET_DESIGNS = {
  dossier: { label: "N5E.SheetDesignDossier", width: 1180, height: 900 },
  classic: { label: "N5E.SheetDesignClassic", width: 1000, height: 960 },
  glass: { label: "N5E.SheetDesignGlass", width: 980, height: 960 },
  ink: { label: "N5E.SheetDesignInk", width: 960, height: 960 },
  scroll: { label: "N5E.SheetDesignScroll", width: 1020, height: 960 },
  oneui: { label: "N5E.SheetDesignOneUI", width: 1000, height: 980 }
};

/** The chrome parts a design replaces (the tab bodies stay shared). */
export const DESIGN_PARTS = ["header", "tabs", "rail", "main"];

/** Shared pieces the designs place in their own layouts (registered as partials at init). */
export const DESIGN_TEMPLATE_PATHS = ["identity", "xp", "abilities", "tabs", "meters", "stats", "header-buttons", "pins", "saves", "disciplines", "skills", "extras", "resources", "conditions", "death-saves", "dice", "defenses"]
  .map(n => `systems/n5e/templates/actor/designs/shared/${n}.hbs`);

