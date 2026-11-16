/**
 * CHATUI1 (King 2026-11-16): the Chat Card Appearance window. One size per field, a master scale, a
 * heading font and a body font, with a live preview card.
 *   GM          edits the world default (everyone's), or their own copy.
 *   Players     edit their own copy, used only when "Use my own settings" is on.
 */
import { CHAT_FIELDS, SCALE, defaultAppearance, cleanAppearance, cssVariables } from "../../rules/chat-appearance.mjs";
import { availableFonts, applyChatAppearance } from "../../workflow/chat-appearance.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ChatAppearanceConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-chat-appearance",
    tag: "form",
    classes: ["n5e", "n5e-v2", "n5e-chat-appearance"],
    window: { title: "N5e Chat Card Appearance", icon: "fa-solid fa-font", resizable: true },
    position: { width: 720, height: 760 },
    form: { handler: ChatAppearanceConfig.#onSubmit, closeOnSubmit: false },
    actions: { reset: ChatAppearanceConfig.#onReset }
  };

  static PARTS = { form: { template: "systems/n5e/templates/apps/chat-appearance.hbs", scrollable: [".ca-fields"] } };

  /** Which setting the window edits: "world" (GM) or "mine". */
  #target = null;

  #bound = false;

  get target() { return this.#target ??= game.user.isGM ? "world" : "mine"; }

  /** @override */
  async _prepareContext() {
    const gm = game.user.isGM;
    const world = cleanAppearance(game.settings.get("n5e", "chatAppearance"));
    const mineRaw = game.settings.get("n5e", "chatAppearanceMine") ?? {};
    const mine = this.target === "mine";
    // A player's own copy starts from the GM's settings until they save one.
    const a = mine ? (mineRaw.sizes ? cleanAppearance(mineRaw) : world) : world;
    const vars = Object.entries(cssVariables(a)).map(([k, v]) => `${k}: ${v}`).join("; ");
    return {
      gm, mine, use: !!mineRaw.use, scale: a.scale, scaleMin: SCALE.min, scaleMax: SCALE.max,
      fonts: a.fonts, fontList: availableFonts(),
      fields: CHAT_FIELDS.map(f => ({ ...f, value: a.sizes[f.key] })),
      vars,
      targets: [{ value: "world", label: "World default (everyone)", selected: !mine }, { value: "mine", label: "Just me", selected: mine }]
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const form = this.element;
    form.querySelector("[data-ca-target]")?.addEventListener("change", ev => { this.#target = ev.currentTarget.value; this.render(); });
    // The form element stays between renders: bind its listeners once.
    if ( !this.#bound ) {
      this.#bound = true;
      form.addEventListener("input", () => this.#preview());
      form.addEventListener("change", () => this.#preview());
    }
    this.#preview();
  }

  /** The form's values as an appearance. */
  #read() {
    const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.element).object);
    return { use: !!data.use, ...cleanAppearance(data) };
  }

  /** Redraw the preview card with the form's values; show each size beside its slider. */
  #preview() {
    const a = this.#read();
    const preview = this.element.querySelector(".ca-preview");
    if ( preview ) applyChatAppearance(a, preview);
    for ( const out of this.element.querySelectorAll("[data-ca-out]") ) {
      const key = out.dataset.caOut;
      out.textContent = key === "scale" ? `${a.scale}%` : `${a.sizes[key]}px`;
    }
  }

  static async #onSubmit() {
    const a = this.#read();
    if ( this.target === "world" ) {
      if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can change the world's chat appearance.");
      const rest = { ...a };
      delete rest.use;
      await game.settings.set("n5e", "chatAppearance", rest);
      ui.notifications.info("Chat appearance saved for everyone.");
    } else {
      await game.settings.set("n5e", "chatAppearanceMine", a);
      ui.notifications.info(a.use ? "Your chat appearance is saved and on." : "Saved. Turn on \"Use my own settings\" to use it.");
    }
    return this.render();
  }

  /** Defaults in the form (not saved until Save). */
  static #onReset() {
    const d = defaultAppearance();
    const form = this.element;
    const set = (name, v) => { const el = form.querySelector(`[name="${name}"]`); if ( el ) el.value = v; };
    set("scale", d.scale);
    set("fonts.head", "");
    set("fonts.body", "");
    for ( const [k, v] of Object.entries(d.sizes) ) set(`sizes.${k}`, v);
    this.#preview();
  }
}
