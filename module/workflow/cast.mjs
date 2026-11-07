/**
 * Casting a jutsu (Foundry side): the cast dialog, spending, and the cast card.
 *
 * The dialog previews the plan as you change it (rank, multiplier choice, Moldings/Maneuvers, which
 * concentration to end) and only enables Cast when the plan is allowed. Casting applies the plan
 * (CP, Focus, Superiority Dice, concentration, Chain/Combo) in one actor update, then posts a card
 * whose buttons roll the attack, damage, healing, and targets' saves.
 */
import { castPlan } from "./cast-plan.mjs";
import { effectiveActivities } from "../rules/activity-parse.mjs";
import { activityButtons } from "./activity-buttons.mjs";
import { esc } from "../view-models/common.mjs";

const RANKS = ["E", "D", "C", "B", "A", "S"];

/** Moldings and Maneuvers the actor could add to this cast. */
function castOptions(actor, item) {
  return actor.items.filter(i => {
    const tags = i.system.tags instanceof Set ? i.system.tags : new Set(i.system.tags ?? []);
    if ( tags.has("nin-molding") ) return item.system.discipline === "nin";
    return tags.has("assault-maneuver");
  });
}

function dialogContent(actor, item, plan) {
  const j = item.system;
  const ranks = [j.rank, ...(j.live?.upcastRanks ?? [])].filter((r, i, a) => a.indexOf(r) === i);
  const opts = castOptions(actor, item);
  const conc = (actor.system.combat?.concentrating ?? []).map(id => actor.items.get(id)).filter(Boolean);
  const choice = (label, name, values) => `<label>${label} <select name="${name}">${values.map((v, i) =>
    `<option value="${i}">${typeof v === "number" ? (v < 1 ? `×${v}` : `×${v}`) : esc(v)}</option>`).join("")}</select></label>`;
  return `<div class="n5e-cast">
    ${ranks.length > 1 ? `<label>Cast at <select name="rank">${ranks.map(r => `<option value="${r}">${r}-Rank${r === j.rank ? " (base)" : ""}</option>`).join("")}</select></label>` : ""}
    ${plan.choices?.multipliers ? choice("Cost multiplier (pick one)", "multiplierChoice", plan.choices.multipliers) : ""}
    ${plan.choices?.divisors ? choice("Cost divisor (pick one)", "divisorChoice", plan.choices.divisors.map(d => `/${d}`)) : ""}
    ${opts.length ? `<fieldset><legend>Moldings and Maneuvers</legend>${opts.map(o => `<label class="opt">
      <input type="checkbox" name="opt" value="${o.id}"> ${esc(o.name)}</label>`).join("")}</fieldset>` : ""}
    ${plan.concentration?.atLimit ? `<label>End concentration on <select name="endConcentration">${conc.map(c =>
      `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>` : ""}
    <div class="preview" data-preview></div>
  </div>`;
}

function readSelection(form) {
  const f = form.elements;
  const val = n => f[n]?.value;
  return {
    rank: val("rank") || undefined,
    multiplierChoice: val("multiplierChoice") != null ? Number(val("multiplierChoice")) : undefined,
    divisorChoice: val("divisorChoice") != null ? Number(val("divisorChoice")) : undefined,
    options: [...form.querySelectorAll('input[name="opt"]:checked')].map(i => i.value),
    endConcentration: val("endConcentration") || undefined
  };
}

function previewHTML(plan) {
  const costLine = plan.costMode === "chakra" ? `<b>${plan.cost} CP</b> (${plan.cpAfter} left)`
    : plan.costMode === "none" ? "<b>No cost</b>" : `<b>Special:</b> ${esc(plan.costText || "see text")}`;
  const pools = Object.entries(plan.pools).map(([k, v]) => `${v} ${k === "focus" ? "Focus" : "Superiority Dice"}`).join(", ");
  return `<p>Cost: ${costLine}${pools ? ` · plus ${pools}` : ""}${plan.upcast > 0 ? ` · upcast +${plan.upcast}` : ""}</p>
    ${plan.concentration ? `<p>Concentration: upkeep ${plan.costMode === "chakra" ? Math.floor(plan.cost / 2) : 0} CP per turn${plan.concentration.ending ? " (ends one current jutsu)" : ""}</p>` : ""}
    ${plan.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join("")}
    ${plan.problems.map(p => `<p class="problem">${esc(p)}</p>`).join("")}`;
}

/**
 * Open the cast dialog and cast. Resolves the chat message, or null when cancelled.
 * @param {Actor} actor
 * @param {Item} item       a jutsu owned by the actor
 * @param {object} [o]
 * @param {boolean} [o.skipDialog]  cast at base rank with defaults (Alt+click)
 */
export async function castJutsu(actor, item, { skipDialog = false } = {}) {
  let sel = {};
  const initial = castPlan(actor, item, sel);
  const needsDialog = !skipDialog || !initial.ok;
  if ( needsDialog ) {
    const { DialogV2 } = foundry.applications.api;
    sel = await DialogV2.wait({
      window: { title: `Cast ${item.name}`, icon: "fa-solid fa-hand-sparkles" },
      classes: ["n5e-cast-dialog"],
      content: dialogContent(actor, item, initial),
      buttons: [{ action: "cast", label: "Cast", default: true, callback: (event, button) => readSelection(button.form) },
        { action: "cancel", label: "Cancel", callback: () => null }],
      render: (event, dialog) => {
        const form = dialog.element.querySelector("form");
        const update = () => {
          const plan = castPlan(actor, item, readSelection(form));
          form.querySelector("[data-preview]").innerHTML = previewHTML(plan);
          const btn = dialog.element.querySelector('button[data-action="cast"]');
          if ( btn ) btn.disabled = !plan.ok;
        };
        form.addEventListener("change", update);
        update();
      },
      rejectClose: false
    });
    if ( !sel ) return null;
  }
  const plan = castPlan(actor, item, sel);
  if ( !plan.ok ) {
    ui.notifications.warn(plan.problems[0]);
    return null;
  }
  await actor.update(plan.update);
  return postCastCard(actor, item, plan);
}

/** The cast card: what was spent, the rules text, and activity buttons. */
export async function postCastCard(actor, item, plan) {
  const j = item.system;
  const activities = effectiveActivities(item);
  const spent = [plan.costMode === "chakra" ? `${plan.cost} CP` : plan.costMode === "none" ? "No cost" : "Special cost",
    ...Object.entries(plan.pools).map(([k, v]) => `${v} ${k === "focus" ? "Focus" : "Superiority Dice"}`)].join(" · ");
  const TextEditor = foundry.applications.ux.TextEditor.implementation;
  const desc = await TextEditor.enrichHTML(j.description ?? "", { relativeTo: item, rollData: actor.getRollData() });
  const content = `<div class="n5e-cast-card" data-actor-uuid="${actor.uuid}" data-item-uuid="${item.uuid}">
    <header><img src="${item.img}" alt="" width="36" height="36"><div><b>${esc(item.name)}</b>
      <span class="sub">${esc(`${plan.rank}-Rank ${CONFIG.N5E.disciplines[j.discipline]?.label ?? ""}`)}${plan.upcast > 0 ? " (upcast)" : ""}</span></div></header>
    <div class="spent">${esc(spent)}${plan.options.length ? ` · ${plan.options.map(o => esc(o.name)).join(", ")}` : ""}</div>
    <details><summary>Rules text</summary><div class="desc">${desc}</div></details>
    ${activityButtons(actor, item, activities, { rank: plan.rank })}
  </div>`;
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }), content,
    flags: { n5e: { cast: { itemUuid: item.uuid, actorUuid: actor.uuid, rank: plan.rank, cost: plan.cost } } } });
}

export { RANKS };
