/**
 * Environment at turn start (ENV1, active GM; rules in rules/environment.mjs).
 *
 *   Hostile terrain   A creature starting its turn inside a Hostile Terrain region gets a Direct
 *                     Exposure card: its owner rolls the Con save; a failure rolls the terrain's
 *                     damage onto a damage card for that creature, ignoring DR.
 *   Suffocating       Counts down the breath it holds (flags.n5e.breath); out of breath, it drops to
 *                     0 HP and is Dying.
 *   FIN4a (King 2026-11-15)
 *     Choke           Suffocating from a Choke (flags.n5e.choke on the effect) runs out into Unconscious,
 *                     not Dying, and ends at once when the hold ends (Q-F15).
 *   FIN4b: Indirect Exposure is a GM option (Q-F14): the GM opens it, picks creatures, DC and the
 *          consequence note; owners roll Survival from the card; the GM applies any consequence.
 *     Outside combat  Breath is Con modifier minutes (at least 30 s) of world time ({until}); the count
 *                     starts fresh when combat starts or ends (Q-F16). The GM can set it (Set breath).
 */
import { worstExposure, suffocationStep, fallDamage, breathSeconds, breathState, outOfBreathStatus, indirectExposure, mayBeImmune } from "../rules/environment.mjs";
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

/** The Suffocating effect that came from a Choke, if any. */
export const chokeOf = actor => Array.from(actor?.effects ?? []).find(e => e.statuses?.has("suffocating") && e.flags?.n5e?.choke) ?? null;

/** Is this creature in the running combat? */
const inCombat = actor => !!game.combat?.started && game.combat.combatants.some(c => c.actor?.uuid === actor?.uuid);

/** Out of breath: 0 HP, and Dying (Unconscious from a choke). Returns the line for the card. */
export async function runOutOfBreath(actor) {
  const status = outOfBreathStatus({ choke: !!chokeOf(actor) });
  await actor.update({ "system.hp.value": 0, "flags.n5e.-=breath": null });
  if ( !actor.statuses?.has(status) ) await actor.toggleStatusEffect(status, { active: true });
  return `Out of breath: drops to 0 HP and is ${status === "unconscious" ? "Unconscious (choked, not Dying)" : "Dying"}`;
}

/** Suffocating countdown (combat). */
export async function breathTurnStart(actor) {
  const flags = actor.flags?.n5e ?? {};
  if ( !actor.statuses?.has("suffocating") ) {
    if ( flags.breath != null ) await actor.update({ "flags.n5e.-=breath": null });
    return [];
  }
  // A count held outside combat starts fresh (King Q-F16).
  const state = breathState(flags.breath, { inCombat: true });
  const step = suffocationStep(state.mode === "turns" ? state.left : null, actor.system.abilities?.con?.mod ?? 0);
  if ( !step.outOfBreath ) {
    await actor.update({ "flags.n5e.breath": step.remaining });
    return [`Suffocating: ${step.remaining} turn${step.remaining === 1 ? "" : "s"} of breath left${chokeOf(actor) ? " (choked)" : ""}`];
  }
  return [`<span class="warn">${esc(await runOutOfBreath(actor))}</span>`];
}

/** Outside combat: start the world-time count (Con modifier minutes, at least 30 s). */
export async function startBreathTime(actor, seconds = null) {
  const s = seconds ?? breathSeconds(actor.system.abilities?.con?.mod ?? 0);
  await actor.update({ "flags.n5e.breath": { until: game.time.worldTime + s } });
  return s;
}

