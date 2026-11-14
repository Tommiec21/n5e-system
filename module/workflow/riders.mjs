/**
 * Feature riders on the action card (Foundry side; CARD1d). Rules: rules/riders.mjs. Authoring a
 * rider for any class, clan or feat is data only: see docs/RIDERS.md. Nothing here names a feature.
 *
 *   Cast riders     armed in the cast dialog (a castOption with `rider`), written onto the card when it
 *                   is posted (castRiderEntries).
 *   Trigger riders  "Use <rider>" on the card for the caster's owner once a target qualifies; paying
 *                   and choosing happen on click (useRider), then the card's author (or a GM) writes it.
 *   Event save      one save per event: the action's save, else the chosen rider save (eventSave).
 *   Applications    per-target buttons for whoever may change that creature (target owner, GM for
 *                   NPCs), recorded through the CARD1b effect note with a source id so they show once.
 */
import { triggerRiders, targetFacts, triggered, saveEffect, eventSave, riderOnTarget, adjustedInflicts, riderEntry, validateRider } from "../rules/riders.mjs";
import { conditions as CONDITIONS } from "../config/conditions.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";
import { resolveFormula } from "../rules/unarmed.mjs";

const list = v => (Array.isArray(v) ? v : v == null ? [] : [...v]);
export const conditionTags = key => CONDITIONS[key]?.tags ?? globalThis.CONFIG?.N5E?.clanConditions?.[key]?.tags ?? [];
const maxRanks = key => {
  const def = CONDITIONS[key] ?? globalThis.CONFIG?.N5E?.clanConditions?.[key];
  return def?.maxRanks ?? null;
};
const nowTurn = () => (globalThis.game?.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null);

/** The save DC a rider save uses when it supplies the event save. source "action": the card's discipline. */
export function riderDC(caster, card, source = "action") {
  const disc = source === "action" ? (card?.kind === "jutsu" ? card.discipline : "tai") : source;
  return caster?.system?.disciplines?.[disc === "buki" ? "tai" : disc || "tai"]?.dc ?? null;
}

/** The action as riders see it: kind, discipline, keywords, the action's own inflicts. */
export function actionOf(card, sourceInflicts = []) {
  const item = globalThis.fromUuidSync?.(card?.itemUuid);
  const kw = item?.system?.keywords;
  return { kind: card?.kind, discipline: card?.kind === "jutsu" ? card.discipline : card?.kind === "attack" ? "tai" : item?.system?.discipline,
    keywords: kw instanceof Set ? [...kw] : list(kw), inflicts: sourceInflicts };
}

/**
 * Cast riders chosen in the dialog → card entries. A rider whose cost rolls its pool die rolls it here,
 * once, and the card keeps the result (@poolRoll).
 * @returns {Promise<{entries: object[], notes: string[], rolledPools: object}>}
 */
export async function castRiderEntries(actor, card, chosen = []) {
  const entries = [], notes = [], rolledPools = {};
  for ( const c of chosen ) {
    let poolRoll = null;
    const die = c.cost?.pool ? actor.system.resources?.[c.cost.pool]?.die : null;
    if ( c.cost?.roll && die && c.amount ) {
      const roll = await (await import("../dice/n5e-roll.mjs")).createN5eRoll(`${c.amount}${die}`).evaluate();
      poolRoll = roll.total;
      rolledPools[c.cost.pool] = (rolledPools[c.cost.pool] ?? 0) + c.amount;
      notes.push(`${c.label}: rolled ${poolRoll} (${c.amount}${die})`);
    }
    const s = saveEffect(c.rider);
    entries.push(riderEntry(c.rider, { key: `cast:${c.id}`, id: c.id, itemUuid: actor.items.get(String(c.id).split("-")[0])?.uuid ?? null,
      arm: "cast", poolRoll, dc: s ? riderDC(actor, card, s.dc?.source) : null }));
  }
  return { entries, notes, rolledPools };
}

