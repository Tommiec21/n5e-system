/**
 * Level-up dialog: one page listing what the new level grants, with a card for every choice
 * (dnd5e's advancement flow, flattened). Apply stays disabled until every choice is made.
 */
import {
  stepsForLevel, subclassSteps, learnableJutsu, eligibleFeats, masteryTargets, validate
} from "../advancement/steps.mjs";
import { applyLevel } from "../advancement/manager.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");
const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

export default class LevelUpDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /**
   * @param {Actor} actor
   * @param {Item} cls
   * @param {number} level      class level being gained
   * @param {object} [options]
   */
  constructor(actor, cls, level, options = {}) {
    super(options);
    this.actor = actor;
    this.cls = cls;
    this.level = level;
    this.#sel = {};
    this.#resolve = null;
    this.done = new Promise(r => { this.#resolve = r; });
  }

  static DEFAULT_OPTIONS = {
    id: "n5e-level-up-{id}",
    classes: ["n5e", "n5e-v2", "n5e-level-up"],
    tag: "div",
    window: { title: "Level Up", icon: "fa-solid fa-arrow-up", resizable: true },
    position: { width: 760, height: 820 },
    actions: {
      apply: LevelUpDialog.#onApply,
      cancel: LevelUpDialog.#onCancel,
      pick: LevelUpDialog.#onPick
    }
  };

  static PARTS = {
    body: { template: "systems/n5e/templates/apps/level-up.hbs", scrollable: [".lu-steps"] }
  };

  /** Selections keyed by step id. */
  #sel;

  #resolve;

  /** uuid -> document cache. */
  #docs = new Map();

  /** Open the dialog; resolves true when applied, false when closed. */
  static async open(actor, cls, level) {
    const app = new LevelUpDialog(actor, cls, level);
    await app.render(true);
    return app.done;
  }

  get title() {
    return `${this.actor.name}: ${this.cls.name} level ${this.level}`;
  }

  async #doc(uuid) {
    if ( !this.#docs.has(uuid) ) this.#docs.set(uuid, await fromUuid(uuid));
    return this.#docs.get(uuid);
  }

  async #packDocs(name, type) {
    const key = `pack:${name}`;
    if ( !this.#docs.has(key) ) {
      const pack = game.packs.get(`n5e.${name}`);
      const docs = pack ? await pack.getDocuments() : [];
      this.#docs.set(key, [...docs, ...game.items.filter(i => i.type === type)]);
    }
    return this.#docs.get(key);
  }

  /** Tooltip card for an item. */
  #tip(doc, extra = "") {
    const desc = doc.system?.description ?? "";
    return `<div class="n5e-tip"><b class="tt">${esc(doc.name)}</b>${extra ? `<div class="tm">${esc(extra)}</div>` : ""}`
      + `<div class="tb">${desc}</div></div>`;
  }

  /** Steps for this level, with the subclass's steps once one is chosen. */
  async #steps() {
    const subclass = this.actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === this.cls.system.identifier);
    const steps = stepsForLevel({ actor: this.actor, cls: this.cls, subclass, level: this.level });
    const subStep = steps.find(s => s.type === "subclass");
    const picked = subStep && this.#sel[subStep.id]?.[0];
    if ( picked ) {
      const doc = await this.#doc(picked);
      if ( doc ) steps.push(...subclassSteps(doc, this.level));
    }
    return steps;
  }

  /** @override */
  async _prepareContext(options) {
    const steps = await this.#steps();
    const actor = this.actor;
    const ownedNames = new Set(actor.items.map(i => i.name.toLowerCase()));
    const poolSizes = {};
    // Affinities after this level (grant steps add theirs).
    const affinities = new Set(actor.system.grants?.affinities ?? []);
    for ( const st of steps ) if ( st.type === "grant" && st.key === "affinity" ) st.values.forEach(v => affinities.add(v));

    const views = [];
    for ( const st of steps ) {
      const chosen = new Set(Array.isArray(this.#sel[st.id]) ? this.#sel[st.id] : []);
      const view = { ...st, chosenCount: chosen.size };
      switch ( st.type ) {
        case "feature": {
          view.items = [];
          for ( const u of st.uuids ) {
            const d = await this.#doc(u);
            if ( d ) view.items.push({ name: d.name, img: d.img, tip: this.#tip(d) });
          }
          break;
        }
        case "itemChoice":
        case "subclass": {
          view.options = [];
          for ( const u of st.uuids ) {
            const d = await this.#doc(u);
            if ( !d ) continue;
            const owned = ownedNames.has(d.name.toLowerCase());
            const req = d.system.requirement;
            view.options.push({ value: u, name: d.name, img: d.img, owned, selected: chosen.has(u),
              sub: typeof req === "string" ? req : "", tip: this.#tip(d, typeof req === "string" && req ? `Requirement: ${req}` : "") });
          }
          poolSizes[st.id] = view.options.filter(o => !o.owned).length;
          break;
        }
        case "option":
        case "trait":
          view.options = st.options.map(o => ({ ...o, selected: chosen.has(o.value) }));
          poolSizes[st.id] = view.options.length;
          break;
        case "grant":
          view.text = st.key === "affinity"
            ? `Gain the ${st.values.map(v => CONFIG.N5E.natureReleases?.[v]?.label ?? `${v[0].toUpperCase()}${v.slice(1)} Release`).join(", ")} affinity`
            : st.key === "mastery" ? `Gain a Mastery rank: ${st.values.map(v => CONFIG.N5E.skills?.[v.split(".")[1]]?.label ?? v).join(", ")}`
              : `Gain: ${st.values.join(", ")}`;
          break;
        case "asi": {
          const a = this.#sel[st.id] ?? {};
          view.abilityOptions = st.abilities.map(o => ({ ...o, selected: a.ability === o.value }));
          const feats = eligibleFeats(await this.#packDocs("feats", "feat"), { level: actor.system.level, owned: ownedNames });
          view.feats = feats.map(f => ({ value: f.uuid, name: f.name, img: f.img, selected: a.feat === f.uuid,
            sub: f.system.prerequisites?.join("; ") ?? "", tip: this.#tip(f, f.system.prerequisites?.length ? `Prerequisite: ${f.system.prerequisites.join("; ")}` : "") }));
          view.mastery = masteryTargets(actor).map(m => ({ ...m, selected: a.mastery === m.value }));
          poolSizes[`${st.id}:feat`] = view.feats.length;
          poolSizes[`${st.id}:mastery`] = view.mastery.length;
          break;
        }
        case "jutsu": {
          const all = await this.#packDocs("jutsu", "jutsu");
          const known = new Set(actor.items.filter(i => i.type === "jutsu").map(i => i.name.toLowerCase()));
          const learnable = learnableJutsu(all, { maxRank: st.maxRank, affinities, known, keywords: CONFIG.N5E.keywords });
          const groups = {};
          for ( const j of learnable ) {
            const g = groups[j.system.discipline] ??= { label: CONFIG.N5E.disciplines[j.system.discipline]?.label ?? j.system.discipline, options: [] };
            g.options.push({ value: j.uuid, name: j.name, img: j.img, rank: j.system.rank, selected: chosen.has(j.uuid),
              sub: `${j.system.rank}-Rank · ${j.system.cost?.mode === "chakra" ? `${j.system.cost.value} CP` : "No cost"}`,
              tip: this.#tip(j, `${j.system.rank}-Rank ${CONFIG.N5E.disciplines[j.system.discipline]?.label ?? ""}`) });
          }
          view.groups = ["nin", "gen", "tai", "buki"].filter(k => groups[k]).map(k => groups[k]);
          poolSizes[st.id] = learnable.length;
          view.short = learnable.length < st.count;
          break;
        }
        default:
          break;
      }
      view.need = Math.min(st.count ?? 0, poolSizes[st.id] ?? Infinity);
      view.full = view.chosenCount >= view.need;
      views.push(view);
    }
    this._steps = steps;
    this._poolSizes = poolSizes;
    const problems = validate(steps, this.#sel, poolSizes);
    return { steps: views, problems, ready: problems.length === 0, level: this.level, cls: this.cls.name,
      rankOrder: RANK_ORDER };
  }

  /** Toggle a choice. data-step, data-value, data-field (asi sub-field) on the clicked element. */
  static #onPick(event, target) {
    const { step, value, field } = target.dataset;
    const st = this._steps?.find(s => s.id === step);
    if ( !st ) return;
    if ( field ) {
      const cur = this.#sel[step] ?? {};
      cur[field] = cur[field] === value ? "" : value;
      this.#sel[step] = cur;
    } else {
      const cur = new Set(this.#sel[step] ?? []);
      if ( cur.has(value) ) cur.delete(value);
      else if ( (st.count ?? 1) === 1 ) { cur.clear(); cur.add(value); }
      else if ( cur.size < st.count ) cur.add(value);
      else return ui.notifications.info(`${st.title}: you can choose ${st.count}. Unpick one first.`);
      this.#sel[step] = [...cur];
      // Changing the subclass drops choices made for the previous one.
      if ( st.type === "subclass" ) for ( const k of Object.keys(this.#sel) ) if ( k.startsWith("subclass:") ) delete this.#sel[k];
    }
    this.render();
  }

  static async #onApply() {
    const problems = validate(this._steps, this.#sel, this._poolSizes);
    if ( problems.length ) return ui.notifications.warn(problems[0]);
    await applyLevel(this.actor, this.cls, this.level, this._steps, this.#sel);
    ui.notifications.info(`${this.actor.name} is now a level ${this.level} ${this.cls.name}.`);
    this.#resolve(true);
    this.#resolve = null;
    return this.close();
  }

  static #onCancel() {
    return this.close();
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    this.#resolve?.(false);
  }
}
