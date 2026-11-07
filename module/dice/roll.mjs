/**
 * Rolling d20s from the sheet and posting them to chat (Foundry side). The rules live in dice/d20.mjs.
 *
 * Click = roll; Shift+click = dialog (advantage/disadvantage, situational bonus); Alt = advantage;
 * Ctrl = disadvantage. Every card shows the breakdown on hover and, while the actor has Will of Fire,
 * buttons to spend one for a reroll or advantage after the fact.
 */
import { MODES, clickMode, critThreshold, rollSpec, readD20, willOfFireAward } from "./d20.mjs";
import { esc, signed, breakdownTooltip } from "../view-models/common.mjs";

const MODE_LABEL = { normal: "", advantage: "Advantage", disadvantage: "Disadvantage" };

/** Shift+click dialog: mode and situational bonus. Resolves null when cancelled. */
async function rollDialog(title, mode) {
  const { DialogV2 } = foundry.applications.api;
  const content = `<div class="n5e-roll-dialog">
    <label>Situational bonus <input type="text" name="bonus" placeholder="e.g. 2 or 1d4"></label></div>`;
  const pick = m => ({ action: m, label: m === "normal" ? "Normal" : MODE_LABEL[m], default: m === mode,
    callback: (event, button) => ({ mode: m, bonus: button.form.elements.bonus.value.trim() }) });
  return DialogV2.wait({ window: { title }, content, buttons: ["advantage", "normal", "disadvantage"].map(pick),
    rejectClose: false });
}

/** Flavor HTML for a d20 card. */
function cardHTML(spec, { mode, result, bonusText, wof }) {
  const tip = spec.breakdown ? breakdownTooltip(spec.breakdown) : "";
  const state = result.crit ? "crit" : result.fumble ? "fumble" : "";
  return `<div class="n5e-roll-card ${state}" data-n5e-roll>
    <header><b>${esc(spec.label)}</b>${MODE_LABEL[mode] ? `<span class="mode">${MODE_LABEL[mode]}</span>` : ""}
      <span class="bonus" ${tip ? `data-tooltip-html="${esc(tip)}"` : ""}>${signed(spec.bonus)}${bonusText ? ` ${esc(bonusText)}` : ""}</span></header>
    ${spec.note ? `<div class="note">${esc(spec.note)}</div>` : ""}
    ${spec.roll ? `<div class="vs"><b>Roll:</b> ${esc(spec.roll)}</div>` : ""}
    ${spec.outcome ? `<div class="outcome">${esc(spec.outcome)}</div>` : ""}
    ${result.crit ? `<div class="flag crit">${spec.kind === "attack" ? "Critical hit" : "Natural 20"}</div>` : ""}
    ${result.fumble ? `<div class="flag fumble">Natural 1${spec.kind === "attack" ? ": miss" : ""}</div>` : ""}
    ${wof ? `<div class="wof-buttons">
      <button type="button" data-n5e-wof="reroll">Will of Fire: reroll</button>
      <button type="button" data-n5e-wof="advantage">Will of Fire: advantage</button></div>` : ""}
  </div>`;
}

/**
 * Roll a d20 for an actor.
 * @param {Actor} actor
 * @param {string} type            ability | save | skill | tool | initiative | attack | skillAction
 * @param {string} [key]
 * @param {object} [options]
 * @param {Event} [options.event]  click event (modifier keys)
 * @param {string} [options.mode]  force normal | advantage | disadvantage
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollD20(actor, type, key, { event, mode: forced } = {}) {
  const spec = rollSpec(actor, type, key);
  if ( !spec ) return null;
  const click = clickMode(event);
  const dialog = click.dialog;
  let mode = forced ?? click.mode;
  let extra = "";
  if ( dialog ) {
    const res = await rollDialog(`${actor.name}: ${spec.label}`, mode);
    if ( !res ) return null;
    mode = res.mode;
    extra = res.bonus;
  }
  const formula = `${MODES[mode]} + @bonus${extra ? ` + ${extra}` : ""}`;
  const roll = await new Roll(formula, { bonus: spec.bonus }).evaluate();
  const threshold = critThreshold(actor, spec.scope);
  const result = readD20(roll, threshold);
  const wof = (actor.system.willOfFire?.value ?? 0) > 0;
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  const message = await roll.toMessage({
    speaker: ChatMessageCls.getSpeaker({ actor }),
    flavor: cardHTML(spec, { mode, result, bonusText: extra ? `+ ${extra}` : "", wof }),
    flags: { n5e: { roll: { type, key: key ?? "", mode, bonus: spec.bonus, extra, threshold,
      natural: result.natural, label: spec.label, kind: spec.kind, actorUuid: actor.uuid } } }
  });
  await awardWillOfFire(actor, result);
  return message;
}

/** First natural 1 or 20 in an encounter grants a Will of Fire (max 3). */
async function awardWillOfFire(actor, result) {
  const combat = game.combat?.started ? game.combat : null;
  const award = willOfFireAward(actor, result, combat?.id ?? null);
  if ( !award.award || !actor.isOwner ) return;
  await actor.update({ "system.willOfFire.value": award.value, "flags.n5e.wofEncounter": combat.id });
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  await ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }),
    content: `<div class="n5e-roll-card wof"><b>Will of Fire</b> from a natural ${result.natural} (${award.value} / 3).</div>` });
}

