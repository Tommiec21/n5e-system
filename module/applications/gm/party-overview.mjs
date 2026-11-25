/**
 * GM Party Overview: every player character (and, in a combat, every combatant) with HP, CP,
 * conditions, concentration, Fury, open Gate and Amps; quick damage, healing and conditions.
 * One window per client (a static instance); it re-renders on actor, effect and combat changes.
 * Quick damage goes through the full damage pipeline (workflow/apply-damage.mjs), so it posts the
 * same summary card with Undo. Rows come from view-models/party.mjs (add a column there + in the
 * template templates/apps/party-overview.hbs).
 */
import { rule } from "../../rules-settings.mjs";
import { partyRowVM } from "../../view-models/party.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class PartyOverview extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-party-overview",
    classes: ["n5e", "n5e-v2", "n5e-party"],
    window: { title: "N5e Party Overview", icon: "fa-solid fa-users", resizable: true },
    position: { width: 760, height: 560 },
    actions: { openSheet: PartyOverview.#onOpen, quick: PartyOverview.#onQuick, awardAll: PartyOverview.#onAwardAll }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/party-overview.hbs", scrollable: [".rows"] } };

  // One shared window: open() reuses it, refresh() re-renders it when anything it shows changes.
  static #instance;
  /** Open (or bring forward) the Party Overview. */
  static open() {
    this.#instance ??= new PartyOverview();
    return this.#instance.render({ force: true });
  }
  /** Re-render if open; called from actor/effect/combat hooks (registerPartyOverview). */
  static refresh() {
    if ( this.#instance?.rendered ) this.#instance.render();
  }

  /** Who is listed: player-owned characters, then every combatant not already listed. */
  actors() {
    const seen = new Set();
    const out = [];
    const add = a => {
      if ( a && !seen.has(a.uuid) ) {
        seen.add(a.uuid);
        out.push(a);
      }
    };
    game.actors.filter(a => a.type === "character" && a.hasPlayerOwner).forEach(add);
    // PRESTD1 (rule partyStatsVisible): players see the player characters only.
    if ( game.user.isGM ) for ( const c of game.combat?.combatants ?? [] ) add(c.actor);
    return out;
  }

  /** @override */
  async _prepareContext() {
    const N5E = CONFIG.N5E;
    return {
      rows: this.actors().map(partyRowVM),
      isGM: game.user.isGM,
      inCombat: !!game.combat,
      conditions: Object.entries(N5E.conditions).map(([key, c]) => ({ key, label: c.label })),
      damageTypes: Object.entries(N5E.damageTypes ?? {}).map(([key, d]) => ({ key, label: d.label ?? key }))
    };
  }

  /** LVL1 L6: add XP to characters (a negative amount takes it away, never below 0). */
  static async award(actors, amount) {
    const chars = actors.filter(a => a?.type === "character");
    for ( const a of chars ) await a.update({ "system.details.xp": Math.max(0, (a.system.details?.xp ?? 0) + amount) });
    if ( chars.length ) ui.notifications.info(`${amount >= 0 ? "Awarded" : "Removed"} ${Math.abs(amount)} XP: ${chars.map(a => a.name).join(", ")}.`);
  }

  /** LVL1 L6: Award XP to every character listed. */
  static async #onAwardAll(event, target) {
    if ( !game.user.isGM ) return;
    const amount = Number(this.element.querySelector("input[name=awardXp]")?.value) || 0;
    if ( !amount ) return ui.notifications.info("Enter an amount first.");
    return PartyOverview.award(this.actors(), amount);
  }

  /** Click a name: open that actor's sheet. */
  static async #onOpen(event, target) {
    (await fromUuid(target.closest("[data-uuid]").dataset.uuid))?.sheet.render(true);
  }

  /**
   * Row quick actions. Damage and Heal go through the normal damage pipeline with this actor as the
   * fixed target (so DR, resistances and Undo all work); Add puts 1 rank of the chosen condition.
   */
  static async #onQuick(event, target) {
    if ( !game.user.isGM ) return;
    const row = target.closest("[data-uuid]");
    const actor = await fromUuid(row.dataset.uuid);
    if ( !actor ) return;
    const kind = target.dataset.kind;
    // LVL1 L6: Grant level (milestone) and Award XP for one character.
    if ( kind === "grant" ) {
      await actor.setFlag("n5e", "levelsGranted", (actor.flags?.n5e?.levelsGranted ?? 0) + 1);
      return ui.notifications.info(`${actor.name} can level up (granted by the GM).`);
    }
    if ( kind === "xp" ) {
      const xp = Number(row.querySelector("input[name=amount]")?.value) || 0;
      if ( !xp ) return ui.notifications.info("Enter an amount first.");
      return PartyOverview.award([actor], xp);
    }
    if ( kind === "condition" ) {
      const key = row.querySelector("select[name=condition]")?.value;
      if ( key ) await actor.addCondition(key, 1, { manual: true });
      return;
    }
    const amount = Number(row.querySelector("input[name=amount]")?.value) || 0;
    if ( !amount ) return ui.notifications.info("Enter an amount first.");
    const type = row.querySelector("select[name=type]")?.value ?? "";
    const { applyToSelected } = await import("../../workflow/apply-damage.mjs");
    return applyToSelected({ instances: [{ amount, type }], total: amount, targetUuid: actor.uuid }, kind);
  }
}

/** Token controls button (GM) and live refresh. */
export function registerPartyOverview() {
  Hooks.on("getSceneControlButtons", controls => {
    if ( !game.user.isGM && !rule("partyStatsVisible") ) return;
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools ) return;
    tokens.tools.n5eParty = { name: "n5eParty", title: "N5e Party Overview", icon: "fa-solid fa-users", button: true,
      order: Object.keys(tokens.tools).length + 1, onChange: () => PartyOverview.open() };
  });
  for ( const hook of ["updateActor", "createActiveEffect", "updateActiveEffect", "deleteActiveEffect", "updateCombat", "createCombatant", "deleteCombatant"] ) {
    Hooks.on(hook, () => PartyOverview.refresh());
  }
}
