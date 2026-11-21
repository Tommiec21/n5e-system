import { ENTRY_KINDS, isWorkspacePage, pageSnapshot, createEntry, saveEntry } from "./workspace-store.mjs";
import { cleanSession, visit, starterText } from "./workspace-navigation.mjs";
import { importStarter } from "./workspace-starter.mjs";
import { MISSION_IDEAS, filterIdeas, ideaText } from "./workspace-ideas.mjs";

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
      search: JournalDesk.onSearch, insert: JournalDesk.onInsert, original: JournalDesk.onOriginal,
      back: JournalDesk.onBack, forward: JournalDesk.onForward, filter: JournalDesk.onFilter,
      link: JournalDesk.onLink, unlink: JournalDesk.onUnlink, follow: JournalDesk.onFollow,
      template: JournalDesk.onTemplate, starter: JournalDesk.onStarter,
      ideaFilter: JournalDesk.onIdeaFilter, ideaAppend: JournalDesk.onIdeaAppend, ideaSave: JournalDesk.onIdeaSave,
      missionBudget: JournalDesk.onMissionBudget, adversary: JournalDesk.onAdversary, social: JournalDesk.onSocial }
  };
  static PARTS = { body: { template: "systems/n5e/templates/apps/journal-desk.hbs" } };
  drafts = new Map();
  active = null;
  query = "";
  showIdeas = false;
  busy = false;
  restored = false;
  campaign = "";
  history = [];
  cursor = -1;
  ideaFilters = { theme: "", region: "", rank: "" };

  /** Recreate saved tabs from documents, ignoring deleted or unsupported records. */
  async restoreTabs() {
    if (this.restored) return;
    this.restored = true;
    const session = cleanSession(game.user.getFlag("n5e", "deskSession") ?? {});
    for (const uuid of session.tabs) {
      try { const page = await fromUuid(uuid); if (isWorkspacePage(page)) this.drafts.set(uuid, this.readDraft(page)); }
      catch { /* A missing reference does not prevent the workspace opening. */ }
    }
    this.active = this.drafts.has(session.active) ? session.active : this.drafts.keys().next().value ?? null;
    this.campaign = session.campaign;
    this.showIdeas = session.ideas;
    if (this.active) Object.assign(this, visit([], -1, this.active));
  }

  /** Read only workspace-owned fields into the unsaved editor state. */
  readDraft(page) {
    const meta = page.flags.n5e.preparation;
    const draft = { name: page.name, content: page.text?.content ?? "", kind: meta.kind,
      campaignUuid: meta.campaignUuid ?? "", links: structuredClone(meta.links ?? []),
      base: pageSnapshot(page), savedName: page.name, savedContent: page.text?.content ?? "" };
    draft.savedRelationships = JSON.stringify([draft.campaignUuid, draft.links]);
    return draft;
  }

  async rememberTabs() {
    await game.user.setFlag("n5e", "deskSession", cleanSession({ tabs: [...this.drafts.keys()],
      active: this.active, campaign: this.campaign, ideas: this.showIdeas }));
  }

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
    draft.campaignUuid = form.campaignUuid ?? draft.campaignUuid;
  }

  /** Unsaved text remains in its tab until explicitly saved or discarded. */
  dirty(draft) { return draft.name !== draft.savedName || draft.content !== draft.savedContent
    || JSON.stringify([draft.campaignUuid, draft.links]) !== draft.savedRelationships; }

  async _prepareContext() {
    if (!game.user.isGM) throw new Error("Journal Desk is GM-only.");
    await this.restoreTabs();
    const favorites = game.user.getFlag("n5e", "deskFavorites") ?? [];
    const entries = game.journal.contents.flatMap(j => j.pages.contents.filter(isWorkspacePage)
      .map(p => ({ uuid: p.uuid, name: p.name, kind: p.flags.n5e.preparation.kind,
        campaignUuid: p.flags.n5e.preparation.campaignUuid ?? "", favorite: favorites.includes(p.uuid) })));
    entries.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
    const draft = this.drafts.get(this.active);
    const campaigns = entries.filter(e => e.kind === "campaign");
    for (const uuid of [draft?.campaignUuid, this.campaign].filter(Boolean)) {
      if (!campaigns.some(e => e.uuid === uuid)) campaigns.push({ uuid, name: "Missing campaign (clear to remove)" });
    }
    const budgets = game.journal.contents.flatMap(j => j.pages.contents.filter(p => p.flags?.n5e?.mission)
      .map(p => ({ uuid: p.uuid, name: p.name, kind: "Mission budget" })));
    const records = [...entries, ...budgets, ...game.actors.contents.map(a => ({ uuid: a.uuid, name: a.name, kind: "Actor" })),
      ...game.scenes.contents.map(s => ({ uuid: s.uuid, name: s.name, kind: "Scene" }))].filter(e => e.uuid !== this.active);
    const linked = await Promise.all((draft?.links ?? []).map(async l => {
      try { const doc = await fromUuid(l.uuid); return { ...l, name: doc?.name ?? "Missing record", missing: !doc }; }
      catch { return { ...l, name: "Missing record", missing: true }; }
    }));
    return { entries: entries.filter(e => (!this.campaign || e.uuid === this.campaign || e.campaignUuid === this.campaign)
        && `${e.name} ${e.kind}`.toLowerCase().includes(this.query.toLowerCase())),
      suggestions: filterIdeas(this.ideaFilters),
      ideaOptions: Object.fromEntries(["theme", "region", "rank"].map(key => [key, [...new Set(MISSION_IDEAS.map(i => i[key]))].map(value => ({ value, selected: this.ideaFilters[key] === value }))])),
      records, campaigns: campaigns.filter(e => e.uuid !== this.active).map(e => ({ ...e, selected: e.uuid === draft?.campaignUuid })),
      filters: campaigns.map(e => ({ ...e, selected: e.uuid === this.campaign })), linked,
      canBack: this.cursor > 0, canForward: this.cursor < this.history.length - 1,
      kinds: ENTRY_KINDS, query: this.query, showIdeas: this.showIdeas, draft, active: this.active,
      tabs: [...this.drafts].map(([uuid, d]) => ({ uuid, name: d.name, active: uuid === this.active, dirty: this.dirty(d) })),
      dirty: draft && this.dirty(draft), favorite: favorites.includes(this.active),
      ideas: entries.filter(e => e.kind === "idea" && e.uuid !== this.active).slice(0, 30) };
  }

  async openPage(uuid, recordHistory = true) {
    this.capture();
    if (!this.drafts.has(uuid)) {
      const page = await fromUuid(uuid);
      if (!isWorkspacePage(page)) throw new Error("This entry needs its original editor.");
      this.drafts.set(uuid, this.readDraft(page));
    }
    this.active = uuid;
    if (recordHistory) Object.assign(this, visit(this.history, this.cursor, uuid));
    await this.rememberTabs();
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
      const submitted = structuredClone(draft);
      draft.base = await saveEntry(await fromUuid(this.active), submitted);
      this.capture();
      draft.savedName = submitted.name;
      draft.savedContent = submitted.content;
      draft.savedRelationships = JSON.stringify([submitted.campaignUuid, submitted.links]);
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
    this.history = this.history.filter(u => u !== uuid);
    this.cursor = this.active ? this.history.lastIndexOf(this.active) : -1;
    await this.rememberTabs();
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
    await this.rememberTabs();
    return super.close(options);
  }

  async navigate(step) {
    const next = this.cursor + step;
    if (next < 0 || next >= this.history.length) return;
    try { await this.openPage(this.history[next], false); this.cursor = next; return this.render(); }
    catch (error) { ui.notifications.warn(error.message); }
  }
  static onBack() { return this.navigate(-1); }
  static onForward() { return this.navigate(1); }
  static async onFilter() {
    this.capture(); this.campaign = this.element.querySelector("[name=campaignFilter]").value;
    await this.rememberTabs(); return this.render();
  }
  static async onLink() {
    this.capture();
    const draft = this.drafts.get(this.active);
    const uuid = this.element.querySelector("[name=linkUuid]").value.trim()
      || this.element.querySelector("[name=linkRecord]").value;
    try {
      const doc = await fromUuid(uuid);
      if (!doc || !["Actor", "JournalEntry", "JournalEntryPage", "Scene"].includes(doc.documentName)) throw new Error("Choose an Actor, Scene or journal document UUID.");
      if (uuid === this.active) throw new Error("Choose a different record.");
      if (!draft.links.some(l => l.uuid === uuid)) draft.links.push({ uuid, label: this.element.querySelector("[name=linkLabel]").value.trim() || "Related" });
      return this.render();
    } catch (error) { ui.notifications.warn(error.message); }
  }
  static onUnlink(event, target) {
    this.capture(); const draft = this.drafts.get(this.active);
    draft.links = draft.links.filter(l => l.uuid !== target.dataset.uuid); return this.render();
  }
  static async onFollow(event, target) {
    this.capture();
    try {
      const doc = await fromUuid(target.dataset.uuid);
      if (!doc) return ui.notifications.warn("This linked record no longer exists.");
      if (isWorkspacePage(doc)) return this.openPage(doc.uuid);
      return doc.sheet?.render(true);
    } catch (error) { ui.notifications.warn(error.message); }
  }
  static onTemplate() {
    this.capture(); const draft = this.drafts.get(this.active);
    draft.content += starterText(draft.kind); return this.render();
  }
  static async onStarter() {
    this.capture();
    try { await importStarter(); await this.render(); }
    catch (error) { ui.notifications.error(error.message); }
  }
  static onIdeaFilter() {
    this.capture();
    for (const key of ["theme", "region", "rank"]) this.ideaFilters[key] = this.element.querySelector(`[name=idea${key}]`).value;
    return this.render();
  }
  static onIdeaAppend(event, target) {
    this.capture();
    const idea = MISSION_IDEAS.find(i => i.id === target.dataset.idea);
    const draft = this.drafts.get(this.active);
    if (idea && draft) draft.content += ideaText(idea);
    return this.render();
  }
  static async onIdeaSave(event, target) {
    if (this.busy) return;
    this.capture(); this.busy = true;
    try {
      const idea = MISSION_IDEAS.find(i => i.id === target.dataset.idea);
      if (!idea) return;
      const page = await createEntry("idea");
      await saveEntry(page, { name: idea.name, content: ideaText(idea), base: pageSnapshot(page) });
      await this.openPage(page.uuid);
    } catch (error) { ui.notifications.error(error.message); }
    finally { this.busy = false; }
  }
  static async onMissionBudget() {
    this.capture();
    const { default: Planner } = await import("./mission-planner.mjs");
    const draft = this.drafts.get(this.active);
    for (const link of draft?.links ?? []) {
      const page = await fromUuid(link.uuid).catch(() => null);
      if (page?.flags?.n5e?.mission) return Planner.open(page);
    }
    const planner = new Planner();
    if (draft) planner.plan.name = draft.name;
    return planner.render({ force: true });
  }
  static async onAdversary() {
    this.capture();
    return (await import("../npc/adversary-builder.mjs")).default.open();
  }
  static async onSocial() {
    this.capture();
    return (await import("../../workflow/social.mjs")).startSocialEncounter();
  }
}
