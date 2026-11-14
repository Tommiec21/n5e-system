/**
 * Reading and countering jutsu (Foundry side; FIN2b). Rules: rules/jutsu-defense.mjs.
 *
 *   Read the Enemy / Identify   Buttons on another creature's cast card. The user's creature (its
 *       controlled token, else its assigned character) rolls the cast discipline's skill action.
 *       The outcome is whispered to that creature's owners and the GM. A successful Read offers
 *       its two benefits as buttons, for one creature.
 *   Suppress Chakra   After the roll: a "Chakra Suppressed" effect holding the score for 10 minutes.
 *       endSuppression() is called where chakra is spent (casting, upkeep, chakra-like pools).
 *   Counter Tag   A row button on a single-target cast card; using it burns the tag out and marks
 *       the creature as unaffected on the card.
 */
import { defenseAction, identifyDC, readEnemyChoices, suppressionScore, tagsOn, counterTagAbsorbs } from "../rules/jutsu-defense.mjs";
import { defaultCastDiscipline } from "../rules/cast-discipline.mjs";
import { checkOutcome } from "../rules/skill-resolution.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;
const ownersOf = actor => game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
const discLabel = d => CONFIG.N5E.disciplines?.[d]?.label ?? d;

/** The creature this user acts with: a controlled token they own, else their assigned character. */
export function actingActor(exceptUuid = null) {
  const controlled = (globalThis.canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(a => a && canModify(game.user, a));
  return [...controlled, game.user.character].find(a => a && a.uuid !== exceptUuid) ?? null;
}

/** What a cast card is about: caster, jutsu, the discipline and rank it was cast as, both DCs. */
export function castFacts(message) {
  const card = message?.flags?.n5e?.card;
  if ( card?.kind !== "jutsu" ) return null;
  const caster = globalThis.fromUuidSync?.(card.actorUuid);
  const item = globalThis.fromUuidSync?.(card.itemUuid);
  if ( !caster || !item ) return null;
  const discipline = card.discipline || defaultCastDiscipline(item);
  const casterDC = caster.system?.disciplines?.[discipline]?.dc ?? null;
  const live = item.system?.liveAs?.(discipline) ?? item.system?.live ?? {};
  return { card, caster, item, discipline, rank: card.rank ?? item.system?.rank ?? "", casterDC, jutsuDC: live.dc ?? casterDC };
}

/** Read the Enemy or Identify from a cast card. */
export async function onDefenseClick(message, kind, event) {
  const facts = castFacts(message);
  if ( !facts ) return null;
  const actor = actingActor(facts.caster.uuid);
  if ( !actor ) return ui.notifications.warn("Select a token you own (not the caster) first.");
  const key = defenseAction(kind, facts.discipline);
  const dc = kind === "identify" ? identifyDC(facts.jutsuDC) : facts.casterDC;
  if ( !key || !Number.isFinite(Number(dc)) ) return ui.notifications.warn("This jutsu has no save DC to roll against.");
  if ( kind === "read" && actor.flags?.n5e?.economy?.reaction ) return ui.notifications.warn(`${actor.name} has already used its Reaction.`);
  const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
  const spec = rollSpec(actor, "skillAction", key);
  if ( !spec ) return null;
  let total = null;
  const rolled = await rollWithSpec(actor, spec, { event, onResult: r => { total = r.total; } });
  if ( !rolled || total == null ) return null;
  if ( kind === "read" && game.combat?.started ) await actor.update({ "flags.n5e.economy.reaction": true });
  const { result } = checkOutcome(total, dc);
  const won = result === "success";
  const targets = (facts.card.targets ?? []).map(t => t.name).join(", ") || "no targets named";
  const name = `<b>${esc(facts.item.name)}</b> (${esc(facts.rank)}-Rank ${esc(discLabel(facts.discipline))})`;
  let body = `<div class="note">${esc(actor.name)} learns nothing.</div>`;
  if ( won && kind === "read" ) {
    body = `<div class="note">${name}, cast by ${esc(facts.caster.name)} at: ${esc(targets)}.</div>
      <div class="note">One creature (you or an ally in range) takes one benefit. Select its token first; with none selected it is ${esc(actor.name)}.</div>
      <div class="n5e-apply">${readEnemyChoices(facts.discipline).map(c => `<button type="button" data-n5e-read-choice="${esc(c.key)}">${esc(c.label)}</button>`).join("")}</div>`;
  } else if ( won ) {
    body = `<div class="note">${name}.</div><div class="n5e-identified">${facts.item.system?.description ?? ""}</div>`;
  }
  const label = kind === "identify" ? "Identify" : "Read the Enemy";
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), whisper: ownersOf(actor),
    content: `<div class="n5e-roll-card"><header><b>${label}: ${won ? "Success" : "Failure"}</b></header>
      <div class="note">${total} vs DC ${dc}</div>${body}</div>`,
    flags: { n5e: { actorUuid: actor.uuid, readEnemy: won && kind === "read"
      ? { cardId: message.id, discipline: facts.discipline, jutsu: facts.item.name, readerUuid: actor.uuid, used: false } : null } } });
}

