/**
 * Amp cards, Foundry side (AMP1a; docs/AMP1_SPEC.md). Rules: rules/amp-cards.mjs.
 *
 *   - Start-up: every card in the Amps compendium and every world Amp item registers into
 *     CONFIG.N5E.amps.
 *   - Starting one: Activate on the Combat tab's Amps panel, an activity naming the card ({amp: key}),
 *     dragging the card onto a token or a sheet, rolling initiative (cards set to start then), or
 *     game.n5e.api.applyAmp. Anyone can apply one, with a confirmation when something is off
 *     (King Q-A2). On a creature the user doesn't own it goes through the GM's client.
 *   - Limits (optional rule): Singleton asks the creature which Amp of a type applies (King Q-A3);
 *     Rule of 3's asks which ones stay on. The creature's owner is asked (the GM when none is online).
 *   - Endings (King Q-A5): Staggered, Blinded, Unconscious, 0 chakra and leaving a stance end the Amps
 *     that say so, automatically or as a reminder at the table (the GM's "ampEnding" setting). The end
 *     of combat and rests always end Amps that last until then.
 *   - Cooldowns start when the Amp ends; uses come back on rests (rules/rest.mjs).
 */
import { ampDefinition, ampKey, ampWarnings, ampSpendUpdate, ampCooldownUpdate, ampEffectPlan, ampLimitConflict, ampsEndingOn, ampVersionFor, actorLevel, trackKey, withChoice, ampChoiceUpdate, ampDefFor, ampsEndingWith, activeAmpOfSeries,
  ownsAmp, activeAmpCards, AMP_END_TRIGGERS, ampTypeLabel } from "../rules/amp-cards.mjs";
import { canModify } from "../automation/authority.mjs";
import { registerIntentHandler, submitIntent } from "../automation/owner-intents.mjs";
import { resolveFormula } from "../rules/unarmed.mjs";
import { rule } from "../rules-settings.mjs";
import { esc } from "../view-models/common.mjs";

export const AMP_PACK = "n5e.amps";
const registry = () => (CONFIG.N5E.amps ??= {});
const ChatMessage = () => CONFIG.ChatMessage.documentClass;
const resolver = actor => v => {
  const r = resolveFormula(String(v ?? ""), actor);
  const n = Number(r);
  if ( Number.isFinite(n) ) return n;
  try { return Number(Roll.safeEval(String(r))) || 0; } catch { return 0; }
};

/** Register one card (or re-register an edited one). Returns its key. */
export function registerAmp(card) {
  // King 2026-11-16: renaming a card without an identifier must not change its key (Amps already
  // started would lose their card): reuse the key this card already has, and drop stale entries.
  const reg = registry();
  const existing = card.uuid ? Object.keys(reg).filter(k => reg[k].card === card.uuid) : [];
  const key = card.system?.identifier || existing[0] || ampKey(card);
  if ( !key ) return null;
  for ( const k of existing ) if ( k !== key ) delete reg[k];
  reg[key] = ampDefinition(card);
  return key;
}

/** Ready hook: register every card from the compendium and the world. */
export async function loadAmpCards() {
  const pack = game.packs.get(AMP_PACK);
  const cards = [...(pack ? await pack.getDocuments() : []), ...game.items.filter(i => i.type === "amp")];
  for ( const card of cards ) registerAmp(card);
  Hooks.callAll("n5e.registryChanged", "amps", null, null);
  return cards.length;
}

/** The registry key for a card's uuid (drops carry the uuid). */
export function keyForAmp(uuid) {
  return Object.entries(registry()).find(([, def]) => def.card === uuid)?.[0] ?? null;
}

/**
 * The client that answers for a creature (its limit dialogs, its endings, its initiative start):
 * the first active player who owns it, else the active GM.
 */
export function isResponsible(actor) {
  const owners = game.users.filter(u => u.active && !u.isGM && actor?.testUserPermission?.(u, "OWNER"));
  if ( owners.length ) return owners.sort((a, b) => a.id.localeCompare(b.id))[0].isSelf;
  return !!game.users.activeGM?.isSelf;
}

/** King Q-A2: ask before applying when something is off. Resolves true to go ahead. */
async function confirmWarnings(def, warnings) {
  if ( !warnings.length ) return true;
  return foundry.applications.api.DialogV2.confirm({
    window: { title: `Start ${def.label}?` },
    content: `<ul>${warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul><p>Apply it anyway?</p>`,
    rejectClose: false
  });
}

