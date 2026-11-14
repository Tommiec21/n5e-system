import { castDisciplineOf } from "../rules/cast-discipline.mjs";
import { damageFromMessage, damageApplicationTrace } from "../rules/damage-trace.mjs";
import { emitEffectEvent } from "../automation/effect-services.mjs";
import { chooseReaction } from "./reaction-adapters.mjs";
import { createN5eRoll } from "../dice/n5e-roll.mjs";
/**
 * Applying damage and healing to tokens (Foundry side); the rules are in rules/damage.mjs.
 *
 * Apply / Half / ×2 / Heal on a damage card apply to the selected tokens. Interception: select the
 * interceptor and apply to them (the interceptor replaces the target, so their defenses count).
 * One summary card per application lists each target's result, with:
 *   - Undo (restores HP/CP and temp pools),
 *   - a Concentration check button when a target concentrating on a non-Stable jutsu took damage,
 *   - a note when a target falls to 0 (Dying for characters; NPCs that die at 0 are marked Dead).
 * Save results can carry "Apply <condition>" buttons (from the jutsu text) that apply to the roller.
 *
 * Folder conventions (pure rules vs Foundry side, who runs what, ownership): workflow/turn.mjs header.
 */
import { damagePlan, concentrationOnDamage, deathSaveResult } from "../rules/damage.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { rollSpec } from "../dice/d20.mjs";
import { esc } from "../view-models/common.mjs";
import { withActorLock } from "./commands.mjs";
import { applyHealing } from "./health.mjs";
import { rule } from "../rules-settings.mjs";
import { coordinateDamage } from "./coordinated-damage.mjs";
import { canModify, ownedRecipients, skippedNotice } from "../automation/authority.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;

/** Actors behind the user's selected (controlled) tokens that the user may change. */
function selectedActors() {
  const { owned, skipped } = ownedRecipients((canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean), game.user);
  const notice = skippedNotice(skipped);
  if ( notice ) ui.notifications.info(notice);
  return owned;
}

/** Owned recipients of a successful hit: the card's fixed target, else targeted, else controlled tokens. */
async function hitRecipients(message) {
  const fixed = message.getFlag("n5e", "roll")?.targetUuid;
  let actors = fixed ? [await fromUuid(fixed)].filter(Boolean) : [...(game.user.targets ?? [])].map(t => t.actor).filter(Boolean);
  if ( !actors.length ) actors = (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean);
  const { owned, skipped } = ownedRecipients(actors, game.user);
  const notice = skippedNotice(skipped);
  if ( notice ) ui.notifications.info(notice);
  return owned;
}

/**
 * "Successful hit" reactions for a creature this user owns (the GM for NPCs). The click is the
 * confirmation that the attack hit; no dialog.
 */
export async function successfulHitReaction(message, actor) {
  if ( message?.getFlag("n5e", "roll")?.kind !== "attack" ) throw new Error("Successful-hit reactions require an attack roll card.");
  if ( !canModify(game.user, actor) ) throw new Error(skippedNotice([actor]));
  void emitEffectEvent(actor, "successfulHit", { id: message.uuid + ":" + actor.uuid }).catch(error => ui.notifications.warn(error.message));
  const choice = await chooseReaction(actor, "successfulHit", { message, attackerUuid: message.getFlag("n5e", "roll").actorUuid });
  if ( choice ) {
    await withActorLock(actor, async () => {
      const plan = await choice.prepare(actor);
      if ( plan.flatReduction || (plan.multiplier !== undefined && plan.multiplier !== 1) ) throw new Error("Damage modifiers must use the damage-roll timing.");
      await plan.validate();
      if ( Object.keys(plan.update ?? {}).length ) await actor.update(plan.update);
      if ( plan.roll ) await plan.roll.toMessage({ speaker: ChatMessage().getSpeaker({ actor }), flavor: plan.label ?? "Successful-hit reaction" });
    });
  }
  return { reaction: choice?.id ?? null };
}

/**
 * Apply damage instances (or healing) to the selected tokens and post a summary.
 * @param {object} data   a damage card's flags.n5e.damage:
 *   instances [{amount, type}]  each rolled part with its type
 *   total                       sum (used for healing)
 *   crit, pierce, genjutsu      passed to the damage pipeline (rules/damage.mjs damagePlan)
 *   ignoreDR                    condition/environment damage (Burned, Bleed, Chilled cards)
 *   targetUuid                  a fixed target (condition damage on that creature; the GM Party
 *                               Overview's quick damage) instead of the selected tokens
 * @param {"full"|"half"|"double"|"heal"} mode
 */
