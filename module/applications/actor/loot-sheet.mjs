/**
 * Loot actor sheet (PRESTD1 Part C): a pile, a merchant or the party stash. Players open it to take,
 * buy and sell; the GM sets the mode, rates and ryo. Rules: rules/loot.mjs; moves: workflow/loot.mjs.
 */
import { LOOT_MODES, priceOf } from "../../rules/loot.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class LootSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "actor", "loot", "n5e-v2"],
    position: { width: 560, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { lootTake: LootSheet.#onTake, lootBuy: LootSheet.#onBuy, lootEdit: LootSheet.#onEdit, lootDelete: LootSheet.#onDelete }
  };

  static PARTS = { body: { template: "systems/n5e/templates/actor/loot/sheet.hbs", scrollable: [".items"] } };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    const merchant = sys.mode === "merchant";
    context.vm = {
      name: this.actor.name, img: this.actor.img, isGM: game.user.isGM, editable: this.isEditable,
      mode: sys.mode, modeLabel: LOOT_MODES[sys.mode] ?? sys.mode, merchant, canTake: sys.mode !== "merchant",
      modes: Object.entries(LOOT_MODES).map(([value, label]) => ({ value, label, selected: value === sys.mode })),
      ryo: sys.currency?.ryo ?? 0, buyRate: sys.buyRate, sellRate: sys.sellRate,
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.description ?? "", { relativeTo: this.actor }),
      items: this.actor.items.contents.sort((a, b) => a.name.localeCompare(b.name)).map(i => ({ id: i.id, name: i.name, img: i.img,
        quantity: i.system.quantity ?? 1, price: merchant ? priceOf(i.system.price ?? 0, 1, sys.buyRate) : i.system.price ?? 0 }))
    };
    return context;
  }

  #item(target) { return this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId); }

  async #quantity(item, verb) {
    const have = Number(item.system.quantity ?? 1);
    if ( have <= 1 ) return 1;
    return foundry.applications.api.DialogV2.prompt({ window: { title: `${verb} ${item.name}` },
      content: `<label>How many? <input type="number" name="q" min="1" max="${have}" value="1" autofocus></label>`,
      ok: { label: verb, callback: (event, button) => Math.clamp(Math.floor(Number(button.form.elements.q.value) || 0), 1, have) }, rejectClose: false });
  }

  static async #onTake(event, target) {
    const item = this.#item(target);
    const quantity = item ? await this.#quantity(item, "Take") : null;
    if ( quantity ) return (await import("../../workflow/loot.mjs")).takeFromLoot(item, { quantity });
    return null;
  }

  static async #onBuy(event, target) {
    const item = this.#item(target);
    const quantity = item ? await this.#quantity(item, "Buy") : null;
    if ( quantity ) return (await import("../../workflow/loot.mjs")).buyFromMerchant(item, { quantity });
    return null;
  }

  static #onEdit(event, target) { return this.#item(target)?.sheet.render(true); }

  static async #onDelete(event, target) {
    if ( !game.user.isGM ) return null;
    return this.#item(target)?.delete();
  }

  /** @override  Your item dropped here: sold to a merchant, or left on the pile / in the stash. */
  async _onDropItem(event, item) {
    const source = item.parent;
    if ( source instanceof Actor && source !== this.actor ) {
      if ( this.actor.system.mode === "merchant" ) {
        const quantity = await this.#quantity(item, "Sell");
        if ( quantity ) await (await import("../../workflow/loot.mjs")).sellToMerchant(item, this.actor, { quantity });
        return null;
      }
      const { transferFromDrop } = await import("../../workflow/transfer.mjs");
      if ( await transferFromDrop(item, this.actor) ) return null;
      return null;
    }
    if ( !game.user.isGM ) return null;
    return super._onDropItem(event, item);
  }
}
