import { createN5eRoll } from "../dice/n5e-roll.mjs";
/**
 * Phase 6 trackers (Foundry side); rules in rules/trackers.mjs.
 *   Fury        gain / spend; Furious token status; Binding Fury Stance grants it on weapon damage.
 *   Marks       placed on targeted creatures (steps the ammo die down 1); expire at the end of the
 *               marker's next turn.
 *   Branded     placed on targeted creatures from a cast card.
 *   Amps        applied from a cast card to targets (or the caster); the optional Amp limit switches
 *               older Amps off.
 *   Gates       open the next gate (Action / BA / Reaction), close all (Exhaustion, Bruised, death).
 *   Chilled     damage card when a Chilled creature moves more than 5 ft (once per turn).
 *   Turn end    Fury expiry, Mark expiry, resave prompts.
 *   Activity effects  "effect" activities (Titan Guard, Set-Up, Crash/Flow...) and their turn-based
 *               endings (applyActivityEffect, expireSourceEffects).
 *
 * Folder conventions (pure rules vs Foundry side, who runs what, ownership): workflow/turn.mjs header.
 */
import {
  chilledMove, gainFury, spendFury, furyTurnEnd, bindingFuryTrigger, jutsuTrackers, trackerEffectData, marksToExpire,
  ampsToDisable, gateChanges, nextGate, closeGatesPlan, resavesDue, expiringEffects
} from "../rules/trackers.mjs";
import { resolveFormula } from "../rules/unarmed.mjs";
import { innerGates } from "../config/combat.mjs";
import { applyButtons } from "./activity-buttons.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { rollSpec } from "../dice/d20.mjs";
import { esc } from "../view-models/common.mjs";
import { asGM } from "../socket.mjs";
import { rule } from "../rules-settings.mjs";
import { abilities } from "../config/core.mjs";

/**
 * Put effects on a creature the user may not own, through the GM. A declined or timed-out request
 * is reported and the loop carries on with the other targets. Resolves true when applied.
 */
async function requestEffects(payload) {
  try { return await asGM("createEffects", payload); }
  catch (error) {
    ui.notifications.warn(error.message);
    return false;
  }
}

// Small helpers shared by every tracker below.
//   ChatMessage()   the configured ChatMessage class (looked up lazily: CONFIG is filled at init)
//   nowTurn()       {round, turn} of the running combat, or null out of combat. Trackers store this
//                   when something starts and compare it later to know "was this placed this turn?"
//   say()           a short chat note from the actor, styled as a turn card
//   targetedActors() the actors behind the user's targeted tokens (T key), not the selected ones
const ChatMessage = () => CONFIG.ChatMessage.documentClass;
const nowTurn = () => (game.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null);
const say = (actor, html) => ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
  content: `<div class="n5e-turn-card">${html}</div>` });
const targetedActors = () => [...(game.user.targets ?? [])].map(t => t.actor).filter(Boolean);

/* -------------------------------------------- */
/*  Fury                                        */
/* -------------------------------------------- */

/** Keep the Furious token status in step with system.combat.fury (on while Fury > 0). */
async function syncFurious(actor) {
  const on = (actor.system.combat?.fury ?? 0) > 0;
  if ( on !== !!actor.statuses?.has("furious") ) await actor.toggleStatusEffect("furious", { active: on });
}

/**
 * Combat tab +/− buttons. Gaining refreshes the duration (it lasts until the end of the turn after the
 * latest gain); the cap is furyMax (1, more with n5e.fury.max).
 * @param {Actor} actor
 * @param {number} delta  +1 gain, −1 spend
 */
export async function changeFury(actor, delta) {
  const update = delta > 0 ? gainFury(actor, nowTurn(), delta) : spendFury(actor, -delta);
  await actor.update(update);
  return syncFurious(actor);
}

/** Weapon damage rolled: Binding Fury Stance grants Fury the first time each turn. */
export async function onWeaponDamage(actor) {
  const update = bindingFuryTrigger(actor, nowTurn());
  if ( !update ) return;
  await actor.update(update);
  await syncFurious(actor);
  await say(actor, `<b>${esc(actor.name)}</b> gains Fury (Binding Fury Stance).`);
}

