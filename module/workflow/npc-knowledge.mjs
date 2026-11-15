/**
 * What the players can learn (NPC1c C5; King Q-N21-Q-N24). Read the Enemy works the same everywhere:
 * the reaction on seeing a jutsu cast (workflow/jutsu-defense.mjs). On a success against an NPC that
 * has learnable entries:
 *   1. the GM chooses which entries are available (a button on the result card, GM only);
 *   2. the reader's owner picks one from that pool (one per success);
 *   3. the whole party learns it: the NPC records it and a card shows it to everyone.
 * The pick finishes on the GM's client through an owner intent, since players can't change the NPC.
 */
import { knowledgeEntryView } from "../view-models/npc.mjs";
import { registerIntentHandler, submitIntent } from "../automation/owner-intents.mjs";
import { canModify } from "../automation/authority.mjs";
import { esc } from "../view-models/common.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;

/** Entries of an NPC the party doesn't know yet. */
export function unknownEntries(npc) {
  const k = npc?.system?.knowledge ?? { entries: [], learned: [] };
  const learned = new Set(k.learned ?? []);
  return (k.entries ?? []).filter(e => !learned.has(e.id));
}

/** The part of a Read the Enemy result card about the creature (rendered for each user). */
export function learnSectionHTML(message, user = game.user) {
  const data = message.flags?.n5e?.learn;
  if ( !data ) return "";
  const npc = globalThis.fromUuidSync?.(data.npcUuid);
  if ( !npc ) return "";
  if ( data.picked ) {
    const entry = npc.system.knowledge.entries.find(e => e.id === data.picked);
    return `<div class="n5e-learn"><b>Learned:</b> ${esc(entry ? knowledgeEntryView(npc, entry).label : "an entry")}</div>`;
  }
  if ( !data.available ) {
    return user.isGM ? `<div class="n5e-learn"><button type="button" data-n5e-learn-offer="1">Choose what ${esc(npc.name)} can reveal</button></div>`
      : `<div class="n5e-learn note">The GM is choosing what can be learned about ${esc(npc.name)}.</div>`;
  }
  const reader = globalThis.fromUuidSync?.(data.readerUuid);
  if ( !reader || !canModify(user, reader) ) return `<div class="n5e-learn note">${esc(reader?.name ?? "The reader")} picks what to learn.</div>`;
  const entries = npc.system.knowledge.entries.filter(e => data.available.includes(e.id));
  return `<div class="n5e-learn"><b>Pick one to learn:</b> ${entries.map(e => `<button type="button" data-n5e-learn-pick="${esc(e.id)}">${esc(knowledgeEntryView(npc, e).label)}</button>`).join("")}</div>`;
}

/** GM: tick which entries this success can reveal. */
export async function onLearnOffer(message) {
  if ( !game.user.isGM ) return null;
  const data = message.flags.n5e.learn;
  const npc = await fromUuid(data.npcUuid);
  const entries = unknownEntries(npc);
  if ( !entries.length ) return ui.notifications.info(`The party already knows everything listed for ${npc.name}.`);
  const content = `<div class="n5e-learn-offer">${entries.map(e => `<label class="check"><input type="checkbox" name="${esc(e.id)}" checked> ${esc(knowledgeEntryView(npc, e).label)}</label>`).join("")}</div>`;
  const ids = await foundry.applications.api.DialogV2.wait({ window: { title: `What can be learned about ${npc.name}` }, content, rejectClose: false,
    buttons: [{ action: "offer", label: "Offer these", default: true, callback: (event, button) =>
      entries.filter(e => button.form.elements[e.id]?.checked).map(e => e.id) }] });
  if ( !ids?.length ) return null;
  return message.setFlag("n5e", "learn", { ...data, available: ids });
}

/** The reader's owner picks one entry; the GM's client records it. */
export async function onLearnPick(message, entryId) {
  const data = message.flags.n5e.learn;
  const reader = await fromUuid(data.readerUuid);
  if ( !reader || !canModify(game.user, reader) ) return ui.notifications.warn("Only the reader's owner picks.");
  return submitIntent(reader, "learnEntry", { messageId: message.id, entryId });
}

/** GM side of a pick: checks it against the offer, then records it for the party. */
export async function learnEntry(reader, { messageId, entryId }) {
  const message = game.messages.get(messageId);
  const data = message?.flags?.n5e?.learn;
  if ( !data || data.readerUuid !== reader.uuid ) throw new Error("That Read the Enemy result isn't yours.");
  if ( data.picked ) throw new Error("Something was already learned from this success.");
  if ( !(data.available ?? []).includes(entryId) ) throw new Error("The GM didn't offer that.");
  const npc = await fromUuid(data.npcUuid);
  const entry = npc?.system.knowledge.entries.find(e => e.id === entryId);
  if ( !entry ) throw new Error("That entry is no longer on the NPC.");
  const learned = new Set(npc.system.knowledge.learned ?? []);
  learned.add(entryId);
  await npc.update({ "system.knowledge.learned": [...learned] });
  await message.setFlag("n5e", "learn", { ...data, picked: entryId });
  const view = knowledgeEntryView(npc, entry);
  const TextEditor = foundry.applications.ux.TextEditor.implementation;
  const text = await TextEditor.enrichHTML(view.text ?? "", { relativeTo: npc });
  // The whole party learns it (King Q-N24): a card everyone sees.
  await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor: reader }),
    content: `<div class="n5e-roll-card"><header><b>${esc(reader.name)} reads ${esc(npc.name)}</b></header>
      <div class="n5e-learned"><b>${esc(view.label)}.</b> ${text}${view.note ? ` <em>${esc(view.note)}</em>` : ""}</div></div>` });
  return { entryId };
}

/** Register the intent handler (init). */
export function registerNpcKnowledge() {
  registerIntentHandler("learnEntry", learnEntry);
}
