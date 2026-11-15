/**
 * The shared window behind the Freeform Strike and Freeform Jutsu windows (NPC3d; King 2026-11-14):
 * a small form whose every change updates the choices and re-renders the live numbers, and a Create
 * or Update button. On an NPC it writes the item; opened from the Adversary Builder it hands the
 * choices back to the builder's draft instead (nothing is saved until the builder saves).
 *
 * Subclasses: freeform-strike.mjs, freeform-jutsu.mjs. Logic: rules/freeform.mjs, view-models/freeform.mjs.
 */
import { adversaryOf } from "../../rules/freeform.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class FreeformWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "n5e-v2", "n5e-freeform"],
    tag: "form",
    window: { resizable: true },
    position: { width: 640, height: "auto" },
    form: { handler: FreeformWindow.#onForm, submitOnChange: true, closeOnSubmit: false },
    actions: { save: FreeformWindow.#onSave }
  };

  /** "strike" or "jutsu". */
  static KIND = "";
  static LABEL = "";

  /**
   * @param {{actor?: Actor, item?: Item, choices?: object, adv?: object, onSave?: Function}} options
   *   adv     the adversary's numbers when there is no actor yet (the builder's draft)
   *   onSave  called with (choices) instead of writing an item (the builder)
   */
  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? options.item?.parent ?? null;
    this.item = options.item ?? null;
    const saved = this.item?.flags?.n5e?.freeform?.choices;
    this.choices = structuredClone(options.choices ?? saved ?? this.blank());
  }

  get adv() {
    return this.options.adv ?? adversaryOf(this.actor);
  }

  get isEdit() {
    return !!(this.item || this.options.isEdit);
  }

  get title() {
    return `${this.constructor.LABEL}: ${this.choices.name || (this.isEdit ? "edit" : "new")}`;
  }

  /* Subclass hooks */
  blank() { return {}; }
  fromForm(f, prev) { return prev; }
  viewModel() { return {}; }
  build() { return null; }

  /** @override */
  async _prepareContext() {
    return { vm: this.viewModel(this.choices, this.adv, { isEdit: this.isEdit }) };
  }

  static async #onForm(event, form, formData) {
    this.choices = this.fromForm(formData.object, this.choices);
    return this.render();
  }

  static async #onSave() {
    if ( !this.choices.name?.trim() ) return ui.notifications.warn(`Give the ${this.constructor.LABEL} a name.`);
    if ( this.options.onSave ) {
      await this.options.onSave(structuredClone(this.choices));
      return this.close();
    }
    if ( !this.actor ) return null;
    const data = this.build(this.choices, this.adv);
    if ( this.item ) {
      await this.item.update({ name: data.name, system: data.system, flags: data.flags });
    } else await this.actor.createEmbeddedDocuments("Item", [data]);
    return this.close();
  }

  /** Open the right window for a Freeform item (the context menu's Edit). */
  static async openFor(item) {
    const kind = item?.flags?.n5e?.freeform?.kind;
    const cls = kind === "strike" ? (await import("./freeform-strike.mjs")).default
      : kind === "jutsu" ? (await import("./freeform-jutsu.mjs")).default : null;
    return cls ? new cls({ item }).render({ force: true }) : null;
  }
}