/* -------------------------------------------- */
/*  Marks, Branded, Amps                        */
/* -------------------------------------------- */

/** Mark the targeted creatures with a Mark jutsu the actor is concentrating on (steps the ammo die down 1). */
export async function placeMarks(actor, itemId) {
  const item = actor.items.get(itemId);
  const { mark } = item ? jutsuTrackers(item) : {};
  if ( !mark ) return null;
  const targets = targetedActors();
  if ( !targets.length ) return ui.notifications.info("Target the creatures to Mark (T over a token).");
  const ammo = actor.items.find(i => i.type === "weapon" && i.system.equipped && i.system.ammo?.usesDie);
  if ( ammo ) {
    const { stepAmmo } = await import("./ammo.mjs");
    await stepAmmo(ammo, 1);
  }
  for ( const t of targets ) {
    const data = trackerEffectData("mark", mark, { sourceUuid: actor.uuid, sourceName: actor.name, now: nowTurn(), worldTime: game.time.worldTime });
    await requestEffects({ actorUuid: t.uuid, effects: [data] });
  }
  return say(actor, `<b>${esc(actor.name)}</b> Marks ${esc(targets.map(t => t.name).join(", "))}: ${esc(mark.label)} (${esc(mark.jutsu)})${ammo ? `. ${esc(ammo.name)} ammo die steps down.` : ""}`);
}

/** Cast-card buttons for Marks, Branded and Amps. */
export function trackerButtons(actor, item) {
  const { mark, branded, amp } = jutsuTrackers(item);
  const b = [];
  if ( mark ) b.push(`<button type="button" data-n5e-track="mark" data-item="${item.id}">Mark targets: ${esc(mark.label)}</button>`);
  if ( branded ) b.push(`<button type="button" data-n5e-track="branded" data-item="${item.id}">Brand targets</button>`);
  if ( amp ) b.push(`<button type="button" data-n5e-track="amp" data-item="${item.id}">Apply ${esc(amp.label.match(/\(([^)]+)\)/)?.[1] ?? "Amp")}</button>`);
  return b.length ? `<div class="n5e-apply">${b.join("")}</div>` : "";
}

/**
 * Click on a cast card's Mark / Brand / Amp button ([data-n5e-track], wired in dice/roll.mjs).
 * Effects on creatures the player doesn't own go through the GM (asGM in module/socket.mjs).
 * @param {ChatMessage} message  the cast card (flags.n5e.cast.actorUuid names the caster)
 * @param {HTMLElement} btn      data-n5e-track = mark|branded|amp, data-item = the jutsu's id
 */
export async function onTrackerClick(message, btn) {
  const casterUuid = message.getFlag("n5e", "cast")?.actorUuid;
  const actor = casterUuid ? await fromUuid(casterUuid) : null;
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the caster's owner can use this.");
  const item = actor.items.get(btn.dataset.item);
  if ( !item ) return null;
  const kind = btn.dataset.n5eTrack;
  if ( kind === "mark" ) return placeMarks(actor, item.id);
  const defs = jutsuTrackers(item);
  if ( kind === "branded" ) {
    const targets = targetedActors();
    if ( !targets.length ) return ui.notifications.info("Target the creatures to Brand (T over a token).");
    for ( const t of targets ) {
      await requestEffects({ actorUuid: t.uuid, effects: [trackerEffectData("branded", defs.branded,
        { sourceUuid: actor.uuid, sourceName: actor.name, now: nowTurn(), worldTime: game.time.worldTime })] });
    }
    return say(actor, `${esc(targets.map(t => t.name).join(", "))}: ${esc(defs.branded.label)}`);
  }
  if ( kind === "amp" ) {
    const targets = targetedActors();
    const who = targets.length ? targets : [actor];
    const dur = item.system.duration ?? {};
    const seconds = dur.unit === "minute" ? (dur.value || 1) * 60 : dur.unit === "hour" ? (dur.value || 1) * 3600
      : dur.unit === "round" ? (dur.value || 1) * 6 : 60;
    for ( const t of who ) {
      await requestEffects({ actorUuid: t.uuid, effects: [{ name: defs.amp.label, type: "amp", img: item.img,
        origin: item.uuid, description: `<p>From ${esc(actor.name)}'s ${esc(item.name)}: see the jutsu for its bonus.</p>`,
        system: { ampType: defs.amp.ampType, sourceUuid: actor.uuid },
        duration: { seconds, rounds: Math.ceil(seconds / 6), startTime: game.time.worldTime, startRound: game.combat?.round ?? null, startTurn: game.combat?.turn ?? null } }] });
    }
    return say(actor, `${esc(who.map(t => t.name).join(", "))}: ${esc(defs.amp.label)}`);
  }
  return null;
}