/** GM card when a creature starts holding its breath, with Set breath. */
async function breathCard(actor, text) {
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b> is holding its breath: ${esc(text)}.
      <button type="button" data-n5e-breath-set="${esc(actor.uuid)}">Set breath</button></div>` });
}

/** GM: set the breath left (turns in combat, seconds outside it) to account for time already spent. */
export async function setBreath(uuid) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM sets breath.");
  const actor = await fromUuid(uuid);
  if ( !actor?.statuses?.has("suffocating") ) return ui.notifications.info("That creature isn't Suffocating.");
  const combat = inCombat(actor);
  const state = breathState(actor.flags?.n5e?.breath, { inCombat: combat, now: game.time.worldTime });
  const value = await foundry.applications.api.DialogV2.prompt({ window: { title: `${actor.name}: breath left` },
    content: `<label>${combat ? "Turns" : "Seconds"} of breath left <input type="number" name="left" min="0" value="${state.left ?? ""}" autofocus></label>`,
    ok: { label: "Set", callback: (event, button) => button.form.elements.left.value }, rejectClose: false });
  if ( value == null || value === "" ) return null;
  const left = Math.max(0, Math.floor(Number(value) || 0));
  if ( combat ) await actor.update({ "flags.n5e.breath": left });
  else await startBreathTime(actor, left);
  return left;
}

/** Active GM, world time: creatures outside combat whose breath ran out. */
export async function breathClock() {
  if ( !game.users.activeGM?.isSelf ) return;
  const now = game.time.worldTime;
  const actors = [...game.actors, ...game.scenes.contents.flatMap(sc => sc.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor))];
  for ( const actor of actors ) {
    if ( !actor.statuses?.has("suffocating") || inCombat(actor) ) continue;
    const state = breathState(actor.flags?.n5e?.breath, { inCombat: false, now });
    if ( state.mode !== "time" || state.left > 0 ) continue;
    const line = await runOutOfBreath(actor);
    await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b>: ${esc(line)}.</div>` });
  }
}

/** FIN4a hooks (active GM): breath starts, combat ends, holds end, world time passes. */
export function registerEnvironmentHooks() {
  const gm = () => !!game.users.activeGM?.isSelf;
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if ( !gm() || actor?.documentName !== "Actor" || !effect.statuses?.has("suffocating") ) return;
    const con = actor.system.abilities?.con?.mod ?? 0;
    if ( inCombat(actor) ) return void breathCard(actor, `${Math.max(1, con)} turns in combat`);
    void startBreathTime(actor).then(s => breathCard(actor, `${s >= 60 ? `${Math.floor(s / 60)} min` : `${s} s`} outside combat`))
      .catch(error => console.warn("n5e | breath", error));
  });
  Hooks.on("deleteActiveEffect", effect => {
    const actor = effect.parent;
    if ( !gm() || actor?.documentName !== "Actor" ) return;
    if ( effect.statuses?.has("suffocating") && !actor.statuses?.has("suffocating") && actor.flags?.n5e?.breath != null ) {
      return void actor.update({ "flags.n5e.-=breath": null });
    }
    // Q-F15: a choke ends at once when the hold ends.
    const by = effect.flags?.n5e?.heldBy;
    const choke = chokeOf(actor);
    if ( by && choke && choke.flags.n5e.choke.holder === by
      && !Array.from(actor.effects).some(e => e.id !== effect.id && e.flags?.n5e?.heldBy === by) ) void choke.delete();
  });
  // Q-F16: leaving combat starts the world-time count fresh.
  Hooks.on("deleteCombat", combat => {
    if ( !gm() || !combat.started ) return;
    for ( const c of combat.combatants ) if ( c.actor?.statuses?.has("suffocating") ) void startBreathTime(c.actor);
  });
  Hooks.on("updateWorldTime", () => void breathClock().catch(error => console.warn("n5e | breath clock", error)));
  // FIN4b: the GM's Indirect Exposure button on the token controls.
  Hooks.on("getSceneControlButtons", controls => {
    if ( !game.user.isGM ) return;
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools ) return;
    tokens.tools.n5eExposure = { name: "n5eExposure", title: "N5e Indirect Exposure", icon: "fa-solid fa-temperature-half", button: true,
      order: Object.keys(tokens.tools).length + 1, onChange: () => void indirectExposureCheck().catch(error => ui.notifications.warn(error.message)) };
  });
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


