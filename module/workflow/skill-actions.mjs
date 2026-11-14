/**
 * Skill actions against one target (SKILL1). After the skill-action roll:
 *   passive:<skill>  compared at once to the target's passive score;
 *   fixed:...        compared to the DC worked out for the target;
 *   contest:<skills> the target's owner gets a card to roll their side (each listed skill);
 * then an outcome card with buttons the target's owner (or the GM) uses to apply the result.
 *   dc:<ability>     the target's Standard DC (ability check bonus + 10, SKILL1b);
 * Other forms (jutsu DCs, scores, GM tables) stay manual.
 */
import { parseVs, passiveScore, fixedDC, standardDC, contestOutcome, checkOutcome, skillActionEffects, skillActionGate, SKILL_RESULTS,
  HOLD_ACTIONS, ESCAPE_ACTIONS, holdBroken } from "../rules/skill-resolution.mjs";
import { esc } from "../view-models/common.mjs";
import { canModify } from "../automation/authority.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;
const skillLabel = k => CONFIG.N5E.skills?.[k]?.label ?? k;
const stateLabel = s => CONFIG.N5E.conditions?.[s]?.label ?? CONFIG.N5E.states?.[s]?.label ?? s;

/** Effects on a creature that record a hold: [{effect, by}] (flags.n5e.heldBy, FIN2a). */
export const holdsOn = actor => Array.from(actor?.effects ?? []).filter(e => !e.disabled && e.flags?.n5e?.heldBy)
  .map(effect => ({ effect, by: effect.flags.n5e.heldBy }));

/**
 * Before a skill action rolls (FIN2a): the target it must use, a refusal, or disadvantage sources.
 * Escape always targets the holder.
 * @returns {Promise<{targets: Actor[], refuse: string|null, disadvantage: string[]}>}
 */
export async function prepareSkillAction(actor, key, targets = []) {
  let list = targets;
  const mine = holdsOn(actor);
  if ( ESCAPE_ACTIONS.includes(key) ) {
    const holder = mine.length ? await fromUuid(mine[0].by) : null;
    list = holder ? [holder] : [];
  }
  const target = list.length === 1 ? list[0] : null;
  const gate = skillActionGate(key, { actorSize: actor.system?.size ?? actor.system?.traits?.size, targetSize: target?.system?.size ?? target?.system?.traits?.size,
    holding: !!target && holdsOn(target).some(h => h.by === actor.uuid),
    held: { by: mine[0]?.by ?? null, restrained: mine.some(h => h.effect.statuses?.has("restrained")) } });
  return { targets: list, ...gate };
}

/** Called after a skill-action roll (dice/roll.mjs rollD20). */
export async function resolveSkillAction(actor, key, message, targets = [], { weaponId = "" } = {}) {
  const def = CONFIG.N5E.skillActions?.[key];
  const roll = message?.flags?.n5e?.roll;
  if ( !def || !roll || targets.length !== 1 ) return null;
  const target = targets[0];
  const vs = parseVs(def.vs);
  if ( vs.kind === "passive" ) {
    const score = passiveScore(target.system?.skills?.[vs.skill]?.total ?? 0);
    return postOutcome(actor, target, key, { ...checkOutcome(roll.total, score), against: `${target.name}'s passive ${skillLabel(vs.skill)} ${score}`, weaponId });
  }
  // Standard DC (SKILL1b): the target's named ability check bonus + 10.
  if ( vs.kind === "dc" && target.system?.abilities?.[vs.ability] ) {
    const dc = standardDC(target.system.abilities[vs.ability].check ?? target.system.abilities[vs.ability].mod);
    const label = CONFIG.N5E.abilities?.[vs.ability]?.label ?? vs.ability;
    return postOutcome(actor, target, key, { ...checkOutcome(roll.total, dc), against: `${target.name}'s ${label} DC ${dc}`, weaponId });
  }
  if ( vs.kind === "fixed" ) {
    const dc = fixedDC(vs.expr, { level: target.system?.level ?? target.system?.details?.level });
    if ( dc == null ) return null;
    return postOutcome(actor, target, key, { ...checkOutcome(roll.total, dc), against: `DC ${dc}`, weaponId });
  }
  if ( vs.kind === "contest" ) {
    const skillsList = vs.skills.filter(s => CONFIG.N5E.skills?.[s]);
    if ( !skillsList.length ) return null;
    const whisper = game.users.filter(u => u.isGM || target.testUserPermission(u, "OWNER")).map(u => u.id);
    return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor: target }), whisper,
      content: `<div class="n5e-roll-card"><header><b>${esc(target.name)}: contest ${esc(def.label)}</b></header>
        <div class="note">${esc(actor.name)} rolled ${roll.total}. Roll to resist (the higher total wins; a tie changes nothing).</div>
        ${skillsList.map(s => `<button type="button" data-n5e-contest="${esc(s)}">${esc(skillLabel(s))}</button>`).join("")}</div>`,
      flags: { n5e: { contest: { key, initiatorUuid: actor.uuid, targetUuid: target.uuid, total: roll.total, weaponId } } } });
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
  return postOutcome(actor, target, data.key, { ...contestOutcome(data.total, total), against: `${target.name}'s ${skillLabel(button.dataset.n5eContest)} ${total}`, weaponId: data.weaponId ?? "" });
}

