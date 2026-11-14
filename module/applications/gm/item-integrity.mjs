/**
 * GM Item Integrity (FIN1): duplicates and missing items on every world actor and unlinked token,
 * from rules/item-audit.mjs. Nothing changes until the GM presses a button.
 *   Remove duplicate   deletes the extra copies (the kept copy is the one with choices or spent uses).
 *   Restore            adds the missing Unarmed Strike.
 * Template: templates/apps/item-integrity.hbs.
 */
import { itemAudit } from "../../rules/item-audit.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Every creature the audit covers. */
export function auditedActors() {
  const unlinked = game.scenes.contents.flatMap(sc => sc.tokens.contents.filter(t => !t.actorLink && t.actor)
    .map(t => ({ actor: t.actor, where: `${sc.name} (token)` })));
  return [...game.actors.filter(a => ["character", "npc"].includes(a.type)).map(actor => ({ actor, where: "World" })), ...unlinked];
}

export default class ItemIntegrity extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-item-integrity",
    classes: ["n5e", "n5e-v2", "n5e-item-integrity"],
    window: { title: "N5e Item Integrity", icon: "fa-solid fa-list-check", resizable: true },
    position: { width: 640, height: 520 },
    actions: { removeDuplicate: ItemIntegrity.#onRemove, restoreUnarmed: ItemIntegrity.#onRestore, openSheet: ItemIntegrity.#onOpen, rescan: ItemIntegrity.#onRescan }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/item-integrity.hbs", scrollable: [".rows"] } };

  static #instance;
  static open() {
    this.#instance ??= new ItemIntegrity();
    return this.#instance.render({ force: true });
  }

  /** @override */
  async _prepareContext() {
    const rows = [];
    for ( const { actor, where } of auditedActors() ) {
      const audit = itemAudit({ type: actor.type, items: actor.items.map(i => i.toObject()) });
      if ( !audit.duplicates.length && !audit.missingUnarmed ) continue;
      rows.push({ uuid: actor.uuid, name: actor.name, where, missingUnarmed: audit.missingUnarmed,
        duplicates: audit.duplicates.map(d => ({ ...d, count: d.remove.length + 1, type: d.key.split(":")[0], remove: d.remove.join(",") })) });
    }
    return { rows, clean: !rows.length, checked: auditedActors().length };
  }

  static async #onRemove(event, target) {
    const actor = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    const ids = target.dataset.remove.split(",").filter(id => actor?.items.get(id));
    if ( ids.length ) await actor.deleteEmbeddedDocuments("Item", ids);
    this.render();
  }

  static async #onRestore(event, target) {
    const actor = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    const { ensureUnarmedStrike } = await import("../../workflow/unarmed.mjs");
    if ( actor ) await ensureUnarmedStrike(actor);
    this.render();
  }

  static async #onOpen(event, target) {
    (await fromUuid(target.closest("[data-uuid]").dataset.uuid))?.sheet?.render(true);
  }

  static #onRescan() { this.render(); }
}

/** Token controls button (GM). */
export function registerItemIntegrity() {
  Hooks.on("getSceneControlButtons", controls => {
    if ( !game.user.isGM ) return;
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools ) return;
    tokens.tools.n5eItemIntegrity = { name: "n5eItemIntegrity", title: "N5e Item Integrity", icon: "fa-solid fa-list-check", button: true,
      order: Object.keys(tokens.tools).length + 1, onChange: () => ItemIntegrity.open() };
  });
}
