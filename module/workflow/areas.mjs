/**
 * Jutsu areas on the map (Foundry side). The rules (which shape, how big, what it covers, how long it
 * lasts) are pure functions in module/rules/area.mjs; this file places templates, targets tokens and
 * cleans up.
 *
 * Flow:
 *   1. The cast card (workflow/cast.mjs) has a "Place area" button (data-n5e-area) and, with the
 *      areaPrompt rule, placement starts right after casting.
 *   2. placeArea() shows the shape under the cursor. Self areas stay on the caster and turn toward
 *      the cursor (cones, lines); other areas follow the cursor, snapped to the grid. Mouse wheel +
 *      Shift or Ctrl rotates. Left click places, right click or Escape cancels.
 *   3. The placed template carries flags.n5e {actorUuid, itemUuid, itemId, lifetime, expires, originToken,
 *      rank}. With the areaAutoTarget rule the placing user targets every token inside it.
 *   4. Cleanup (active GM, areaCleanup rule): "turn" areas at the end of the caster's turn, "rounds"
 *      areas when their round comes, "concentration" areas when the jutsu leaves the caster's
 *      system.combat.concentrating list.
 *   5. Reminders (active GM, areaTurnStart rule): a creature starting its turn inside a lasting area
 *      gets a GM-only card with that jutsu's activity buttons.
 */
import { areaOf, areaLabel, templateFields, tokensInTemplate, pointInTemplate, areaLifetime, areaExpired } from "../rules/area.mjs";
import { effectiveActivities } from "../rules/activity-parse.mjs";
import { rule } from "../rules-settings.mjs";
import { esc } from "../view-models/common.mjs";

// ------------------------------------------------------------------------------------------------ //
//  Geometry helpers: Foundry pixels ↔ feet                                                         //
// ------------------------------------------------------------------------------------------------ //

/** Pixels per scene distance unit (feet). */
const pxPerFoot = () => canvas.dimensions.size / canvas.dimensions.distance;

/** A placed or previewed template document as the pure geometry wants it (feet). */
function templateGeometry(doc) {
  return { t: doc.t, distance: doc.distance, width: doc.width, angle: doc.angle, direction: doc.direction };
}

/** One point (feet) per grid square a token occupies: the square's center. */
function tokenPoints(token) {
  const d = token.document;
  const g = canvas.dimensions.size;
  const k = pxPerFoot();
  const points = [];
  for ( let i = 0; i < Math.max(1, Math.round(d.width)); i++ ) {
    for ( let j = 0; j < Math.max(1, Math.round(d.height)); j++ ) {
      points.push({ x: (d.x + (i + 0.5) * g) / k, y: (d.y + (j + 0.5) * g) / k });
    }
  }
  return points;
}

/** The tokens a template document covers (Token placeables on the current canvas). */
export function tokensInArea(doc) {
  if ( !canvas?.ready || doc.parent !== canvas.scene ) return [];
  const k = pxPerFoot();
  const list = canvas.tokens.placeables.filter(t => game.user.isGM || t.visible)
    .map(t => ({ id: t.id, points: tokenPoints(t), token: t }));
  const ids = tokensInTemplate(templateGeometry(doc), { x: doc.x / k, y: doc.y / k }, list,
    { exclude: doc.flags?.n5e?.originToken });
  return list.filter(t => ids.includes(t.id)).map(t => t.token);
}

/** Replace the user's targets with these tokens (v13 API first, older fallbacks after). */
function setTargets(tokens) {
  const ids = tokens.map(t => t.id);
  if ( typeof canvas.tokens.setTargets === "function" ) return canvas.tokens.setTargets(ids, { mode: "replace" });
  if ( typeof game.user.updateTokenTargets === "function" ) return game.user.updateTokenTargets(ids);
  for ( const t of canvas.tokens.placeables ) t.setTarget(ids.includes(t.id), { releaseOthers: false, groupSelection: true });
}

// ------------------------------------------------------------------------------------------------ //
//  Card button                                                                                     //
// ------------------------------------------------------------------------------------------------ //

/** The "Place area" button for a cast card, or "" when the item has no area. */
export function areaButton(item, { rank } = {}) {
  const area = areaOf(item.system, { rank });
  if ( !area ) return "";
  return `<div class="act-row"><button type="button" data-n5e-area="${esc(item.uuid)}" data-rank="${esc(rank ?? "")}">
    <i class="fa-solid fa-draw-polygon"></i> Place area (${esc(areaLabel(area))})</button></div>`;
}

