/**
 * Active Effect editor: the core config with a change-key picker. Every Key field suggests the
 * system's keys (n5e.* and system bonus paths) as you type, and shows what the chosen key does.
 * The list comes from changeKeyCatalog() in rules/change-keys.mjs; a new key added there appears here.
 */
import { changeKeyCatalog } from "../../rules/change-keys.mjs";

const Base = foundry.applications.sheets.ActiveEffectConfig;

export default class EffectConfig extends Base {
  static DEFAULT_OPTIONS = { classes: ["n5e-effect-config"] };

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const catalog = changeKeyCatalog(CONFIG.N5E);
    const byKey = new Map(catalog.map(c => [c.key, c]));
    const listId = `n5e-change-keys-${this.id}`;
    if ( !this.element.querySelector(`#${CSS.escape(listId)}`) ) {
      const dl = document.createElement("datalist");
      dl.id = listId;
      for ( const c of catalog ) {
        const o = document.createElement("option");
        o.value = c.key;
        o.label = `${c.group}: ${c.label}`;
        dl.append(o);
      }
      this.element.append(dl);
    }
    for ( const input of this.element.querySelectorAll('input[name^="changes."][name$=".key"]') ) {
      input.setAttribute("list", listId);
      input.setAttribute("placeholder", "n5e.… or system.…");
      const hint = () => {
        const c = byKey.get(input.value.trim());
        input.dataset.tooltip = c ? `${c.group}: ${c.label}` : "Start typing for N5e keys";
        input.classList.toggle("n5e-known-key", !!c);
      };
      hint();
      input.addEventListener("input", hint);
    }
  }
}