/** Card sections plus what riders add (riders; saves when a rider supplies the event save). */
export function withRiderSections(sections, entries, sourceSaves) {
  const out = [...sections];
  if ( entries.length && !out.includes("riders") ) out.push("riders");
  if ( !sourceSaves && entries.some(e => saveEffect(e)) && !out.includes("saves") ) out.push("saves");
  const order = ["attack", "area", "saves", "damage", "effects", "riders", "reactions", "concentration"];
  return order.filter(s => out.includes(s));
}

/** Is this creature the caster's Combat Rival (a combatRival state placed by the caster)? */
function rivalOf(caster) {
  return uuid => {
    const actor = globalThis.fromUuidSync?.(uuid);
    return list(actor?.effects).some(e => !e.disabled && e.flags?.n5e?.state === "combatRival"
      && (!e.flags?.n5e?.expires?.sourceUuid || e.flags.n5e.expires.sourceUuid === caster?.uuid || e.origin?.startsWith?.(caster?.uuid ?? "\u0000")));
  };
}

/**
 * What riders add to a card render: the caster's bar, the event-save choice, and per-row controls.
 * @param {ChatMessage} message
 * @param {object} results       mergedResults
 * @param {{saves: object[]}} acts  the card's own save buttons (datasets)
 * @param {Set<string>} appliedSources  effect sources already applied, per target: `${uuid}|${source}`
 */
export function riderView(message, results, acts, appliedSources = new Set()) {
  const card = message.flags.n5e.card;
  const game = globalThis.game;
  const caster = globalThis.fromUuidSync?.(card.actorUuid);
  const entries = list(card.riders).filter(e => !e.undone);
  const parse = v => { try { return JSON.parse(v || "[]") ?? []; } catch { return []; } };
  const sourceInflicts = acts.saves.flatMap(d => parse(d.inflicts));
  const facts = targetFacts(card, results);
  const isRival = rivalOf(caster);
  const ev = eventSave(card, acts.saves.length);
  const canWrite = message.isAuthor || game.user.isGM;
  const bar = [];
  if ( caster?.isOwner ) {
    const offered = triggerRiders(caster.items, actionOf(card, sourceInflicts), { now: nowTurn(), riderTurn: caster.flags?.n5e?.riderTurn ?? {}, conditionTags });
    for ( const o of offered ) {
      if ( entries.some(e => e.id === o.id) ) continue;
      const any = [...facts.values()].some(f => triggered(o.rider, f));
      if ( !any ) continue;
      const cost = o.rider.cost?.pool ? ` · ${o.rider.cost.amount ?? 1} ${esc(caster.system.resources?.[o.rider.cost.pool]?.label ?? o.rider.cost.pool)}` : "";
      bar.push(o.used ? `<span class="sub">${esc(o.rider.label)} (used this turn)</span>`
        : `<button type="button" data-n5e-rider-use="${esc(o.id)}">Use ${esc(o.rider.label)}${cost}</button>`);
    }
    for ( const e of entries ) {
      const anyApplied = [...appliedSources].some(s => s.split("|")[1]?.startsWith(`${e.key}:`));
      bar.push(`<span class="n5e-rider-chip">${esc(e.label)}${e.poolRoll != null ? ` (${e.poolRoll})` : ""}${e.choice ? `: ${esc(e.choice.label)}` : ""}</span>`
        + (canWrite && !anyApplied ? `<button type="button" data-n5e-rider-cancel="${esc(e.key)}" data-tooltip="Remove this rider and refund its cost">×</button>` : ""));
    }
    if ( ev?.from === "choose" && canWrite && !Object.keys(results.saves ?? {}).length ) {
      for ( const key of ev.keys ) {
        const e = entries.find(x => x.key === key);
        const s = saveEffect(e);
        bar.push(`<button type="button" data-n5e-rider-eventsave="${esc(key)}">Event save: ${esc(e.label)} (${esc(String(s.ability).toUpperCase())})</button>`);
      }
    }
  }
  /** Per-row controls and the action's inflicts after riders. */
  const row = (uuid, mine) => {
    const fact = facts.get(uuid);
    const parts = entries.map(e => riderOnTarget(e, uuid, fact, sourceInflicts, conditionTags, { isRival }));
    const adds = parts.flatMap(p => p.adds);
    const controls = [];
    const notes = [];
    // The event save from a rider (the action forces none): one save per target.
    if ( mine && ev?.from === "rider" && fact && !fact.saved && entries.some(e => saveEffect(e) && (!e.targets || e.targets.includes(uuid))
      && (e.targetMode === "chosen" || triggered(e, fact))) ) {
      controls.push(`<button type="button" data-n5e-rider-save="${esc(uuid)}">Roll ${esc(String(ev.ability).toUpperCase())} save</button>`);
    }
    parts.forEach((p, i) => {
      const e = entries[i];
      if ( p.warning && (p.apps.length || p.adds.length) ) notes.push(`${e.label}: ${p.warning}`);
      for ( const a of p.apps ) {
        if ( a.kind === "note" ) { notes.push(`${e.label}: ${a.label}`); continue; }
        if ( !mine || appliedSources.has(`${uuid}|${a.id}`) ) continue;
        controls.push(`<button type="button" data-n5e-rider-apply="${esc(a.id)}" data-target="${esc(uuid)}">${esc(e.label)}: ${esc(a.label)}${a.kind === "condition" ? ` ${a.ranks}` : ""}</button>`);
      }
    });
    return { controls, notes, inflicts: adjustedInflicts(sourceInflicts, adds, maxRanks) };
  };
  return { bar, row, entries };
}