/** A Read the Enemy benefit, for the selected creature (default: the reader). One creature, once. */
export async function onReadChoiceClick(message, button) {
  const data = message.flags?.n5e?.readEnemy;
  if ( !data ) return null;
  if ( data.used ) return ui.notifications.warn("This Read the Enemy benefit has been used.");
  const reader = await fromUuid(data.readerUuid);
  const actor = actingActor() ?? reader;
  if ( !actor || !canModify(game.user, actor) ) return ui.notifications.warn("Select a token you own to take the benefit.");
  const choice = readEnemyChoices(data.discipline).find(c => c.key === button.dataset.n5eReadChoice);
  if ( !choice ) return null;
  if ( choice.changes ) {
    await actor.createEmbeddedDocuments("ActiveEffect", [{ name: `Read the Enemy: ${data.jutsu}`, img: "icons/svg/eye.svg", changes: choice.changes.map(c => ({ ...c })),
      duration: { rounds: 1, seconds: 6, startTime: game.time.worldTime, startRound: game.combat?.round ?? null, startTurn: game.combat?.turn ?? null },
      description: `<p>+1 to saves and AC against ${esc(data.jutsu)}. Remove it once that jutsu is resolved.</p>`,
      flags: { n5e: { state: "readEnemy", readEnemy: { cardId: data.cardId } } } }]);
  }
  if ( choice.status && !actor.statuses?.has(choice.status) ) await actor.toggleStatusEffect(choice.status, { active: true });
  for ( const b of button.parentElement?.querySelectorAll("[data-n5e-read-choice]") ?? [] ) b.disabled = true;
  if ( message.isAuthor || game.user.isGM ) await message.setFlag("n5e", "readEnemy", { ...data, used: true });
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-roll-card"><b>Read the Enemy</b>: ${esc(actor.name)} ${esc(choice.note)} (${esc(data.jutsu)}).</div>` });
}

/** Suppress Chakra: the roll's total becomes the Suppression Score for 10 minutes. */
export async function applySuppression(actor, total) {
  const old = Array.from(actor.effects ?? []).filter(e => e.flags?.n5e?.state === "chakraSuppressed");
  // A reattempt in a row: the last suppression is still on the creature (running or run out).
  const reattempts = old.length ? (Number(old[0].flags.n5e.suppression?.reattempts) || 0) + 1 : 0;
  const score = suppressionScore(total, reattempts);
  if ( old.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", old.map(e => e.id));
  await actor.createEmbeddedDocuments("ActiveEffect", [{ name: `Chakra Suppressed (score ${score})`, img: "icons/svg/invisible.svg",
    duration: { seconds: 600, rounds: 100, startTime: game.time.worldTime, startRound: game.combat?.round ?? null, startTurn: game.combat?.turn ?? null },
    description: `<p>Suppression Score ${score}. Hidden from Chakra Sight whose passive Perception is below it. Ends when chakra is spent.</p>`,
    flags: { n5e: { state: "chakraSuppressed", suppression: { score, reattempts } } } }]);
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), whisper: ownersOf(actor),
    content: `<div class="n5e-roll-card"><b>Suppress Chakra</b>: Suppression Score <b>${score}</b>${reattempts ? ` (${total} − ${2 * reattempts} for ${reattempts} reattempt${reattempts > 1 ? "s" : ""} in a row)` : ""}, 10 minutes. It ends when ${esc(actor.name)} spends chakra.</div>` });
}

/** Spending Chakra Points or a chakra-like resource ends Suppress Chakra. */
export async function endSuppression(actor) {
  const ids = Array.from(actor?.effects ?? []).filter(e => e.flags?.n5e?.state === "chakraSuppressed").map(e => e.id);
  if ( !ids.length || !canModify(game.user, actor) ) return 0;
  await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), whisper: ownersOf(actor),
    content: `<div class="n5e-roll-card">${esc(actor.name)} spent chakra: <b>Suppress Chakra</b> ends.</div>` });
  return ids.length;
}

/** Creatures a card's jutsu was absorbed for (uuid set), from the Counter Tag notes linked to it. */
export const counteredOn = message => new Set((game.messages?.contents ?? []).slice(-200)
  .filter(m => m.flags?.n5e?.counterTag?.cardId === message.id).map(m => m.flags.n5e.counterTag.targetUuid));

/** The Counter Tag on this creature that absorbs the card's jutsu, or null. */
export function counterTagFor(message, actor, targetCount) {
  const facts = castFacts(message);
  if ( !facts || !actor ) return null;
  const area = facts.card.sections?.includes("area") || !!facts.card.areaPlaced;
  return tagsOn(actor, "counterTag").find(t => counterTagAbsorbs({ tagRank: t.rank, castRank: facts.rank, targetCount, area })) ?? null;
}

/** Use the Counter Tag: it burns out and the jutsu has no effect on the creature. */
export async function onCounterTagClick(message, button) {
  const actor = await fromUuid(button.dataset.target);
  if ( !actor || !canModify(game.user, actor) ) return ui.notifications.warn("Only that creature's owner (the GM for NPCs) uses its Counter Tag.");
  const tag = counterTagFor(message, actor, Number(button.dataset.count) || 1);
  if ( !tag ) return ui.notifications.warn("No Counter Tag on this creature absorbs this jutsu.");
  button.disabled = true;
  await tag.effect.delete();
  const facts = castFacts(message);
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-roll-card"><b>Counter Tag (${esc(tag.rank)}-Rank)</b> absorbs ${esc(facts.item.name)}: it has no effect on ${esc(actor.name)}. The tag burns out.</div>`,
    flags: { n5e: { counterTag: { cardId: message.id, targetUuid: actor.uuid } } } });
}
