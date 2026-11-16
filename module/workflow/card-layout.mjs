/**
 * CARD2 (docs/CARD2_SPEC.md; King 2026-11-16): the action card laid out like King's SW5e card.
 * Pure parts: rules/card-layout.mjs. Called from workflow/action-card.mjs renderActionCard.
 *
 *   header      the caster's portrait and name above the card
 *   tags        action, duration, keywords and components as small tags
 *   tiles       the rolled results side by side: attack (total, hit mark), each damage (total, type),
 *               each creature's save (King Q-C4); an arrow shows the dice
 *   apply       Targeted / Selected; each creature with the damage it would take after its own
 *               resistance and DR; −1, 0, ¼, ½, 1, 2 (King Q-C2); one APPLY for every row
 *
 * Rolls live inside the card (King Q-C1): the linked roll messages are recorded in the card and no
 * longer shown in the chat log (workflow/action-card.mjs hides them once recorded).
 */
import { MULTIPLIERS, defaultMultiplier, diceSummary, saveTile, chunk, shortSaveLabel } from "../rules/card-layout.mjs";
import { damagePlan } from "../rules/damage.mjs";
import { damagesOf } from "../rules/action-card.mjs";
import { canModify } from "../automation/authority.mjs";
import { rule } from "../rules-settings.mjs";
import { esc } from "../view-models/common.mjs";

const messages = () => globalThis.game?.messages;
const typeLabel = t => globalThis.CONFIG?.N5E?.damageTypes?.[t]?.label ?? t ?? "";
const titleCase = s => String(s ?? "").replace(/\b\w/g, c => c.toUpperCase());

/** The caster's portrait and name, above the card's own header. */
export function headerHTML(card) {
  const actor = globalThis.fromUuidSync?.(card.actorUuid);
  if ( !actor ) return "";
  return `<div class="n5e-c2-who"><img src="${esc(actor.img)}" alt="" width="36" height="36"><b>${esc(actor.name)}</b></div>`;
}

