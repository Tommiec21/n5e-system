import { createN5eRoll } from "../dice/n5e-roll.mjs";
/**
 * Casting a jutsu (Foundry side): the cast dialog, spending, and the cast card.
 *
 * The dialog previews the plan as you change it (rank, multiplier choice, Moldings/Maneuvers, which
 * concentration to end) and only enables Cast when the plan is allowed. Casting applies the plan
 * (CP, Focus, Superiority Dice, concentration, Chain/Combo) in one actor update, then posts a card
 * whose buttons roll the attack, damage, healing, and targets' saves.
 *
 * Folder conventions (pure rules vs Foundry side, who runs what, ownership): workflow/turn.mjs header.
 */
import { trackerButtons } from "./trackers.mjs";
import { castPlan } from "./cast-plan.mjs";
import { effectiveActivities } from "../rules/activity-parse.mjs";
import { activityButtons, damageButtons } from "./activity-buttons.mjs";
import { esc } from "../view-models/common.mjs";
import { areaButton, placeArea } from "./areas.mjs";
import { areaOf } from "../rules/area.mjs";
import { withActorLock } from "./commands.mjs";
import { rule } from "../rules-settings.mjs";
import { castableDisciplines, castDisciplineOf } from "../rules/cast-discipline.mjs";
import { cardFlag } from "./action-card.mjs";

const RANKS = ["E", "D", "C", "B", "A", "S"];
// {round, turn} while a combat runs (once-per-turn options and Pyroclasm compare against it), else null.
const nowTurn = () => (game.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null);

/**
 * Moldings and Maneuvers the actor could add to this cast (by tag). Feature cast options (Chakra
 * Compression, Crash, Warfare, Pyroclasm...) are separate: rules/cast-options.mjs, listed in the plan.
 */
function castOptions(actor, item) {
  return actor.items.filter(i => {
    // A maneuver authored as a CARD1d cast rider is offered with the feature options instead (once).
    const n = i.flags?.n5e ?? {};
    if ( [n.castOption, ...(n.castOptions ?? [])].some(o => o?.rider) ) return false;
    const tags = i.system.tags instanceof Set ? i.system.tags : new Set(i.system.tags ?? []);
    if ( tags.has("nin-molding") ) return castableDisciplines(item).includes("nin");
    return tags.has("assault-maneuver") || tags.has("scout-maneuver");
  });
}

