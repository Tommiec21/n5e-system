/**
 * Optional character sheet designs (SHEETS1; docs/SHEETS1_SPEC.md). Each design is the same
 * CharacterSheet (context, view models, actions, drag and drop, edit and play modes) with its own
 * chrome templates (header, tabs, rail, main) and its own stylesheet section (styles/designs.css),
 * scoped by the class n5e-design-<id>. The other tabs (Combat, Jutsu, Inventory, Features, Effects,
 * Biography) use the shared templates, restyled by the design's colours.
 *
 * Players choose a design per character from the sheet's Sheet menu (King Q-SH1).
 * tests/sheet-designs.test.mjs checks every design keeps every button and field of the default sheet.
 */
import CharacterSheet from "./character-sheet.mjs";
import { headerVM, railVM, mainVM } from "../../view-models/character.mjs";
import { SHEET_DESIGNS, DESIGN_PARTS, DESIGN_TEMPLATE_PATHS } from "./sheet-designs.mjs";

export { SHEET_DESIGNS, DESIGN_PARTS, DESIGN_TEMPLATE_PATHS };

const designTemplate = (id, part) => `systems/n5e/templates/actor/designs/${id}/${part}.hbs`;

/** The sheet class of one design. */
export function designSheet(id) {
  const design = SHEET_DESIGNS[id];
  if ( !design ) throw new Error(`Unknown sheet design: ${id}`);
  const parts = foundry.utils.deepClone(CharacterSheet.PARTS);
  for ( const part of DESIGN_PARTS ) parts[part] = { ...parts[part], template: designTemplate(id, part) };
  // A named class: Foundry saves the chosen sheet as "n5e.<class name>" on the actor, so each design
  // needs its own stable name (an anonymous class would register every design under the same id).
  const name = `CharacterSheet${id[0].toUpperCase()}${id.slice(1)}`;
  return { [name]: class extends CharacterSheet {
    static DEFAULT_OPTIONS = {
      // The full list, as the NPC sheet does (the parent's classes plus the design's scope).
      classes: ["n5e", "sheet", "actor", "character", "n5e-v2", "n5e-design", `n5e-design-${id}`],
      position: { width: design.width, height: design.height }
    };

    static PARTS = parts;

    static DESIGN = id;

    /** @override  The chrome parts also see the other chrome view models (a design may move a block). */
    async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      if ( !DESIGN_PARTS.includes(partId) ) return context;
      const actor = this.actor;
      const conditions = { ...CONFIG.N5E.conditions, ...CONFIG.N5E.clanConditions };
      context.d = {
        header: partId === "header" ? context.vm : headerVM(actor),
        rail: partId === "rail" ? context.vm : railVM(actor, conditions),
        main: partId === "main" ? context.vm : mainVM(actor)
      };
      context.conditionChoices ??= Object.entries(conditions).map(([key, c]) => ({ key, label: c.label })).sort((a, b) => a.label.localeCompare(b.label));
      context.design = id;
      return context;
    }
  } }[name];
}
