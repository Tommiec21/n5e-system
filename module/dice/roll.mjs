import { shouldCoordinate, submitWorkflow, targetSnapshot, clickData } from "../automation/multiplayer.mjs";
import { createN5eRoll } from "./n5e-roll.mjs";
/**
 * Rolling d20s from the sheet and posting them to chat (Foundry side). The rules live in dice/d20.mjs.
 *
 * Click = roll; Shift+click = dialog (advantage/disadvantage, situational bonus); Alt = advantage;
 * Ctrl = disadvantage. Every card shows the breakdown on hover and, while the actor has Will of Fire,
 * buttons to spend one for a reroll or advantage after the fact.
 */
import { MODES, clickMode, critThreshold, rollSpec, readD20, willOfFireAward } from "./d20.mjs";
import { esc, signed, breakdownTooltip } from "../view-models/common.mjs";
import { degreeOfSuccess } from "../rules/degree.mjs";
import { contextualSpec } from "../rules/elements.mjs";

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
    ${tip ? `<details class="n5e-roll-breakdown"><summary>Roll breakdown</summary>${tip}</details>` : ""}
    ${spec.note ? `<div class="note">${esc(spec.note)}</div>` : ""}
    ${spec.roll ? `<div class="vs"><b>Roll:</b> ${esc(spec.roll)}</div>` : ""}
    ${spec.outcome ? `<div class="outcome">${esc(spec.outcome)}</div>` : ""}
    ${result.crit ? `<div class="flag crit">${spec.kind === "attack" ? "Critical hit" : "Natural 20"}</div>` : ""}
    ${result.fumble ? `<div class="flag fumble">Natural 1${spec.kind === "attack" ? ": miss" : ""}</div>` : ""}
    ${spec.footer ?? ""}
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
export async function rollD20(actor, type, key, options = {}) {
  if ( shouldCoordinate(options.authoritative) ) return submitWorkflow("roll", { actorUuid: actor.uuid, rollType: type, key, event: clickData(options.event), ...targetSnapshot() });
  const spec = rollSpec(actor, type, key);
  if ( !spec ) return null;
  return rollWithSpec(actor, spec, { ...options, ...(options.targetActors ? { target: options.targetActors.length === 1 ? options.targetActors[0] : null } : {}) });
}

/**
 * Roll any d20 spec ({label, bonus, kind, scope?, breakdown?, note?}).
 * Every d20 in the system ends up here: sheet rolls, attacks, saves from cards, removal checks,
 * resaves. The message carries flags.n5e.roll so Will of Fire can reroll it later.
 * @param {object} [options]
 * @param {Event} [options.event]        the click (modifier keys pick the mode; Shift opens the dialog)
 * @param {string} [options.mode]        force normal | advantage | disadvantage (e.g. condition resistance)
 * @param {number} [options.dc]          compare against a DC (saves from a card)
 * @param {boolean} [options.fourTier]   report Genjutsu four-tier results
 * @param {string} [options.onFail]      HTML added to the card only on a failure (Apply-condition buttons)
 * @param {Function} [options.onResult]  called with {natural, crit, fumble, degree, success, message}
 */