/** Chat click on data-n5e-area. */
export async function onAreaClick(message, button) {
  const item = await fromUuid(button.dataset.n5eArea);
  if ( !item?.actor ) return ui.notifications.warn("The jutsu is no longer on its actor.");
  const created = await placeArea(item.actor, item, { rank: button.dataset.rank || undefined });
  // Single action card (CARD1b): the covered tokens become the card's targets.
  if ( created && message?.flags?.n5e?.card ) await import("./action-card.mjs").then(m => m.addAreaTargets(message, tokensInArea(created)));
  return created;
}

// ------------------------------------------------------------------------------------------------ //
//  Placement                                                                                       //
// ------------------------------------------------------------------------------------------------ //

/**
 * Place an item's area on the current scene. Resolves the created template document, or null when
 * cancelled (or when the item has no area / there is no scene).
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [o]
 * @param {string} [o.rank]  cast rank (upcast area growth)
 */
export async function placeArea(actor, item, { rank } = {}) {
  const area = areaOf(item.system, { rank });
  if ( !area || !canvas?.ready || !canvas.scene ) return null;
  const caster = actor.getActiveTokens(true)[0] ?? null;
  const fromSelf = area.self && !!caster;
  const lifetime = areaLifetime(item.system.duration, !!game.combat?.started);
  const expires = lifetime.kind === "rounds" && game.combat
    ? { round: game.combat.round + lifetime.rounds, turn: game.combat.turn } : null;
  const start = fromSelf ? caster.center : canvas.mousePosition ?? { x: canvas.dimensions.width / 2, y: canvas.dimensions.height / 2 };
  const data = {
    ...templateFields(area, 0),
    x: start.x, y: start.y,
    author: game.user.id,
    fillColor: game.user.color?.css ?? game.user.color ?? "#ff6400",
    flags: { n5e: { actorUuid: actor.uuid, itemUuid: item.uuid, itemId: item.id, rank: rank ?? item.system.rank ?? "",
      lifetime: lifetime.kind, expires, originToken: fromSelf ? caster.id : null,
      casterCombatant: game.combat?.getCombatantsByActor?.(actor)?.[0]?.id ?? null } }
  };
  const TemplateDoc = CONFIG.MeasuredTemplate.documentClass;
  const preview = new TemplateDoc(data, { parent: canvas.scene });
  const created = await previewAndPlace(preview, { fromSelf, caster, rotates: ["cone", "ray"].includes(data.t) });
  if ( !created ) return null;
  if ( rule("areaAutoTarget") ) setTargets(tokensInArea(created));
  return created;
}

/**
 * The interactive part: draw the preview on the template layer, follow the mouse, and create the
 * template on left click. Resolves the created document or null.
 */
function previewAndPlace(previewDoc, { fromSelf, caster, rotates }) {
  return new Promise(resolve => {
    const layer = canvas.templates;
    const initialLayer = canvas.activeLayer;
    const TemplateObj = CONFIG.MeasuredTemplate.objectClass;
    const obj = new TemplateObj(previewDoc);
    let last = 0;
    let done = false;
    const view = canvas.app.view;

    const finish = async created => {
      if ( done ) return;
      done = true;
      canvas.stage.off("pointermove", onMove);
      canvas.stage.off("pointerdown", onDown);
      view.removeEventListener("contextmenu", onCancel);
      view.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKey);
      layer.preview.removeChild(obj);
      obj.destroy?.({ children: true });
      initialLayer?.activate?.();
      resolve(created);
    };
    const onMove = event => {
      const now = Date.now();
      if ( now - last < 20 ) return;
      last = now;
      const p = event.getLocalPosition(layer);
      if ( fromSelf ) {
        // Self areas stay on the caster; cones and lines turn toward the cursor.
        if ( rotates ) previewDoc.updateSource({ direction: Math.toDegrees?.(Math.atan2(p.y - caster.center.y, p.x - caster.center.x))
          ?? Math.atan2(p.y - caster.center.y, p.x - caster.center.x) * 180 / Math.PI });
      } else {
        const snapped = layer.getSnappedPoint ? layer.getSnappedPoint(p) : p;
        previewDoc.updateSource({ x: snapped.x, y: snapped.y });
      }
      obj.refresh();
    };
    const onWheel = event => {
      if ( !rotates || !(event.shiftKey || event.ctrlKey) ) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 45 : 15;
      previewDoc.updateSource({ direction: (previewDoc.direction + step * Math.sign(event.deltaY)) % 360 });
      obj.refresh();
    };
    const onDown = async event => {
      if ( event.button !== 0 ) return;
      event.stopPropagation?.();
      const [created] = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [previewDoc.toObject()]);
      finish(created ?? null);
    };
    const onCancel = event => {
      event.preventDefault?.();
      finish(null);
    };
    const onKey = event => {
      if ( event.key === "Escape" ) onCancel(event);
    };

    obj.draw().then(() => {
      layer.activate();
      layer.preview.addChild(obj);
      canvas.stage.on("pointermove", onMove);
      canvas.stage.on("pointerdown", onDown);
      view.addEventListener("contextmenu", onCancel);
      view.addEventListener("wheel", onWheel, { passive: false });
      document.addEventListener("keydown", onKey);
      ui.notifications.info("Left click to place the area, right click or Escape to cancel. Shift/Ctrl + wheel rotates.");
    });
  });
}