/** Outcome card with Apply buttons for the statuses a success gives. */
async function postOutcome(actor, target, key, { result, margin, against, weaponId = "" }) {
  const def = CONFIG.N5E.skillActions[key];
  const sk = actor?.system?.skills?.[def.skill] ?? {};
  const fx = skillActionEffects(key, { result, margin, mastery: sk.mastery ?? 0, proficient: !!sk.isProficient });
  const label = { success: "Success", failure: "Failure", tie: "Tie" }[result];
  const won = result === "success";
  // FIN2a: a hold records its holder; Escape releases; a weapon's Disarm or Trip property adds its damage die.
  const holder = HOLD_ACTIONS.includes(key) ? ` data-holder="${esc(actor.uuid)}"` : "";
  const release = won && SKILL_RESULTS[key]?.release
    ? `<div class="n5e-apply"><button type="button" data-n5e-skill-release="${esc(target.uuid)}" data-target="${esc(actor.uuid)}">End the hold on ${esc(actor.name)}</button></div>` : "";
  let damage = "";
  const weapon = weaponId ? actor?.items?.get(weaponId) : null;
  if ( won && weapon?.system?.damage?.die ) {
    const { damageButtons } = await import("./activity-buttons.mjs");
    damage = damageButtons([{ formula: weapon.system.damage.die, type: [...(weapon.system.damage.types ?? [])][0] ?? "" }], { label: `${weapon.name} die` });
  }
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-roll-card"><header><b>${esc(def.label)}: ${label}</b></header>
      <div class="note">vs ${esc(against)}${margin ? ` (by ${Math.abs(margin)})` : ""}</div>
      ${won ? `<div class="note">${esc(def.text ?? "")}</div>` : ""}
      ${fx.notes.map(n => `<div class="note">${esc(n)}</div>`).join("")}
      ${fx.statuses.length ? `<div class="n5e-apply">${fx.statuses.map(s => `<button type="button" data-n5e-skill-apply="${esc(s)}" data-target="${esc(target.uuid)}"${holder}>Apply ${esc(stateLabel(s))} to ${esc(target.name)}</button>`).join("")}</div>` : ""}
      ${release}${damage}</div>`,
    flags: { n5e: { actorUuid: actor?.uuid ?? null, skillOutcome: { key, result, margin, targetUuid: target.uuid, statuses: fx.statuses } } } });
}

/** Apply a status from an outcome card (the target's owner or the GM). */
export async function onSkillApplyClick(button) {
  const target = await fromUuid(button.dataset.target);
  if ( !target || !canModify(game.user, target) ) return ui.notifications.warn("Only the target's owner or the GM can apply this.");
  const status = button.dataset.n5eSkillApply;
  if ( !target.statuses?.has(status) ) await target.toggleStatusEffect(status, { active: true });
  // FIN2a: remember who is holding (Escape, Pin and the 5-ft break read it).
  if ( button.dataset.holder ) {
    const effect = target.effects.find(e => e.statuses?.has(status));
    if ( effect ) await effect.setFlag("n5e", "heldBy", button.dataset.holder);
  }
  button.disabled = true;
  return status;
}

/** Escape succeeded: the held creature's owner (or the GM) ends every hold from that holder. */
export async function onSkillReleaseClick(button) {
  const held = await fromUuid(button.dataset.target);
  if ( !held || !canModify(game.user, held) ) return ui.notifications.warn("Only the escaping creature's owner or the GM can end the hold.");
  const ids = holdsOn(held).filter(h => h.by === button.dataset.n5eSkillRelease).map(h => h.effect.id);
  if ( ids.length ) await held.deleteEmbeddedDocuments("ActiveEffect", ids);
  button.disabled = true;
  return ids.length;
}

/** Edge-to-edge distance in feet between two tokens. */
function gapFeet(a, b) {
  const d = canvas.grid.measurePath([a.center, b.center]).distance;
  const unit = canvas.dimensions?.distance ?? 5;
  return d - (unit * ((a.document.width ?? 1) - 1) + unit * ((b.document.width ?? 1) - 1)) / 2;
}

/** Active GM, moveToken: a hold ends when holder and held are more than 5 ft apart (FIN2a). */
export async function onMoveForHolds(tokenDoc) {
  if ( !game.users.activeGM?.isSelf || !canvas?.grid?.measurePath ) return;
  const tokens = canvas.tokens?.placeables?.filter(t => t.actor) ?? [];
  const moved = tokens.find(t => t.document === tokenDoc);
  if ( !moved ) return;
  for ( const t of tokens ) {
    for ( const { effect, by } of holdsOn(t.actor) ) {
      const holder = tokens.find(x => x.actor.uuid === by);
      if ( !holder || (t !== moved && holder !== moved) || !holdBroken(gapFeet(t, holder)) ) continue;
      await effect.delete();
      await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor: t.actor }),
        content: `<div class="n5e-roll-card">${esc(holder.name)}'s hold on <b>${esc(t.name)}</b> ends: they are more than 5 ft apart.</div>` });
    }
  }
}