/**
 * Start an Amp card on a creature.
 * @param {Actor} target
 * @param {string} key
 * @param {object} [o]
 * @param {Actor|null} [o.applier]   who starts it (uses and cooldown are theirs); default the target
 * @param {Item|null} [o.item]       the feature or jutsu it came from (concentration, origin)
 * @param {boolean} [o.confirm=true] false: skip the confirmation (initiative "auto")
 */
export async function applyAmp(target, key, { applier = null, item = null, confirm = true, rank = "", choice = null } = {}) {
  // AMP1g (King 2026-11-20): start the version the character's level reaches (Flow (11th) at 11th).
  // AMP1f (King Q-F1): and the version for the rank the jutsu was cast at.
  key = ampVersionFor(registry(), key, actorLevel(applier ?? target), rank);
  const def = registry()[key];
  if ( !def ) throw new Error(`Unknown Amp: ${key}`);
  if ( !target ) throw new Error("Drop the Amp on a creature.");
  const who = applier ?? target;
  const resolve = resolver(who);
  const warnings = ampWarnings(def, { applier: who, target, worldTime: game.time.worldTime, key, resolve });
  if ( confirm && !(await confirmWarnings(def, warnings)) ) return null;
  // AMP1f (King Q-F1): the caster picks from the card's options in a menu.
  if ( def.choose && choice == null ) {
    choice = await pickOption(def);
    if ( choice == null ) return null;
  }
  // Uses are spent by whoever starts it, when it is theirs to start.
  if ( ownsAmp(who, def) && def.uses?.max && canModify(game.user, who) ) {
    const spend = ampSpendUpdate(who, key, def);
    if ( spend ) await who.update(spend);
  }
  if ( canModify(game.user, target) ) return placeAmp(target, key, { applier: who, item, choice });
  if ( !canModify(game.user, who) ) throw new Error("Select a token you own (or assign your character) to apply this.");
  return submitIntent(who, "applyAmp", { key, targetUuid: target.uuid, ...(choice == null ? {} : { choice }) });
}

/**
 * AMP1f: for an Amp given to several creatures, the caster picks once (the cast's one choice).
 * @returns {number|null|false}  the option, null when the card has no options, false when closed
 */
export async function pickAmpOption(key, applier, rank = "") {
  const def = registry()[ampVersionFor(registry(), key, actorLevel(applier), rank)];
  if ( !def?.choose ) return null;
  const choice = await pickOption(def);
  return choice == null ? false : choice;
}

/** AMP1f: the options menu (every option in view). Returns the picked indexes, or null when closed. */
async function pickOption(def, current = []) {
  const count = def.choose.count ?? 1;
  const many = count > 1;
  const rows = def.choose.options.map((o, i) => `<label class="checkbox"><input type="${many ? "checkbox" : "radio"}" name="choice" value="${i}" ${(current.length ? current.includes(i) : i === 0) ? "checked" : ""}> ${esc(o.label)}</label>`).join("");
  const picked = await foundry.applications.api.DialogV2.prompt({
    window: { title: def.label }, content: `<p>${esc(def.choose.prompt)}${many ? ` (up to ${count})` : ""}</p>${rows}`,
    ok: { label: current.length ? "Change" : "Start", callback: (event, button) => [...button.form.querySelectorAll("input[name=choice]:checked")].map(x => Number(x.value)) },
    rejectClose: false
  });
  if ( !Array.isArray(picked) || !picked.length ) return null;
  if ( picked.length > count ) { ui.notifications.warn(`Pick up to ${count}.`); return null; }
  return picked;
}

/** AMP1f (King Q-F9): the Change button on an active Amp whose pick can change (Score's tempo). */
export async function changeAmpChoice(actor, effectId) {
  const effect = actor.effects.get(effectId);
  const def = effect ? ampDefFor(effect, registry()) : null;
  if ( !def?.choose?.changeable ) return null;
  const picked = await pickOption(def, effect.flags?.n5e?.ampChoice ?? []);
  if ( !picked ) return null;
  return effect.update(ampChoiceUpdate(def, picked));
}

/** AMP1f batch 3 (King Q-F11): a button on an active Amp applies its effect to the Amp's bearer. */
export async function useAmpButton(actor, effectId, index) {
  const effect = actor.effects.get(effectId);
  const button = effect ? ampDefFor(effect, registry())?.buttons?.[index] : null;
  if ( !button ) return null;
  // AMP1f batch 4 (King Q-F20): end it early without its aftermath (The Zone can be reactivated).
  if ( button.end === "pause" ) { await effect.delete({ n5eAmpPause: true }); return effect.name; }
  const { applyActivityEffect } = await import("./trackers.mjs");
  return applyActivityEffect(actor, { ...button.effect, target: "self" }, { label: button.label, item: { name: effect.name, img: effect.img, id: null, uuid: effect.uuid }, targetActors: [actor] });
}