/* ---- FIN4b: Indirect Exposure (King Q-F14: a GM option; the GM decides) ---- */

const RELEASE_LABEL = { fire: "Fire Release", water: "Water Release", medical: "Medical Release" };

/** The creatures to check: the selected tokens, else every token in a Hostile Terrain region on the scene. */
function exposureCandidates() {
  const selected = canvas?.tokens?.controlled ?? [];
  const tokens = selected.length ? selected : (canvas?.tokens?.placeables ?? []).filter(t => terrainsAt(t.document).length);
  return tokens.filter(t => t.actor).map(t => {
    const terrains = terrainsAt(t.document);
    return { token: t, actor: t.actor, terrains, exposure: indirectExposure(terrains) };
  });
}

/** GM: open the Indirect Exposure dialog and post the check card. */
export async function indirectExposureCheck() {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM runs Indirect Exposure.");
  const rows = exposureCandidates();
  if ( !rows.length ) return ui.notifications.info("Select tokens, or place tokens in a Hostile Terrain region.");
  const dc = Math.max(...rows.map(r => r.exposure?.dc ?? 0)) || 18;
  const label = [...new Set(rows.map(r => r.exposure?.label).filter(Boolean))].join(", ") || "Hostile terrain";
  const list = rows.map((r, i) => {
    const immune = mayBeImmune(r.actor.system?.grants?.affinities, r.exposure?.releases ?? []);
    return `<label class="check"><input type="checkbox" name="c${i}" ${immune.length ? "" : "checked"}> ${esc(r.actor.name)}
      ${immune.length ? `<span class="hint">may be immune (${esc(immune.map(x => RELEASE_LABEL[x] ?? x).join(", "))})</span>` : ""}</label>`;
  }).join("");
  const picked = await foundry.applications.api.DialogV2.prompt({ window: { title: "Indirect Exposure" },
    content: `<p class="hint">${esc(label)}. You decide who checks, the DC and what a failure does.</p>${list}
      <label>Survival DC <input type="number" name="dc" value="${dc}" min="1"></label>
      <label>On a failure <input type="text" name="note" placeholder="what happens (you apply it)"></label>`,
    ok: { label: "Post checks", callback: (event, button) => {
      const f = button.form.elements;
      return { dc: Number(f.dc.value) || dc, note: f.note.value, chosen: rows.filter((r, i) => f[`c${i}`]?.checked) };
    } }, rejectClose: false });
  if ( !picked?.chosen?.length ) return null;
  return ChatMessage().create({ speaker: { alias: "Indirect Exposure" },
    content: `<div class="n5e-roll-card"><header><b>Indirect Exposure: ${esc(label)}</b></header>
      <div class="note">Survival check DC ${picked.dc}.${picked.note ? ` On a failure: ${esc(picked.note)}` : ""}</div>
      ${picked.chosen.map(r => `<div class="n5e-target-row"><span>${esc(r.actor.name)}</span>
        <button type="button" data-n5e-exposure-roll="${esc(r.actor.uuid)}" data-dc="${picked.dc}">Roll Survival DC ${picked.dc}</button></div>`).join("")}</div>`,
    flags: { n5e: { indirectExposure: { dc: picked.dc, note: picked.note, actors: picked.chosen.map(r => r.actor.uuid) } } } });
}

/** The creature's owner rolls its Survival check from the card. */
export async function onExposureRollClick(button, event) {
  const actor = await fromUuid(button.dataset.n5eExposureRoll);
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the creature's owner rolls this check.");
  const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
  const spec = { ...rollSpec(actor, "skill", "sur"), label: "Survival: Indirect Exposure" };
  const message = await rollWithSpec(actor, spec, { event, dc: Number(button.dataset.dc) });
  if ( message ) button.disabled = true;
  return message;
}