/** The cast dialog's form. Every control's name is read back by readSelection(). */
function dialogContent(actor, item, plan) {
  const j = item.system;
  const ranks = [j.rank, ...(j.live?.upcastRanks ?? [])].filter((r, i, a) => a.indexOf(r) === i);
  const opts = castOptions(actor, item);
  const conc = (actor.system.combat?.concentrating ?? []).map(id => actor.items.get(id)).filter(Boolean);
  const choice = (label, name, values) => `<label>${label} <select name="${name}">${values.map((v, i) =>
    `<option value="${i}">${typeof v === "number" ? (v < 1 ? `×${v}` : `×${v}`) : esc(v)}</option>`).join("")}</select></label>`;
  // Cast as (MDISC1): shown for multi-discipline jutsu; locked while concentrating on it.
  const discs = castableDisciplines(item);
  const current = castDisciplineOf(actor, item);
  const locked = (actor.system.combat?.concentrating ?? []).includes(item.id) && !!actor.flags?.n5e?.castDiscipline?.[item.id];
  const label = d => CONFIG.N5E.disciplines?.[d]?.label ?? d;
  return `<div class="n5e-cast">
    ${discs.length > 1 ? `<label>Cast as <select name="discipline" ${locked ? "disabled" : ""}>${discs.map(d => `<option value="${d}" ${d === current ? "selected" : ""}>${esc(label(d))}</option>`).join("")}</select>${locked ? ' <span class="sub">(locked while concentrating)</span>' : ""}</label>` : ""}
    ${ranks.length > 1 ? `<label>Cast at <select name="rank">${ranks.map(r => `<option value="${r}">${r}-Rank${r === j.rank ? " (base)" : ""}</option>`).join("")}</select></label>` : ""}
    ${plan.choices?.multipliers ? choice("Cost multiplier (pick one)", "multiplierChoice", plan.choices.multipliers) : ""}
    ${plan.choices?.divisors ? choice("Cost divisor (pick one)", "divisorChoice", plan.choices.divisors.map(d => `/${d}`)) : ""}
    ${opts.length ? `<fieldset><legend>Moldings and Maneuvers</legend>${opts.map(o => `<label class="opt">
      <input type="checkbox" name="opt" value="${o.id}"> ${esc(o.name)}</label>`).join("")}</fieldset>` : ""}
    ${plan.featureOptions?.length ? `<fieldset><legend>Features</legend>${plan.featureOptions.map(o => o.choose
      ? `<label class="opt">${esc(o.label)} <input type="number" name="famt-${o.id}" value="0" min="0" max="${o.max}" style="width:50px"> <span class="sub">of ${o.max}</span></label>`
      : `<label class="opt${o.used ? " used" : ""}"><input type="checkbox" name="fopt" value="${o.id}" ${o.auto && !o.used ? "checked" : ""} ${o.used ? "disabled" : ""}> ${esc(o.label)}${o.used ? " (used this turn)" : ""}</label>`).join("")}</fieldset>` : ""}
    ${plan.concentration?.atLimit ? `<label>End concentration on <select name="endConcentration">${conc.map(c =>
      `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>` : ""}
    ${j.activation?.type === "action" ? `<fieldset><legend>Ready</legend><label class="opt"><input type="checkbox" name="ready"> Ready it: pay now, hold it with concentration, release it with your Reaction</label>
      <label>Trigger <input type="text" name="readyTrigger" placeholder="When…" maxlength="200"></label></fieldset>` : ""}
    <div class="preview" data-preview></div>
  </div>`;
}

/** The dialog's current choices, in the shape castPlan() takes. Re-read on every change for the preview. */
function readSelection(form) {
  const f = form.elements;
  const val = n => f[n]?.value;
  return {
    rank: val("rank") || undefined,
    discipline: val("discipline") || undefined,
    multiplierChoice: val("multiplierChoice") != null ? Number(val("multiplierChoice")) : undefined,
    divisorChoice: val("divisorChoice") != null ? Number(val("divisorChoice")) : undefined,
    options: [...form.querySelectorAll('input[name="opt"]:checked')].map(i => i.value),
    endConcentration: val("endConcentration") || undefined,
    ready: f.ready?.checked ? { trigger: val("readyTrigger") || "" } : undefined,
    featureOptions: [...[...form.querySelectorAll('input[name="fopt"]:checked')].map(i => ({ id: i.value })),
      ...[...form.querySelectorAll('input[name^="famt-"]')].map(i => ({ id: i.name.slice(5), amount: Number(i.value) || 0 })).filter(o => o.amount > 0)],
    now: nowTurn()
  };
}

/** The live preview under the form: cost, pools, upkeep, warnings, and what blocks the cast. */
function previewHTML(plan) {
  const costLine = plan.costMode === "chakra" ? `<b>${plan.cost} CP</b> (${plan.cpAfter} left)`
    : plan.costMode === "none" ? "<b>No cost</b>" : `<b>Special:</b> ${esc(plan.costText || "see text")}`;
  const pools = Object.entries(plan.pools).map(([k, v]) => `${v} ${{ focus: "Focus", superiorityDice: "Superiority Dice", pyroclasm: "Pyroclasm" }[k] ?? k}`).join(", ");
  return `<p>Cost: ${costLine}${pools ? ` · plus ${pools}` : ""}${plan.upcast > 0 ? ` · upcast +${plan.upcast}` : ""}</p>
    ${plan.concentration ? `<p>Concentration: upkeep ${plan.costMode === "chakra" ? Math.floor(plan.cost / 2) : 0} CP per turn${plan.concentration.ending ? " (ends one current jutsu)" : ""}</p>` : ""}
    ${plan.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join("")}
    ${plan.problems.map(p => `<p class="problem">${esc(p)}</p>`).join("")}`;
}

/**
 * Open the cast dialog and cast. Resolves the chat message, or null when cancelled.
 * @param {Actor} actor
 * @param {Item} item       a jutsu owned by the actor
 * @param {object} [o]
 * @param {boolean} [o.skipDialog]  cast at base rank with defaults (Alt+click)
 */
export async function castJutsu(actor, item, { skipDialog = false } = {}) {
  let sel = { now: nowTurn() };
  const initial = castPlan(actor, item, sel);
  const needsDialog = !skipDialog || !initial.ok;
  if ( needsDialog ) {
    const { DialogV2 } = foundry.applications.api;
    sel = await DialogV2.wait({
      window: { title: `Cast ${item.name}`, icon: "fa-solid fa-hand-sparkles" },
      classes: ["n5e-cast-dialog"],
      content: dialogContent(actor, item, initial),
      buttons: [{ action: "cast", label: "Cast", default: true, callback: (event, button) => readSelection(button.form) },
        { action: "cancel", label: "Cancel", callback: () => null }],
      render: (event, dialog) => {
        const form = dialog.element.querySelector("form");
        const update = () => {
          const plan = castPlan(actor, item, readSelection(form));
          form.querySelector("[data-preview]").innerHTML = previewHTML(plan);
          const btn = dialog.element.querySelector('button[data-action="cast"]');
          if ( btn ) btn.disabled = !plan.ok;
        };
        form.addEventListener("change", update);
        update();
      },
      rejectClose: false
    });
    if ( !sel ) return null;
  }
  return executeCast(actor, item, sel);
}

export function executeCast(actor, item, sel = {}, { areaPrompt = true } = {}) {
  sel = { ...sel, now: nowTurn() };
  // Spend and post inside the actor's queue, so a second click re-reads the pools first.
  return withActorLock(actor, async () => {
    if ( !actor.isOwner ) {
      ui.notifications.warn("Only the owner can cast this jutsu.");
      return null;
    }
    const plan = castPlan(actor, item, sel);
    if ( !plan.ok ) {
      ui.notifications.warn(plan.problems[0]);
      return null;
    }
    // FIN2b: spending Chakra Points or a chakra-like pool ends Suppress Chakra.
    const spent = spendsChakra(actor, plan.update);
    await actor.update(plan.update);
    if ( spent ) await (await import("./jutsu-defense.mjs")).endSuppression(actor);
    // Ready (KB 03): the chakra is spent and held; the cast card comes when it is released.
    if ( plan.ready ) return (await import("./concentration.mjs")).postReadyCard(actor, item, plan);
    const message = await postCastCard(actor, item, plan);
    // Jutsu with an area: start placing it on the map (the card keeps a Place area button too).
    if ( areaPrompt && rule("areaPrompt") && canvas?.ready && areaOf(item.system, { rank: plan.rank }) ) placeArea(actor, item, { rank: plan.rank });
    return message;
  });
}

/** The cast card: what was spent, the rules text, and activity buttons. */
export async function postCastCard(actor, item, plan) {
  const j = item.system;
  const activities = effectiveActivities(item, { rank: plan.rank });
  const spent = [plan.costMode === "chakra" ? `${plan.cost} CP` : plan.costMode === "none" ? "No cost" : "Special cost",
    ...Object.entries(plan.pools).map(([k, v]) => `${v} ${{ focus: "Focus", superiorityDice: "Superiority Dice", pyroclasm: "Pyroclasm" }[k] ?? k}`)].join(" · ");
  // Moldings that change the card's buttons: Precise (attack advantage), Heightened (first save at
  // disadvantage), Piercing (damage: half DR, no resistance).
  const usedIds = new Set((plan.options ?? []).map(o => actor.items.get(o.id)?.system.identifier).filter(Boolean));
  const moldingFlags = { precise: usedIds.has("precise-ninjutsu"), heightened: usedIds.has("heightened-ninjutsu"),
    piercing: usedIds.has("piercing-ninjutsu") };
  // Feature extras: added damage (Crash, Warfare), effects for targets (Hellrend), rolls (Devastation).
  const extras = [];
  const castAs = plan.discipline || castDisciplineOf(actor, item);
  // Clash keyword (CLASH1): the defender's owner can start a Jutsu Clash from this card.
  extras.push((await import("./clash.mjs")).clashButton(item));
  // Unaware Genjutsu (GEN1, KB 10): its targets don't know they're in it until they identify it.
  if ( castAs === "gen" && j.unaware ) extras.push('<div class="note">Unaware: targets don\'t know they are in this Genjutsu until they succeed on Identify Genjutsu.</div>');
  for ( const d of plan.extraDamage ?? [] ) extras.push(`<div class="act-row">${damageButtons([{ formula: d.formula, type: d.type }], { label: d.label, genjutsu: castAs === "gen", piercing: moldingFlags.piercing })}</div>`);
  // Healing a feature adds (Channeled Healing, Talented Support's temporary HP).
  if ( plan.extraHeals?.length ) extras.push(activityButtons(actor, item, plan.extraHeals.map(h => ({ type: "heal", label: h.label, heal: { formula: h.formula, pool: h.pool } }))));
  if ( plan.extraEffects?.length ) extras.push(activityButtons(actor, item, plan.extraEffects.map(e => ({ type: "effect", label: e.label, effect: e.effect }))));
  for ( const r of plan.extraRolls ?? [] ) {
    const roll = await createN5eRoll(r.formula).evaluate();
    extras.push(`<p class="note"><b>${esc(r.label)}</b>: rolled ${roll.total}. ${esc(r.note)}</p>`);
  }
  for ( const n of plan.notes ?? [] ) extras.push(`<p class="note">${esc(n)}</p>`);
  // CARD1d: riders armed in the dialog go onto the card; a rider that rolls its pool die rolls it once
  // here (its amount is then left out of the generic pool roll below).
  let riderEntries = [], rolledPools = {};
  if ( plan.riders?.length ) {
    const { castRiderEntries } = await import("./riders.mjs");
    const got = await castRiderEntries(actor, { kind: "jutsu", discipline: castAs }, plan.riders);
    riderEntries = got.entries;
    rolledPools = got.rolledPools;
    for ( const n of got.notes ) extras.push(`<p class="note">${esc(n)}</p>`);
  }
  for ( const [k, total] of Object.entries(plan.pools) ) {
    const v = total - (rolledPools[k] ?? 0);
    const die = actor.system.resources?.[k]?.die;
    if ( !die || !v ) continue;
    const roll = await createN5eRoll(`${v}${die}`).evaluate();
    extras.push(`<p class="note"><b>${esc(actor.system.resources[k].label || k)}</b>: rolled ${roll.total} (${v}${die})</p>`);
  }
  if ( plan.pyroclasm ) extras.push(`<p class="note">+1 Pyroclasm (${Math.min(3, actor.system.resources?.pyroclasm?.value ?? 0)} / 3)</p>`);
  const TextEditor = foundry.applications.ux.TextEditor.implementation;
  const desc = await TextEditor.enrichHTML(j.description ?? "", { relativeTo: item, rollData: actor.getRollData() });
  const content = `<div class="n5e-cast-card" data-actor-uuid="${actor.uuid}" data-item-uuid="${item.uuid}">
    <header><img src="${item.img}" alt="" width="36" height="36"><div><b>${esc(item.name)}</b>
      <span class="sub">${esc(`${plan.rank}-Rank ${CONFIG.N5E.disciplines[castableDisciplines(item).length > 1 ? castAs : (j.group ?? j.discipline)]?.label ?? ""}`)}${castableDisciplines(item).length > 1 ? " (cast as)" : ""}${plan.upcast > 0 ? " (upcast)" : ""}</span></div></header>
    <div class="spent">${esc(spent)}${plan.options.length ? ` · ${plan.options.map(o => esc(o.name)).join(", ")}` : ""}</div>
    <details><summary>Rules text</summary><div class="desc">${desc}</div></details>
    ${areaButton(item, { rank: plan.rank })}
    ${activityButtons(actor, item, activities, { rank: plan.rank, flags: moldingFlags, discipline: castAs })}
    ${extras.join("")}
    ${trackerButtons(actor, item)}
  </div>`;
  // Single action card (CARD1): this cast card collects the rolls made from its buttons.
  const card = cardFlag({ kind: "jutsu", actor, item, activities, area: !!areaOf(j, { rank: plan.rank }),
    concentration: !!plan.concentration, rank: plan.rank, discipline: castAs });
  if ( card && riderEntries.length ) {
    const { withRiderSections } = await import("./riders.mjs");
    card.riders = riderEntries.map(e => ({ ...e, targetMode: "each" }));
    card.sections = withRiderSections(card.sections, card.riders, activities.filter(a => a.type === "save").length);
  }
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }), content,
    flags: { n5e: { cast: { itemUuid: item.uuid, actorUuid: actor.uuid, rank: plan.rank, cost: plan.cost, discipline: castAs }, ...(card ? { card } : {}) } } });
}

export { RANKS };

/** Does this actor update spend Chakra Points or a pool that counts as chakra (FIN2b)? */
export function spendsChakra(actor, update = {}) {
  return Object.entries(update).some(([path, value]) => {
    if ( path === "system.cp.value" ) return value < (actor.system?.cp?.value ?? 0);
    const id = path.match(/^system\.resources\.([^.]+)\.value$/)?.[1];
    const pool = id ? actor.system?.resources?.[id] : null;
    return !!pool?.countsAsChakraSpend && value < (pool.value ?? 0);
  });
}