/** Create the Amp effect from the card (runs on a client that can modify the target). */
export async function placeAmp(target, key, { applier = null, item = null, choice = null } = {}) {
  const def = registry()[key];
  if ( !def ) return null;
  const { applyActivityEffect } = await import("./trackers.mjs");
  const source = item ?? { img: def.icon, uuid: def.card, name: def.label, id: null, system: { description: def.summary } };
  if ( def.endsWith ) await releaseFor(target, def);
  await applyActivityEffect(applier ?? target, withChoice(ampEffectPlan(key, def), def, choice), { label: def.label, item: source, targetActors: [target] });
  return { applied: target.name, key };
}

/**
 * AMP1f batch 4 (King Q-F17): an Amp that ends with another (Strength of 1000 with Strength of 100)
 * frees that Amp from its concentration: it keeps its duration, and the jutsu leaves the
 * concentration list. Without that Amp on the bearer, a warning (the jutsu requires it).
 */
async function releaseFor(target, def) {
  const other = activeAmpOfSeries(target.effects, def.endsWith, registry());
  if ( !other ) {
    ui.notifications.warn(`${def.label}: ${target.name} isn't under ${registry()[def.endsWith]?.label ?? def.endsWith}.`);
    return;
  }
  const dep = other.flags?.n5e?.dependentOn;
  if ( !dep ) return;
  await other.update({ "flags.n5e.dependentOn": null });
  const caster = dep.actorUuid === target.uuid ? target : await fromUuid(dep.actorUuid).catch(() => null);
  const held = caster?.system?.combat?.concentrating ?? [];
  if ( caster && held.includes(dep.itemId) && canModify(game.user, caster) ) {
    await caster.update({ "system.combat.concentrating": held.filter(id => id !== dep.itemId) });
  }
}

/** End an Amp (by effect id or card key). The cooldown starts (deleteActiveEffect hook). */
export async function endAmp(actor, idOrKey) {
  const effect = actor.effects.get(idOrKey) ?? activeAmpCards(actor)[idOrKey];
  if ( !effect ) return null;
  await effect.delete();
  return effect.name;
}

/* -------------------------------------------- */
/*  Limits (King Q-A3)                          */
/* -------------------------------------------- */

/**
 * After a new Amp: if it clashes with the optional limit, its creature picks which ones stay on.
 * Runs on the creature's responsible client. Closing the dialog keeps the newest ones.
 */