// ------------------------------------------------------------------------------------------------ //
//  Lifetimes and reminders (active GM)                                                             //
// ------------------------------------------------------------------------------------------------ //

/** Every N5e area template in the world (all scenes). */
function n5eTemplates() {
  return game.scenes.contents.flatMap(s => s.templates.contents.filter(t => t.flags?.n5e?.actorUuid));
}

/** Delete templates (GM). */
async function removeTemplates(docs) {
  const byScene = new Map();
  for ( const d of docs ) byScene.set(d.parent, [...(byScene.get(d.parent) ?? []), d.id]);
  for ( const [scene, ids] of byScene ) await scene.deleteEmbeddedDocuments("MeasuredTemplate", ids);
}

/** End of a combatant's turn: instantaneous areas that combatant's actor placed are removed. */
export async function areasTurnEnd(combat, actor) {
  if ( !rule("areaCleanup") || !game.users.activeGM?.isSelf ) return;
  const gone = n5eTemplates().filter(t => t.flags.n5e.lifetime === "turn" && t.flags.n5e.actorUuid === actor.uuid);
  if ( gone.length ) await removeTemplates(gone);
}

/**
 * Start of a turn: timed areas that have run out are removed, then a reminder card for each lasting
 * area the current combatant's token starts in.
 */
export async function areasTurnStart(combat, actor) {
  if ( !game.users.activeGM?.isSelf ) return;
  const now = { round: combat.round, turn: combat.turn };
  if ( rule("areaCleanup") ) {
    const expired = n5eTemplates().filter(t => t.flags.n5e.lifetime === "rounds" && areaExpired(t.flags.n5e.expires, now));
    if ( expired.length ) await removeTemplates(expired);
  }
  if ( !rule("areaTurnStart") || !canvas?.ready ) return;
  const token = combat.combatant?.token?.object;
  if ( !token ) return;
  const k = pxPerFoot();
  const points = tokenPoints(token);
  for ( const t of canvas.scene.templates.contents ) {
    const f = t.flags?.n5e;
    if ( !f?.actorUuid || f.lifetime === "turn" || f.originToken === token.id ) continue;
    const inside = points.some(p => pointInTemplate(templateGeometry(t), { x: t.x / k, y: t.y / k }, p));
    if ( inside ) await postAreaReminder(t, actor);
  }
}

/** The GM-only "starts its turn in the area" card, with the jutsu's buttons (the caster rolls). */
async function postAreaReminder(template, actor) {
  const f = template.flags.n5e;
  const [caster, item] = await Promise.all([fromUuid(f.actorUuid), fromUuid(f.itemUuid)]);
  if ( !caster || !item ) return;
  const { activityButtons } = await import("./activity-buttons.mjs");
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  await ChatMessageCls.create({
    speaker: ChatMessageCls.getSpeaker({ actor: caster }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="n5e-cast-card n5e-area-card" data-actor-uuid="${caster.uuid}" data-item-uuid="${item.uuid}">
      <p><b>${esc(actor.name)}</b> starts its turn in <b>${esc(item.name)}</b> (${esc(caster.name)}).</p>
      <p class="sub">Target it, then use the buttons that the jutsu's text calls for.</p>
      ${activityButtons(caster, item, effectiveActivities(item), { rank: f.rank })}</div>`,
    flags: { n5e: { actorUuid: caster.uuid, cast: { actorUuid: caster.uuid, itemUuid: item.uuid, rank: f.rank } } }
  });
}

/** Concentration ended (the item left system.combat.concentrating): remove its areas. */
async function onActorUpdate(actor, changes) {
  if ( !rule("areaCleanup") || !game.users.activeGM?.isSelf ) return;
  if ( !foundry.utils.hasProperty(changes, "system.combat.concentrating") ) return;
  const keep = new Set(actor.system.combat?.concentrating ?? []);
  const gone = n5eTemplates().filter(t => t.flags.n5e.lifetime === "concentration" && t.flags.n5e.actorUuid === actor.uuid
    && !keep.has(t.flags.n5e.itemId));
  if ( gone.length ) await removeTemplates(gone);
}

/** Called once from n5e.mjs. */
export function registerAreaHooks() {
  Hooks.on("updateActor", onActorUpdate);
}
