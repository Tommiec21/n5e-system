/** The Freeform Jutsu window (NPC3d D1): the book's steps in order with the effective level and damage live. */
import FreeformWindow from "./freeform-window.mjs";
import { blankJutsu, jutsuFromForm, jutsuVM } from "../../view-models/freeform.mjs";
import { buildJutsu } from "../../rules/freeform.mjs";

export default class FreeformJutsuWindow extends FreeformWindow {
  static DEFAULT_OPTIONS = { window: { icon: "fa-solid fa-fire" } };
  static PARTS = { body: { template: "systems/n5e/templates/apps/freeform-jutsu.hbs" } };
  static KIND = "jutsu";
  static LABEL = "Freeform Jutsu";
  blank() { return blankJutsu(this.adv); }
  fromForm(f, prev) { return jutsuFromForm(f, prev); }
  viewModel(c, adv, o) { return jutsuVM(c, adv, o); }
  build(c, adv) { return buildJutsu(c, adv); }
}
