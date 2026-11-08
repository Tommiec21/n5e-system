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
 */
import { damagePlan, healPlan, concentrationOnDamage, deathSaveResult } from "../rules/damage.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { rollSpec } from "../dice/d20.mjs";
import { esc } from "../view-models/common.mjs";
import { rule } from "../rules-settings.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;

function selectedActors() {
  return (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(a => a?.isOwner);
}

/** Apply damage instances (or healing) to the selected tokens and post a summary. */
export async function applyToSelected(data, mode) {
  const fixed = data.targetUuid ? await fromUuid(data.targetUuid) : null;
  const targets = fixed ? (fixed.isOwner ? [fixed] : []) : selectedActors();
  if ( fixed && !targets.length ) return ui.notifications.warn(`Only ${fixed.name}'s owner or the GM can apply this.`);
  if ( !targets.length ) return ui.notifications.info("Select the tokens to apply this to.");
  const rows = [];
  const undo = [];
  for ( const actor of targets ) {
    const before = { uuid: actor.uuid, hp: actor.system.hp.value, tempHp: actor.system.hp.temp, cp: actor.system.cp.value,
      tempCp: actor.system.cp.temp, deathSaves: { ...actor.system.deathSaves } };
    if ( mode === "heal" ) {
      const plan = healPlan(actor, data.total, "hp");
      if ( plan.blocked ) {
        rows.push(`<div><b>${esc(actor.name)}</b>: ${esc(plan.blocked)}</div>`);
        continue;
      }
      await actor.update(plan.update);
      if ( plan.revived ) {
        for ( const s of ["dying", "unconscious", "stabilized"] ) await actor.toggleStatusEffect(s, { active: false });
      }
      undo.push(before);
      rows.push(`<div><b>${esc(actor.name)}</b> regains ${plan.gained} HP${plan.revived ? " and is no longer Dying" : ""}.</div>`);
      continue;
    }
    const multiplier = { half: 0.5, double: 2 }[mode] ?? 1;
    const plan = damagePlan(actor, data.instances, { multiplier, pierce: data.pierce ?? 0, genjutsu: !!data.genjutsu, crit: !!data.crit, ignoreDR: !!data.ignoreDR });
    const update = { ...plan.update };
    if ( plan.deathFailures ) update["system.deathSaves.failure"] = Math.min(3, (actor.system.deathSaves?.failure ?? 0) + plan.deathFailures);
    if ( Object.keys(update).length ) await actor.update(update);
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
    const conc = concentrationOnDamage(actor, plan.total);
    const concBtn = conc ? `<button type="button" data-n5e-concheck="${conc.dc}" data-actor="${actor.uuid}"
      data-jutsu='${esc(JSON.stringify(conc.atRisk.map(j => j.id)))}'>Concentration check DC ${conc.dc} (${esc(conc.atRisk.map(j => j.name).join(", "))})</button>` : "";
    const taken = [plan.health ? `${plan.health} damage${plan.tempHpLost ? ` (${plan.tempHpLost} to temp HP)` : ""}` : "",
      plan.chakra ? `${plan.chakra} Chakra damage${plan.tempCpLost ? ` (${plan.tempCpLost} to temp CP)` : ""}` : ""].filter(Boolean).join(", ") || "no damage";
    rows.push(`<div class="target"><b>${esc(actor.name)}</b> takes ${esc(taken)}${notes.length ? `: <span class="warn">${esc(notes.join("; "))}</span>` : ""}
      ${plan.steps.length ? `<div class="steps">${esc(plan.steps.join(" · "))}</div>` : ""}${concBtn}</div>`);
  }
  if ( !rows.length ) return null;
  return ChatMessage().create({
    content: `<div class="n5e-apply-card"><b>${mode === "heal" ? "Healing applied" : `${{ full: "Damage", half: "Half damage", double: "Double damage" }[mode]} applied`}</b>
      ${rows.join("")}<button type="button" class="undo" data-n5e-undo="1"><i class="fa-solid fa-rotate-left"></i> Undo</button></div>`,
    flags: { n5e: { undo } }
  });
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
  return rollWithSpec(actor, spec, { event, dc, onResult: async r => {
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
  const roll = await new Roll("1d20").evaluate();
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
  const d = btn.dataset;
  if ( d.n5eApply ) return applyToSelected(message.getFlag("n5e", "damage") ?? {}, d.n5eApply);
  if ( d.n5eUndo ) {
    btn.disabled = true;
    return undoApply(message);
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
