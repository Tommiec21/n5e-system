/**
 * Skill actions against one target (SKILL1). After the skill-action roll:
 *   passive:<skill>  compared at once to the target's passive score;
 *   fixed:...        compared to the DC worked out for the target;
 *   contest:<skills> the target's owner gets a card to roll their side (each listed skill);
 * then an outcome card with buttons the target's owner (or the GM) uses to apply the result.
 * Other forms (dc:<ability>, jutsu DCs, scores, GM tables) stay manual.
 */
import { parseVs, passiveScore, fixedDC, contestOutcome, checkOutcome, skillActionEffects } from "../rules/skill-resolution.mjs";
import { esc } from "../view-models/common.mjs";
import { canModify } from "../automation/authority.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;
const skillLabel = k => CONFIG.N5E.skills?.[k]?.label ?? k;
const stateLabel = s => CONFIG.N5E.conditions?.[s]?.label ?? CONFIG.N5E.states?.[s]?.label ?? s;

/** Called after a skill-action roll (dice/roll.mjs rollD20). */
export async function resolveSkillAction(actor, key, message, targets = []) {
  const def = CONFIG.N5E.skillActions?.[key];
  const roll = message?.flags?.n5e?.roll;
  if ( !def || !roll || targets.length !== 1 ) return null;
  const target = targets[0];
  const vs = parseVs(def.vs);
  if ( vs.kind === "passive" ) {
    const score = passiveScore(target.system?.skills?.[vs.skill]?.total ?? 0);
    return postOutcome(actor, target, key, { ...checkOutcome(roll.total, score), against: `${target.name}'s passive ${skillLabel(vs.skill)} ${score}` });
  }
  if ( vs.kind === "fixed" ) {
    const dc = fixedDC(vs.expr, { level: target.system?.level ?? target.system?.details?.level });
    if ( dc == null ) return null;
    return postOutcome(actor, target, key, { ...checkOutcome(roll.total, dc), against: `DC ${dc}` });
  }
  if ( vs.kind === "contest" ) {
    const skillsList = vs.skills.filter(s => CONFIG.N5E.skills?.[s]);
    if ( !skillsList.length ) return null;
    const whisper = game.users.filter(u => u.isGM || target.testUserPermission(u, "OWNER")).map(u => u.id);
    return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor: target }), whisper,
      content: `<div class="n5e-roll-card"><header><b>${esc(target.name)}: contest ${esc(def.label)}</b></header>
        <div class="note">${esc(actor.name)} rolled ${roll.total}. Roll to resist (the higher total wins; a tie changes nothing).</div>
        ${skillsList.map(s => `<button type="button" data-n5e-contest="${esc(s)}">${esc(skillLabel(s))}</button>`).join("")}</div>`,
      flags: { n5e: { contest: { key, initiatorUuid: actor.uuid, targetUuid: target.uuid, total: roll.total } } } });
  }
  return null;
}

/** The defender's contest roll (button on the contest card). */
export async function onContestClick(message, button, event) {
  const data = message.getFlag("n5e", "contest");
  const target = data ? await fromUuid(data.targetUuid) : null;
  if ( !target || !canModify(game.user, target) ) return ui.notifications.warn("Only the defender's owner can roll this.");
  const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
  let total = null;
  const rolled = await rollWithSpec(target, rollSpec(target, "skill", button.dataset.n5eContest), { event, onResult: r => { total = r.total; } });
  if ( !rolled ) return null;
  for ( const b of button.parentElement?.querySelectorAll("[data-n5e-contest]") ?? [] ) b.disabled = true;
  const actor = await fromUuid(data.initiatorUuid);
  return postOutcome(actor, target, data.key, { ...contestOutcome(data.total, total), against: `${target.name}'s ${skillLabel(button.dataset.n5eContest)} ${total}` });
}

/** Outcome card with Apply buttons for the statuses a success gives. */
async function postOutcome(actor, target, key, { result, margin, against }) {
  const def = CONFIG.N5E.skillActions[key];
  const mastery = actor?.system?.skills?.[def.skill]?.mastery ?? 0;
  const fx = skillActionEffects(key, { result, margin, mastery });
  const label = { success: "Success", failure: "Failure", tie: "Tie" }[result];
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-roll-card"><header><b>${esc(def.label)}: ${label}</b></header>
      <div class="note">vs ${esc(against)}${margin ? ` (by ${Math.abs(margin)})` : ""}</div>
      ${result === "success" ? `<div class="note">${esc(def.text ?? "")}</div>` : ""}
      ${fx.notes.map(n => `<div class="note">${esc(n)}</div>`).join("")}
      ${fx.statuses.length ? `<div class="n5e-apply">${fx.statuses.map(s => `<button type="button" data-n5e-skill-apply="${esc(s)}" data-target="${esc(target.uuid)}">Apply ${esc(stateLabel(s))} to ${esc(target.name)}</button>`).join("")}</div>` : ""}</div>`,
    flags: { n5e: { skillOutcome: { key, result, margin, targetUuid: target.uuid, statuses: fx.statuses } } } });
}

/** Apply a status from an outcome card (the target's owner or the GM). */
export async function onSkillApplyClick(button) {
  const target = await fromUuid(button.dataset.target);
  if ( !target || !canModify(game.user, target) ) return ui.notifications.warn("Only the target's owner or the GM can apply this.");
  const status = button.dataset.n5eSkillApply;
  if ( !target.statuses?.has(status) ) await target.toggleStatusEffect(status, { active: true });
  button.disabled = true;
  return status;
}