/** Riders write to the card: its author or a GM. */
function writable(message) {
  if ( message.isAuthor || globalThis.game.user.isGM ) return true;
  ui.notifications.warn("Only the card's author or the GM can add riders to it.");
  return false;
}

async function pick(title, options, { multiple = false } = {}) {
  const { DialogV2 } = foundry.applications.api;
  const type = multiple ? "checkbox" : "radio";
  return DialogV2.prompt({ window: { title }, content: options.map((o, i) =>
    `<label><input type="${type}" name="pick" value="${i}"${!multiple && i === 0 ? " checked" : ""}> ${esc(o.label)}</label>`).join("<br>"),
    ok: { callback: (event, button) => [...button.form.querySelectorAll("input[name=pick]:checked")].map(x => options[Number(x.value)]) },
    rejectClose: false });
}

/** Rider buttons on the card. */
export async function onRiderClick(message, btn, event, { results, acts }) {
  const card = message.flags.n5e.card;
  const d = btn.dataset;
  const game = globalThis.game;
  const caster = await fromUuid(card.actorUuid);
  const parse = v => { try { return JSON.parse(v || "[]") ?? []; } catch { return []; } };
  const sourceInflicts = acts.saves.flatMap(x => parse(x.inflicts));
  if ( d.n5eRiderUse ) {
    if ( !caster?.isOwner ) return ui.notifications.warn("Only the caster's owner uses its riders.");
    if ( !writable(message) ) return null;
    const offer = triggerRiders(caster.items, actionOf(card, sourceInflicts), { now: nowTurn(), riderTurn: caster.flags?.n5e?.riderTurn ?? {}, conditionTags })
      .find(o => o.id === d.n5eRiderUse);
    if ( !offer || offer.used ) return ui.notifications.warn("That rider isn't available now.");
    const rider = offer.rider;
    const facts = targetFacts(card, results);
    const qualifying = [...facts.entries()].filter(([, f]) => triggered(rider, f)).map(([uuid]) => uuid);
    const name = uuid => list(card.targets).find(t => t.uuid === uuid)?.name ?? globalThis.fromUuidSync?.(uuid)?.name ?? uuid;
    let targets = null;
    if ( rider.target === "one" ) {
      const got = await pick(rider.label, qualifying.map(uuid => ({ uuid, label: name(uuid) })));
      if ( !got?.length ) return null;
      targets = [got[0].uuid];
    } else if ( rider.target === "chosen" ) {
      const got = await pick(`${rider.label}: choose the creatures`, list(card.targets).map(t => ({ uuid: t.uuid, label: t.name })), { multiple: true });
      if ( !got?.length ) return null;
      targets = got.map(g => g.uuid);
    }
    const inflict = list(rider.effects).find(e => e.type === "inflict");
    let choice = null;
    if ( inflict && list(inflict.choose).length > 1 ) {
      const got = await pick(`${rider.label}: choose the condition`, inflict.choose);
      if ( !got?.length ) return null;
      choice = got[0];
    }
    let poolRoll = null;
    if ( rider.cost?.pool ) {
      const { payPoolCost } = await import("./resources.mjs");
      const paid = await payPoolCost(caster, rider.cost);
      if ( !paid ) return null;
      poolRoll = paid.roll;
    }
    const s = saveEffect(rider);
    const entry = { ...riderEntry(rider, { key: `${offer.id}@${Date.now().toString(36)}`, id: offer.id, itemUuid: caster.items.get(offer.itemId)?.uuid ?? null,
      poolRoll, choice, targets, dc: s ? riderDC(caster, card, s.dc?.source) : null }), targetMode: rider.target ?? "each", cost: rider.cost ?? null,
      paid: rider.cost?.pool ? { pool: rider.cost.pool, amount: rider.cost.amount ?? 1 } : null };
    const entries = [...list(card.riders), entry];
    await message.update({ "flags.n5e.card.riders": entries, "flags.n5e.card.sections": withRiderSections(card.sections, entries, acts.saves.length) });
    if ( rider.oncePerTurn && nowTurn() ) await caster.update({ [`flags.n5e.riderTurn.${offer.id}`]: nowTurn() });
    return entry;
  }
  if ( d.n5eRiderCancel ) {
    if ( !writable(message) ) return null;
    const entries = list(card.riders).map(e => (e.key === d.n5eRiderCancel ? { ...e, undone: true } : e));
    const e = list(card.riders).find(x => x.key === d.n5eRiderCancel);
    if ( e?.paid && caster?.isOwner ) {
      const pool = caster.system.resources?.[e.paid.pool];
      if ( pool ) await caster.update({ [`system.resources.${e.paid.pool}.value`]: Math.min(pool.maxValue ?? Infinity, (pool.value ?? 0) + e.paid.amount) });
    }
    const keep = entries.filter(x => !x.undone);
    const patch = { "flags.n5e.card.riders": entries };
    if ( card.eventSave?.key === d.n5eRiderCancel && !Object.keys(results.saves ?? {}).length ) patch["flags.n5e.card.-=eventSave"] = null;
    if ( !keep.length ) patch["flags.n5e.card.sections"] = list(card.sections).filter(s => s !== "riders");
    return message.update(patch);
  }
  if ( d.n5eRiderEventsave ) {
    if ( !writable(message) ) return null;
    if ( Object.keys(results.saves ?? {}).length ) return ui.notifications.warn("A target has already saved; the event save can't change.");
    const e = list(card.riders).find(x => x.key === d.n5eRiderEventsave);
    const s = saveEffect(e);
    return message.update({ "flags.n5e.card.eventSave": { key: e.key, ability: s.ability, dc: s.dcValue } });
  }
  const target = d.target ? await fromUuid(d.target) : d.n5eRiderSave ? await fromUuid(d.n5eRiderSave) : null;
  if ( !target ) return ui.notifications.warn("That creature is no longer available.");
  if ( !canModify(game.user, target) ) return ui.notifications.warn("Only that creature's owner (the GM for NPCs) can do this.");
  if ( d.n5eRiderSave ) {
    const ev = eventSave(card, acts.saves.length);
    if ( ev?.from !== "rider" || ev.dc == null ) return ui.notifications.info("Choose the event save first.");
    const { onActivityClick } = await import("./activity-buttons.mjs");
    btn.disabled = true;
    const e = list(card.riders).find(x => x.key === ev.key);
    return onActivityClick(message, { dataset: { n5eAct: "save", ability: ev.ability, dc: String(ev.dc), label: e?.label ?? "Rider", inflicts: "[]", onSuccess: "none" }, disabled: false },
      event, { selectedActors: [target] });
  }
  if ( d.n5eRiderApply ) {
    const key = d.n5eRiderApply.split(":")[0];
    const entry = list(card.riders).find(e => e.key === key);
    const fact = targetFacts(card, results).get(target.uuid);
    const app = riderOnTarget(entry, target.uuid, fact, sourceInflicts, conditionTags).apps.find(a => a.id === d.n5eRiderApply);
    if ( !app ) return ui.notifications.info("This rider doesn't apply to that creature now.");
    btn.disabled = true;
    const created = await applyRiderApp(target, app, caster, entry);
    const { postEffectSummary } = await import("./action-card.mjs");
    return postEffectSummary(message, target, created, app.id);
  }
  return null;
}

