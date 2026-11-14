/**
 * Jutsu Clash workflow (CLASH1). Rules in rules/clash.mjs.
 *
 * Nothing is detected automatically (dnd5e / PF2e parity): the defender's owner clicks Clash on the
 * triggering cast card and picks one of its own Clash jutsu. The Clash card lists both sides; each
 * owner rolls its own checks (one per contest) with source = the Clash card. The card reads those
 * rolls when it renders and shows the result with an Apply button for the loser (1 Concussed and
 * Dazed). Draw: both jutsu are dispelled, no effects.
 */
import { clashSkill, rankMastery, releaseOf, elementalAdvantage, contestCount, clashResult } from "../rules/clash.mjs";
import { castDisciplineOf } from "../rules/cast-discipline.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;
const hasClash = item => [...(item?.system?.keywords ?? [])].some(k => String(k).split(":")[0] === "clash");

/** The Clash button for a cast card of a Clash-keyword jutsu (workflow/cast.mjs). */
export const clashButton = item => (hasClash(item) ? '<div class="act-row"><button type="button" data-n5e-clash="1">Clash</button></div>' : "");

/** The creature the clicking user clashes with: a selected token they own, else their character. */
function defenderFor(user, excludeUuid) {
  const controlled = (globalThis.canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(a => a && canModify(user, a));
  const pick = controlled.find(a => a.uuid !== excludeUuid) ?? (user.character?.uuid !== excludeUuid ? user.character : null);
  return pick ?? null;
}

/** Start a clash from the triggering cast card. */
export async function startClash(message) {
  const cast = message.getFlag("n5e", "cast");
  const [trigger, triggerItem] = await Promise.all([fromUuid(cast?.actorUuid), fromUuid(cast?.itemUuid)]);
  if ( !trigger || !triggerItem ) return ui.notifications.warn("The triggering jutsu can't be found.");
  const defender = defenderFor(game.user, trigger.uuid);
  if ( !defender ) return ui.notifications.info("Select a creature you own to clash with this jutsu.");
  const concentrating = new Set(defender.system.combat?.concentrating ?? []);
  const options = defender.items.filter(i => i.type === "jutsu" && hasClash(i))
    .sort((x, y) => Number(concentrating.has(y.id)) - Number(concentrating.has(x.id)));
  if ( !options.length ) return ui.notifications.warn(`${defender.name} has no Clash jutsu.`);
  let chosen = options[0];
  if ( options.length > 1 ) {
    const id = await foundry.applications.api.DialogV2.wait({ window: { title: "Clash with which jutsu?" },
      content: `<p>${esc(defender.name)} clashes with ${esc(triggerItem.name)}.</p>`, rejectClose: false,
      buttons: options.map((j, i) => ({ action: j.id, label: `${j.name} (${j.system.rank})${concentrating.has(j.id) ? " · concentrating" : ""}`, default: i === 0 })) });
    chosen = options.find(j => j.id === id);
    if ( !chosen ) return null;
  }
  const skill = clashSkill(cast.discipline ?? triggerItem.system.discipline, CONFIG.N5E.skills);
  const rankA = cast.rank ?? triggerItem.system.rank;
  const rankB = chosen.system.rank;
  const element = elementalAdvantage(releaseOf(triggerItem.system.keywords), releaseOf(chosen.system.keywords));
  const side = (actor, item, rank, otherRank, adv) => {
    const m = rankMastery(rank, otherRank, actor.system.skills?.[skill]?.mastery ?? 0);
    return { actorUuid: actor.uuid, name: actor.name, item: item.name, rank, bonus: m.bonus, masteryRanks: m.ranks, advantage: adv };
  };
  const data = {
    skill, contests: contestCount(rankA, rankB),
    a: side(trigger, triggerItem, rankA, rankB, element === "mine"),
    b: side(defender, chosen, rankB, rankA, element === "theirs"),
    triggerDiscipline: cast.discipline ?? castDisciplineOf(trigger, triggerItem)
  };
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor: defender }),
    content: `<div class="n5e-roll-card clash"><header><b>Jutsu Clash</b></header><div data-n5e-clash-body></div></div>`,
    flags: { n5e: { clash: data } } });
}

/** Totals rolled for each side of this Clash card, in order. */
function sideTotals(card, data) {
  const rolls = (game.messages?.contents ?? []).map(m => m.flags?.n5e?.roll).filter(r => r?.source === card.id);
  return {
    a: rolls.filter(r => r.actorUuid === data.a.actorUuid).map(r => r.total).slice(0, data.contests),
    b: rolls.filter(r => r.actorUuid === data.b.actorUuid).map(r => r.total).slice(0, data.contests)
  };
}