/** Action, duration, keywords and components as tags. */
export function tagsHTML(card) {
  const item = globalThis.fromUuidSync?.(card.itemUuid);
  const sys = item?.system;
  if ( !sys ) return "";
  const N5E = globalThis.CONFIG?.N5E ?? {};
  const act = sys.activation?.type ?? sys.activities?.[0]?.activation ?? "";
  const dur = sys.duration?.unit ? (sys.duration.unit === "instant" ? "Instantaneous" : `${sys.duration.value ?? ""} ${sys.duration.unit}`.trim()) : "";
  const tags = [N5E.activationTypes?.[act]?.label ?? titleCase(act), titleCase(dur), sys.duration?.concentration ? "Concentration" : "",
    ...[...(sys.keywords ?? [])].map(k => N5E.keywords?.[k]?.label ?? k).slice(0, 4),
    item.type === "weapon" && sys.equipped ? "Equipped" : ""].filter(Boolean);
  return tags.length ? `<div class="n5e-c2-tags">${tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : "";
}

/** A tile's dice, for its expand arrow. */
const diceHTML = roll => {
  const lines = diceSummary(roll);
  return lines.length ? `<div class="n5e-c2-dice" hidden>${lines.map(l => `<div>${esc(l.formula)}: ${esc(l.results.join(", "))}</div>`).join("")}</div>` : "";
};
const tile = ({ head, formula = "", total, mark = "", cls = "", sub = "", roll = null }) => `<div class="n5e-c2-tile ${cls}">
  <div class="h">${esc(head)}</div>${formula ? `<div class="f">${esc(formula)}</div>` : ""}
  <div class="t"><span class="mark">${mark}</span><span class="n">${esc(total)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ""}
  ${roll && diceSummary(roll).length ? '<button type="button" class="n5e-c2-more" aria-label="Show the dice">›</button>' : ""}</div>${roll ? diceHTML(roll) : ""}</div>`;

/**
 * The results row: attack, each damage roll, each creature's save.
 * @param {object} results   the card's merged results
 * @param {object[]} rows    cardTargetRows output (visibility already applied)
 */
export function tilesHTML(results, rows, { canSeeSave = () => true, isGM = false } = {}) {
  const out = [];
  if ( results.attack ) {
    const msg = messages()?.get(results.attack.messageId);
    const visible = msg ? msg.isContentVisible !== false : true;
    const one = rows.length === 1 ? rows[0] : null;
    const hit = one?.attack ? (/miss/i.test(one.attack) ? "miss" : "hit") : "";
    out.push(tile({ head: "Attack", formula: visible ? msg?.rolls?.[0]?.formula ?? "" : "", total: visible ? results.attack.total : "?",
      mark: hit === "hit" ? "✓" : hit === "miss" ? "✗" : "", cls: `attack ${hit}`, sub: one?.attack && hit ? "" : "", roll: visible ? msg?.rolls?.[0] : null }));
  }
  for ( const [key, d] of Object.entries(damagesOf(results)) ) {
    const msg = messages()?.get(d.messageId);
    const visible = msg ? msg.isContentVisible !== false : true;
    const types = [...new Set((msg?.flags?.n5e?.damage?.instances ?? []).map(i => i.type).filter(Boolean))].map(typeLabel);
    out.push(tile({ head: `Damage${key && Object.keys(damagesOf(results)).length > 1 ? ` (${key})` : ""}${d.crit ? " · Critical" : ""}`,
      formula: visible ? msg?.rolls?.[0]?.formula ?? "" : "", total: visible ? d.total : "?", sub: visible ? types.join(" + ") : "", cls: "damage", roll: visible ? msg?.rolls?.[0] : null }));
  }
  // King 2026-11-16: the saves share a box, one small line per creature ("Test ✓ 15"), at most 3 per
  // box; more creatures open another box. One set of boxes per save (Con, Dex).
  const bySave = new Map();
  for ( const r of rows ) {
    for ( const s of r.saves ?? [] ) {
      const msg = messages()?.get(s.messageId);
      const visible = isGM || canSeeSave(r.uuid);
      const t = saveTile({ name: r.name, label: s.label, total: msg?.rolls?.[0]?.total ?? null, degree: s.failed ? 0 : 2, visible });
      if ( !bySave.has(s.label) ) bySave.set(s.label, []);
      bySave.get(s.label).push(t);
    }
  }
  for ( const [label, list] of bySave ) for ( const part of chunk(list, 3) ) out.push(`<div class="n5e-c2-tile saves">
    <div class="h">${esc(label ? `${label} Save` : "Save")}</div>
    ${part.map(t => `<div class="f srow ${t.outcome}" data-tooltip="${esc(t.name)}"><span class="nm">${esc(t.name)}</span><span class="mark">${t.mark}</span><b>${esc(t.total)}</b></div>`).join("")}</div>`);
  return out.length ? `<div class="n5e-c2-tiles">${out.join("")}</div>` : "";
}

/**
 * King 2026-11-16: the card's action buttons in two columns, smaller, with the short save label
 * ("DC 12 DEX Save"); Critical, Clash, Read the Enemy and Identify together on one small row.
 * Runs before the chat listeners are bound, so moved buttons keep working.
 * @param {HTMLElement} html   the message element
 * @param {HTMLElement} box    the card's own panel (left alone)
 * @param {string} smallHTML   more small buttons (Read the Enemy, Identify)
 */
export function compactActions(html, box, smallHTML = "") {
  const rows = [...html.querySelectorAll(".act-row")].filter(r => !box.contains(r));
  const small = document.createElement("div");
  small.className = "n5e-c2-small";
  if ( !rows.length ) {
    if ( smallHTML ) { small.innerHTML = smallHTML; box.before(small); }
    return;
  }
  const grid = document.createElement("div");
  grid.className = "n5e-c2-grid";
  const hints = [];
  for ( const r of rows ) {
    for ( const el of [...r.children] ) {
      if ( el.matches("button.crit, [data-n5e-clash]") ) small.append(el);
      else if ( el.matches("button") ) {
        if ( el.dataset.n5eAct === "save" && el.dataset.dc ) relabelSave(el);
        grid.append(el);
      } else hints.push(el);
    }
  }
  rows[0].before(grid);
  grid.after(small);
  small.insertAdjacentHTML("beforeend", smallHTML);
  for ( const h of hints.reverse() ) small.after(h);
  for ( const r of rows ) r.remove();
  if ( !small.children.length ) small.remove();
}

/** "DC 12 DEX Save" on a save button (its icon kept). */
function relabelSave(btn) {
  const icon = btn.querySelector("i")?.outerHTML ?? "";
  const N5E = globalThis.CONFIG?.N5E ?? {};
  btn.innerHTML = `${icon} ${esc(shortSaveLabel(btn.dataset.dc, btn.dataset.ability, N5E.abilities))}`;
}

/** The damage a creature would take from one damage roll at a multiplier, after its own resistance and DR. */
export function previewDamage(actor, damageMessage, mode) {
  const f = damageMessage?.flags?.n5e?.damage;
  if ( !actor || !f ) return null;
  if ( mode === "heal" ) return -(Number(f.total) || 0);
  try {
    const plan = damagePlan(actor, f.instances ?? [], { multiplier: { none: 0, quarter: 0.25, half: 0.5, full: 1, double: 2 }[mode] ?? 1,
      pierce: f.pierce ?? 0, genjutsu: !!f.genjutsu, crit: !!f.crit, handling: f.handling ?? null, dealtPenalty: Number(f.dealtPenalty) || 0,
      ignoreTraits: !rule("applyResistances") });
    return (plan.health ?? 0) + (plan.chakra ?? 0);
  } catch { return null; }
}

/** One Apply row: the creature, what it would take, and the multiplier buttons. */
function applyRowHTML({ uuid, name, img, amount, mode, applied, mine }) {
  const buttons = MULTIPLIERS.map(m => `<button type="button" class="${m.mode === mode ? "on" : ""}" data-n5e-c2-mult="${m.mode}" data-tooltip="${esc(m.tip)}"${mine && !applied ? "" : " disabled"}>${m.label}</button>`).join("");
  return `<div class="n5e-c2-arow${applied ? " applied" : ""}" data-uuid="${esc(uuid)}" data-mode="${esc(mode)}">
    <div class="who">${img ? `<img src="${esc(img)}" alt="" width="28" height="28">` : ""}<span>${esc(name)}</span>
    <span class="amt">${applied ? esc(applied) : amount == null ? "" : amount < 0 ? `+${-amount}` : `−${amount}`}</span></div>
    <div class="mults">${buttons}</div></div>`;
}

/**
 * The Apply panel for each damage roll on the card.
 * @param {object} message   the card
 * @param {object} results
 * @param {object[]} rows    cardTargetRows output
 * @param {string} mode      "targeted" | "selected"
 */
export function applyPanelHTML(message, results, rows, view = "targeted") {
  const damages = damagesOf(results);
  const keys = Object.keys(damages);
  if ( !keys.length ) return "";
  const game = globalThis.game;
  const panels = keys.map(key => {
    const msg = messages()?.get(damages[key].messageId);
    if ( !msg ) return "";
    const creatures = view === "selected"
      ? (globalThis.canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean).map(a => ({ uuid: a.uuid, name: a.name, img: a.img, actor: a, row: rows.find(r => r.uuid === a.uuid) }))
      : rows.map(r => ({ uuid: r.uuid, name: r.name, actor: globalThis.fromUuidSync?.(r.uuid), row: r })).map(c => ({ ...c, img: c.actor?.img }));
    const list = creatures.map(c => {
      const dm = c.row?.damages?.find(x => x.effect === key) ?? null;
      const mode = c.row?.immune ? "none" : defaultMultiplier(dm?.share ?? c.row?.share);
      const applied = dm?.applied ? { full: "Applied ×1", half: "Applied ×½", quarter: "Applied ×¼", none: "Applied ×0", double: "Applied ×2", heal: "Healed" }[dm.applied.mode] ?? "Applied" : "";
      const mine = !!c.actor && (game.user.isGM || canModify(game.user, c.actor));
      return applyRowHTML({ uuid: c.uuid, name: c.name, img: c.img, amount: previewDamage(c.actor, msg, mode), mode, applied, mine });
    });
    const label = keys.length > 1 ? ` · ${esc(key)}` : "";
    return `<div class="n5e-c2-apply" data-effect="${esc(key)}">
      <div class="n5e-c2-h">Apply${label}</div>
      <div class="n5e-c2-view"><button type="button" class="${view === "targeted" ? "on" : ""}" data-n5e-c2-view="targeted"><i class="fa-solid fa-bullseye"></i> Targeted</button>
        <button type="button" class="${view === "selected" ? "on" : ""}" data-n5e-c2-view="selected"><i class="fa-regular fa-square"></i> Selected</button></div>
      ${list.length ? list.join("") : `<p class="note">${view === "selected" ? "Select tokens on the map." : "No targets: switch to Selected."}</p>`}
      ${list.length ? `<button type="button" class="n5e-c2-applyall" data-n5e-card-applyall="${esc(key)}"><i class="fa-solid fa-share"></i> Apply</button>` : ""}
    </div>`;
  }).filter(Boolean);
  return panels.join("");
}

/**
 * The panel's own clicks: a multiplier picks that row's mode (and updates its amount); Targeted /
 * Selected redraws the panel; the tile arrows show the dice. APPLY goes through onActionCardClick.
 */
export function bindLayout(box, message, redraw) {
  for ( const b of box.querySelectorAll("[data-n5e-c2-mult]") ) b.addEventListener("click", ev => {
    ev.preventDefault();
    const row = b.closest(".n5e-c2-arow");
    row.dataset.mode = b.dataset.n5eC2Mult;
    row.querySelectorAll("[data-n5e-c2-mult]").forEach(x => x.classList.toggle("on", x === b));
    const panel = b.closest(".n5e-c2-apply");
    const damages = damagesOf(message.flags.n5e.card.results ?? {});
    const msg = messages()?.get(damages[panel.dataset.effect]?.messageId ?? Object.values(damages)[0]?.messageId);
    const amount = previewDamage(globalThis.fromUuidSync?.(row.dataset.uuid), msg, row.dataset.mode);
    const amt = row.querySelector(".amt");
    if ( amt && amount != null ) amt.textContent = amount < 0 ? `+${-amount}` : `−${amount}`;
  });
  for ( const b of box.querySelectorAll("[data-n5e-card-applyall]") ) b.addEventListener("click", ev => {
    ev.preventDefault();
    void applyAll(message, b, ev).catch(error => ui.notifications.warn(error.message));
  });
  for ( const b of box.querySelectorAll("[data-n5e-c2-view]") ) b.addEventListener("click", ev => { ev.preventDefault(); redraw(b.dataset.n5eC2View); });
  for ( const b of box.querySelectorAll(".n5e-c2-more") ) b.addEventListener("click", ev => {
    ev.preventDefault();
    const dice = b.closest(".n5e-c2-tile")?.querySelector(".n5e-c2-dice");
    if ( dice ) { dice.hidden = !dice.hidden; b.classList.toggle("open", !dice.hidden); }
  });
}

/** APPLY: each row's chosen multiplier, through the damage roll's own apply (receipts, reactions, Undo). */
export async function applyAll(message, btn, event) {
  const panel = btn.closest(".n5e-c2-apply");
  const damages = damagesOf(message.flags.n5e.card.results ?? {});
  const msg = messages()?.get(damages[panel?.dataset.effect]?.messageId ?? Object.values(damages)[0]?.messageId);
  if ( !msg ) return ui.notifications.info("Roll the damage first.");
  const rows = [...(panel?.querySelectorAll(".n5e-c2-arow:not(.applied)") ?? [])].filter(r => !r.querySelector("[data-n5e-c2-mult]")?.disabled);
  if ( !rows.length ) return ui.notifications.info("Nothing left to apply here that you may change.");
  btn.disabled = true;
  const { onApplyClick } = await import("./apply-damage.mjs");
  for ( const r of rows ) {
    try { await onApplyClick(msg, { dataset: { n5eApply: r.dataset.mode || "full", target: r.dataset.uuid } }, event); }
    catch (error) { ui.notifications.warn(error.message); }
  }
  return true;
}