/** Apply one rider application to a creature (owner or GM). Returns the effects created. */
async function applyRiderApp(target, app, caster, entry) {
  const now = nowTurn();
  const expires = e => (e?.expires ? { at: e.expires, sourceUuid: caster?.uuid ?? null, placed: now } : null);
  const out = [];
  if ( app.kind === "condition" || app.kind === "state" ) {
    let effect;
    if ( app.kind === "state" ) {
      await target.toggleStatusEffect(app.key, { active: true });
      effect = target.effects.find(e => e.statuses?.has(app.key));
    } else effect = await target.addCondition(app.key, app.ranks);
    const inflict = list(entry.effects).find(e => e.type === "inflict" || e.type === "save");
    if ( effect && inflict?.expires ) await effect.setFlag("n5e", "expires", expires(inflict));
    if ( effect ) out.push(effect);
    return out;
  }
  if ( app.kind === "effect" ) {
    const e = app.effect;
    // Limited marks (Static: two, three at 10th, four at 18th): the oldest ends when a new one goes past it.
    if ( e.limit?.state ) {
      const count = Number(resolveFormula(String(e.limit.count ?? "1"), caster)) || 1;
      const marks = allActors().flatMap(a => list(a.effects).filter(x => x.flags?.n5e?.state === e.limit.state && x.flags?.n5e?.riderFrom === caster?.uuid))
        .sort((a, b) => (a._stats?.createdTime ?? 0) - (b._stats?.createdTime ?? 0));
      if ( marks.length >= count ) {
        const oldest = marks[0];
        if ( canModify(globalThis.game.user, oldest.parent) ) await oldest.delete();
        else ui.notifications.warn(`${e.name}: remove the oldest mark (on ${oldest.parent?.name}); only its owner or the GM can.`);
      }
    }
    const seconds = Number(e.seconds) || 60;
    const data = { name: e.name || entry.label, img: globalThis.fromUuidSync?.(entry.itemUuid)?.img ?? "icons/svg/aura.svg", origin: entry.itemUuid ?? null,
      changes: list(e.changes).map(c => ({ key: c.key, mode: c.mode ?? 2, value: String(c.value) })),
      duration: { seconds, rounds: Math.ceil(seconds / 6), startTime: globalThis.game.time.worldTime, startRound: globalThis.game.combat?.round ?? null, startTurn: globalThis.game.combat?.turn ?? null },
      flags: { n5e: { state: e.state || null, riderFrom: caster?.uuid ?? null, expires: expires(e) } } };
    const [created] = await target.createEmbeddedDocuments("ActiveEffect", [data]);
    if ( created ) out.push(created);
  }
  return out;
}

const allActors = () => {
  const game = globalThis.game;
  const unlinked = (game.scenes?.contents ?? []).flatMap(s => s.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor));
  return [...(game.actors?.contents ?? []), ...unlinked];
};

export { validateRider };