export async function applyToSelected(data, mode, { coordinated = false, beforePlan } = {}) {
  const fixed = data.targetUuid ? await fromUuid(data.targetUuid) : null;
  const targets = fixed ? (canModify(game.user, fixed) ? [fixed] : []) : selectedActors();
  if ( fixed && !targets.length ) return ui.notifications.info(skippedNotice([fixed]));
  if ( !targets.length ) return ui.notifications.info("Select the tokens to apply this to.");
  const rows = [];
  const undo = [], applications = [];
  for ( const actor of [...new Set(targets)] ) {
    await withActorLock(actor, async () => {
    // Snapshot for Undo: stored on the summary card (flags.n5e.undo) and restored by undoApply().
    const before = { uuid: actor.uuid, hp: actor.system.hp.value, tempHp: actor.system.hp.temp, cp: actor.system.cp.value,
      tempCp: actor.system.cp.temp, deathSaves: { ...actor.system.deathSaves } };
    if ( mode === "heal" ) {
      const plan = await applyHealing(actor, data.total, "hp", { locked: true });
      if ( plan.blocked ) {
        rows.push(`<div><b>${esc(actor.name)}</b>: ${esc(plan.blocked)}</div>`);
        return;
      }
      undo.push(before);
      rows.push(`<div><b>${esc(actor.name)}</b> regains ${plan.gained} HP${plan.revived ? " and is no longer Dying" : ""}.</div>`);
      return;
    }
    const multiplier = { half: 0.5, double: 2 }[mode] ?? 1;
    const reaction = beforePlan ? await beforePlan(actor) : {};
    const damageOptions = { multiplier, pierce: data.pierce ?? 0, genjutsu: !!data.genjutsu, crit: !!data.crit, ignoreDR: !!data.ignoreDR,
      piercing: !!data.piercing, flatReduction: reaction.flatReduction ?? 0, reactionMultiplier: reaction.multiplier ?? 1,
      dealtPenalty: Number(data.dealtPenalty) || 0 };
    let plan = damagePlan(actor, data.instances, damageOptions);
    if ( plan.requiresDROrder ) {
      const revision = actor._stats?.modifiedTime;
      const drOrder = await chooseDROrder(actor, plan.eligibleTypes);
      if ( !drOrder ) return null;
      if ( actor._stats?.modifiedTime !== revision ) throw new Error("Actor changed while choosing DR allocation. Recalculate before applying damage.");
      plan = damagePlan(actor, data.instances, { ...damageOptions, drOrder });
    }
    const update = { ...plan.update, ...reaction.update };
    if ( reaction.validate ) await reaction.validate();
    if ( coordinated && !game.users.activeGM?.isSelf ) throw new Error("GM authority changed before damage commit; reconcile the pending request.");
    if ( plan.deathFailures ) update["system.deathSaves.failure"] = Math.min(3, (actor.system.deathSaves?.failure ?? 0) + plan.deathFailures);
    if ( Object.keys(update).length ) await actor.update(update);
    if ( reaction.roll ) await reaction.roll.toMessage({ speaker: ChatMessage().getSpeaker({ actor }), flavor: reaction.label ?? "Reaction" });
    undo.push(before);
    const notes = [];
    const isNPC = actor.type === "npc";
    if ( plan.instantDeath || (isNPC && rule("npcDieAtZero") && actor.system.diesAtZero && plan.dropsToZero)
      || (rule("deathSaves") && update["system.deathSaves.failure"] === 3) ) {
      await actor.toggleStatusEffect("dead", { active: true, overlay: true });
      notes.push(plan.instantDeath ? "killed outright (damage beyond 0 ≥ max HP)" : "dies");
    } else if ( plan.dropsToZero ) {
      await actor.toggleStatusEffect(rule("deathSaves") && !isNPC ? "dying" : "unconscious", { active: true });
      notes.push(rule("deathSaves") && !isNPC ? "falls to 0 HP: Dying" : "falls to 0 HP: Unconscious");
    } else if ( plan.deathFailures ) notes.push(`${plan.deathFailures} death save failure${plan.deathFailures > 1 ? "s" : ""}`);
    if ( plan.total > 0 ) void emitEffectEvent(actor, "damageTaken", { id: crypto.randomUUID(), damage: plan.total }).catch(error => ui.notifications.warn(error.message));
    const conc = concentrationOnDamage(actor, plan.total);
    const concBtn = conc ? `<button type="button" data-n5e-concheck="${conc.dc}" data-actor="${actor.uuid}"
      data-jutsu='${esc(JSON.stringify(conc.atRisk.map(j => j.id)))}'>Concentration check DC ${conc.dc} (${esc(conc.atRisk.map(j => j.name).join(", "))})</button>` : "";
    const trace = damageApplicationTrace(actor, data, mode, plan, before, reaction);
    applications.push(trace);
    const taken = [plan.health ? `${plan.health} damage${plan.tempHpLost ? ` (${plan.tempHpLost} to temp HP)` : ""}` : "",
      plan.chakra ? `${plan.chakra} Chakra damage${plan.tempCpLost ? ` (${plan.tempCpLost} to temp CP)` : ""}` : ""].filter(Boolean).join(", ") || "no damage";
    rows.push(`<div class="target"><b>${esc(actor.name)}</b> takes ${esc(taken)}${notes.length ? `: <span class="warn">${esc(notes.join("; "))}</span>` : ""}
      ${concBtn}</div>`);
    });
  }
  if ( !rows.length ) return null;
  return ChatMessage().create({
    content: `<div class="n5e-apply-card"><b>${mode === "heal" ? "Healing applied" : `${{ full: "Damage", half: "Half damage", double: "Double damage" }[mode]} applied`}</b>
      ${data.rollTrace?.sourceUuid ? `<button type="button" class="n5e-source-roll inline-control icon fa-solid fa-dice" data-n5e-source="${esc(data.rollTrace.sourceUuid)}" title="View damage roll" aria-label="View damage roll"></button>` : ""}
      ${rows.join("")}${coordinated ? "" : '<button type="button" class="undo" data-n5e-undo="1"><i class="fa-solid fa-rotate-left"></i> Undo</button>'}</div>`,
    ...(data.sourceVisibility ?? {}),
    flags: { n5e: { undo: coordinated ? [] : undo, damageApplication: { version: 1, sourceUuid: data.rollTrace?.sourceUuid ?? null, mode, rollTrace: data.rollTrace ?? null, recipients: applications } } }
  });
}

