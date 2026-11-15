/**
 * GM Automation Audit (STD5; docs/STD_SPEC.md "Reviewable in game"). Lists the world's items, or one
 * N5e compendium's, by automation status (rules/automation-summary.mjs), with a filter and the items
 * whose text names mechanics nothing authored covers. The in-game counterpart of
 * docs/generated/std-audit.md. Click a row to open the item.
 */
import { automationOf, STATUS_LABELS } from "../../rules/automation-summary.mjs";
import { esc } from "../../view-models/common.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class AutomationAudit extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "n5e-v2", "n5e-audit"],
    window: { resizable: true, title: "Automation Audit" },
    position: { width: 720, height: 640 },
    actions: { auditSource: AutomationAudit.#onSource, auditFilter: AutomationAudit.#onFilter, auditOpen: AutomationAudit.#onOpen }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/automation-audit.hbs", scrollable: [".audit-rows"] } };

  source = "world";
  filter = "all";
  #rows = null;

  async #load() {
    let docs;
    if ( this.source === "world" ) docs = game.items.contents;
    else docs = await game.packs.get(this.source)?.getDocuments() ?? [];
    this.#rows = docs.map(d => ({ uuid: d.uuid, name: d.name, type: d.type, ...automationOf(d) }));
  }

  async _prepareContext() {
    if ( !this.#rows ) await this.#load();
    const counts = { all: this.#rows.length, automated: 0, partial: 0, note: 0, none: 0, mentions: 0 };
    for ( const r of this.#rows ) { counts[r.status]++; if ( r.mentions ) counts.mentions++; }
    const rows = this.#rows.filter(r => this.filter === "all" || (this.filter === "mentions" ? r.mentions : r.status === this.filter))
      .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 500)
      .map(r => ({ ...r, statusLabel: STATUS_LABELS[r.status], channelCount: r.channels.length, noteCount: r.notes.length }));
    const sources = [{ value: "world", label: "World items", selected: this.source === "world" },
      ...game.packs.filter(p => p.metadata.type === "Item" && p.metadata.packageName === "n5e")
        .map(p => ({ value: p.collection, label: p.metadata.label, selected: this.source === p.collection }))];
    const filters = ["all", "automated", "partial", "note", "none", "mentions"].map(k => ({ key: k, active: this.filter === k,
      label: `${k === "all" ? "All" : k === "mentions" ? "Text names mechanics" : STATUS_LABELS[k]} (${counts[k]})` }));
    return { rows, sources, filters, truncated: rows.length >= 500 };
  }

  static async #onSource(event, target) {
    this.source = target.value ?? target.dataset.value;
    this.#rows = null;
    return this.render();
  }

  static #onFilter(event, target) {
    this.filter = target.dataset.filter;
    return this.render();
  }

  static async #onOpen(event, target) {
    return (await fromUuid(target.closest("[data-uuid]").dataset.uuid))?.sheet?.render(true);
  }

  /** @override select changes go through the source action. */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelector("select[name=auditSource]")?.addEventListener("change", ev => AutomationAudit.#onSource.call(this, ev, ev.currentTarget));
  }

  static open() {
    if ( !game.user.isGM ) return ui.notifications.warn("Only the GM opens the Automation Audit.");
    return new AutomationAudit().render({ force: true });
  }
}

export const auditLabel = s => esc(STATUS_LABELS[s] ?? s);
