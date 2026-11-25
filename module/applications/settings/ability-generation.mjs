/**
 * CREATE1 C1 (King 2026-11-25, Q-C1): the GM's Starting Ability Scores setup. Toggles for Point Buy
 * (with its points), the Standard Array (the GM can add arrays; one is on at a time) and Roll.
 * Saved in the world setting abilityGenerationConfig (rules/ability-generation.mjs cleanConfig).
 */
import { cleanConfig, addArray, parseArray } from "../../rules/ability-generation.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class AbilityGenerationConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-ability-generation",
    tag: "form",
    classes: ["n5e", "n5e-v2", "n5e-abgen-config"],
    window: { title: "N5e Starting Ability Scores", icon: "fa-solid fa-dice-d20", resizable: true },
    position: { width: 520, height: "auto" },
    form: { handler: AbilityGenerationConfig.#onSubmit, closeOnSubmit: true },
    actions: { addArray: AbilityGenerationConfig.#onAdd, deleteArray: AbilityGenerationConfig.#onDelete }
  };

  static PARTS = { form: { template: "systems/n5e/templates/apps/ability-generation.hbs" } };

  /** The edited setup (kept between re-renders until saved). */
  #draft = null;

  get draft() {
    return this.#draft ??= cleanConfig(game.settings.get("n5e", "abilityGenerationConfig"));
  }

  /** @override */
  async _prepareContext() {
    const c = this.draft;
    return { c: { ...c, arrays: c.arrays.map(a => ({ ...a, text: a.values.join(", ") })) }, canDelete: c.arrays.length > 1 };
  }

  /** @override  Turning one array on turns the others off. */
  _onRender(context, options) {
    super._onRender?.(context, options);
    for ( const box of this.element.querySelectorAll("[data-array-toggle]") ) {
      box.addEventListener("change", () => {
        if ( !box.checked ) return;
        for ( const other of this.element.querySelectorAll("[data-array-toggle]") ) if ( other !== box ) other.checked = false;
      });
    }
  }

  /** The form as a setup. */
  #read() {
    const data = new foundry.applications.ux.FormDataExtended(this.element).object;
    const expanded = foundry.utils.expandObject(data);
    const arrays = Object.values(expanded.arrays ?? {}).map(a => ({ values: parseArray(a.values) ?? a.values, on: !!a.on }));
    return { draft: cleanConfig({ pointBuy: { on: !!expanded.pointBuy?.on, points: Number(expanded.pointBuy?.points) }, arrays, roll: { on: !!expanded.roll?.on } }),
      newArray: expanded.newArray ?? "" };
  }

  static #onAdd() {
    const { draft, newArray } = this.#read();
    if ( !parseArray(newArray) ) return ui.notifications.warn("A Standard Array is six scores from 3 to 20, such as 17, 16, 14, 13, 12, 10.");
    this.#draft = addArray(draft, newArray);
    return this.render();
  }

  static #onDelete(event, target) {
    const { draft } = this.#read();
    const i = Number(target.dataset.index);
    const arrays = draft.arrays.filter((a, n) => n !== i);
    this.#draft = { ...draft, arrays: arrays.length ? arrays : draft.arrays };
    return this.render();
  }

  static async #onSubmit() {
    const { draft, newArray } = this.#read();
    const next = parseArray(newArray) ? addArray(draft, newArray) : draft;
    await game.settings.set("n5e", "abilityGenerationConfig", next);
    ui.notifications.info("Starting ability scores saved.");
  }
}

