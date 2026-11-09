/** Typed action routing. Only the active GM executes coordinated combat workflows. */
import { asGM } from "../socket.mjs";
import { rule } from "../rules-settings.mjs";
import { requestFingerprint } from "./receipts.mjs";

const inFlight = new Map();
const operations = new Set(["cast", "feature", "activity", "attack", "resource", "healing", "rest", "damage", "hit", "apply", "tracker", "trackerAction", "deathSave", "endCondition", "endConcentration", "resave", "roll", "willOfFire"]);
export const shouldCoordinate = authoritative => !authoritative && !!globalThis.game?.ready && !!rule("multiplayerCoordination");
export const clickData = event => ({ altKey: !!event?.altKey, shiftKey: !!event?.shiftKey, ctrlKey: !!event?.ctrlKey, metaKey: !!event?.metaKey });
export function targetSnapshot() {
  const unique = actors => [...new Set(actors.filter(Boolean).map(a => a.uuid))];
  return { selectedActorUuids: unique((globalThis.canvas?.tokens?.controlled ?? []).map(t => t.actor)),
    targetActorUuids: unique([...game.user.targets ?? []].map(t => t.actor)), characterUuid: game.user.character?.uuid ?? null };
}
export function storedButton(message, selector, index) {
  if ( !Number.isSafeInteger(index) || index < 0 || index > 500 ) throw new Error("Invalid card action index.");
  const root = new DOMParser().parseFromString(message.content ?? "", "text/html");
  const button = root.querySelectorAll(selector)[index];
  if ( !button ) throw new Error("The original card action is unavailable. Use the current card.");
  return button;
}
export function buttonIndex(message, button, selector) {
  const root = new DOMParser().parseFromString(message.content ?? "", "text/html");
  const keys = Object.keys(button.dataset).sort();
  const index = [...root.querySelectorAll(selector)].findIndex(b => keys.every(k => b.dataset[k] === button.dataset[k])
    && Object.keys(b.dataset).length === keys.length);
  if ( index < 0 ) throw new Error("This action does not match the original card.");
  return index;
}

