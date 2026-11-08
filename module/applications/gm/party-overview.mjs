/**
 * GM Party Overview: every player character (and, in a combat, every combatant) with HP, CP,
 * conditions, concentration, Fury, open Gate and Amps; quick damage, healing and conditions.
 * One window per client (a static instance); it re-renders on actor, effect and combat changes.
 * Quick damage goes through the full damage pipeline (workflow/apply-damage.mjs), so it posts the
 * same summary card with Undo. Rows come from view-models/party.mjs (add a column there + in the
 * template templates/apps/party-overview.hbs).
 */
import { partyRowVM } from "../../view-models/party.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class PartyOverview extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-party-overview",
    classes: ["n5e", "n5e-v2", "n5e-party"],
    window: { title: "N5e Party Overview", icon: "fa-solid fa-users", resizable: true },
    position: { width: 760, height: 560 },
    actions: { openSheet: PartyOverview.#onOpen, quick: PartyOverview.#onQuick }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/party-overview.hbs", scrollable: [".rows"] } };

  static #instance;
  static open() {
    this.#instance ??= new PartyOverview();
    return this.#instance.render({ force: true });
  }
  static refresh() {
    if ( this.#instance?.rendered ) this.#instance.render();
  }

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
    for ( const c of game.combat?.combatants ?? [] ) add(c.actor);
    return out;
  }

  /** @override */
  async _prepareContext() {
    const N5E = CONFIG.N5E;
    return {
      rows: this.actors().map(partyRowVM),
      inCombat: !!game.combat,
      conditions: Object.entries(N5E.conditions).map(([key, c]) => ({ key, label: c.label })),
      damageTypes: Object.entries(N5E.damageTypes ?? {}).map(([key, d]) => ({ key, label: d.label ?? key }))
    };
  }

  static async #onOpen(event, target) {
    (await fromUuid(target.closest("[data-uuid]").dataset.uuid))?.sheet.render(true);
  }

  static async #onQuick(event, target) {
    const row = target.closest("[data-uuid]");
    const actor = await fromUuid(row.dataset.uuid);
    if ( !actor ) return;
    const kind = target.dataset.kind;
    if ( kind === "condition" ) {
      const key = row.querySelector("select[name=condition]")?.value;
      if ( key ) await actor.addCondition(key, 1);
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
    if ( !game.user.isGM ) return;
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools ) return;
    tokens.tools.n5eParty = { name: "n5eParty", title: "N5e Party Overview", icon: "fa-solid fa-users", button: true,
      order: Object.keys(tokens.tools).length + 1, onChange: () => PartyOverview.open() };
  });
  for ( const hook of ["updateActor", "createActiveEffect", "updateActiveEffect", "deleteActiveEffect", "updateCombat", "createCombatant", "deleteCombatant"] ) {
    Hooks.on(hook, () => PartyOverview.refresh());
  }
}