/** Amp limit (optional): a new Amp switches older ones off (runs on the creating client). */
export async function onAmpCreated(effect, options, userId) {
  if ( effect.type !== "amp" || userId !== game.user.id || rule("ampLimit") === "none" ) return;
  const actor = effect.parent;
  if ( !(actor instanceof Actor) ) return;
  const others = actor.effects.filter(e => e.type === "amp" && e.id !== effect.id).sort((a, b) => (a.duration?.startTime ?? 0) - (b.duration?.startTime ?? 0));
  const off = ampsToDisable(others, effect.system.ampType);
  if ( !off.length ) return;
  await actor.updateEmbeddedDocuments("ActiveEffect", off.map(e => ({ _id: e.id, disabled: true })));
  await say(actor, `<b>${esc(actor.name)}</b>: Amp limit (${rule("ampLimit") === "singleton" ? "Singleton" : "Rule of 3's"}). Switched off ${esc(off.map(e => e.name).join(", "))}; switch which one applies on the Effects tab.`);
}

/* -------------------------------------------- */
/*  8-Inner Gates                               */
/* -------------------------------------------- */

// One effect holds every open gate's bonuses (flags.n5e.gates.n = the highest open gate).
const gateEffect = actor => actor.effects.find(e => e.flags?.n5e?.gates);
export const openGate = actor => (gateEffect(actor)?.flags.n5e.gates.n ?? 0);

/**
 * Open the next 8-Inner Gate (they open in order). Checks access (rules/trackers.mjs nextGate),
 * asks which action pays for it, then writes ONE effect holding the cumulative bonuses of every open
 * gate (replaced, not stacked, when another gate opens). Opening ends Ninjutsu/Genjutsu concentration.
 * @param {Actor} actor
 */
