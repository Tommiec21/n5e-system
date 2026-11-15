/**
 * Jutsu Clash workflow (CLASH1). Rules in rules/clash.mjs.
 *
 * Nothing is detected automatically (dnd5e / PF2e parity): the defender's owner clicks Clash on the
 * triggering cast card and picks one of its own Clash jutsu. The Clash card lists both sides; each
 * owner rolls its own checks (one per contest) with source = the Clash card. The card reads those
 * rolls when it renders and shows the result with an Apply button for the loser (1 Concussed and
 * Dazed). Draw: both jutsu are dispelled, no effects.
 * FIN3b (King 2026-11-14): a concentrated jutsu clashes at the rank it was cast at; the GM can decide
 * a clash with "wins automatically" (Q-F8); a dispelled jutsu ends at once, with every effect it put
 * out (Q-F10): the loser's Apply dispels its jutsu, and a Draw has "Dispel both".
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

/** FIN3b: the rank a jutsu clashes at: its cast rank while its caster concentrates on it, else its own. */
export function clashRank(actor, item) {
  const concentrating = (actor?.system?.combat?.concentrating ?? []).includes(item?.id);
  return (concentrating && actor?.flags?.n5e?.concentrationRank?.[item.id]) || item?.system?.rank;
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
      buttons: options.map((j, i) => {
        const at = clashRank(defender, j);
        return { action: j.id, label: `${j.name} (${j.system.rank}${at !== j.system.rank ? `, cast at ${at}` : ""})${concentrating.has(j.id) ? " · concentrating" : ""}`, default: i === 0 };
      }) });
    chosen = options.find(j => j.id === id);
    if ( !chosen ) return null;
  }
  const skill = clashSkill(cast.discipline ?? triggerItem.system.discipline, CONFIG.N5E.skills);
  const rankA = cast.rank ?? triggerItem.system.rank;
  const rankB = clashRank(defender, chosen);
  const element = elementalAdvantage(releaseOf(triggerItem.system.keywords), releaseOf(chosen.system.keywords));
  const side = (actor, item, rank, otherRank, adv) => {
    const m = rankMastery(rank, otherRank, actor.system.skills?.[skill]?.mastery ?? 0);
    return { actorUuid: actor.uuid, name: actor.name, item: item.name, itemId: item.id, rank, bonus: m.bonus, masteryRanks: m.ranks, advantage: adv };
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
  // FIN3b (Q-F8): the GM may decide the clash for a side ("wins automatically").
  const result = clashResult(totals.a, totals.b, data.contests, { autoA: data.auto === "a", autoB: data.auto === "b" });
  const dispelled = new Set(data.dispelled ?? []);
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
  const ownsSide = s => { const a = fromUuidSync(s.actorUuid); return game.user.isGM || (a && canModify(game.user, a)); };
  if ( result.winner === "draw" ) {
    const open = ["a", "b"].filter(k => !dispelled.has(k) && ownsSide(data[k]));
    outcome = `<div class="note"><b>Draw.</b> Both jutsu are dispelled; no one suffers any effects.${dispelled.size ? ` Dispelled: ${["a", "b"].filter(k => dispelled.has(k)).map(k => esc(data[k].item)).join(", ")}.` : ""}</div>
      ${open.length ? `<div class="n5e-apply"><button type="button" data-n5e-clash-dispel="${open.join(",")}">${open.length > 1 ? "Dispel both" : `Dispel ${esc(data[open[0]].item)}`}</button></div>` : ""}`;
  } else if ( result.winner ) {
    const loseKey = result.winner === "a" ? "b" : "a";
    const win = data[result.winner], lose = data[loseKey];
    const decided = data.auto ? " (decided by the GM)" : data.contests > 1 ? ` (${result.wins[result.winner]} of ${data.contests})` : "";
    outcome = `<div class="note"><b>${esc(win.name)} wins</b>${decided}: ${esc(win.item)} applies its effects. ${esc(lose.item)} is dispelled; ${esc(lose.name)} gains 1 Concussed and is Dazed (and automatically fails the winner's save if it calls for one).</div>
      ${dispelled.has(loseKey) ? `<div class="note">${esc(lose.item)} dispelled.</div>` : `<div class="n5e-apply"><button type="button" data-n5e-clash-lose="${esc(lose.actorUuid)}" data-side="${loseKey}">Dispel ${esc(lose.item)}; apply Concussed 1 + Dazed to ${esc(lose.name)}</button></div>`}`;
  }
  // FIN3b (Q-F8): GM only, before a result.
  const gmBar = game.user.isGM && !result.winner ? `<div class="n5e-apply">${["a", "b"].map(k =>
    `<button type="button" data-n5e-clash-auto="${k}">${esc(data[k].name)} wins automatically</button>`).join("")}</div>` : "";
  body.innerHTML = `<div class="note">${esc(skillLabel)} check${data.contests > 1 ? "s, best of 3" : ""} (the triggering jutsu's discipline). Saves wait until the clash is resolved.</div>
    ${row("a", data.a)}${row("b", data.b)}${gmBar}${outcome}`;
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

/** FIN3b (Q-F8): the GM decides the clash for one side. */
export async function decideClash(card, key) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM decides a clash automatically.");
  if ( !["a", "b"].includes(key) ) return null;
  return card.update({ "flags.n5e.clash.auto": key });
}

