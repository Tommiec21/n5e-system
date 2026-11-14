/**
 * Environment at turn start (ENV1, active GM; rules in rules/environment.mjs).
 *
 *   Hostile terrain   A creature starting its turn inside a Hostile Terrain region gets a Direct
 *                     Exposure card: its owner rolls the Con save; a failure rolls the terrain's
 *                     damage onto a damage card for that creature, ignoring DR.
 *   Suffocating       Counts down the breath it holds (flags.n5e.breath); out of breath, it drops to
 *                     0 HP and is Dying.
 */
import { worstExposure, suffocationStep, fallDamage } from "../rules/environment.mjs";
import { esc } from "../view-models/common.mjs";
import { applyButtons } from "./activity-buttons.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;

/** Hostile Terrain behaviours of the regions this token is inside: [{type, rank}]. */
export function terrainsAt(tokenDoc) {
  const regions = tokenDoc?.parent?.regions ?? [];
  const out = [];
  for ( const region of regions ) {
    if ( !region.tokens?.has?.(tokenDoc) ) continue;
    for ( const b of region.behaviors ?? [] ) {
      if ( b.type === "hostileTerrain" && !b.disabled ) out.push({ type: b.system.terrain, rank: b.system.rank, region: region.name });
    }
  }
  return out;
}

/** Turn start: terrain exposure card and breath countdown. Returns turn-card lines. */
export async function environmentTurnStart(actor, combatant) {
  const lines = [];
  const tokenDoc = combatant?.token;
  const terrains = terrainsAt(tokenDoc);
  const chakraResistant = terrains.some(t => t.type === "chakraResistant");
  const exposure = worstExposure(terrains);
  if ( exposure?.damage ) {
    await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
      content: `<div class="n5e-roll-card"><header><b>${esc(actor.name)}: ${esc(exposure.label)}</b></header>
        <div class="note">Direct Exposure: Con save DC ${exposure.dc}; on a failure ${esc(exposure.damage)} ${esc(exposure.damageType)} damage, ignoring DR.</div>
        <button type="button" data-n5e-terrain-save="${esc(actor.uuid)}" data-dc="${exposure.dc}" data-damage="${esc(exposure.damage)}"
          data-type="${esc(exposure.damageType)}" data-label="${esc(exposure.label)}">Con save DC ${exposure.dc}</button></div>`,
      flags: { n5e: { terrain: { actorUuid: actor.uuid, ...exposure } } } });
    lines.push(`Hostile terrain: ${esc(exposure.label)} (Con save DC ${exposure.dc})`);
  } else if ( exposure ) lines.push(`Hostile terrain: ${esc(exposure.label)}, no Direct Exposure damage`);
  if ( chakraResistant ) lines.push("Chakra Resistant terrain: no Wall or Water Walk; area concentration upkeep doubled; Sensory and Dojutsu can't see past its surface");
  lines.push(...await breathTurnStart(actor));
  return lines;
}

/** Suffocating countdown (combat). */
export async function breathTurnStart(actor) {
  const flags = actor.flags?.n5e ?? {};
  if ( !actor.statuses?.has("suffocating") ) {
    if ( flags.breath != null ) await actor.update({ "flags.n5e.-=breath": null });
    return [];
  }
  const step = suffocationStep(flags.breath ?? null, actor.system.abilities?.con?.mod ?? 0);
  if ( !step.outOfBreath ) {
    await actor.update({ "flags.n5e.breath": step.remaining });
    return [`Suffocating: ${step.remaining} turn${step.remaining === 1 ? "" : "s"} of breath left`];
  }
  await actor.update({ "system.hp.value": 0, "flags.n5e.-=breath": null });
  if ( !actor.statuses?.has("dying") ) await actor.toggleStatusEffect("dying", { active: true });
  return [`<span class="warn">Out of breath: drops to 0 HP and is Dying</span>`];
}

/** Direct Exposure card button: the owner rolls the Con save; a failure rolls the damage. */
export async function onTerrainSaveClick(button, event) {
  const actor = await fromUuid(button.dataset.n5eTerrainSave);
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the creature's owner can roll this save.");
  const [{ rollWithSpec }, { rollSpec }, { createN5eRoll }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs"), import("../dice/n5e-roll.mjs")]);
  const dc = Number(button.dataset.dc);
  let success = null;
  const spec = { ...rollSpec(actor, "save", "con"), label: `Con save vs ${button.dataset.label}` };
  const message = await rollWithSpec(actor, spec, { event, dc, onResult: r => { success = r.success; } });
  if ( !message ) return null;
  button.disabled = true;
  if ( success ) return message;
  const roll = await createN5eRoll(button.dataset.damage).evaluate();
  const type = button.dataset.type;
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), rolls: [roll],
    content: `<div class="n5e-roll-card damage"><header><b>${esc(button.dataset.label)}</b><span class="bonus">${roll.total}</span></header>
      <div class="note">${esc(button.dataset.damage)} ${esc(type)} · ignores DR</div>${applyButtons()}</div>`,
    flags: { n5e: { damage: { instances: [{ amount: roll.total, type }], total: roll.total, ignoreDR: true, targetUuid: actor.uuid }, actorUuid: actor.uuid } } });
}

/**
 * A creature falls (ENV1b; GM macro or API: game.n5e.api.fall(actor, feet)). Posts the fall damage
 * as a damage card for that creature (bludgeoning, ignoring DR) with a Prone button, or a note when
 * the fall is within its Strength score.
 */
export async function fall(actor, feet) {
  if ( !actor ) throw new Error("Choose the creature that falls.");
  const strScore = actor.system.abilities?.str?.value ?? 10;
  const fx = fallDamage(feet, strScore);
  const speaker = ChatMessage().getSpeaker({ actor });
  if ( !fx ) {
    return ChatMessage().create({ speaker, content: `<div class="n5e-roll-card"><b>${esc(actor.name)} falls ${Number(feet) || 0} ft</b>
      <div class="note">Within its Strength score (${strScore} ft): no damage.</div></div>` });
  }
  const { createN5eRoll } = await import("../dice/n5e-roll.mjs");
  const roll = await createN5eRoll(fx.formula).evaluate();
  return ChatMessage().create({ speaker, rolls: [roll],
    content: `<div class="n5e-roll-card damage"><header><b>${esc(actor.name)} falls ${Number(feet)} ft</b><span class="bonus">${roll.total}</span></header>
      <div class="note">${fx.formula} bludgeoning · ignores DR · lands Prone</div>${applyButtons()}
      <div class="n5e-apply"><button type="button" data-n5e-skill-apply="prone" data-target="${esc(actor.uuid)}">Apply Prone to ${esc(actor.name)}</button></div></div>`,
    flags: { n5e: { damage: { instances: [{ amount: roll.total, type: "bludgeoning" }], total: roll.total, ignoreDR: true, targetUuid: actor.uuid }, actorUuid: actor.uuid, fall: { feet: Number(feet), dice: fx.dice } } } });
}