export async function openNextGate(actor) {
  const current = openGate(actor);
  const check = nextGate(actor, current, { worldTime: game.time.worldTime });
  if ( !check.ok ) return ui.notifications.warn(check.reason);
  const gate = check.gate;
  const { DialogV2 } = foundry.applications.api;
  const slot = await DialogV2.wait({
    window: { title: `${actor.name}: Gate ${gate.n}, ${gate.label}`, icon: "fa-solid fa-dungeon" },
    content: `<p>${esc(gate.text)}</p>${gate.requires ? `<p class="sub">Requires: ${esc(gate.requires)}</p>` : ""}
      ${check.gm ? `<p class="warn"><b>Needs the GM's permission. When it ends, you die.</b></p>` : ""}
      ${current === 0 ? "<p class=\"sub\">While any Gate is open you can't cast or maintain Ninjutsu or Genjutsu; those concentrations end.</p>" : ""}`,
    buttons: [{ action: "action", label: "Action" }, { action: "bonus", label: "Bonus Action", default: true },
      { action: "reaction", label: "Reaction" }, { action: "cancel", label: "Cancel" }],
    rejectClose: false
  });
  if ( !slot || slot === "cancel" ) return null;
  const data = { name: `8-Inner Gates: Gate ${gate.n} (${gate.label})`, img: "icons/svg/aura.svg",
    description: innerGates.filter(g => g.n <= gate.n).map(g => `<p><b>Gate ${g.n}, ${g.label}.</b> ${g.text}</p>`).join(""),
    changes: gateChanges(gate.n), flags: { n5e: { gates: { n: gate.n } } },
    duration: { seconds: 60, rounds: 10, startTime: game.time.worldTime, startRound: game.combat?.round ?? null, startTurn: game.combat?.turn ?? null } };
  const existing = gateEffect(actor);
  if ( existing ) await existing.update({ name: data.name, description: data.description, changes: data.changes, "flags.n5e.gates.n": gate.n });
  else await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  const update = {};
  if ( game.combat?.started ) update[`flags.n5e.economy.${slot}`] = true;
  if ( gate.tempHp ) update["system.hp.temp"] = Math.max(actor.system.hp.temp ?? 0, gate.tempHp);
  // Ninjutsu and Genjutsu can't be maintained while a gate is open.
  const conc = actor.system.combat?.concentrating ?? [];
  const keep = conc.filter(id => !["nin", "gen"].includes(actor.items.get(id)?.system.discipline));
  if ( keep.length !== conc.length ) update["system.combat.concentrating"] = keep;
  if ( Object.keys(update).length ) await actor.update(update);
  return say(actor, `<b>${esc(actor.name)}</b> opens Gate ${gate.n}, ${esc(gate.label)}.${gate.tempHp ? ` +${gate.tempHp} temporary HP.` : ""}${keep.length !== conc.length ? " Ninjutsu and Genjutsu concentration ends." : ""}`);
}

/**
 * Close the gates (free on your turn): delete the gates effect, start the 10-minute cooldown, apply
 * the cumulative Exhaustion (rules/trackers.mjs closeGatesPlan), Bruised after Gate 7, death after
 * Gate 8, and post what happened.
 */
export async function closeGates(actor) {
  const effect = gateEffect(actor);
  if ( !effect ) return null;
  const n = effect.flags.n5e.gates.n;
  const plan = closeGatesPlan(n);
  await effect.delete();
  await actor.update({ "flags.n5e.gates.cooldownUntil": game.time.worldTime + 600 });
  const notes = [];
  if ( plan.exhaustion ) {
    await actor.addCondition("exhaustion", plan.exhaustion);
    notes.push(`${plan.exhaustion} Exhaustion`);
  }
  if ( plan.bruised ) {
    await actor.addCondition("bruised", 1);
    notes.push("Bruised until the Exhaustion is gone");
  }
  if ( plan.death ) {
    await actor.toggleStatusEffect("dead", { active: true, overlay: true });
    notes.push("dies and turns to dust");
  }
  return say(actor, `<b>${esc(actor.name)}</b> closes the gates (Gate ${n})${notes.length ? `: ${esc(notes.join(", "))}` : ""}.
    <div class="sub">Gate Exhaustion: lose 1 rank per 10 minutes out of combat${plan.shortRestRecovery ? " (Gate 5: 1 per Short Rest, all on a Full Rest)" : ""}. 10 minutes out of combat before the gates open again.</div>`);
}

/* -------------------------------------------- */
/*  Chilled                                     */
/* -------------------------------------------- */

/** moveToken hook (active GM): Chilled creatures that move more than 5 ft take cold damage once per turn. */
/*
 * Chilled. Foundry v13 fires moveToken on every client after a token moves; only the active GM acts.
 * movement.passed.distance is the distance travelled in scene units (feet), movement.passed.waypoints
 * carry the movement action ("displace" = forced movement, which doesn't count), and method "undo"
 * means the move was taken back. The running total for this turn is stored on the actor
 * (flags.n5e.chilledMove) so several short moves add up.
 */
export async function onTokenMove(token, movement) {
  if ( !game.users.activeGM?.isSelf ) return;
  const actor = token.actor;
  if ( !actor || !actor.effects.some(e => e.type === "condition" && e.system?.key === "chilled") ) return;
  if ( movement?.method === "undo" ) return;
  const waypoints = movement?.passed?.waypoints ?? [];
  const willing = !waypoints.length || waypoints.some(w => w.action !== "displace");
  const feet = Number(movement?.passed?.distance) || 0;
  const res = chilledMove(actor, { feet, willing, now: nowTurn() });
  await actor.update({ "flags.n5e.chilledMove": res.state });
  if ( !res.hit ) return;
  const roll = await createN5eRoll(res.hit.formula).evaluate();
  await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), rolls: [roll],
    content: `<div class="n5e-roll-card damage"><header><b>${esc(actor.name)}: Chilled</b><span class="bonus">${roll.total}</span></header>
      <div class="note">Moved more than 5 ft: ${esc(res.hit.formula)} cold (${res.hit.ranks} rank${res.hit.ranks > 1 ? "s" : ""}) · ignores DR · skip if the movement was forced</div>
      ${applyButtons()}</div>`,
    flags: { n5e: { damage: { instances: [{ amount: roll.total, type: "cold" }], total: roll.total, ignoreDR: true, targetUuid: actor.uuid }, actorUuid: actor.uuid } } });
}

/* -------------------------------------------- */
/*  Turn end                                    */
/* -------------------------------------------- */

/** End of a creature's turn: Fury expiry, its Marks expire, resave prompts. */
export async function trackersTurnEnd(combat, actor, now) {
  const fury = furyTurnEnd(actor, now);
  if ( fury ) {
    await actor.update(fury);
    await syncFurious(actor);
  }
  await expireSourceEffects(combat, actor, "turnEnd", now);
  const all = combat.combatants.contents.flatMap(c => c.actor?.effects.contents ?? []);
  const expired = marksToExpire(actor.uuid, all, now);
  for ( const e of expired ) await e.delete();
  const due = resavesDue(actor, now);
  const lines = [];
  if ( fury ) lines.push("Fury ends");
  if ( expired.length ) lines.push(`Marks end: ${esc(expired.map(e => `${e.parent.name} (${e.name.replace(/^Marked: /, "")})`).join(", "))}`);
  for ( const r of due ) {
    lines.push(`${esc(r.name)}: ${esc(abilities[r.ability]?.label ?? r.ability)} save DC ${r.dc}
      <button type="button" data-n5e-resave="${r.id}" data-actor="${actor.uuid}">Resave</button>`);
  }
  if ( lines.length ) {
    await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
      content: `<div class="n5e-turn-card"><b>${esc(actor.name)}: end of turn</b>${lines.map(l => `<div>${l}</div>`).join("")}</div>` });
  }
}

/** Resave button: success ends the effect. */
export async function rollResave(btn, event) {
  const actor = await fromUuid(btn.dataset.actor);
  const effect = actor?.effects.get(btn.dataset.n5eResave);
  if ( !actor?.isOwner || !effect ) return ui.notifications.warn("Only the owner rolls this save.");
  const r = effect.flags.n5e.resave;
  btn.disabled = true;
  const spec = { ...rollSpec(actor, "save", r.ability), label: `${abilities[r.ability]?.label ?? r.ability} save: end ${effect.name}` };
  return rollWithSpec(actor, spec, { event, dc: r.dc, onResult: async res => {
    if ( !res.success ) return;
    await effect.delete();
    await say(actor, `${esc(effect.name)} ends.`);
  } });
}

/* -------------------------------------------- */
/*  Activity effects                            */
/* -------------------------------------------- */

// Effect values can be arithmetic after formula substitution ("-floor(4/2)", "-2*3"); Foundry's
// Roll.safeEval evaluates them without dice. Anything else is kept as text.
const evalNumber = expr => {
  try {
    return Roll.safeEval(String(expr));
  } catch {
    return Number(expr) || 0;
  }
};

/**
 * Apply an activity's effect (Titan Guard, Light Step +1 AC, Reaping Swing's DR penalty...) to the
 * caster or the targeted creatures, with an optional turn-based ending.
 *
 * eff fields (schema: activityFields().effect in data/fields/shared.mjs):
 *   name, target ("self" | "targets"), changes [{key, value, mode}], seconds (duration out of combat),
 *   expires ("turnStart" | "turnEnd" | "nextTurnEnd": ends on the CASTER's turn, see
 *     rules/trackers.mjs expiringEffects), tempHp (formula, given once, keeps the higher),
 *   state (a named state other code checks, e.g. "crash", "flow", "combatRival"),
 *   exclusive (group: applying one removes the others in the group, e.g. Crash/Flow = "surge"),
 *   ampType (makes it an Amp effect, so Amp limits and the Amps tracker see it).
 * Values may use lvl(...), @level and @poolRoll; they're resolved now, at apply time.
 *
 * @param {Actor} actor   the caster (owner of the source)
 * @param {object} eff
 * @param {object} [o]
 * @param {string} [o.label]      fallback name
 * @param {Item|null} [o.item]    source item (image, origin, description)
 * @param {number|null} [o.poolRoll]  the pool die rolled when paying the activity's cost
 */
export async function applyActivityEffect(actor, eff, { label = "Effect", item = null, poolRoll = null } = {}) {
  const sub = v => resolveFormula(String(v ?? "").replace(/@poolRoll/g, String(poolRoll ?? 0)), actor);
  const targets = eff.target === "targets" ? targetedActors() : [actor];
  if ( !targets.length ) {
    ui.notifications.info("Target the creatures first (T over a token).");
    return null;
  }
  const now = nowTurn();
  const changes = (eff.changes ?? []).map(c => {
    const v = sub(c.value);
    return { key: c.key, mode: c.mode ?? 2, value: /^[-+*/\d\s().]+$/.test(v) ? String(evalNumber(v)) : v };
  });
  // Duration: the given seconds; otherwise 2 rounds for turn-ended effects (a safety net if the turn
  // hook never runs, e.g. out of combat) and 1 minute for the rest.
  const seconds = eff.seconds || (eff.expires ? 12 : 60);
  const data = { name: eff.name || label, img: item?.img ?? "icons/svg/aura.svg", origin: item?.uuid ?? null, changes,
    description: item?.system?.description ? `<p>From ${esc(actor.name)}'s ${esc(item.name)}.</p>` : "",
    duration: { seconds, rounds: Math.ceil(seconds / 6), startTime: game.time.worldTime, startRound: game.combat?.round ?? null, startTurn: game.combat?.turn ?? null },
    flags: { n5e: { expires: eff.expires ? { at: eff.expires, sourceUuid: actor.uuid, placed: now } : null,
      state: eff.state || null, exclusive: eff.exclusive || null } } };
  if ( eff.ampType ) Object.assign(data, { type: "amp", system: { ampType: eff.ampType, sourceUuid: actor.uuid } });
  const notes = [];
  for ( const t of targets ) {
    // Exclusive group: remove the other member first (entering Flow ends Crash).
    if ( eff.exclusive && t.isOwner ) {
      const old = t.effects.filter(e => e.flags?.n5e?.exclusive === eff.exclusive).map(e => e.id);
      if ( old.length ) await t.deleteEmbeddedDocuments("ActiveEffect", old);
    }
    // Only create an effect when it does or marks something; a pure temp-HP activity creates none.
    if ( changes.length || eff.expires || eff.state || eff.ampType ) {
      if ( t.isOwner ) await t.createEmbeddedDocuments("ActiveEffect", [data]);
      else await requestEffects({ actorUuid: t.uuid, effects: [data] });
    }
    if ( eff.tempHp ) {
      const roll = await createN5eRoll(sub(eff.tempHp)).evaluate();
      if ( t.isOwner ) await t.update({ "system.hp.temp": Math.max(t.system.hp.temp ?? 0, roll.total) });
      notes.push(`${t.name}: ${roll.total} temporary HP`);
    }
  }
  const ends = { turnStart: "until the start of your next turn", turnEnd: "until the end of the turn", nextTurnEnd: "until the end of your next turn" }[eff.expires] ?? "";
  return say(actor, `<b>${esc(data.name)}</b>: ${esc(targets.map(t => t.name).join(", "))}${ends ? ` (${ends})` : ""}${notes.length ? `<div>${esc(notes.join(" · "))}</div>` : ""}`);
}

/**
 * Turn start / end: remove effects that end on this creature's turn, wherever they are (an effect
 * this creature put on an enemy ends on THIS creature's turn). Called from workflow/turn.mjs.
 * @param {Combat} combat
 * @param {Actor} actor               whose turn is starting or ending
 * @param {"turnStart"|"turnEnd"} when
 * @param {{round, turn}} now          the turn in question
 */
export async function expireSourceEffects(combat, actor, when, now) {
  const all = combat.combatants.contents.flatMap(c => c.actor?.effects.contents ?? []);
  for ( const e of expiringEffects(actor.uuid, all, when, now) ) {
    if ( e.parent?.isOwner || game.user.isGM ) await e.delete();
  }
}
