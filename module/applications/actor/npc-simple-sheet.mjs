/**
 * Simple NPC sheet (NPC1b): the whole stat block on one page, in the Bingo Book's order (header,
 * traits, jutsu by discipline and rank, attacks). Read first: names roll or post their card, and
 * current HP and CP can be typed. An alternative picked per NPC from the sheet menu; the tabbed
 * sheet (npc-sheet.mjs) is the default (King Q-N13) and is where an adversary is built.
 * It extends the tabbed sheet for its actions (roll, useItem) and its limited view.
 */
import NPCSheet from "./npc-sheet.mjs";
import { npcSimpleVM } from "../../view-models/npc.mjs";

const T = name => `systems/n5e/templates/actor/npc/${name}.hbs`;

export default class NPCSimpleSheet extends NPCSheet {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "actor", "npc", "npc-simple", "n5e-v2"],
    position: { width: 520, height: 760 }
  };

  static PARTS = {
    simple: { template: T("simple"), scrollable: [""] },
    limited: { template: T("limited") }
  };

  /** @override  One page, no tabs. */
  async _preparePartContext(partId, context, options) {
    if ( partId === "limited" ) return super._preparePartContext(partId, context, options);
    context.vm = npcSimpleVM(this.actor);
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    for ( const t of context.vm.traits ) t.text = await TextEditor.enrichHTML(t.text, { relativeTo: this.actor });
    context.vm.publicNotes = await TextEditor.enrichHTML(context.vm.publicNotes ?? "", { relativeTo: this.actor });
    return context;
  }
}
