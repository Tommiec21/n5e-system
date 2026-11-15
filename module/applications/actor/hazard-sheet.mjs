/**
 * Hazard and vehicle sheets (PRESTD1 Part D-ii): the NPC sheet with one more tab. Hazards: Stealth DC,
 * disable check, hardness, trigger and routine, and buttons that post Notice, Disable and Trigger
 * cards. Vehicles: hardness, piloting, collision, crew and passengers (drop an actor on the sheet).
 * Rules: rules/hazards.mjs.
 */
import NPCSheet from "./npc-sheet.mjs";
import { HAZARD_KINDS, checkChoices, hazardLines, vehicleLines, board, leave } from "../../rules/hazards.mjs";
import { abilities } from "../../config/core.mjs";

const enrich = (text, actor) => foundry.applications.ux.TextEditor.implementation.enrichHTML(text ?? "", { relativeTo: actor });
const options = (pairs, value) => pairs.map(([k, label]) => ({ value: k, label, selected: k === value }));

async function postLines(actor, lines, flavor) {
  const html = `<div class="n5e-roll-card"><b>${foundry.utils.escapeHTML?.(flavor) ?? flavor}</b>${lines.map(l => `<div>${l}</div>`).join("")}</div>`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: html });
}

export class HazardSheet extends NPCSheet {
  static DEFAULT_OPTIONS = {
    classes: ["hazard"],
    actions: { hazardPost: HazardSheet.#onPost }
  };

  static PARTS = { ...NPCSheet.PARTS, hazard: { template: "systems/n5e/templates/actor/hazard/hazard.hbs", scrollable: [""] } };

  static TABS = { primary: { ...NPCSheet.TABS.primary, tabs: [NPCSheet.TABS.primary.tabs[0], { id: "hazard", label: "Hazard" }, ...NPCSheet.TABS.primary.tabs.slice(1)] } };

  async _preparePartContext(partId, context, opts) {
    context = await super._preparePartContext(partId, context, opts);
    if ( partId !== "hazard" ) return context;
    const h = this.actor.system.hazard;
    context.tab = context.tabs.hazard;
    context.hz = { ...h, isGM: game.user.isGM, editMode: this.editMode,
      kinds: options(Object.entries(HAZARD_KINDS), h.kind), checks: options(checkChoices(), h.disable.skill),
      triggerHTML: await enrich(h.trigger ?? "", this.actor),
      routineHTML: await enrich(h.routine ?? "", this.actor) };
    return context;
  }

  static async #onPost(event, target) {
    const moment = target.dataset.moment;
    const h = this.actor.system.hazard;
    const lines = hazardLines(this.actor.name, h, moment);
    if ( moment === "trigger" ) {
      if ( h.trigger ) lines.push(await enrich(h.trigger, this.actor));
      if ( h.routine ) lines.push(await enrich(h.routine, this.actor));
    }
    // Notice and disable cards go to everyone (the players roll); the trigger stays with the GM unless they share it.
    return postLines(this.actor, lines, { notice: "Hazard: notice", disable: "Hazard: disable", trigger: "Hazard triggered" }[moment] ?? "Hazard");
  }
}

export class VehicleSheet extends NPCSheet {
  static DEFAULT_OPTIONS = {
    classes: ["vehicle"],
    actions: { vehiclePost: VehicleSheet.#onPost, vehicleLeave: VehicleSheet.#onLeave }
  };

  static PARTS = { ...NPCSheet.PARTS, vehicle: { template: "systems/n5e/templates/actor/vehicle/vehicle.hbs", scrollable: [""] } };

  static TABS = { primary: { ...NPCSheet.TABS.primary, tabs: [NPCSheet.TABS.primary.tabs[0], { id: "vehicle", label: "Vehicle" }, ...NPCSheet.TABS.primary.tabs.slice(1)] } };

  async _preparePartContext(partId, context, opts) {
    context = await super._preparePartContext(partId, context, opts);
    if ( partId !== "vehicle" ) return context;
    const v = this.actor.system.vehicle;
    const who = async list => (await Promise.all(list.map(async uuid => ({ uuid, name: (await fromUuid(uuid))?.name ?? "(missing)" }))));
    context.tab = context.tabs.vehicle;
    context.vh = { ...v, isGM: game.user.isGM, editable: this.isEditable,
      checks: options(checkChoices(), v.pilot.skill),
      saves: options(Object.entries(abilities).map(([k, a]) => [k, a.label]), v.collision.save),
      crewList: await who(v.crew), passengerList: await who(v.passengers),
      notesHTML: await enrich(v.notes ?? "", this.actor) };
    return context;
  }

  /** Drop an actor on the sheet: crew or passenger. */
  async _onDropActor(event, actor) {
    if ( !this.isEditable || !actor || actor === this.actor ) return null;
    const as = await foundry.applications.api.DialogV2.wait({ window: { title: `${actor.name} boards ${this.actor.name}` },
      content: "<p>Crew or passenger?</p>", buttons: [{ action: "crew", label: "Crew" }, { action: "passengers", label: "Passenger" }], rejectClose: false });
    if ( !as ) return null;
    try {
      const next = board(this.actor.system.vehicle, actor.uuid, as);
      return this.actor.update({ "system.vehicle.crew": next.crew, "system.vehicle.passengers": next.passengers });
    } catch (error) {
      return ui.notifications.warn(error.message);
    }
  }

  static async #onLeave(event, target) {
    if ( !this.isEditable ) return null;
    const next = leave(this.actor.system.vehicle, target.closest("[data-uuid]")?.dataset.uuid);
    return this.actor.update({ "system.vehicle.crew": next.crew, "system.vehicle.passengers": next.passengers });
  }

  static async #onPost(event, target) {
    const moment = target.dataset.moment;
    return postLines(this.actor, vehicleLines(this.actor.name, this.actor.system.vehicle, moment), moment === "pilot" ? "Vehicle: piloting" : "Vehicle: collision");
  }
}