export async function rollWithSpec(actor, spec, { event, mode: forced, dc = null, fourTier = false, onFail = "", onResult = null,
  target = undefined, tiers = null } = {}) {
  // Multiple targets can have different defenses: never borrow the first target's facts for all.
  if ( target === undefined ) {
    const targets = Array.from(globalThis.game?.user?.targets ?? []);
    target = targets.length === 1 ? targets[0].actor : null;
  }
  spec = contextualSpec(actor, spec, target);
  const type = spec.type ?? "custom";
  const key = spec.key ?? "";
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
  const roll = await createN5eRoll(formula, { bonus: spec.bonus }).evaluate();
  const threshold = critThreshold(actor, spec.scope);
  const result = readD20(roll, threshold);
  const wof = (actor.system.willOfFire?.value ?? 0) > 0;
  let degree = null;
  if ( dc != null ) {
    const d = degreeOfSuccess(roll.total, dc, { natural: result.natural, isSave: spec.kind === "save", shift: spec.degreeShift });
    degree = d.degree;
    const outcomeKey = fourTier ? d.key : d.degree >= 2 ? "success" : "failure";
    const labels = ["Critical Failure", "Failure", "Success", "Critical Success"];
    spec = { ...spec, note: [spec.note, `vs DC ${dc}: ${fourTier ? labels[d.degree] : (d.degree >= 2 ? "Success" : "Failure")}`].filter(Boolean).join(" · "),
      // Buttons that only matter on a failure (apply a condition, etc.).
      footer: `${spec.footer ?? ""}${tiers?.[outcomeKey] ? `<div class="n5e-save-outcome"><b>Result</b>: ${esc(tiers[outcomeKey])}</div>` : ""}${degree < 2 && onFail && !Object.values(tiers ?? {}).some(Boolean) ? onFail : ""}` };
  }
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  const message = await roll.toMessage({
    speaker: ChatMessageCls.getSpeaker({ actor }),
    flavor: cardHTML(spec, { mode, result, bonusText: extra ? `+ ${extra}` : "", wof }) + (spec.kind === "attack" ? '<button type="button" data-n5e-hit="1">Successful hit: reactions</button>' : ""),
    flags: { n5e: { roll: { type, key: key ?? "", mode, bonus: spec.bonus, extra, threshold,
      natural: result.natural, label: spec.label, kind: spec.kind, actorUuid: actor.uuid,
      dc, degree, fourTier, tiers, degreeShift: spec.degreeShift, breakdown: spec.breakdown, targetUuid: target?.uuid ?? null } } }
  });
  await awardWillOfFire(actor, result);
  if ( onResult ) await onResult({ ...result, degree, success: degree == null ? null : degree >= 2, message });
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
export async function spendWillOfFire(message, how, { authoritative = false } = {}) {
  if ( shouldCoordinate(authoritative) ) return submitWorkflow("willOfFire", { messageUuid: message.uuid, how });
  const data = message.getFlag("n5e", "roll");
  const actor = data?.actorUuid ? await fromUuid(data.actorUuid) : null;
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the roller's owner can spend their Will of Fire.");
  const wof = actor.system.willOfFire?.value ?? 0;
  if ( wof < 1 ) return ui.notifications.warn(`${actor.name} has no Will of Fire left.`);
  await actor.update({ "system.willOfFire.value": wof - 1 });
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  const extra = data.extra ? ` + ${data.extra}` : "";
  // Re-evaluate the original DC using the original contextual bonus, rather than carrying a stale
  // degree onto the reroll. Tier effects are exclusive: only the newly selected result is printed.
  const outcome = (total, natural) => {
    if ( data.dc == null ) return { degree: null, html: "" };
    const d = degreeOfSuccess(total, data.dc, { natural, isSave: data.kind === "save", shift: data.degreeShift });
    const key = data.fourTier ? d.key : d.degree >= 2 ? "success" : "failure";
    const label = data.fourTier ? ["Critical Failure", "Failure", "Success", "Critical Success"][d.degree] : d.degree >= 2 ? "Success" : "Failure";
    return { degree: d.degree, html: `<div class="note">vs DC ${data.dc}: ${label}</div>${data.tiers?.[key] ? `<div class="n5e-save-outcome">${esc(data.tiers[key])}</div>` : ""}` };
  };
  if ( how === "reroll" ) {
    const roll = await createN5eRoll(`${MODES[data.mode] ?? "1d20"} + @bonus${extra}`, { bonus: data.bonus }).evaluate();
    const result = readD20(roll, data.threshold ?? 20);
    const resolved = outcome(roll.total, result.natural);
    return roll.toMessage({ speaker: ChatMessageCls.getSpeaker({ actor }),
      flavor: `<div class="n5e-roll-card ${result.crit ? "crit" : result.fumble ? "fumble" : ""}"><header><b>${esc(data.label)}</b>
        <span class="mode">Will of Fire reroll</span></header>${resolved.html}</div>`,
      flags: { n5e: { roll: { ...data, natural: result.natural, degree: resolved.degree } } } });
  }
  // Advantage after the fact: one more d20, keep the higher natural.
  const extraDie = await createN5eRoll("1d20").evaluate();
  const kept = Math.max(data.natural ?? 1, extraDie.total);
  const total = createN5eRoll(`${kept} + @bonus${extra}`, { bonus: data.bonus });
  await total.evaluate();
  const resolved = outcome(total.total, kept);
  return total.toMessage({ speaker: ChatMessageCls.getSpeaker({ actor }),
    flavor: `<div class="n5e-roll-card ${kept >= (data.threshold ?? 20) ? "crit" : ""}"><header><b>${esc(data.label)}</b>
      <span class="mode">Will of Fire advantage</span></header>
      <div class="note">First d20 ${data.natural}, second ${extraDie.total}: keeps ${kept}.</div>${resolved.html}</div>`,
    flags: { n5e: { roll: { ...data, natural: kept, degree: resolved.degree } } } });
}

/**
 * Wire chat card buttons (call from the renderChatMessageHTML hook).
 * Cards are stored as HTML, so buttons are found by their data attributes on every render:
 *   data-n5e-apply / -inflict / -undo / -concheck / -deathsave   workflow/apply-damage.mjs
 *   data-n5e-act (attack, damage, save, heal, strike, effect, roll)  workflow/activity-buttons.mjs
 *   data-n5e-track / data-n5e-resave                               workflow/trackers.mjs
 *   data-n5e-wof                                                   Will of Fire (below)
 * A new kind of card button: pick a new data-n5e-* attribute and add a loop here. The handlers are
 * imported on click so loading the chat log stays cheap.
 */
export function onRenderChatMessage(message, html) {
  for ( const button of html.querySelectorAll("[data-n5e-source]") ) button.addEventListener("click", async event => {
    event.preventDefault();
    try {
      const source = await fromUuid(button.dataset.n5eSource);
      if ( !source || source.visible === false || source.isContentVisible === false ) return ui.notifications.warn("The source roll is unavailable or private.");
      const { damageFromMessage } = await import("../rules/damage-trace.mjs");
      const { damageRollHTML } = await import("../view-models/damage-trace.mjs");
      await foundry.applications.api.DialogV2.wait({ window: { title: "Source damage roll" }, content: damageRollHTML(damageFromMessage(source).rollTrace),
        buttons: [{ action: "close", label: "Close", default: true }], rejectClose: false });
    } catch (error) { ui.notifications.warn(error.message); }
  });
  for ( const btn of html.querySelectorAll("[data-n5e-hit], [data-n5e-retarget], [data-n5e-apply], [data-n5e-inflict], [data-n5e-undo], [data-n5e-concheck], [data-n5e-deathsave]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/apply-damage.mjs").then(m => m.onApplyClick(message, btn, ev));
    });
  }
  for ( const btn of html.querySelectorAll("[data-n5e-act]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/activity-buttons.mjs").then(m => m.onActivityClick(message, btn, ev));
    });
  }
  for ( const btn of html.querySelectorAll("[data-n5e-track], [data-n5e-resave]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/trackers.mjs").then(m => (btn.dataset.n5eResave ? m.rollResave(btn, ev, { message }) : m.onTrackerClick(message, btn)));
    });
  }
  // Place a jutsu's area on the map (workflow/areas.mjs).
  for ( const btn of html.querySelectorAll("[data-n5e-area]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/areas.mjs").then(m => m.onAreaClick(message, btn));
    });
  }
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