export async function onAmpCreated(effect) {
  if ( effect.type !== "amp" ) return;
  const actor = effect.parent;
  const mode = rule("ampLimit");
  if ( !(actor instanceof Actor) || mode === "none" || !isResponsible(actor) ) return;
  const others = actor.effects.filter(e => e.type === "amp" && e.id !== effect.id).sort((a, b) => (a.duration?.startTime ?? 0) - (b.duration?.startTime ?? 0));
  const clash = ampLimitConflict(others, effect, mode);
  if ( !clash ) return;
  const keep = await pickAmps(actor, clash);
  const off = clash.candidates.filter(e => !keep.includes(e.id));
  if ( !off.length ) return;
  await actor.updateEmbeddedDocuments("ActiveEffect", off.map(e => ({ _id: e.id, disabled: true })));
  await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b>: Amp limit (${mode === "singleton" ? "Singleton" : "Rule of 3's"}). Switched off ${esc(off.map(e => e.name).join(", "))}.</div>` });
}

/** The dialog: which Amps stay on. Returns effect ids. */
async function pickAmps(actor, clash) {
  const { candidates, keep, kind } = clash;
  const newest = candidates.slice(-keep).map(e => e.id);
  const single = keep === 1;
  const rows = candidates.map(e => `<label class="checkbox"><input type="${single ? "radio" : "checkbox"}" name="keep" value="${e.id}" ${newest.includes(e.id) ? "checked" : ""}>
    ${esc(e.name)} <span class="sub">(${esc(ampTypeLabel(e.system?.ampType))})</span></label>`).join("");
  const title = kind === "singleton" ? `${ampTypeLabel(candidates.at(-1).system?.ampType)} Amps: which one applies?` : `Rule of 3's: which ${keep} stay on?`;
  const chosen = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${actor.name}: ${title}` },
    content: `<p>${kind === "singleton" ? "Only one Amp of a type applies. Pick the one that applies; the other is switched off (switch it back from the Amps panel)." : `Only 3 Amps are active at once. Keep ${keep}; the rest are switched off.`}</p>${rows}`,
    ok: { label: "Apply", callback: (event, button) => [...button.form.querySelectorAll("input[name=keep]:checked")].map(i => i.value) },
    rejectClose: false
  }).catch(() => null);
  if ( !Array.isArray(chosen) || !chosen.length ) return newest;
  if ( chosen.length === keep ) return chosen;
  // Too few or too many: fill with the newest, then trim.
  const filled = [...chosen, ...[...newest].reverse().filter(id => !chosen.includes(id))];
  return filled.slice(0, keep);
}

/* -------------------------------------------- */
/*  Endings (King Q-A5)                         */
/* -------------------------------------------- */

/**
 * End the Amps an event ends. "combatEnd", "rest" and "finisherCast" are durations and always end; the others follow
 * the GM's setting: automatically, or a reminder to end them at the table.
 */
export async function endAmpsOn(actor, trigger) {
  const ending = ampsEndingOn(actor, trigger);
  if ( !ending.length ) return 0;
  // AMP1e: casting a Finisher is part of DYNAMIC FORM!'s duration ("until you cast a Finisher"), so it always ends.
  const auto = ["combatEnd", "rest", "finisherCast"].includes(trigger) || rule("ampEnding") !== "table";
  const why = AMP_END_TRIGGERS[trigger] ?? trigger;
  if ( auto ) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", ending.map(e => e.id));
    if ( trigger !== "combatEnd" && trigger !== "rest" ) {
      await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b>: ${esc(ending.map(e => e.name).join(", "))} ${ending.length > 1 ? "end" : "ends"} (${esc(why)}).</div>` });
    }
    return ending.length;
  }
  const owners = game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
  await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), whisper: owners,
    content: `<div class="n5e-turn-card"><b>${esc(actor.name)}</b>: ${esc(why)}. ${esc(ending.map(e => e.name).join(", "))} should end (end ${ending.length > 1 ? "them" : "it"} on the Amps panel).</div>` });
  return 0;
}

const END_CONDITIONS = { staggered: "staggered", blinded: "blinded", unconscious: "unconscious", dying: "unconscious" };

/* -------------------------------------------- */
/*  Initiative                                  */
/* -------------------------------------------- */

const started = new Set();

