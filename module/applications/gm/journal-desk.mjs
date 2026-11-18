import { ENTRY_KINDS, isWorkspacePage, pageSnapshot, createEntry, saveEntry } from "./workspace-store.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Journal Desk owns its window, not Foundry's journal sheets or navigation hooks. */
export default class JournalDesk extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-journal-desk", tag: "form", classes: ["n5e", "n5e-journal-desk"],
    window: { title: "N5e Journal Desk", icon: "fa-solid fa-book-open", resizable: true },
    position: { width: 1120, height: 760 },
    form: { handler: JournalDesk.onSave, closeOnSubmit: false },
    actions: { open: JournalDesk.onOpen, create: JournalDesk.onCreate, ideas: JournalDesk.onIdeas,
      favorite: JournalDesk.onFavorite, reload: JournalDesk.onReload, closeTab: JournalDesk.onCloseTab,
      search: JournalDesk.onSearch, insert: JournalDesk.onInsert, original: JournalDesk.onOriginal }
  };
  static PARTS = { body: { template: "systems/n5e/templates/apps/journal-desk.hbs" } };
  drafts = new Map();
  active = null;
  query = "";
  showIdeas = false;
  busy = false;

  /** Show unsaved status without rerendering or interrupting the text cursor. */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const updateStatus = () => {
      this.capture();
      const draft = this.drafts.get(this.active);
      const status = this.element.querySelector("[data-save-state]");
      if (status && draft) status.textContent = this.dirty(draft) ? "Unsaved changes" : "Saved";
    };
    this.element.querySelector("[name=name]")?.addEventListener("input", updateStatus);
    this.element.querySelector("prose-mirror")?.addEventListener("change", updateStatus);
  }

  /** Capture the active editor before any navigation rerenders it. */
  capture() {
    const draft = this.drafts.get(this.active);
    if (!draft || !this.element?.querySelector("[name=name]")) return;
    const form = new foundry.applications.ux.FormDataExtended(this.element).object;
    draft.name = form.name ?? draft.name;
    draft.content = form.content ?? draft.content;
  }

  /** Unsaved text remains in its tab until explicitly saved or discarded. */
  dirty(draft) { return draft.name !== draft.savedName || draft.content !== draft.savedContent; }

  async _prepareContext() {
    if (!game.user.isGM) throw new Error("Journal Desk is GM-only.");
    const favorites = game.user.getFlag("n5e", "deskFavorites") ?? [];
    const entries = game.journal.contents.flatMap(j => j.pages.contents.filter(isWorkspacePage)
      .map(p => ({ uuid: p.uuid, name: p.name, kind: p.flags.n5e.preparation.kind, favorite: favorites.includes(p.uuid) })));
    entries.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
    const draft = this.drafts.get(this.active);
    return { entries: entries.filter(e => `${e.name} ${e.kind}`.toLowerCase().includes(this.query.toLowerCase())),
      kinds: ENTRY_KINDS, query: this.query, showIdeas: this.showIdeas, draft, active: this.active,
      tabs: [...this.drafts].map(([uuid, d]) => ({ uuid, name: d.name, active: uuid === this.active, dirty: this.dirty(d) })),
      dirty: draft && this.dirty(draft), favorite: favorites.includes(this.active),
      ideas: entries.filter(e => e.kind === "idea" && e.uuid !== this.active).slice(0, 30) };
  }

  async openPage(uuid) {
    this.capture();
    if (!this.drafts.has(uuid)) {
      const page = await fromUuid(uuid);
      if (!isWorkspacePage(page)) throw new Error("This entry needs its original editor.");
      this.drafts.set(uuid, { name: page.name, content: page.text?.content ?? "", kind: page.flags.n5e.preparation.kind,
        base: pageSnapshot(page), savedName: page.name, savedContent: page.text?.content ?? "" });
    }
    this.active = uuid;
    return this.render({ force: true });
  }

  static async onOpen(event, target) { await this.openPage(target.dataset.uuid); }
  static async onCreate() {
    if (this.busy) return;
    this.capture();
    this.busy = true;
    try { await this.openPage((await createEntry(this.element.querySelector("[name=kind]").value)).uuid); }
    catch (error) { ui.notifications.error(error.message); }
    finally { this.busy = false; }
  }
  static async onSave() {
    if (this.busy || !this.active) return;
    this.capture();
    this.busy = true;
    try {
      const draft = this.drafts.get(this.active);
      draft.base = await saveEntry(await fromUuid(this.active), draft);
      draft.savedName = draft.name;
      draft.savedContent = draft.content;
      ui.notifications.info("Entry saved.");
      await this.render();
    } catch (error) { ui.notifications.error(error.message); }
    finally { this.busy = false; }
  }
  static onIdeas() { this.capture(); this.showIdeas = !this.showIdeas; return this.render(); }
  static onSearch() { this.capture(); this.query = this.element.querySelector("[name=search]").value; return this.render(); }
  static async onFavorite() {
    this.capture();
    const ids = new Set(game.user.getFlag("n5e", "deskFavorites") ?? []);
    if (ids.has(this.active)) ids.delete(this.active); else ids.add(this.active);
    await game.user.setFlag("n5e", "deskFavorites", [...ids]);
    return this.render();
  }
  static async onReload() {
    this.capture();
    if (!await this.confirmDiscard([this.drafts.get(this.active)])) return;
    const uuid = this.active;
    this.drafts.delete(uuid);
    return this.openPage(uuid);
  }
  static async onCloseTab(event, target) {
    this.capture();
    const uuid = target.dataset.uuid;
    if (!await this.confirmDiscard([this.drafts.get(uuid)])) return;
    this.drafts.delete(uuid);
    if (this.active === uuid) this.active = this.drafts.keys().next().value ?? null;
    return this.render();
  }
  static async onInsert(event, target) {
    this.capture();
    const draft = this.drafts.get(this.active);
    const idea = await fromUuid(target.dataset.uuid);
    if (!draft || !isWorkspacePage(idea)) return;
    draft.content += idea.text?.content ?? "";
    return this.render();
  }
  static async onOriginal() {
    this.capture();
    const page = await fromUuid(this.active);
    return page?.sheet.render(true);
  }
  async confirmDiscard(drafts) {
    if (!drafts.some(d => d && this.dirty(d))) return true;
    return foundry.applications.api.DialogV2.confirm({ window: { title: "Discard unsaved changes?" },
      content: "<p>Your unsaved writing will be discarded. Cancel to keep editing.</p>" });
  }
  async close(options = {}) {
    this.capture();
    if (this.busy || !await this.confirmDiscard([...this.drafts.values()])) return this;
    return super.close(options);
  }
}