export async function sourceStamp(message) {
  const content = String(message.content ?? "");
  if ( content.length > 256000 ) throw new Error("This card is too large for a coordinated action.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  const html = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, "0")).join("");
  return requestFingerprint("card", { html, damage: message.getFlag("n5e", "damage"), cast: message.getFlag("n5e", "cast"), roll: message.getFlag("n5e", "roll"), actorUuid: message.getFlag("n5e", "actorUuid") });
}

export async function submitWorkflow(operation, data) {
  const payload = { ...data, operation };
  try {
    if ( payload.messageUuid ) {
      const message = await fromUuid(payload.messageUuid);
      if ( !message ) throw new Error("Original card is unavailable.");
      payload.sourceFingerprint = await sourceStamp(message);
    }
    const key = await requestFingerprint("workflow", payload);
    if ( inFlight.has(key) ) return await inFlight.get(key);
    const task = (async () => {
      // A rolled damage card cannot be applied to the same actor twice through different clients.
      const requestId = ["damage", "hit"].includes(operation) ? `w-${operation}-${(await requestFingerprint(operation, { messageUuid: data.messageUuid, actorUuid: data.actorUuid })).slice(0, 64)}` : undefined;
      const result = await asGM("workflow", payload, { requestId });
      return result?.documentUuid ? (await fromUuid(result.documentUuid) ?? result) : result?.value ?? null;
    })();
    inFlight.set(key, task);
    try { return await task; } finally { inFlight.delete(key); }
  } catch (error) {
    ui.notifications.warn(`Action not confirmed: ${error.message} Check the actor and chat before retrying; nothing will be repeated automatically.`);
    return null;
  }
}

async function actorsFor(uuids = []) {
  if ( !Array.isArray(uuids) || uuids.length > 100 || uuids.some(u => typeof u !== "string") ) throw new Error("Invalid action targets.");
  const actors = await Promise.all([...new Set(uuids)].map(uuid => fromUuid(uuid)));
  if ( actors.some(a => a?.documentName !== "Actor") ) throw new Error("An action target no longer exists.");
  return actors;
}

/** Reconstructed again after approval; no client-supplied HTML, formulas or callbacks are executed. */
export async function prepareWorkflow(payload) {
  if ( !payload || !operations.has(payload.operation) ) throw new Error("Unsupported multiplayer action.");
  await requestFingerprint("workflow", payload); // Bounds nesting/size and rejects non-JSON data.
  if ( payload.operation === "resource" ) {
    const c = payload.cost;
    if ( !c || typeof c.pool !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/.test(c.pool)
      || ["constructor", "prototype", "__proto__"].includes(c.pool)
      || !Number.isSafeInteger(c.amount ?? 1) || (c.amount ?? 1) < 0 ) throw new Error("Invalid resource request.");
  }
  if ( payload.operation === "healing" && (!Number.isFinite(payload.amount) || payload.amount < 0 || !["hp", "cp", "tempHp", "tempCp"].includes(payload.pool)) ) throw new Error("Invalid healing request.");
  if ( payload.operation === "rest" && (!["short", "long", "full"].includes(payload.restType)
    || [payload.choice?.hd ?? 0, payload.choice?.cd ?? 0].some(n => !Number.isSafeInteger(n) || n < 0 || n > 1000)) ) throw new Error("Invalid rest request.");
  if ( payload.operation === "willOfFire" && !["reroll", "advantage"].includes(payload.how) ) throw new Error("Invalid Will of Fire request.");
  let actor = payload.actorUuid ? await fromUuid(payload.actorUuid) : null;
  if ( payload.actorUuid && actor?.documentName !== "Actor" ) throw new Error("The action's actor no longer exists.");
  const item = payload.itemId ? actor?.items.get(payload.itemId) : null;
  if ( payload.itemId && !item ) throw new Error("The action's item is no longer owned.");
  if ( payload.operation === "attack" && item && item.type !== "weapon" ) throw new Error("Choose a weapon for this attack.");
  const message = payload.messageUuid ? await fromUuid(payload.messageUuid) : null;
  if ( payload.messageUuid && message?.documentName !== "ChatMessage" ) throw new Error("The original chat card is unavailable.");
  if ( message && payload.sourceFingerprint !== await sourceStamp(message) ) throw new Error("The source card changed. Review the current card and try again.");
  if ( ["activity", "tracker", "willOfFire"].includes(payload.operation) ) {
    const uuid = message?.getFlag("n5e", "cast")?.actorUuid ?? message?.getFlag("n5e", "roll")?.actorUuid ?? message?.getFlag("n5e", "actorUuid");
    if ( !uuid || (actor && actor.uuid !== uuid) ) throw new Error("Card actor does not match this request.");
    actor = await fromUuid(uuid);
    if ( actor?.documentName !== "Actor" ) throw new Error("The card's actor is unavailable.");
  }
  if ( !actor && !["apply"].includes(payload.operation) ) throw new Error("Choose an actor for this action.");
  const selected = await actorsFor(payload.selectedActorUuids), targeted = await actorsFor(payload.targetActorUuids);
  const character = payload.characterUuid ? (await actorsFor([payload.characterUuid]))[0] : null;
  const selectedForRolls = selected.length ? selected : character ? [character] : [];
  const event = clickData(payload.event);
  const summary = `${payload.operation}: ${actor?.name ?? message?.speaker?.alias ?? "chat action"}${item ? ` — ${item.name}` : ""}${selected.length ? `; selected: ${selected.map(a => a.name).join(", ")}` : ""}${targeted.length ? `; targeted: ${targeted.map(a => a.name).join(", ")}` : ""}`;
  const run = async () => {
    if ( !game.users.activeGM?.isSelf ) throw new Error("GM authority changed before action execution.");
    let result;
    const options = { authoritative: true, event, selectedActors: selectedForRolls, targetActors: targeted };
    switch ( payload.operation ) {
      case "cast": result = await (await import("../workflow/cast.mjs")).executeCast(actor, item, payload.selection, { areaPrompt: false }); break;
      case "feature": result = await (await import("../workflow/use-feature.mjs")).useFeature(actor, item, options); break;
      case "attack": result = await (await import("../workflow/attack.mjs")).attackWithWeapon(actor, item, options); break;
      case "resource": result = await (await import("../workflow/resources.mjs")).payPoolCost(actor, payload.cost, options); break;
      case "healing": result = await (await import("../workflow/health.mjs")).applyHealing(actor, payload.amount, payload.pool, options); break;
      case "rest": result = await (await import("../workflow/rest.mjs")).takeRest(actor, payload.restType, payload.choice, options); break;
      case "roll": result = await (await import("../dice/roll.mjs")).rollD20(actor, payload.rollType, payload.key, options); break;
      case "willOfFire": result = await (await import("../dice/roll.mjs")).spendWillOfFire(message, payload.how, options); break;
      case "activity": {
        const button = storedButton(message, "[data-n5e-act]", payload.buttonIndex);
        if ( payload.resourceAmount !== undefined ) {
          const cost = JSON.parse(button.dataset.cost ?? "null");
          if ( !cost?.choose || !Number.isSafeInteger(payload.resourceAmount) || payload.resourceAmount < 1 ) throw new Error("Invalid chosen resource amount.");
          button.dataset.cost = JSON.stringify({ ...cost, choose: false, amount: payload.resourceAmount });
        }
        result = await (await import("../workflow/activity-buttons.mjs")).onActivityClick(message, button, event, options); break;
      }
      case "tracker": {
        const button = storedButton(message, "[data-n5e-track]", payload.buttonIndex);
        result = await (await import("../workflow/trackers.mjs")).onTrackerClick(message, button, options); break;
      }
      case "apply": {
        const button = storedButton(message, "[data-n5e-undo], [data-n5e-concheck], [data-n5e-deathsave], [data-n5e-inflict]", payload.buttonIndex);
        result = await (await import("../workflow/apply-damage.mjs")).onApplyClick(message, button, event, options); break;
      }
      case "trackerAction": {
        const trackers = await import("../workflow/trackers.mjs");
        const { withActorLock } = await import("../workflow/commands.mjs");
        result = await withActorLock(actor, async () => {
          switch ( payload.action ) {
            case "fury":
              if ( !Number.isSafeInteger(payload.delta) || Math.abs(payload.delta) > 100 ) throw new Error("Invalid Fury adjustment.");
              return trackers.changeFury(actor, payload.delta);
            case "openGate": return trackers.openNextGate(actor);
            case "closeGates": return trackers.closeGates(actor);
            case "mark": return trackers.placeMarks(actor, payload.itemId, targeted);
            default: throw new Error("Unsupported tracker action.");
          }
        }); break;
      }
      case "deathSave": result = await (await import("../workflow/apply-damage.mjs")).rollDeathSave(actor, options); break;
      case "endCondition": {
        const effect = actor.effects.get(payload.effectId);
        if ( !effect ) throw new Error("The condition no longer exists.");
        result = await (await import("../workflow/conditions.mjs")).tryEndCondition(actor, effect, event); break;
      }
      case "endConcentration": {
        if ( typeof payload.itemId !== "string" ) throw new Error("Choose the concentrating jutsu.");
        result = await (await import("../workflow/turn.mjs")).endConcentration(actor, payload.itemId, options); break;
      }
      case "resave": {
        const button = storedButton(message, "[data-n5e-resave]", payload.buttonIndex);
        if ( button.dataset.actor !== actor.uuid ) throw new Error("Save actor does not match the original card.");
        result = await (await import("../workflow/trackers.mjs")).rollResave(button, event, options); break;
      }
      case "damage": {
        if ( !actor || !["full", "half", "double", "heal"].includes(payload.mode) ) throw new Error("Invalid rolled damage application.");
        const data = message.getFlag("n5e", "damage");
        if ( !data || !Array.isArray(data.instances) || !data.instances.length || data.instances.some(i => !Number.isFinite(i.amount) || i.amount < 0) ) throw new Error("The original card has no valid rolled damage.");
        const { applyToSelected, resolveDamageReaction } = await import("../workflow/apply-damage.mjs");
        result = await resolveDamageReaction(message, data, payload.mode, actor, applyToSelected); break;
      }
      case "hit": {
        if ( message?.getFlag("n5e", "roll")?.kind !== "attack" ) throw new Error("Successful-hit reactions require an attack roll card.");
        if ( !await foundry.applications.api.DialogV2.confirm({ window: { title: "Confirm successful hit" },
          content: "<p>Confirm that this attack successfully hit the selected recipient. Misses and saves do not trigger this window.</p>", rejectClose: false }) ) break;
        const { chooseReaction } = await import("../workflow/reaction-adapters.mjs");
        const choice = await chooseReaction(actor, "successfulHit", { message, attackerUuid: message.getFlag("n5e", "roll").actorUuid });
        if ( choice ) {
          const { withActorLock } = await import("../workflow/commands.mjs");
          await withActorLock(actor, async () => {
            const plan = await choice.prepare(actor);
            if ( plan.flatReduction || (plan.multiplier !== undefined && plan.multiplier !== 1) ) throw new Error("Damage modifiers must use the damage-roll timing.");
            await plan.validate();
            if ( Object.keys(plan.update ?? {}).length ) await actor.update(plan.update);
            if ( plan.roll ) await plan.roll.toMessage({ speaker: CONFIG.ChatMessage.documentClass.getSpeaker({ actor }), flavor: plan.label ?? "Successful-hit reaction" });
          });
        }
        result = { reaction: choice?.id ?? null }; break;
      }
    }
    if ( result?.uuid && typeof result.uuid === "string" ) return { documentUuid: result.uuid };
    // Only return small plain values through the durable receipt, never whole Foundry documents.
    if ( result == null ) return { value: null };
    const value = JSON.parse(JSON.stringify(result));
    await requestFingerprint("workflow-result", value);
    return { value };
  };
  let action = null;
  if ( payload.operation === "activity" ) action = { ...storedButton(message, "[data-n5e-act]", payload.buttonIndex).dataset };
  if ( payload.operation === "tracker" ) action = { ...storedButton(message, "[data-n5e-track]", payload.buttonIndex).dataset };
  if ( payload.operation === "apply" ) action = { ...storedButton(message, "[data-n5e-undo], [data-n5e-concheck], [data-n5e-deathsave], [data-n5e-inflict]", payload.buttonIndex).dataset };
  return { summary, details: { ...payload, originalAction: action, rolledDamage: message?.getFlag("n5e", "damage") ?? null }, run };
}