/** A creature rolled initiative: start the Amps set to start then ("auto"), or ask ("ask"). */
export async function startOnInitiative(combatant) {
  const actor = combatant.actor;
  if ( !actor || !isResponsible(actor) ) return;
  const mark = `${combatant.parent?.id}.${combatant.id}`;
  if ( started.has(mark) ) return;
  started.add(mark);
  const active = activeAmpCards(actor);
  for ( const [key, def] of Object.entries(registry()) ) {
    if ( !def.startOnInitiative || active[key] || def.owner?.kind === "any" || !ownsAmp(actor, def) ) continue;
    if ( def.startOnInitiative === "ask" ) {
      const go = await foundry.applications.api.DialogV2.confirm({ window: { title: `${actor.name}: start ${def.label}?` },
        content: `<p>${esc(def.summary || def.label)}</p>`, rejectClose: false });
      if ( !go ) continue;
    }
    await applyAmp(actor, key, { applier: actor, confirm: def.startOnInitiative === "ask" }).catch(e => ui.notifications.warn(e.message));
  }
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** Drops, the GM's intent handler, world cards, limits, endings, cooldowns, initiative. */
export function registerAmpCards() {
  Hooks.on("dropCanvasData", (cnv, data) => {
    if ( data?.type !== "Item" || !data.uuid ) return undefined;
    const doc = globalThis.fromUuidSync?.(data.uuid);
    const key = keyForAmp(data.uuid) ?? (doc?.type === "amp" ? registerAmp(doc) : null);
    if ( !key ) return undefined;
    const token = cnv.tokens.placeables.filter(t => t.actor && t.bounds.contains(data.x, data.y))
      .sort((a, b) => b.document.sort - a.document.sort)[0];
    if ( !token ) return undefined;
    const applier = canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
    void applyAmp(token.actor, key, { applier }).catch(e => ui.notifications.warn(e.message));
    return false;
  });
  registerIntentHandler("applyAmp", async (actor, data) => {
    const doc = await fromUuid(data.targetUuid);
    const target = doc?.actor ?? doc;
    if ( !(target instanceof Actor) ) throw new Error("That creature no longer exists.");
    return placeAmp(target, data.key, { applier: actor, choice: data.choice ?? null });
  });
  for ( const hook of ["createItem", "updateItem"] ) {
    Hooks.on(hook, item => { if ( item.type === "amp" && !item.parent ) registerAmp(item); });
  }
  // A new card gets an identifier from its name, so it keeps its key when renamed.
  Hooks.on("preCreateItem", (item, data) => {
    if ( item.type === "amp" && !data.system?.identifier ) item.updateSource({ "system.identifier": ampKey(item) });
  });
  // UX1: the card's own effects are part of its buff; editing them re-registers the card.
  for ( const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"] ) {
    Hooks.on(hook, effect => { const card = effect.parent; if ( card?.documentName === "Item" && card.type === "amp" && !card.parent ) registerAmp(card); });
  }

  Hooks.on("createActiveEffect", effect => {
    void onAmpCreated(effect);
    const actor = effect.parent;
    if ( !(actor instanceof Actor) || effect.type !== "condition" || !isResponsible(actor) ) return;
    const trigger = END_CONDITIONS[effect.system?.key] ?? [...(effect.statuses ?? [])].map(s => END_CONDITIONS[s]).find(Boolean);
    if ( trigger ) void endAmpsOn(actor, trigger);
  });
  Hooks.on("updateActor", (actor, change) => {
    if ( !isResponsible(actor) ) return;
    const cp = foundry.utils.getProperty(change, "system.cp.value");
    if ( cp != null && cp <= 0 ) void endAmpsOn(actor, "noChakra");
    if ( foundry.utils.hasProperty(change, "system.combat.activeStance") ) void endAmpsOn(actor, "stanceLeave");
  });
  // AMP1f batch 3 (King Q-F13): an Amp that leaves a condition behind when it ends (Strength of 100's
  // aftermath). Not on a swap or a version change; placed by the bearer's responsible client.
  Hooks.on("deleteActiveEffect", async (effect, options) => {
    const key = effect.type === "amp" ? effect.system?.key : null;
    const after = key ? registry()[key]?.onEnd?.condition : null;
    const actor = effect.parent;
    if ( !after || options?.n5eAmpSwap || options?.n5eAmpPause || !(actor instanceof Actor) || !isResponsible(actor) ) return;
    const { applyConditionCard } = await import("./condition-cards.mjs");
    await applyConditionCard(actor, after, { applier: actor }).catch(e => console.warn("n5e | Amp aftermath", e));
  });
  // AMP1f batch 4 (King Q-F17): Amps that end with this one end too (each leaves its own aftermath).
  Hooks.on("deleteActiveEffect", async (effect, options) => {
    const key = effect.type === "amp" ? effect.system?.key : null;
    const actor = effect.parent;
    if ( !key || options?.n5eAmpSwap || !(actor instanceof Actor) || !isResponsible(actor) ) return;
    const ids = ampsEndingWith(actor.effects, key, registry()).filter(id => actor.effects.has(id));
    if ( ids.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", ids).catch(e => console.warn("n5e | Amp ends with", e));
  });
  // The cooldown starts when an Amp card's effect ends, on whoever starts it.
  Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
    const key = effect.type === "amp" ? effect.system?.key : null;
    if ( !key || userId !== game.user.id || options?.n5eAmpSwap ) return;
    const def = registry()[key];
    if ( !def?.cooldown ) return;
    const source = effect.system.sourceUuid ? await fromUuid(effect.system.sourceUuid) : effect.parent;
    const who = source?.actor ?? source;
    if ( !(who instanceof Actor) || !canModify(game.user, who) || !ownsAmp(who, def) ) return;
    await who.update(ampCooldownUpdate(key, def, game.time.worldTime, who.flags?.n5e?.ampUses?.[trackKey(key, def)] ?? {}));
  });
  Hooks.on("updateCombatant", (combatant, change) => {
    if ( change?.initiative != null ) void startOnInitiative(combatant);
  });
  Hooks.on("deleteCombat", combat => {
    for ( const c of combat.combatants ) {
      started.delete(`${combat.id}.${c.id}`);
      if ( c.actor && isResponsible(c.actor) ) void endAmpsOn(c.actor, "combatEnd");
    }
  });
}
