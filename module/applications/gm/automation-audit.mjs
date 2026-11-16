/**
 * GM Automation Audit (STD5; docs/STD_SPEC.md "Reviewable in game"). Lists the world's items, or one
 * N5e compendium's, by automation status (rules/automation-summary.mjs), with a filter and the items
 * whose text names mechanics nothing authored covers. The in-game counterpart of
 * docs/generated/std-audit.md. Click a row to open the item.
 */
import { automationOf, STATUS_LABELS } from "../../rules/automation-summary.mjs";
import { ampAuditOf, ampAuditCounts, AMP_AUDIT_STATUSES, AMP_TYPE_CHOICES } from "../../rules/amp-audit.mjs";
import { esc } from "../../view-models/common.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class AutomationAudit extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "n5e-v2", "n5e-audit"],
    window: { resizable: true, title: "Automation Audit" },
    position: { width: 720, height: 640 },
    actions: { auditSource: AutomationAudit.#onSource, auditFilter: AutomationAudit.#onFilter, auditOpen: AutomationAudit.#onOpen,
      ampFilter: AutomationAudit.#onAmpFilter, ampDismiss: AutomationAudit.#onAmpDismiss }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/automation-audit.hbs", scrollable: [".audit-rows"] } };

  source = "world";
  filter = "all";
  ampFilter = "open";
  #rows = null;
  #ampDocs = null;

  /**
   * AMP1b (King 2026-11-16): the Amps view reads everything at once, whatever the Source says: the
   * world's items and every N5e Item compendium, each row naming where it lives.
   */
  async #loadAmps() {
    const packs = game.packs.filter(p => p.metadata.type === "Item" && p.metadata.packageName === "n5e");
    const out = game.items.contents.map(d => ({ d, where: "World" }));
    for ( const p of packs ) for ( const d of await p.getDocuments() ) out.push({ d, where: p.metadata.label });
    this.#ampDocs = out;
  }

  async #load() {
    let docs;
    if ( this.source === "world" ) docs = game.items.contents;
    else docs = await game.packs.get(this.source)?.getDocuments() ?? [];
    this.#rows = docs.map(d => ({ uuid: d.uuid, name: d.name, type: d.type, ...automationOf(d) }));
  }

  /**
   * AMP1b: the Amps view. Rows from rules/amp-audit.mjs, sorted by rank then name (jutsu) or name;
   * "open" shows what still needs King: Amps with no type and candidates.
   */
  #ampContext() {
    const dismissed = new Set(game.settings.get("n5e", "ampAuditDismissed") ?? []);
    const RANKS = ["E", "D", "C", "B", "A", "S"];
    const rows = (this.#ampDocs ?? []).map(({ d, where }) => ({ d, where, a: ampAuditOf(d, { dismissed }) })).filter(x => x.a)
      .map(({ d, where, a }) => ({ uuid: d.uuid, name: d.name, itemType: d.type, where, rank: d.system?.rank ?? "", ...a,
        locked: !!d.pack && !!game.packs.get(d.pack)?.locked,
        typeOptions: Object.entries(AMP_TYPE_CHOICES).map(([value, label]) => ({ value, label, selected: value === (d.system?.ampType ?? "") })),
        isCard: d.type === "amp", canDismiss: a.status === "candidate", canRestore: a.status === "dismissed" }))
      .sort((x, y) => (RANKS.indexOf(x.rank) - RANKS.indexOf(y.rank)) || x.name.localeCompare(y.name));
    const counts = ampAuditCounts(rows);
    const keep = { open: r => ["untyped", "candidate"].includes(r.status), all: () => true }[this.ampFilter] ?? (r => r.status === this.ampFilter);
    const filters = [["open", `Needs review (${counts.untyped + counts.candidate})`], ["all", `All (${rows.length})`],
      ...Object.entries(AMP_AUDIT_STATUSES).map(([k, label]) => [k, `${label} (${counts[k]})`])]
      .map(([key, label]) => ({ key, label, active: this.ampFilter === key }));
    const shown = rows.filter(keep);
    return { ampRows: shown.slice(0, 500), ampFilters: filters, ampTruncated: shown.length > 500 };
  }

  async _prepareContext() {
    if ( !this.#rows ) await this.#load();
    if ( this.filter === "amps" && !this.#ampDocs ) await this.#loadAmps();
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
    filters.push({ key: "amps", active: this.filter === "amps", label: "Amps (all compendiums)" });
    return { rows, sources, filters, truncated: rows.length >= 500, amps: this.filter === "amps", ...(this.filter === "amps" ? this.#ampContext() : {}) };
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

  static #onAmpFilter(event, target) {
    this.ampFilter = target.dataset.filter;
    return this.render();
  }

  /** "Not an Amp" / "Restore": the GM's dismissals (world setting ampAuditDismissed). */
  static async #onAmpDismiss(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    const set = new Set(game.settings.get("n5e", "ampAuditDismissed") ?? []);
    if ( set.has(uuid) ) set.delete(uuid); else set.add(uuid);
    await game.settings.set("n5e", "ampAuditDismissed", [...set]);
    return this.render();
  }

  /** Setting an Amp card's type from its row (King Q-A4: the "Amp: no type" queue). */
  async #setAmpType(select) {
    const doc = await fromUuid(select.closest("[data-uuid]").dataset.uuid);
    if ( !doc ) return;
    if ( doc.pack && game.packs.get(doc.pack)?.locked ) {
      ui.notifications.warn("Unlock the Amps compendium (right-click it, Toggle Edit Lock) to change a card's type.");
      return this.render();
    }
    await doc.update({ "system.ampType": select.value });
    this.#rows = null;
    this.#ampDocs = null;
    return this.render();
  }

  static async #onOpen(event, target) {
    return (await fromUuid(target.closest("[data-uuid]").dataset.uuid))?.sheet?.render(true);
  }

  /** @override select changes go through the source action. */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelector("select[name=auditSource]")?.addEventListener("change", ev => AutomationAudit.#onSource.call(this, ev, ev.currentTarget));
    for ( const sel of this.element.querySelectorAll("select[data-amp-type]") ) sel.addEventListener("change", () => this.#setAmpType(sel));
  }

  static open() {
    if ( !game.user.isGM ) return ui.notifications.warn("Only the GM opens the Automation Audit.");
    return new AutomationAudit().render({ force: true });
  }
}

export const auditLabel = s => esc(STATUS_LABELS[s] ?? s);
