/**
 * "Reset NPCs" (NPC1c C2): a GM button on the Actors sidebar. Pick the NPCs (the selected tokens, or
 * an Actors folder), untick anything that shouldn't change, confirm. The plan per creature is
 * rules/npc-reset.mjs; this file only asks and applies.
 */
import { RESET_OPTIONS, resetPlan } from "../../rules/npc-reset.mjs";
import { esc } from "../../view-models/common.mjs";

/** The NPCs a choice refers to: "tokens" (selected on the canvas) or a folder id. */
export function npcsFor(source) {
  if ( source === "tokens" ) return (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(a => a?.type === "npc");
  const folder = game.folders.get(source);
  return folder ? [...folder.contents, ...folder.getSubfolders(true).flatMap(f => f.contents)].filter(a => a?.type === "npc") : [];
}

/** Ask what to reset, then reset it. */
export async function resetNPCsDialog() {
  if ( !game.user.isGM ) return null;
  const folders = game.folders.filter(f => f.type === "Actor");
  const content = `<div class="n5e-npc-reset">
    <label>NPCs <select name="source"><option value="tokens">Selected tokens</option>${folders.map(f => `<option value="${f.id}">Folder: ${esc(f.name)}</option>`).join("")}</select></label>
    ${Object.entries(RESET_OPTIONS).map(([k, label]) => `<label class="check"><input type="checkbox" name="${k}" checked> ${esc(label)}</label>`).join("")}
  </div>`;
  const choice = await foundry.applications.api.DialogV2.wait({ window: { title: "Reset NPCs" }, content, rejectClose: false,
    buttons: [{ action: "reset", label: "Next", default: true, callback: (event, button) => {
      const f = button.form.elements;
      return { source: f.source.value, ...Object.fromEntries(Object.keys(RESET_OPTIONS).map(k => [k, f[k].checked])) };
    } }] });
  if ( !choice ) return null;
  const actors = npcsFor(choice.source);
  if ( !actors.length ) return ui.notifications.info("No NPCs there.");
  const what = Object.entries(RESET_OPTIONS).filter(([k]) => choice[k]).map(([, l]) => `<li>${esc(l)}</li>`).join("");
  const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Reset NPCs" },
    content: `<p>Reset ${actors.length} NPC${actors.length > 1 ? "s" : ""}: ${esc(actors.map(a => a.name).join(", "))}</p><ul>${what}</ul>` });
  if ( !ok ) return null;
  for ( const actor of actors ) await resetNPC(actor, choice);
  ui.notifications.info(`Reset ${actors.length} NPC${actors.length > 1 ? "s" : ""}.`);
  return actors.length;
}

/** Apply one creature's reset. */
export async function resetNPC(actor, options) {
  const plan = resetPlan(actor, options);
  if ( Object.keys(plan.update).length ) await actor.update(plan.update);
  if ( plan.deleteEffects.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", plan.deleteEffects);
  if ( plan.items.length ) await actor.updateEmbeddedDocuments("Item", plan.items);
  return plan;
}

/** The sidebar button (renderActorDirectory hook). */
export function addResetButton(app, html) {
  if ( !game.user.isGM ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const actions = root?.querySelector(".header-actions");
  if ( !actions || actions.querySelector("[data-n5e-reset-npcs]") ) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.n5eResetNpcs = "1";
  button.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Reset NPCs';
  button.addEventListener("click", ev => { ev.preventDefault(); resetNPCsDialog(); });
  actions.append(button);
}