/**
 * Spend a Will of Fire on a posted d20: reroll it, or roll another d20 and keep the higher.
 * @param {ChatMessage} message
 * @param {"reroll"|"advantage"} how
 */
export async function spendWillOfFire(message, how) {
  const data = message.getFlag("n5e", "roll");
  const actor = data?.actorUuid ? await fromUuid(data.actorUuid) : null;
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the roller's owner can spend their Will of Fire.");
  const wof = actor.system.willOfFire?.value ?? 0;
  if ( wof < 1 ) return ui.notifications.warn(`${actor.name} has no Will of Fire left.`);
  await actor.update({ "system.willOfFire.value": wof - 1 });
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  const extra = data.extra ? ` + ${data.extra}` : "";
  if ( how === "reroll" ) {
    const roll = await new Roll(`${MODES[data.mode] ?? "1d20"} + @bonus${extra}`, { bonus: data.bonus }).evaluate();
    const result = readD20(roll, data.threshold ?? 20);
    return roll.toMessage({ speaker: ChatMessageCls.getSpeaker({ actor }),
      flavor: `<div class="n5e-roll-card ${result.crit ? "crit" : result.fumble ? "fumble" : ""}"><header><b>${esc(data.label)}</b>
        <span class="mode">Will of Fire reroll</span></header></div>`,
      flags: { n5e: { roll: { ...data, natural: result.natural } } } });
  }
  // Advantage after the fact: one more d20, keep the higher natural.
  const extraDie = await new Roll("1d20").evaluate();
  const kept = Math.max(data.natural ?? 1, extraDie.total);
  const total = new Roll(`${kept} + @bonus${extra}`, { bonus: data.bonus });
  await total.evaluate();
  return total.toMessage({ speaker: ChatMessageCls.getSpeaker({ actor }),
    flavor: `<div class="n5e-roll-card ${kept >= (data.threshold ?? 20) ? "crit" : ""}"><header><b>${esc(data.label)}</b>
      <span class="mode">Will of Fire advantage</span></header>
      <div class="note">First d20 ${data.natural}, second ${extraDie.total}: keeps ${kept}.</div></div>`,
    flags: { n5e: { roll: { ...data, natural: kept } } } });
}

/** Wire chat card buttons (call from the renderChatMessageHTML hook). */
export function onRenderChatMessage(message, html) {
  for ( const btn of html.querySelectorAll("[data-n5e-wof]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      btn.disabled = true;
      spendWillOfFire(message, btn.dataset.n5eWof);
    });
  }
}

/**
 * Initiative from the sheet. In a combat the combatant's initiative is set; Adaptive Initiative
 * (Scout-Nin) offers Athletics, Ninshou, Illusions or Insight instead of Initiative.
 */
export async function rollInitiative(actor, { event } = {}) {
  let skill = null;
  const adaptive = actor.items.some(i => i.system.identifier === "adaptive-initiative");
  if ( adaptive ) {
    const { DialogV2 } = foundry.applications.api;
    const choices = [["", `Initiative (${signed(actor.system.initiative.total)})`], ["ath", "Athletics"], ["nin", "Ninshou"],
      ["ill", "Illusions"], ["ins", "Insight"]];
    skill = await DialogV2.wait({ window: { title: "Adaptive Initiative" },
      content: "<p>Substitute a skill if it fits how combat started (GM decides).</p>",
      buttons: choices.map(([k, label]) => ({ action: k || "init", label: k ? `${label} (${signed(actor.system.skills[k]?.total ?? 0)})` : label,
        default: !k, callback: () => k })), rejectClose: false });
    if ( skill === null || skill === undefined ) return null;
  }
  const bonus = skill ? actor.system.skills[skill]?.total ?? 0 : actor.system.initiative.total;
  const combatant = game.combat?.getCombatantsByActor?.(actor)?.[0];
  if ( combatant ) {
    const { mode } = clickMode(event);
    return game.combat.rollInitiative([combatant.id], { formula: `${MODES[mode]} + ${bonus}`, updateTurn: false });
  }
  return skill ? rollD20(actor, "skill", skill, { event }) : rollD20(actor, "initiative", "", { event });
}