/** Owner chooses directly, or the GM records the damaged creature's choice. */
async function chooseDROrder(actor, types) {
  const health = types.filter(t => t !== "chakra");
  const label = t => CONFIG.N5E?.damageTypes?.[t]?.label ?? (t || "Untyped");
  const order = await foundry.applications.api.DialogV2.prompt({ window: { title: `${actor.name}: allocate DR` },
    content: `<p>The damaged creature chooses which HP damage type DR reduces first; leftovers reduce the next type. Chakra damage receives its own DR budget.</p><p>If you are the GM, record that creature's choice.</p>${health.map((t, index) => `<label>Priority ${index + 1}<select name="dr${index}">${health.map(type => `<option value="${esc(type)}" ${type === t ? "selected" : ""}>${esc(label(type))}</option>`).join("")}</select></label>`).join("")}`,
    ok: { label: "Apply chosen order", callback: (event, button) => health.map((t, index) => button.form.elements[`dr${index}`].value) }, rejectClose: false });
  if ( !order ) return null;
  if ( new Set(order).size !== health.length || order.some(t => !health.includes(t)) ) throw new Error("Choose every HP damage type exactly once; no damage was applied.");
  return [...order, ...types.filter(t => t === "chakra")];
}

/** Restore pools recorded on an apply card. */
async function undoApply(message) {
  for ( const b of message.getFlag("n5e", "undo") ?? [] ) {
    const actor = await fromUuid(b.uuid);
    if ( !actor?.isOwner ) continue;
    await actor.update({ "system.hp.value": b.hp, "system.hp.temp": b.tempHp, "system.cp.value": b.cp, "system.cp.temp": b.tempCp,
      "system.deathSaves.success": b.deathSaves?.success ?? 0, "system.deathSaves.failure": b.deathSaves?.failure ?? 0 });
    if ( b.hp > 0 ) for ( const s of ["dying", "unconscious", "dead"] ) await actor.toggleStatusEffect(s, { active: false });
  }
  ui.notifications.info("Damage undone (HP, CP and temporary pools restored).");
}

