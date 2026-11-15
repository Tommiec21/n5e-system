/**
 * Mission planner (PRESTD1 Part E, MISSION1; GM only). Rank, tier and active players give the XP
 * budget (the Bingo Book's Mission Rewards and Tier Modifications); the GM buys encounter elements
 * and sees what is left, sets the ryo per player within the range and the downtime, and keeps notes.
 * The plan is saved as a page in the "N5e Missions" journal (flags.n5e.mission), so it lasts and can
 * be shared. Complete or Fail opens the award: the book's rule quoted as printed, the figure for
 * each active player (King Q-P9: no XP logic of our own), every number editable, one Award button.
 * Rules: rules/missions.mjs; tables: config/missions.mjs.
 */
import { missionNumbers, encounterCost, spentOf, missionPayout } from "../../rules/missions.mjs";
import { missionTiers, missionEncounters, missionRuleText, missionRewards } from "../../config/missions.mjs";
import { esc } from "../../view-models/common.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const JOURNAL = "N5e Missions";

export const blankMission = () => ({ name: "", rank: "D", tier: "moderate", players: [], ryo: 250, downtime: 4, lines: [], notes: "", status: "planned" });

/** Characters some player owns: the possible active players. */
const partyCandidates = () => game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);

export default class MissionPlanner extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "n5e-v2", "n5e-mission"],
    tag: "form",
    window: { resizable: true, title: "Mission planner" },
    position: { width: 640, height: "auto" },
    form: { handler: MissionPlanner.#onForm, submitOnChange: true, closeOnSubmit: false },
    actions: { addLine: MissionPlanner.#onAddLine, removeLine: MissionPlanner.#onRemoveLine, save: MissionPlanner.#onSave,
      complete: MissionPlanner.#onComplete, fail: MissionPlanner.#onFail, rollDowntime: MissionPlanner.#onRollDowntime }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/mission-planner.hbs" } };

  /** @param {{page?: JournalEntryPage}} options */
  constructor(options = {}) {
    super(options);
    this.page = options.page ?? null;
    this.plan = foundry.utils.mergeObject(blankMission(), structuredClone(this.page?.flags?.n5e?.mission ?? {}));
    if ( !this.page && !this.plan.players.length ) this.plan.players = partyCandidates().map(a => a.uuid);
  }

  get title() { return `Mission: ${this.plan.name || "new"}`; }

  async _prepareContext() {
    const p = this.plan;
    const numbers = missionNumbers(p.rank, p.tier, p.players.length);
    const spent = spentOf(p.lines, p.rank);
    const rewards = missionRewards[p.rank] ?? missionRewards.D;
    return { vm: { ...p, numbers, spent, left: numbers.budget - spent, over: spent > numbers.budget,
      ranks: Object.keys(missionRewards).map(r => ({ value: r, label: `${r}-Rank`, selected: r === p.rank })),
      tiers: Object.entries(missionTiers).map(([k, t]) => ({ value: k, label: t.label, selected: k === p.tier })),
      party: (this._party = partyCandidates().map(a => a.uuid)).map((uuid, index) => ({ index, name: fromUuidSync(uuid)?.name ?? uuid, checked: p.players.includes(uuid) })),
      kinds: Object.entries(missionEncounters).map(([k, e]) => ({ value: k, label: `${e.group}: ${e.label}` })),
      lines: p.lines.map((l, i) => ({ ...l, index: i, label: missionEncounters[l.key]?.label ?? l.key, group: missionEncounters[l.key]?.group ?? "",
        costValue: l.cost != null && l.cost !== "" ? String(l.cost) : "", table: encounterCost(l.key, p.rank),
        kinds: Object.entries(missionEncounters).map(([k, e]) => ({ value: k, label: `${e.group}: ${e.label}`, selected: k === l.key })) })),
      downtimeDice: rewards.downtimeDice, ryoOutside: p.ryo < numbers.ryo[0] || p.ryo > numbers.ryo[1], saved: !!this.page } };
  }

  static async #onForm(event, form, formData) {
    const o = foundry.utils.expandObject(formData.object);
    const p = this.plan;
    for ( const k of ["name", "rank", "tier", "notes"] ) if ( k in o ) p[k] = o[k];
    for ( const k of ["ryo", "downtime"] ) if ( k in o ) p[k] = Math.max(0, Math.floor(Number(o[k]) || 0));
    p.players = Object.entries(o.player ?? {}).filter(([, on]) => on).map(([i]) => this._party?.[Number(i)]).filter(Boolean);
    p.lines = Object.values(o.lines ?? {}).map(l => ({ key: l.key, count: Math.max(0, Math.floor(Number(l.count) || 0)), cost: l.cost === "" || l.cost == null ? null : Math.max(0, Number(l.cost) || 0) }));
    return this.render();
  }

  static #onAddLine() {
    this.plan.lines.push({ key: "standard", count: 1, cost: null });
    return this.render();
  }

  static #onRemoveLine(event, target) {
    this.plan.lines.splice(Number(target.dataset.index), 1);
    return this.render();
  }

  static async #onRollDowntime() {
    const roll = await new Roll((missionRewards[this.plan.rank] ?? missionRewards.D).downtimeDice).evaluate();
    await roll.toMessage({ flavor: "Mission downtime", whisper: game.users.filter(u => u.isGM).map(u => u.id) });
    this.plan.downtime = roll.total;
    return this.render();
  }

  /** Save the plan as a page in the Missions journal (created when missing). */
  async save() {
    const p = this.plan;
    const n = missionNumbers(p.rank, p.tier, p.players.length);
    const spent = spentOf(p.lines, p.rank);
    const content = `<p><b>${esc(p.rank)}-Rank, ${esc(missionTiers[p.tier]?.label ?? p.tier)}</b> · ${p.players.length} active players · ${n.xpPerPlayer} XP per player, budget ${n.budget} (spent ${spent}, left ${n.budget - spent}) · ${p.ryo} ryo per player · ${p.downtime} downtime · ${esc(p.status)}</p>`
      + `<ul>${p.lines.map(l => `<li>${l.count} × ${esc(missionEncounters[l.key]?.label ?? l.key)}</li>`).join("")}</ul>${p.notes ? `<p>${esc(p.notes)}</p>` : ""}`;
    const data = { name: p.name || "Mission", "text.content": content, "flags.n5e.mission": structuredClone(p) };
    if ( this.page ) await this.page.update(data);
    else {
      const journal = game.journal.getName(JOURNAL) ?? await CONFIG.JournalEntry.documentClass.create({ name: JOURNAL });
      [this.page] = await journal.createEmbeddedDocuments("JournalEntryPage", [{ name: p.name || "Mission", type: "text",
        text: { content }, flags: { n5e: { mission: structuredClone(p) } } }]);
    }
    return this.page;
  }

  static async #onSave() {
    await this.save();
    ui.notifications.info(`Saved to the "${JOURNAL}" journal.`);
    return this.render();
  }

  static #onComplete() { return this.award(true); }
  static #onFail() { return this.award(false); }

  /** The award (Q-P9): the rule as printed, each active player's figure, editable, one Award button. */
  async award(success) {
    const p = this.plan;
    const actors = (await Promise.all(p.players.map(u => fromUuid(u)))).filter(Boolean);
    if ( !actors.length ) return ui.notifications.warn("Tick the active players first.");
    const spent = spentOf(p.lines, p.rank);
    const pay = missionPayout({ spent, players: actors.length, ryo: p.ryo, downtime: p.downtime, success, tier: p.tier });
    const rules = [missionRuleText.xp, ...(success ? [] : [missionRuleText.failure])];
    const head = success ? `Encounters purchased: ${spent} XP, split among ${actors.length} active players.`
      : `Encounters purchased: ${spent} XP, split among ${actors.length} active players; ${missionTiers[p.tier]?.label} failure payout ${pay.percent}%.`;
    const rows = actors.map((a, i) => `<tr><td>${esc(a.name)}</td>
      <td><input type="number" name="xp${i}" value="${pay.xp}" min="0"></td><td><input type="number" name="ryo${i}" value="${pay.ryo}" min="0"></td>
      <td><input type="number" name="dt${i}" value="${pay.downtime}" min="0"></td></tr>`).join("");
    const picked = await foundry.applications.api.DialogV2.prompt({ window: { title: `${p.name || "Mission"}: ${success ? "complete" : "failed"}` },
      position: { width: 560 },
      content: `${rules.map(r => `<blockquote>${esc(r)}</blockquote>`).join("")}<p>${esc(head)}</p>
        <table><tr><th>Player</th><th>XP</th><th>Ryo</th><th>Downtime</th></tr>${rows}</table><p class="hint">Change any number before you award.</p>`,
      ok: { label: "Award", callback: (event, button) => actors.map((a, i) => ({ actor: a,
        xp: Number(button.form.elements[`xp${i}`].value) || 0, ryo: Number(button.form.elements[`ryo${i}`].value) || 0, downtime: Number(button.form.elements[`dt${i}`].value) || 0 })) },
      rejectClose: false });
    if ( !picked ) return null;
    for ( const g of picked ) {
      const s = g.actor.system;
      await g.actor.update({ "system.details.xp": (s.details?.xp ?? 0) + Math.max(0, g.xp), "system.currency.ryo": (s.currency?.ryo ?? 0) + Math.max(0, g.ryo),
        "system.downtime": (s.downtime ?? 0) + Math.max(0, g.downtime) });
    }
    p.status = success ? "complete" : "failed";
    await this.save();
    await ChatMessage.create({ content: `<div class="n5e-roll-card"><b>${esc(p.name || "Mission")}: ${success ? "complete" : "failed"}</b>
      ${rules.map(r => `<blockquote>${esc(r)}</blockquote>`).join("")}
      ${picked.map(g => `<div>${esc(g.actor.name)}: ${g.xp} XP, ${g.ryo} ryo, ${g.downtime} downtime</div>`).join("")}</div>` });
    return this.render();
  }

  /** Open a saved mission page, or a new plan. */
  static open(page = null) {
    if ( !game.user.isGM ) return ui.notifications.warn("Only the GM plans missions.");
    return new MissionPlanner({ page }).render({ force: true });
  }

  /** The GM button: pick a saved mission or start a new one. */
  static async choose() {
    if ( !game.user.isGM ) return ui.notifications.warn("Only the GM plans missions.");
    const pages = (game.journal.getName(JOURNAL)?.pages.contents ?? []).filter(pg => pg.flags?.n5e?.mission);
    if ( !pages.length ) return MissionPlanner.open();
    const id = await foundry.applications.api.DialogV2.prompt({ window: { title: "Mission planner" },
      content: `<label>Mission <select name="page"><option value="">New mission</option>${pages.map(pg => `<option value="${pg.id}">${esc(pg.name)} (${esc(pg.flags.n5e.mission.status)})</option>`).join("")}</select></label>`,
      ok: { label: "Open", callback: (event, button) => button.form.elements.page.value }, rejectClose: false });
    if ( id == null ) return null;
    return MissionPlanner.open(pages.find(pg => pg.id === id) ?? null);
  }
}
