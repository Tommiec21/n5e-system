/**
 * Level-up dialog: one page listing what the new level grants, with a card for every choice
 * (dnd5e's advancement flow, flattened). Apply stays disabled until every choice is made.
 *
 * Flow: open(actor, classItem, level) → advancement/steps.mjs works out the steps for that level
 * (HP/CP, features granted, option picks, subclass, ASI, jutsu slots) → the player chooses →
 * validate() → advancement/manager.mjs applyLevel() creates the items and records what this level
 * added (so "Remove level" can take exactly that back).
 * NT1: jutsu are never listed here. Slot cards (class, and each feature's Bonus Jutsu) take drops from the
 * Jutsu Browser (Open Jutsu Browser presets the slot's filters); open slots don't hold up Apply.
 * A new kind of choice: add a step type in steps.mjs (and its validation), a card for it in
 * templates/apps/level-up.hbs (classes are prefixed "lu-"), and its application in manager.mjs.
 */
import {
  stepsForLevel, subclassSteps, eligibleFeats, masteryTargets, validate
} from "../advancement/steps.mjs";
import { applyLevel } from "../advancement/manager.mjs";
import { itemChoiceAllowed, validateItemChoices } from "../advancement/eligibility.mjs";
import { learnProblems, learnBlock, browserFilters, filterText, matchesFilter, replacementFor, learnedMode, jutsuDiscipline } from "../rules/jutsu-slots.mjs";
import { grantedBy } from "../workflow/learn-jutsu.mjs";

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
      pick: LevelUpDialog.#onPick,
      toggleReplace: LevelUpDialog.#onToggleReplace,
      openJutsuBrowser: LevelUpDialog.#onOpenJutsuBrowser
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

  /** Load a document by uuid once per dialog (steps point at compendium items by uuid). */
  async #doc(uuid) {
    if ( !this.#docs.has(uuid) ) this.#docs.set(uuid, await fromUuid(uuid));
    return this.#docs.get(uuid);
  }

  /** Every document of a type in one of the system's packs (feat and jutsu pickers), cached. */
  async #packDocs(name, type) {
    const key = `pack:${name}`;
    if ( !this.#docs.has(key) ) {
      const pack = game.packs.get(`n5e.${name}`);
      const docs = pack ? await pack.getDocuments() : [];
      if ( !this.#docs.has("clan:documents") ) this.#docs.set("clan:documents", await game.packs.get("n5e.clans")?.getDocuments() ?? []);
      this.#docs.set(key, [...docs, ...this.#docs.get("clan:documents").filter(i => i.type === type), ...game.items.filter(i => i.type === type)]);
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
    // NT1: features gained this level (granted, or picked here) that give Bonus Jutsu: a slot step each,
    // and one card listing the jutsu they grant outright.
    const gained = [];
    for ( const st of steps ) {
      if ( st.type === "feature" ) gained.push(...st.uuids);
      else if ( ["itemChoice", "featChoice"].includes(st.type) ) gained.push(...(this.#sel[st.id] ?? []));
      else if ( st.type === "asi" && this.#sel[st.id]?.feat ) gained.push(this.#sel[st.id].feat);
    }
    const granted = [];
    for ( const uuid of new Set(gained) ) {
      const doc = await this.#doc(uuid);
      if ( doc?.type !== "feat" ) continue;
      const b = doc.system.bonusJutsu ?? {};
      if ( (b.count ?? 0) > 0 ) steps.push({ id: `bonus:${uuid}`, type: "bonusJutsu", title: `Bonus jutsu: ${doc.name}`, count: b.count,
        sourceUuid: uuid, sourceName: doc.name, maxRank: b.maxRank || "",
        filter: { maxRank: b.maxRank ?? "", discipline: b.discipline ?? "", section: b.section ?? "", keyword: b.keyword ?? "" } });
      for ( const j of doc.system.grants?.jutsu ?? [] ) {
        // LVL1 L1: already known: a replacement Bonus Jutsu slot (same discipline and section, up to its rank).
        const jd = await this.#doc(j);
        const known = jd && this.actor.items.some(i => i.type === "jutsu" && ((i.system.identifier || i.name) === (jd.system.identifier || jd.name) || (i._stats?.compendiumSource ?? i.flags?.core?.sourceId) === j));
        granted.push({ jutsu: j, from: doc.name, known: !!known });
        if ( known ) {
          const r = replacementFor(jd);
          steps.push({ id: `bonus:${uuid}#${j}`, type: "bonusJutsu", title: `Bonus jutsu: ${doc.name} (instead of ${jd.name})`, count: 1,
            sourceUuid: `${uuid}#${j}`, sourceName: doc.name, maxRank: r.maxRank,
            filter: { maxRank: r.maxRank, discipline: r.discipline, section: r.section, keyword: "" } });
        }
      }
    }
    if ( granted.length ) steps.push({ id: "granted:jutsu", type: "grantedJutsu", title: "Jutsu granted", granted });

    // LVL1 L2: option swaps. A choice marked swap (Malleable Mirages) lists the earlier picks with the same
    // key; each one switched out adds a pick.
    const owners = { class: this.cls, subclass, clan: this.actor.items.find(i => i.type === "clan") };
    for ( const st of steps.filter(x => x.type === "itemChoice" && x.swap) ) {
      const owner = owners[st.origin];
      const ids = new Set((owner?.system.advancement ?? []).filter(a => a.key === st.key && a.id !== st.advId).map(a => `${st.origin}:${a.id}`));
      st.known = this.actor.items.filter(i => ids.has(i.flags?.n5e?.advancement?.step)).map(i => ({ id: i.id, name: i.name, img: i.img }));
      st.replace = (this.#sel[`${st.id}:replace`] ?? []).filter(id => st.known.some(k => k.id === id));
      st.baseCount = st.count;
      st.count += st.replace.length;
    }

    // LVL1 L2 (KB 04, King): learning a new jutsu at level up, swap any number of known class jutsu for
    // jutsu of the same discipline within the highest rank. Granted jutsu can't be swapped.
    const jst = steps.find(x => x.type === "jutsu");
    if ( jst?.gain > 0 ) {
      const N = CONFIG.N5E;
      const known = this.actor.items.filter(i => i.type === "jutsu" && learnedMode(i) === "class" && !grantedBy(this.actor, i))
        .sort((a, b) => RANK_ORDER.indexOf(a.system.rank) - RANK_ORDER.indexOf(b.system.rank) || a.name.localeCompare(b.name));
      if ( known.length ) {
        steps.push({ id: "class:swap", type: "swapPick", title: "Swap jutsu", count: known.length,
          known: known.map(i => ({ id: i.id, name: i.name, rank: i.system.rank, disc: N.disciplines[jutsuDiscipline(i)]?.label ?? "" })) });
        for ( const id of this.#sel["class:swap"] ?? [] ) {
          const j = this.actor.items.get(id);
          if ( !j ) continue;
          const disc = jutsuDiscipline(j);
          steps.push({ id: `swap:${id}`, type: "swapJutsu", title: `Swap: replace ${j.name}`, count: 1, forget: id, forgetName: j.name,
            maxRank: jst.maxRank ?? "", filter: { maxRank: jst.maxRank ?? "", discipline: disc, section: "", keyword: "" }, discLabel: N.disciplines[disc]?.label ?? disc });
        }
      }
    }
    return steps;
  }

  /** LVL1 L2: switch an earlier pick out (or back in) for a swap choice. */
  static #onToggleReplace(event, target) {
    const key = `${target.dataset.step}:replace`;
    const cur = new Set(this.#sel[key] ?? []);
    if ( cur.has(target.dataset.value) ) cur.delete(target.dataset.value);
    else cur.add(target.dataset.value);
    this.#sel[key] = [...cur];
    this.render();
  }

  /** NT1: a jutsu dropped on a jutsu card (or anywhere in the window): queue it in that step or the first with room. */
  async #onDropJutsu(event) {
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    const doc = data?.uuid ? await fromUuid(data.uuid) : null;
    if ( doc?.type !== "jutsu" ) return;
    const known = this.actor.items.some(i => i.type === "jutsu" && (i.system.identifier || i.name) === (doc.system.identifier || doc.name));
    if ( known ) return ui.notifications.warn(`${this.actor.name} already knows ${doc.name}.`);
    // LVL1 L1 (King): below the ability requirement it can't be learned (this level's ASI counts).
    const block = learnBlock(this.#probe(), doc);
    if ( block ) return ui.notifications.error(block);
    const slotSteps = (this._steps ?? []).filter(s => ["jutsu", "bonusJutsu", "swapJutsu"].includes(s.type));
    if ( slotSteps.some(s => (this.#sel[s.id] ?? []).includes(doc.uuid)) ) return;
    const target = event.target.closest?.("[data-jutsu-step]")?.dataset.jutsuStep;
    const room = s => (this.#sel[s.id] ?? []).length < (s.count ?? 0);
    const st = slotSteps.find(s => s.id === target)
      ?? slotSteps.find(s => s.type === "jutsu" && room(s))
      ?? slotSteps.find(s => s.type === "bonusJutsu" && room(s) && matchesFilter(doc, s.filter))
      ?? slotSteps.find(s => s.type === "swapJutsu" && room(s) && matchesFilter(doc, s.filter))
      ?? slotSteps.find(s => room(s))
      ?? slotSteps.find(s => s.type === "jutsu") ?? slotSteps[0];
    if ( !st ) return ui.notifications.info("No jutsu slots at this level: drop it on the character sheet instead.");
    this.#sel[st.id] = [...(this.#sel[st.id] ?? []), doc.uuid];
    this.#docs.set(doc.uuid, doc);
    this.render();
  }

  /** The actor as it will be after this level's ASI (ability score checks). */
  #probe() {
    const asi = (this._steps ?? []).find(s => s.type === "asi");
    const up = asi ? this.#sel[asi.id]?.ability : "";
    if ( !up ) return this.actor;
    const sys = this.actor.system;
    const abilities = { ...sys.abilities, [up]: { ...sys.abilities[up], value: (sys.abilities[up]?.value ?? 10) + 1 } };
    return { name: this.actor.name, items: this.actor.items, system: { ...sys, abilities } };
  }

  /** NT1: open the Jutsu Browser with this slot's filters (all removable), learning for this character. */
  static #onOpenJutsuBrowser(event, target) {
    const st = this._steps?.find(s => s.id === target.dataset.step);
    game.n5e.browser("jutsu", { filters: browserFilters({ maxRank: st?.maxRank ?? "", filter: st?.filter ?? {} }), learning: this.actor });
  }

  /** @override Jutsu cards accept drops from the browser or a compendium. */
  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const root = this.element;
    if ( root.dataset.jutsuDrop ) return;
    root.dataset.jutsuDrop = "1";
    const zones = ".lu-jutsu, .lu-bonusJutsu, .lu-swapJutsu";
    root.addEventListener("dragover", ev => { if ( ev.target.closest?.(zones) ) ev.preventDefault(); });
    root.addEventListener("drop", ev => { if ( ev.target.closest?.(zones) ) this.#onDropJutsu(ev); });
  }

  /** @override */
  async _prepareContext(options) {
    const steps = await this.#steps();
    this._steps = steps;
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
        case "featChoice":
        case "subclass": {
          view.options = [];
          const clanKey = actor.items.find(i => i.type === "clan")?.system.identifier ?? "";
          const choices = st.type === "featChoice" ? eligibleFeats(await this.#packDocs("feats", "feat"), { level: Math.max(actor.system.level, this.level), owned: ownedNames, clan: clanKey }).map(d => d.uuid) : st.uuids;
          if ( st.type === "featChoice" ) view.type = "itemChoice";
          for ( const u of choices ) {
            const d = await this.#doc(u);
            if ( !d ) continue;
            if ( !itemChoiceAllowed(d, { actor, level: this.level, key: st.key }) ) continue;
            const owned = ownedNames.has(d.name.toLowerCase());
            const req = d.system.requirement;
            view.options.push({ value: u, name: d.name, img: d.img, owned, selected: chosen.has(u),
              sub: [typeof req === "string" ? req : req?.level > 1 ? `Level ${req.level}` : "", ...(d.system.prerequisites ?? [])].filter(Boolean).join("; "),
              tip: this.#tip(d, (d.system.prerequisites ?? []).join("; ")) });
          }
          poolSizes[st.id] = view.options.filter(o => !o.owned).length + (st.replace?.length ?? 0);
          if ( st.swap ) view.swapKnown = (st.known ?? []).map(k => ({ ...k, replaced: st.replace.includes(k.id) }));
          break;
        }
        case "option":
        case "trait":
          view.options = st.options.map(o => ({ ...o, selected: chosen.has(o.value) }));
          poolSizes[st.id] = view.options.length;
          break;
        case "masteryChoice":
          // Any proficient skill or toolkit; ◆n shows Mastery ranks it already has.
          view.options = masteryTargets(actor).map(m => ({ value: m.value, label: `${m.label}${m.rank ? ` ◆${m.rank}` : ""}`, selected: chosen.has(m.value) }));
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
          const feats = eligibleFeats(await this.#packDocs("feats", "feat"), { level: Math.max(actor.system.level, this.level), owned: ownedNames, clan: actor.items.find(i => i.type === "clan")?.system.identifier ?? "" })
            .filter(f => !f.system.requirement?.clan || f.system.requirement.clan === actor.items.find(i => i.type === "clan")?.system.identifier);
          view.feats = feats.map(f => ({ value: f.uuid, name: f.name, img: f.img, selected: a.feat === f.uuid,
            sub: f.system.prerequisites?.join("; ") ?? "", tip: this.#tip(f, f.system.prerequisites?.length ? `Prerequisite: ${f.system.prerequisites.join("; ")}` : "") }));
          view.mastery = masteryTargets(actor).map(m => ({ ...m, selected: a.mastery === m.value }));
          poolSizes[`${st.id}:feat`] = view.feats.length;
          poolSizes[`${st.id}:mastery`] = view.mastery.length;
          break;
        }
        case "swapPick":
          view.options = st.known.map(k => ({ ...k, selected: chosen.has(k.id) }));
          view.need = 0;
          break;
        case "jutsu":
        case "bonusJutsu":
        case "swapJutsu": {
          // NT1: no list here: the counts, where they come from, and the jutsu dropped in so far.
          const N = CONFIG.N5E;
          const labels = { discipline: k => N.disciplines[k]?.label ?? k, section: k => N.jutsuSections?.[k]?.label ?? k, keyword: k => N.keywords?.[k]?.label ?? k };
          view.limits = st.type === "jutsu" ? (st.maxRank ? `up to ${st.maxRank}-Rank` : "") : filterText(st.filter, labels);
          view.from = st.type === "jutsu"
            ? `Level up (${st.sourceName}): ${st.gain ?? st.count} new${st.carried ? `, ${st.carried} still open from earlier levels` : ""}`
            : st.type === "swapJutsu" ? `Forget ${st.forgetName}; learn a ${st.discLabel} jutsu instead (if none is dropped, ${st.forgetName} stays)`
            : `${st.sourceName}: ${st.count} bonus jutsu`;
          const probe = { name: actor.name, items: actor.items, system: { grants: { ...actor.system.grants, affinities } } };
          view.picks = [];
          for ( const [n, u] of [...chosen].entries() ) {
            const d = await this.#doc(u);
            if ( !d ) continue;
            const problems = learnProblems(probe, d, { maxRank: st.maxRank ?? "", filter: st.type === "jutsu" ? null : st.filter, keywords: N.keywords });
            if ( n >= st.count ) problems.push("Over this slot's count.");
            const block = learnBlock(this.#probe(), d);
            if ( block ) problems.unshift(`Blocked: ${block}`);
            view.picks.push({ value: u, name: d.name, img: d.img, rank: d.system.rank, warn: problems.join(" "),
              tip: this.#tip(d, `${d.system.rank}-Rank ${N.disciplines[d.system.group ?? d.system.discipline]?.label ?? ""}`) });
          }
          view.open = Math.max(0, st.count - view.picks.length);
          break;
        }
        case "grantedJutsu": {
          view.granted = [];
          for ( const g of st.granted ) {
            const d = await this.#doc(g.jutsu);
            view.granted.push({ name: d?.name ?? g.jutsu, img: d?.img, from: g.from, known: g.known, tip: d ? this.#tip(d) : "" });
          }
          break;
        }
        default:
          break;
      }
      view.need = Math.min(st.count ?? 0, poolSizes[st.id] ?? Infinity);
      view.full = view.chosenCount >= view.need;
      if ( st.type === "grantedJutsu" || st.type === "swapPick" ) view.full = true;
      views.push(view);
    }
    this._steps = steps;
    this._poolSizes = poolSizes;
    const problems = validate(steps, this.#sel, poolSizes);
    problems.push(...await validateItemChoices(actor, this.level, steps, this.#sel, uuid => this.#doc(uuid)));
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

  /**
   * Apply: validate every step has its choices (advancement/steps.mjs validate), then
   * advancement/manager.mjs applyLevel() writes the level (class levels, HP/CP, granted items with
   * flags.n5e.advancement so Remove level can undo exactly them, ASI, Mastery, jutsu).
   */
  static async #onApply() {
    const problems = validate(this._steps, this.#sel, this._poolSizes);
    problems.push(...await validateItemChoices(this.actor, this.level, this._steps, this.#sel));
    if ( problems.length ) return ui.notifications.warn(problems[0]);
    await applyLevel(this.actor, this.cls, this.level, this._steps, this.#sel);
    ui.notifications.info(`${this.actor.name} is now a level ${this.level} ${this.cls.name}.`);
    this.#resolve(true);
    this.#resolve = null;
    return this.close();
  }

  /** Cancel: close without changing anything (a 1st level from a dropped class is removed by the caller). */
  static #onCancel() {
    return this.close();
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    this.#resolve?.(false);
  }
}
