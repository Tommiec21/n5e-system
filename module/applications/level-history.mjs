/**
 * LVL1 L5 (King 2026-11-24): Level History. One card per class level with what it gave (items stamped with
 * that level: features, feats, options, jutsu; the ASI; 1st-level proficiencies; what it switched out),
 * and, for the character's owner, "Change choices" (LevelUpDialog.openEdit; the GM is alerted).
 * Remove level stays on the sheet (most recent level only).
 */
import LevelUpDialog from "./level-up.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TYPE_LABEL = { feat: "Features and feats", jutsu: "Jutsu", stance: "Stances", subclass: "Subclass" };

/** Pure: the history rows for a class (tests use this). */
export function levelHistory(actor, cls) {
  const N = globalThis.CONFIG?.N5E ?? {};
  const items = [...(actor.items?.contents ?? actor.items ?? [])];
  const levels = [];
  for ( let level = 1; level <= (cls.system.levels ?? 0); level++ ) {
    const lines = [];
    const stamped = items.filter(i => (i.flags?.n5e?.advancement?.level === level && i !== cls) || i.flags?.n5e?.clanLevel === level);
    const groups = {};
    for ( const i of stamped ) (groups[TYPE_LABEL[i.type] ?? "Other"] ??= []).push(i.name);
    for ( const [label, names] of Object.entries(groups) ) lines.push({ label, text: names.sort().join(", ") });
    const asi = cls.flags?.n5e?.asi?.[level];
    if ( asi && (asi.ability || asi.mastery) ) lines.push({ label: "Ability Score Increase",
      text: [asi.ability && `+1 ${N.abilities?.[asi.ability]?.label ?? asi.ability.toUpperCase()}`, asi.mastery && `Mastery: ${asi.mastery}`].filter(Boolean).join(", ") });
    if ( level === 1 ) {
      const sk = [...(cls.system.skills?.chosen ?? [])].map(k => N.skills?.[k]?.label ?? k);
      const tl = [...(cls.system.tools?.chosen ?? [])].map(k => N.toolkits?.[k]?.label ?? k);
      if ( sk.length ) lines.push({ label: "Skills chosen", text: sk.join(", ") });
      if ( tl.length ) lines.push({ label: "Toolkits chosen", text: tl.join(", ") });
    }
    const swaps = cls.flags?.n5e?.levelSwaps?.[level]?.removed ?? [];
    if ( swaps.length ) lines.push({ label: "Switched out", text: swaps.map(d => d.name).join(", ") });
    levels.push({ level, lines, current: level === cls.system.levels });
  }
  return levels.reverse();
}

export default class LevelHistory extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, cls, options = {}) {
    super(options);
    this.actor = actor;
    this.cls = cls;
  }

  static DEFAULT_OPTIONS = {
    id: "n5e-level-history-{id}",
    classes: ["n5e", "n5e-v2", "n5e-level-history"],
    tag: "div",
    window: { title: "Level History", icon: "fa-solid fa-clock-rotate-left", resizable: true },
    position: { width: 560, height: 640 },
    actions: { editLevel: LevelHistory.#onEditLevel }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/level-history.hbs", scrollable: [".lh-body"] } };

  get title() { return `${this.actor.name}: Level History (${this.cls.name})`; }

  async _prepareContext() {
    return { levels: levelHistory(this.actor, this.cls), editable: this.actor.isOwner };
  }

  static async #onEditLevel(event, target) {
    const done = await LevelUpDialog.openEdit(this.actor, this.cls, Number(target.dataset.level));
    if ( done ) this.render();
  }
}
