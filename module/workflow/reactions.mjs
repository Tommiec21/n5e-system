/** Private, persisted reaction windows. Player socket replies are suggestions requiring GM review. */
import { reactionDeadline, reactionPhase, decideReaction } from "../rules/reactions.mjs";
import { rule } from "../rules-settings.mjs";
import { esc } from "../view-models/common.mjs";
import { withActorLock } from "./commands.mjs";

const timers = new Map(), prompted = new Set();
const prompts = new Map();
const CHANNEL = "system.n5e";
const current = message => message.getFlag("n5e", "reactionWindow");
const activeGM = () => !!game.users?.activeGM?.isSelf;

function syncPrompt(message) {
  const window = current(message);
  if ( window?.state === "pending" && reactionPhase(window) === "pending" ) return;
  const dialog = prompts.get(message.id);
  prompts.delete(message.id);
  if ( dialog ) Promise.resolve(dialog.close()).catch(error => ui.notifications.warn(error.message));
}

function content(window) {
  const phase = reactionPhase(window);
  const status = { pending: "Waiting for an eligible player", gm: "Waiting for GM resolution", accepted: "Accepted — not yet applied", declined: "Declined" }[phase];
  const timer = window.deadline === null ? "Timer disabled" : `Player decision deadline: ${new Date(window.deadline).toISOString()}`;
  return `<div class="n5e-reaction-card"><b>${esc(window.label)}</b><p>${esc(window.trigger)}</p><p>${esc(status)}</p><p>${esc(timer)}</p>
    <p>No resources or effects are applied by this decision window.</p>
    ${["pending", "gm"].includes(phase) ? '<button type="button" data-n5e-reaction="accept">Accept</button><button type="button" data-n5e-reaction="decline">Decline</button>' : ""}</div>`;
}

async function store(message, window) {
  if ( !activeGM() ) throw new Error("Only the active GM can update a reaction window.");
  await message.update({ "flags.n5e.reactionWindow": window, content: content(window) });
}

/** GM-authored eligibility/trigger; later ability adapters will produce these inputs. */
export async function openReactionWindow(actor, item, { label = item?.name, trigger = "Reaction opportunity", requestId } = {}) {
  if ( !activeGM() ) throw new Error("The active GM opens reaction windows.");
  if ( !rule("reactionWindows") ) throw new Error("Reaction windows are disabled in N5e Rules.");
  if ( actor?.documentName !== "Actor" || item?.actor?.uuid !== actor.uuid || !label || label.length > 160 || trigger.length > 400 ) throw new Error("Choose an owned ability and a valid reaction description.");
  const owners = game.users.filter(u => !u.isGM && u.active && actor.testUserPermission(u, "OWNER")).map(u => u.id);
  const window = { version: 1, actorUuid: actor.uuid, itemId: item.id, label, trigger, owners,
    state: owners.length ? "pending" : "gm", openedAt: Date.now(), deadline: reactionDeadline(Number(rule("reactionTimeoutSeconds"))) };
  if ( requestId !== undefined ) {
    if ( typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(requestId) ) throw new Error("Invalid reaction command identity.");
    window.requestId = requestId;
  }
  return CONFIG.ChatMessage.documentClass.create({ content: content(window),
    whisper: [...new Set([...owners, ...game.users.filter(u => u.isGM).map(u => u.id)])], flags: { n5e: { reactionWindow: window } } });
}

export async function retireReactionWindows(requestId) {
  if ( !activeGM() ) throw new Error("Only the active GM can retire interrupted prompts.");
  for ( const message of game.messages.values() ) {
    const window = current(message);
    if ( message.author?.isGM && window?.requestId === requestId && ["pending", "gm"].includes(window.state) ) {
      await store(message, { ...window, state: "declined", retired: true });
    }
  }
}

export async function resolveReactionWindow(message, decision) {
  return withActorLock(`reaction:${message.id}`, async () => {
    if ( !activeGM() || !message.author?.isGM ) throw new Error("Only the active GM can resolve a GM-authored window.");
    const window = current(message);
    const actor = await fromUuid(window.actorUuid);
    if ( !actor?.items.get(window.itemId) ) throw new Error("The reaction ability is no longer owned; review the pending window.");
    const next = decideReaction(window, decision, { gm: true });
    await store(message, next);
    Hooks.callAll("n5e.reactionDecision", message, next);
    return next;
  });
}

/** Wait without holding actor locks; authority loss cancels continuation, never auto-applies it. */
export function waitForReactionWindow(message) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if ( !activeGM() ) { clearInterval(timer); reject(new Error("GM authority changed; reconcile the pending damage request.")); return; }
      if ( !game.messages.has(message.id) ) { clearInterval(timer); reject(new Error("Reaction window was deleted; damage was not resumed.")); return; }
      const state = current(message)?.state;
      if ( ["accepted", "declined"].includes(state) ) { clearInterval(timer); resolve(state); }
    }, 250);
  });
}

