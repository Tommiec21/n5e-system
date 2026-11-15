/** The Freeform Strike window (NPC3d D2): the book's five decisions with the table's damage live. */
import FreeformWindow from "./freeform-window.mjs";
import { blankStrike, strikeFromForm, strikeVM } from "../../view-models/freeform.mjs";
import { buildStrike } from "../../rules/freeform.mjs";

export default class FreeformStrikeWindow extends FreeformWindow {
  static DEFAULT_OPTIONS = { window: { icon: "fa-solid fa-hand-fist" } };
  static PARTS = { body: { template: "systems/n5e/templates/apps/freeform-strike.hbs" } };
  static KIND = "strike";
  static LABEL = "Freeform Strike";
  blank() { return blankStrike(); }
  fromForm(f, prev) { return strikeFromForm(f, prev); }
  viewModel(c, adv, o) { return strikeVM(c, adv, o); }
  build(c, adv) { return buildStrike(c, adv); }
}