/** Concentration check after damage: Con (Chakra Control) vs DC; failure ends the non-Stable jutsu. */
async function concentrationCheck(actor, dc, jutsuIds, event) {
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the owner rolls this check.");
  const spec = { ...rollSpec(actor, "skill", "cha"), label: "Concentration check" };
  // Chakra Surge, Flow: Concentration checks for Ninjutsu at advantage.
  const flow = actor.effects.some(e => !e.disabled && e.flags?.n5e?.state === "flow")
    && jutsuIds.some(id => { const j = actor.items.get(id); return j && castDisciplineOf(actor, j) === "nin"; }); // locked cast discipline (MDISC1)
  return rollWithSpec(actor, spec, { event, dc, mode: flow ? "advantage" : undefined, onResult: async r => {
    if ( r.success ) return;
    const keep = (actor.system.combat?.concentrating ?? []).filter(id => !jutsuIds.includes(id));
    const update = { "system.combat.concentrating": keep };
    for ( const id of jutsuIds ) update[`flags.n5e.concentrationPaid.-=${id}`] = null;
    await actor.update(update);
    const names = jutsuIds.map(id => actor.items.get(id)?.name).filter(Boolean);
    await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
      content: `<div class="n5e-roll-card"><b>Concentration lost</b>: ${esc(names.join(", "))} end.</div>` });
  } });
}

/** Death save (no bonuses): >= 10 success; nat 1 two failures; nat 20 back to 1 HP. */
export async function rollDeathSave(actor) {
  if ( !actor?.isOwner ) return null;
  const roll = await createN5eRoll("1d20").evaluate();
  const res = deathSaveResult(actor.system.deathSaves, roll.total);
  const update = { "system.deathSaves.success": res.success, "system.deathSaves.failure": res.failure };
  let note = `${res.success} success / ${res.failure} failure`;
  if ( res.outcome === "revive" ) {
    update["system.hp.value"] = 1;
    note = "Natural 20: back to 1 HP, two failures removed";
  }
  await actor.update(update);
  if ( res.outcome === "revive" ) for ( const s of ["dying", "unconscious", "stabilized"] ) await actor.toggleStatusEffect(s, { active: false });
  if ( res.outcome === "stable" ) {
    await actor.toggleStatusEffect("dying", { active: false });
    await actor.toggleStatusEffect("stabilized", { active: true });
    note = "Three successes: stable (regains 1 HP after 8 hours)";
  }
  if ( res.outcome === "dead" ) {
    await actor.toggleStatusEffect("dead", { active: true, overlay: true });
    note = "Three failures: dead";
  }
  return roll.toMessage({ speaker: ChatMessage().getSpeaker({ actor }),
    flavor: `<div class="n5e-roll-card ${roll.total === 20 ? "crit" : roll.total === 1 ? "fumble" : ""}"><header><b>Death save</b></header>
      <div class="note">${esc(note)}</div></div>` });
}