async function sendDecision(message, decision) {
  if ( activeGM() ) return resolveReactionWindow(message, decision);
  const window = current(message), actor = await fromUuid(window.actorUuid);
  decideReaction(window, decision, { userId: game.user.id });
  if ( !actor?.testUserPermission(game.user, "OWNER") ) throw new Error("You no longer own the reacting actor.");
  game.socket.emit(CHANNEL, { reactionResponse: { messageId: message.id, decision, userId: game.user.id } });
  ui.notifications.info("Reaction choice sent for GM review; no resource has been spent.");
}

async function receive(data) {
  if ( !activeGM() || !data?.reactionResponse ) return;
  const { messageId, decision, userId } = data.reactionResponse;
  const message = game.messages.get(messageId), window = message && current(message);
  try {
    if ( !window || !message.author?.isGM ) throw new Error("Unknown reaction window.");
    decideReaction(window, decision, { userId });
    const actor = await fromUuid(window.actorUuid), user = game.users.get(userId);
    if ( !user || !actor?.testUserPermission(user, "OWNER") ) throw new Error("The suggested responder is no longer an eligible owner.");
    // Socket identity is not authenticated. The claimed player name is advisory, never authority.
    const accepted = await foundry.applications.api.DialogV2.confirm({ window: { title: "Review reaction choice" },
      content: `<p>Unverified player response for ${esc(window.label)}: <b>${esc(decision)}</b>.</p><p>Claimed responder: ${esc(user.name)}. Confirm this decision with the player before approving it.</p>`, rejectClose: false });
    if ( !accepted ) return;
    if ( reactionPhase(current(message)) !== "pending" ) throw new Error("The player window ended; use the GM controls to resolve it.");
    await resolveReactionWindow(message, decision);
  } catch (error) { ui.notifications.warn(error.message); }
}

function schedule(message) {
  clearTimeout(timers.get(message.id)); timers.delete(message.id);
  const window = current(message);
  syncPrompt(message);
  if ( !window || !message.author?.isGM || window.state !== "pending" || window.deadline === null ) return;
  if ( !activeGM() && (!window.owners.includes(game.user.id) || reactionPhase(window) === "gm") ) return;
  const delay = Math.max(0, Math.min(60000, window.deadline - Date.now()));
  timers.set(message.id, setTimeout(async () => {
    timers.delete(message.id);
    if ( !activeGM() ) { syncPrompt(message); schedule(message); return; }
    try {
      await withActorLock(`reaction:${message.id}`, async () => {
        const latest = current(message);
        if ( latest?.state === "pending" && reactionPhase(latest) === "gm" ) await store(message, { ...latest, state: "gm" });
      });
      schedule(message);
    } catch (error) { ui.notifications.warn(error.message); }
  }, delay));
}

export function registerReactionWindows() {
  game.socket?.on(CHANNEL, receive);
  const resume = () => game.messages?.forEach(schedule);
  Hooks.on("updateUser", resume);
  Hooks.on("createChatMessage", schedule);
  Hooks.on("updateChatMessage", schedule);
  Hooks.on("renderDialogV2", dialog => {
    const prefix = "n5e-reaction-prompt-";
    if ( !dialog.id?.startsWith(prefix) ) return;
    const id = dialog.id.slice(prefix.length), message = game.messages.get(id);
    prompts.set(id, dialog);
    if ( message ) syncPrompt(message);
  });
  Hooks.on("closeDialogV2", dialog => {
    const id = dialog.id?.replace(/^n5e-reaction-prompt-/, "");
    if ( prompts.get(id) === dialog ) prompts.delete(id);
  });
  Hooks.on("deleteChatMessage", message => {
    clearTimeout(timers.get(message.id)); timers.delete(message.id);
    const dialog = prompts.get(message.id); prompts.delete(message.id);
    if ( dialog ) Promise.resolve(dialog.close()).catch(error => ui.notifications.warn(error.message));
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const window = current(message);
    if ( !window || !message.author?.isGM ) return;
    const eligible = !game.user.isGM && window.owners.includes(game.user.id) && reactionPhase(window) === "pending";
    for ( const button of html.querySelectorAll("[data-n5e-reaction]") ) {
      button.disabled = !(activeGM() || eligible);
      button.addEventListener("click", async () => {
        try { await sendDecision(message, button.dataset.n5eReaction); } catch (error) { ui.notifications.warn(error.message); }
      });
    }
    if ( eligible && !prompted.has(message.id) ) {
      prompted.add(message.id);
      foundry.applications.api.DialogV2.wait({ id: `n5e-reaction-prompt-${message.id}`, window: { title: window.label }, content: `<p>${esc(window.trigger)}</p><p>Accept or decline this reaction opportunity?</p>`,
        buttons: ["accept", "decline"].map(action => ({ action, label: action === "accept" ? "Accept" : "Decline", callback: () => action })), rejectClose: false })
        .then(decision => decision && sendDecision(message, decision)).catch(error => ui.notifications.warn(error.message));
    }
  });
  resume();
}