/** Draw the Clash card body (synchronous: listeners are bound right after). */
export function renderClash(card, html) {
  const data = card.flags?.n5e?.clash;
  const body = html.querySelector("[data-n5e-clash-body]");
  if ( !data || !body ) return;
  const totals = sideTotals(card, data);
  const result = clashResult(totals.a, totals.b, data.contests);
  const skillLabel = CONFIG.N5E.skills?.[data.skill]?.label ?? data.skill;
  const row = (key, s) => {
    const mine = fromUuidSync(s.actorUuid);
    const done = totals[key].length >= data.contests;
    const extras = [s.masteryRanks ? `+${s.masteryRanks} Mastery (+${s.bonus}) for rank` : "", s.advantage ? "advantage (element)" : ""].filter(Boolean).join(", ");
    return `<div class="n5e-target-row"><span><b>${esc(s.name)}</b>: ${esc(s.item)} (${esc(s.rank)})</span>
      <span class="sub">${totals[key].length ? totals[key].join(" / ") : "not rolled"}${extras ? ` · ${esc(extras)}` : ""}</span>
      ${!done && mine && canModify(game.user, mine) ? `<button type="button" data-n5e-clash-roll="${key}">Roll ${esc(skillLabel)}${data.contests > 1 ? ` ×${data.contests - totals[key].length}` : ""}</button>` : ""}</div>`;
  };
  let outcome = "";
  if ( result.winner === "draw" ) outcome = '<div class="note"><b>Draw.</b> Both jutsu are dispelled; no one suffers any effects.</div>';
  else if ( result.winner ) {
    const win = data[result.winner], lose = data[result.winner === "a" ? "b" : "a"];
    outcome = `<div class="note"><b>${esc(win.name)} wins</b>${data.contests > 1 ? ` (${result.wins[result.winner]} of ${data.contests})` : ""}: ${esc(win.item)} applies its effects. ${esc(lose.item)} is dispelled; ${esc(lose.name)} gains 1 Concussed and is Dazed (and automatically fails the winner's save if it calls for one).</div>
      <div class="n5e-apply"><button type="button" data-n5e-clash-lose="${esc(lose.actorUuid)}">Apply Concussed 1 + Dazed to ${esc(lose.name)}</button></div>`;
  }
  body.innerHTML = `<div class="note">${esc(skillLabel)} check${data.contests > 1 ? "s, best of 3" : ""} (the triggering jutsu's discipline). Saves wait until the clash is resolved.</div>
    ${row("a", data.a)}${row("b", data.b)}${outcome}`;
}

/** A side's owner rolls its remaining clash checks. */
export async function rollClash(card, key, event) {
  const data = card.getFlag("n5e", "clash");
  const s = data?.[key];
  const actor = s ? await fromUuid(s.actorUuid) : null;
  if ( !actor || !canModify(game.user, actor) ) return ui.notifications.warn("Only that creature's owner rolls its clash checks.");
  const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("./../dice/d20.mjs")]);
  const left = data.contests - sideTotals(card, data)[key].length;
  for ( let i = 0; i < left; i++ ) {
    const base = rollSpec(actor, "skill", data.skill);
    const spec = { ...base, label: `Clash: ${s.item}${data.contests > 1 ? ` (${i + 1 + data.contests - left}/${data.contests})` : ""}`,
      bonus: base.bonus + (s.bonus || 0), note: [base.note, s.masteryRanks ? `+${s.masteryRanks} Mastery for rank` : ""].filter(Boolean).join(" · ") };
    await rollWithSpec(actor, spec, { event, mode: s.advantage ? "advantage" : undefined, source: card.id });
  }
  return left;
}

/** The loser's Apply button: 1 Concussed and Dazed (its owner or the GM). */
export async function applyClashLoss(uuid) {
  const actor = await fromUuid(uuid);
  if ( !actor || !canModify(game.user, actor) ) return ui.notifications.warn("Only that creature's owner or the GM can apply this.");
  await actor.addCondition("concussed", 1);
  await actor.addCondition("dazed", 1);
  return true;
}

/** Re-render Clash cards when one of their rolls is posted. */
export function registerClashHooks() {
  Hooks.on("createChatMessage", message => {
    const source = message.flags?.n5e?.roll?.source;
    if ( !source ) return;
    const card = game.messages.get(source);
    if ( card?.flags?.n5e?.clash ) ui.chat?.updateMessage?.(card);
  });
}
