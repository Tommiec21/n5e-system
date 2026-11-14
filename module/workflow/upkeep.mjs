/**
 * Concentration upkeep at the start of a turn (King 2026-11-13; rules/upkeep.mjs).
 * The active GM opens the decision at turn start; the owner answers on their own client (only their
 * own actor changes, so no relay is needed); an unanswered decision ends those jutsu at turn end.
 * The turn card reads the pending decision from the actor's flags.n5e.upkeepPending.
 */
import { upkeepOptions, validateUpkeepChoice, upkeepMode, autoKeep } from "../rules/upkeep.mjs";
import { rule } from "../rules-settings.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

const modeFor = actor => upkeepMode(actor, { upkeepRule: !!rule("concentrationUpkeep"), npcUpkeep: rule("npcUpkeep") });

/** Keep exactly `keepIds`; drop the rest (their areas, summons and dependents end through existing hooks). */
async function keepOnly(actor, keepIds, cost) {
  const current = actor.system.combat?.concentrating ?? [];
  const update = { "system.combat.concentrating": current.filter(id => keepIds.includes(id)), "flags.n5e.-=upkeepPending": null };
  for ( const id of current ) if ( !keepIds.includes(id) ) update[`flags.n5e.concentrationPaid.-=${id}`] = null;
  if ( cost ) update["system.cp.value"] = (actor.system.cp?.value ?? 0) - cost;
  return actor.update(update);
}

/**
 * GM, at turn start. Returns HTML lines for the turn card.
 * @returns {Promise<string[]>}
 */
export async function beginUpkeep(actor, combat) {
  const mode = modeFor(actor);
  if ( mode === "off" || mode === "manual" ) return [];
  const options = upkeepOptions(actor);
  if ( !options.jutsu.length ) return [];
  if ( options.noneAffordable ) {
    await keepOnly(actor, [], 0);
    return [`<span class="warn">Not enough chakra for any upkeep: ${esc(options.jutsu.map(j => j.name).join(", "))} end.</span>`];
  }
  if ( mode === "auto" ) {
    const keep = autoKeep(options);
    const cost = validateUpkeepChoice(options, keep);
    await keepOnly(actor, keep, cost);
    const ended = options.jutsu.filter(j => !keep.includes(j.id)).map(j => j.name);
    return [`Upkeep paid: <b>${cost} CP</b>${ended.length ? `; ended: ${esc(ended.join(", "))}` : ""}`];
  }
  await actor.update({ "flags.n5e.upkeepPending": { combatId: combat?.id ?? null, round: combat?.round ?? null,
    turn: combat?.turn ?? null, ids: options.jutsu.map(j => j.id) } });
  return [`<div class="n5e-upkeep" data-n5e-upkeep="${esc(actor.uuid)}"><b>Concentration upkeep</b>: choose what to maintain (unanswered jutsu end at the end of this turn).</div>`];
}

/** Owner's client: pay for the chosen jutsu and end the others. */
export async function resolveUpkeep(actor, keepIds) {
  if ( !canModify(game.user, actor) ) throw new Error("Only the owner decides this upkeep.");
  const pending = actor.flags?.n5e?.upkeepPending;
  if ( !pending ) throw new Error("No upkeep decision is waiting.");
  const options = upkeepOptions(actor);
  options.jutsu = options.jutsu.filter(j => pending.ids.includes(j.id));
  const cost = validateUpkeepChoice(options, keepIds);
  // Jutsu started after the prompt opened are not part of this decision.
  const untouched = (actor.system.combat?.concentrating ?? []).filter(id => !pending.ids.includes(id));
  return keepOnly(actor, [...untouched, ...keepIds], cost);
}

/** GM, at turn end: an unanswered decision ends those jutsu (King 2026-11-13). */
export async function finishUpkeep(actor) {
  const pending = actor?.flags?.n5e?.upkeepPending;
  if ( !pending || !game.users.activeGM?.isSelf ) return null;
  const keep = (actor.system.combat?.concentrating ?? []).filter(id => !pending.ids.includes(id));
  await keepOnly(actor, keep, 0);
  return pending.ids;
}

/** Per viewer: the upkeep form for owners while the decision is open. */
export async function renderUpkeep(message, html) {
  for ( const box of html.querySelectorAll("[data-n5e-upkeep]") ) {
    const actor = await fromUuid(box.dataset.n5eUpkeep);
    const pending = actor?.flags?.n5e?.upkeepPending;
    if ( !actor || !pending ) { box.querySelector("form")?.remove(); box.classList.add("resolved"); continue; }
    if ( !canModify(game.user, actor) ) continue;
    const options = upkeepOptions(actor);
    const jutsu = options.jutsu.filter(j => pending.ids.includes(j.id));
    const form = document.createElement("form");
    form.innerHTML = jutsu.map(j => `<label><input type="checkbox" name="keep" value="${esc(j.id)}" data-cost="${j.cost}"> ${esc(j.name)} (${j.cost} CP)</label>`).join("")
      + `<div class="total">Total: <b>0</b> / ${options.cp} CP</div><button type="submit">Confirm upkeep</button>`;
    const refresh = () => {
      const chosen = [...form.querySelectorAll("input[name=keep]:checked")];
      const total = chosen.reduce((t, i) => t + Number(i.dataset.cost), 0);
      form.querySelector(".total b").textContent = String(total);
      for ( const input of form.querySelectorAll("input[name=keep]") ) input.disabled = !input.checked && total + Number(input.dataset.cost) > options.cp;
    };
    form.addEventListener("change", refresh);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const keep = [...form.querySelectorAll("input[name=keep]:checked")].map(i => i.value);
      try { await resolveUpkeep(actor, keep); form.remove(); box.classList.add("resolved"); }
      catch (error) { ui.notifications.warn(error.message); }
    });
    box.append(form);
    refresh();
  }
}
