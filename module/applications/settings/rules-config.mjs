/**
 * N5e Rules panel: every optional rule grouped, as toggles, numbers and choices. Everyone can open it
 * to see what's in play; only the GM can save.
 */
import { rules, ruleGroups } from "../../config/rules.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class RulesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-rules-config",
    tag: "form",
    classes: ["n5e", "n5e-v2", "n5e-rules-config"],
    window: { title: "N5e Rules", icon: "fa-solid fa-scroll", resizable: true },
    position: { width: 620, height: 720 },
    form: { handler: RulesConfig.#onSubmit, closeOnSubmit: true },
    actions: { reset: RulesConfig.#onReset }
  };

  // The template wraps its header, scrolling groups and footer in one section: ApplicationV2
  // rejects ordinary template parts with several top-level elements before opening the window.
  static PARTS = { form: { template: "systems/n5e/templates/apps/rules-config.hbs", scrollable: [".rule-groups"] } };

  /** @override */
  async _prepareContext() {
    const gm = game.user.isGM;
    const groups = Object.entries(ruleGroups).map(([key, label]) => ({
      key, label,
      rules: Object.entries(rules).filter(([, r]) => r.group === key).map(([k, r]) => {
        const value = game.settings.get("n5e", k);
        return { key: k, ...r, value, isBool: r.type === "boolean", isNumber: r.type === "number", isChoice: r.type === "choice",
          options: r.type === "choice" ? Object.entries(r.choices).map(([v, l]) => ({ value: v, label: l, selected: v === value })) : null,
          changed: value !== r.default };
      })
    }));
    return { groups, gm };
  }

  /**
   * Save (GM only). Each rule's value is coerced to its type (checkbox → boolean, numbers clamped to
   * min/max) and written to its world setting only when it changed. Code reads them with rule("key").
   */
  static async #onSubmit(event, form, formData) {
    if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can change the N5e Rules.");
    const data = formData.object;
    for ( const [key, r] of Object.entries(rules) ) {
      let v = data[key];
      if ( r.type === "boolean" ) v = !!v;
      else if ( r.type === "number" ) v = Math.max(r.min ?? -Infinity, Math.min(r.max ?? Infinity, Number(v) || 0));
      if ( v !== undefined && v !== game.settings.get("n5e", key) ) await game.settings.set("n5e", key, v);
    }
    ui.notifications.info("N5e Rules saved.");
  }

  /** "Book defaults": every rule back to its default (GM only). */
  static async #onReset() {
    if ( !game.user.isGM ) return;
    for ( const [key, r] of Object.entries(rules) ) if ( key !== "rationPool" ) await game.settings.set("n5e", key, r.default);
    this.render();
  }
}