/** Chat button dispatcher (damage card, apply card, save result, turn card). */
export async function onApplyClick(message, btn, event) {
  if ( btn.dataset.n5eRetarget ) return retargetDamage(message);
  const d = btn.dataset;
  if ( d.n5eHit ) {
    const recipients = await hitRecipients(message);
    if ( !recipients.length ) return ui.notifications.info("Select or target the creature hit by this attack.");
    const results = [];
    for ( const actor of recipients ) {
      try { results.push(await successfulHitReaction(message, actor)); }
      catch (error) { ui.notifications.warn(error.message); }
    }
    return results;
  }
  if ( d.n5eApply ) {
    // A per-target row (RES1) applies to its own creature, like a card with a fixed target.
    const flags = message.getFlag("n5e", "damage") ?? {};
    // The damage card's uuid travels with the application (view-roll button; CARD1 links the summary to its card).
    const data = { ...flags, ...(flags.rollTrace ? { rollTrace: { ...flags.rollTrace, sourceUuid: flags.rollTrace.sourceUuid ?? message.uuid ?? null } } : {}),
      ...(d.target ? { targetUuid: d.target } : {}) };
    if ( rule("coordinatedDamage") && d.n5eApply !== "heal" ) {
      const fixed = data.targetUuid ? await fromUuid(data.targetUuid) : null;
      const recipients = fixed ? ownedRecipients([fixed], game.user) : { owned: selectedActors(), skipped: [] };
      if ( recipients.skipped.length ) ui.notifications.info(skippedNotice(recipients.skipped));
      if ( !recipients.owned.length ) return fixed ? null : ui.notifications.info("Select the tokens to apply this to.");
      try {
        // The active GM keeps one durable receipt per card and target (world setting); an owner
        // applying to their own creature resolves the same reactions locally.
        if ( game.users.activeGM?.isSelf ) return await coordinateDamage(message, data, d.n5eApply, recipients.owned, applyToSelected);
        const results = [];
        for ( const actor of recipients.owned ) results.push(await resolveDamageReaction(message, data, d.n5eApply, actor, applyToSelected));
        return results;
      } catch (error) { ui.notifications.warn(error.message); return null; }
    }
    return applyToSelected(data, d.n5eApply);
  }
  if ( d.n5eUndo ) {
    btn.disabled = true;
    const done = await undoApply(message);
    // Marked on the summary (its author or a GM) so an action card shows it undone (CARD1).
    if ( message.isAuthor || game.user.isGM ) await message.setFlag("n5e", "undone", true);
    return done;
  }
  if ( d.n5eConcheck ) {
    const actor = await fromUuid(d.actor);
    btn.disabled = true;
    return concentrationCheck(actor, Number(d.n5eConcheck), JSON.parse(d.jutsu || "[]"), event);
  }
  if ( d.n5eDeathsave ) return rollDeathSave(await fromUuid(d.n5eDeathsave));
  if ( d.n5eInflict ) {
    const uuid = message.getFlag("n5e", "roll")?.actorUuid;
    const actor = uuid ? await fromUuid(uuid) : null;
    if ( !actor?.isOwner ) return ui.notifications.warn("Only the owner of the creature that failed can apply this.");
    btn.disabled = true;
    let effect;
    if ( d.kind === "state" ) {
      await actor.toggleStatusEffect(d.n5eInflict, { active: true });
      effect = actor.effects.find(e => e.statuses?.has(d.n5eInflict));
    } else effect = await actor.addCondition(d.n5eInflict, Number(d.ranks) || 1);
    // "Repeat the save at the end of each of its turns": remembered on the effect for the turn-end prompt.
    if ( d.resave && effect?.setFlag ) {
      const now = game.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null;
      await effect.setFlag("n5e", "resave", { ...JSON.parse(d.resave), applied: now });
    }
    return effect;
  }
  return null;
}

/** Damage-roll timing only; nested reaction work is deferred by the user. */
export async function resolveDamageReaction(message, data, mode, actor, apply) {
  data = damageFromMessage(message);
  const selection = mode !== "heal" && rule("coordinatedDamage") && rule("reactionWindows")
    ? await chooseReaction(actor, "beforeDamage", { data, message }) : null;
  const result = await apply({ ...data, targetUuid: actor.uuid }, mode, { coordinated: true,
    beforePlan: current => selection ? selection.prepare(current) : {} });
  if ( !result ) throw new Error("Damage application was cancelled or unconfirmed.");
  return result;
}

async function retargetDamage(message) {
  const candidates = new Map();
  for ( const token of canvas?.tokens?.placeables ?? [] ) if ( token.actor && (game.user.isGM || token.visible) ) candidates.set(token.actor.uuid, token.actor);
  for ( const actor of game.actors?.contents ?? [] ) if ( game.user.isGM || actor.testUserPermission(game.user, "LIMITED") ) candidates.set(actor.uuid, actor);
  if ( !candidates.size ) return ui.notifications.info("No visible recipients are available.");
  const uuid = await foundry.applications.api.DialogV2.prompt({ window: { title: "Retarget rolled damage" },
    content: '<p>Choose who receives this existing roll. This does not reroll damage or undo an earlier application.</p><label>Recipient<select name="recipient">' + [...candidates.values()].map(a => '<option value="' + esc(a.uuid) + '">' + esc(a.name) + '</option>').join('') + '</select></label>',
    ok: { label: "Apply to recipient", callback: (event, button) => button.form.elements.recipient.value }, rejectClose: false });
  if ( !uuid || !candidates.has(uuid) ) return null;
  const actor = candidates.get(uuid);
  if ( !canModify(game.user, actor) ) return ui.notifications.info(skippedNotice([actor]));
  return applyToSelected({ ...damageFromMessage(message), targetUuid: uuid }, "full");
}