/**
 * FIN3b (Q-F10): dispel a side's jutsu: it ends at once. Its caster stops concentrating on it, and
 * every effect it put out ends (the GM removes those on creatures the user doesn't own).
 */
export async function dispelSide(card, key) {
  const data = card.getFlag("n5e", "clash");
  const s = data?.[key];
  const actor = s ? await fromUuid(s.actorUuid) : null;
  if ( !actor || !(game.user.isGM || canModify(game.user, actor)) ) return ui.notifications.warn("Only that creature's owner or the GM can dispel its jutsu.");
  const item = actor.items.get(s.itemId) ?? actor.items.find(i => i.type === "jutsu" && i.name === s.item);
  if ( item ) {
    const conc = actor.system.combat?.concentrating ?? [];
    if ( conc.includes(item.id) ) await actor.update({ "system.combat.concentrating": conc.filter(id => id !== item.id), [`flags.n5e.concentrationPaid.-=${item.id}`]: null });
    if ( game.user.isGM ) await endEffectsOf(item);
    else {
      const { submitIntent } = await import("../automation/owner-intents.mjs");
      await submitIntent(actor, "dispelJutsu", { itemId: item.id, messageId: card.id, side: key }).catch(error => ui.notifications.warn(error.message));
    }
  }
  const dispelled = [...new Set([...(data.dispelled ?? []), key])];
  if ( card.isAuthor || game.user.isGM ) await card.update({ "flags.n5e.clash.dispelled": dispelled });
  ui.notifications.info(`${s.item} is dispelled.`);
  return true;
}

/** Active GM: end every effect a jutsu put out, on any creature (its origin is the jutsu). */
export async function endEffectsOf(item) {
  const actors = [...game.actors, ...game.scenes.contents.flatMap(sc => sc.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor))];
  let n = 0;
  for ( const a of actors ) {
    const ids = a.effects.filter(e => e.origin === item.uuid).map(e => e.id);
    if ( ids.length ) { await a.deleteEmbeddedDocuments("ActiveEffect", ids); n += ids.length; }
  }
  return n;
}

/** GM side of a player's dispel: the owner is verified by the intent. */
async function receiveDispel(actor, { itemId, messageId, side }) {
  const item = actor.items.get(itemId);
  const card = game.messages.get(messageId);
  const data = card?.flags?.n5e?.clash;
  if ( !item || data?.[side]?.actorUuid !== actor.uuid ) throw new Error("That jutsu isn't in this clash.");
  await card.update({ "flags.n5e.clash.dispelled": [...new Set([...(data.dispelled ?? []), side])] });
  return endEffectsOf(item);
}

/** The loser's Apply button: its jutsu is dispelled, and it gains 1 Concussed and is Dazed (its owner or the GM). */
export async function applyClashLoss(uuid, card = null, key = null) {
  const actor = await fromUuid(uuid);
  if ( !actor || !canModify(game.user, actor) ) return ui.notifications.warn("Only that creature's owner or the GM can apply this.");
  if ( card && key ) await dispelSide(card, key);
  await actor.addCondition("concussed", 1);
  await actor.addCondition("dazed", 1);
  return true;
}

/** Re-render Clash cards when one of their rolls is posted. */
export async function registerClashHooks() {
  const { registerIntentHandler } = await import("../automation/owner-intents.mjs");
  registerIntentHandler("dispelJutsu", receiveDispel);
  Hooks.on("createChatMessage", message => {
    const source = message.flags?.n5e?.roll?.source;
    if ( !source ) return;
    const card = game.messages.get(source);
    if ( card?.flags?.n5e?.clash ) ui.chat?.updateMessage?.(card);
  });
}
