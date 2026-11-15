/**
 * The roll dialog (ROLL1; King 2026-11-14): every roll shows its math before it is rolled. Each part
 * has a tick; the roller can add modifiers (a number or dice) and pick Advantage, Normal or
 * Disadvantage. There is no key combination: the dialog always opens unless the user turned on
 * "Roll without the dialog" (a per-user setting, off by default; King Q-R1).
 *
 *   d20Dialog(options)    ability, save, skill, skill action, attack, initiative, death save
 *   diceDialog(options)   damage, healing, pool dice, recovery dice
 *
 * The HTML builders (d20DialogHTML, diceDialogHTML) and the math (rules/roll-math.mjs) are pure, so
 * tests check them without Foundry. Callers go through `dialogs` so tests can stand in for them.
 */
import { composeD20, readChoice, parseAdded } from "../rules/roll-math.mjs";
import { esc, signed } from "../view-models/common.mjs";

const MODE_LABELS = { advantage: "Advantage", normal: "Normal", disadvantage: "Disadvantage" };

/** Should this user see the dialog? Off in tests unless `dialogs.enabled` says so. */
export function wantsDialog() {
  if ( dialogs.enabled != null ) return dialogs.enabled;
  const settings = globalThis.game?.settings;
  if ( !settings?.settings?.has?.("n5e.rollWithoutDialog") ) return false;
  return !settings.get("n5e", "rollWithoutDialog");
}

/** The mode buttons: the worked-out mode preselected; `own` adds "As worked out" for groups and multi-part dice. */
function modeRadios(mode, { own = null } = {}) {
  const options = [...(own ? [["own", own]] : []), ...Object.entries(MODE_LABELS)];
  return `<div class="n5e-rd-modes" role="radiogroup" aria-label="Roll mode">${options.map(([key, label]) =>
    `<label class="n5e-rd-mode"><input type="radio" name="mode" value="${key}" ${key === mode ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div>`;
}

/** Why the system picked the mode it did. */
function sourceLines(sources = {}) {
  const out = [];
  if ( sources.advantage?.length ) out.push(`<div class="n5e-rd-why">Advantage: ${esc(sources.advantage.join(", "))}</div>`);
  if ( sources.disadvantage?.length ) out.push(`<div class="n5e-rd-why">Disadvantage: ${esc(sources.disadvantage.join(", "))}</div>`);
  if ( sources.autoFail ) out.push(`<div class="n5e-rd-why fail">Automatic failure: ${esc(sources.autoFail)}</div>`);
  return out.join("");
}

/** One empty "add a modifier" row. */
export function addedRowHTML(n, { types = null } = {}) {
  const typeSelect = types ? `<select name="addType_${n}" aria-label="Damage type">${Object.entries(types).map(([k, t]) =>
    `<option value="${esc(k)}">${esc(t.label ?? t)}</option>`).join("")}</select>` : "";
  return `<div class="n5e-rd-add" data-n5e-rd-add="${n}"><input type="text" name="addLabel_${n}" placeholder="Label (optional)" aria-label="Modifier label">
    <input type="text" name="addValue_${n}" placeholder="2, -1, 1d4" aria-label="Modifier value">${typeSelect}</div>`;
}

/**
 * d20 dialog content. parts: d20Parts / situationalParts (or groupParts with `group`).
 * @param {{parts, mode, sources?, stake?, group?: string[], baseLabel?: string}} view
 */
export function d20DialogHTML({ parts, mode = "normal", sources = {}, stake = "", group = null, secret = null }) {
  const rows = parts.map(p => {
    const value = group && !p.same ? "varies" : signed(p.value);
    const ticked = p.situational ? "" : "checked";
    return `<label class="n5e-rd-part ${p.situational ? "situational" : ""}"><input type="checkbox" name="on_${p.id}" ${ticked}>
      <span class="label">${esc(p.label)}</span><span class="value">${esc(value)}</span></label>`;
  }).join("");
  const total = group ? "" : `<div class="n5e-rd-total">1d20 <b data-n5e-rd-total>${signed(composeD20(parts, { on: [] }).bonus)}</b><span data-n5e-rd-dice></span></div>`;
  return `<div class="n5e-roll-dialog">
    ${group ? `<div class="n5e-rd-group">Rolling for: ${esc(group.join(", "))}</div>` : ""}
    ${stake ? `<div class="n5e-rd-stake">${esc(stake)}</div>` : ""}
    <div class="n5e-rd-parts">${rows}</div>
    <div class="n5e-rd-adds">${addedRowHTML(0)}</div>
    <button type="button" class="n5e-rd-more" data-n5e-rd-more>Add another modifier</button>
    ${total}
    ${modeRadios(mode, { own: group ? "Each creature's own" : null })}
    ${secret ? `<label class="n5e-rd-secret"><input type="checkbox" name="secret" ${secret.checked ? "checked" : ""}> Secret (GM only)</label>` : ""}
    ${sourceLines(sources)}
  </div>`;
}

/**
 * Dice dialog content. parts: diceParts (formula, type, flat).
 * @param {{parts, mode?, sources?, crit?, showCrit?, types?, own?: boolean, useMode?: boolean}} view
 */
export function diceDialogHTML({ parts, mode = "own", sources = {}, crit = false, showCrit = false, types = null, useMode = true }) {
  const typeLabel = k => (k && types?.[k] ? ` ${types[k].label ?? types[k]}` : k ? ` ${k}` : "");
  const rows = parts.map(p => `<label class="n5e-rd-part"><input type="checkbox" name="on_${p.id}" checked>
    <span class="label">${esc(p.label)}</span><span class="value">${esc(p.flat ? signed(Number(p.formula) || 0) : p.formula)}${esc(typeLabel(p.type))}</span></label>`).join("");
  return `<div class="n5e-roll-dialog dice">
    <div class="n5e-rd-parts">${rows}</div>
    <div class="n5e-rd-adds">${addedRowHTML(0, { types })}</div>
    <button type="button" class="n5e-rd-more" data-n5e-rd-more>Add another modifier</button>
    ${showCrit ? `<label class="n5e-rd-crit"><input type="checkbox" name="crit" ${crit ? "checked" : ""}> Critical (double the dice)</label>` : ""}
    ${useMode ? modeRadios(mode, { own: "As worked out" }) : ""}
    ${useMode ? sourceLines(sources) : ""}
  </div>`;
}

/** The form's values as a flat object (checkboxes as true/false). */
function formFields(form) {
  const out = {};
  for ( const el of form.elements ) {
    if ( !el.name ) continue;
    if ( el.type === "checkbox" ) out[el.name] = el.checked;
    else if ( el.type === "radio" ) { if ( el.checked ) out[el.name] = el.value; }
    else out[el.name] = el.value;
  }
  return out;
}

/** Live parts of the dialog: the running total, invalid entries, and "Add another modifier". */
function wire(root, parts, { types = null, d20 = true } = {}) {
  const form = root.querySelector("form") ?? root;
  const update = () => {
    const choice = readChoice(formFields(form), parts);
    for ( const input of form.querySelectorAll('[name^="addValue_"]') ) {
      const bad = input.value.trim() && !parseAdded(input.value).ok;
      input.classList.toggle("invalid", !!bad);
      input.title = bad ? "Use a number or dice: 2, -1, 1d4, 1d6+2" : "";
    }
    if ( !d20 ) return;
    const out = composeD20(parts, choice);
    const total = form.querySelector("[data-n5e-rd-total]");
    if ( total ) total.textContent = signed(out.bonus);
    const dice = form.querySelector("[data-n5e-rd-dice]");
    if ( dice ) dice.textContent = out.extra ? ` + ${out.extra}` : "";
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.querySelector("[data-n5e-rd-more]")?.addEventListener("click", ev => {
    ev.preventDefault();
    const list = form.querySelector(".n5e-rd-adds");
    list.insertAdjacentHTML("beforeend", addedRowHTML(list.children.length, { types }));
  });
}

async function open({ title, content, parts, types, d20, cancellable = true, fallback }) {
  const { DialogV2 } = foundry.applications.api;
  const result = await DialogV2.wait({
    window: { title }, content, classes: ["n5e-roll-dialog-window"], rejectClose: false,
    buttons: [{ action: "roll", label: "Roll", icon: "fa-solid fa-dice-d20", default: true,
      callback: (event, button) => readChoice(formFields(button.form), parts) }],
    render: (event, dialog) => wire(dialog.element, parts, { types, d20 })
  });
  if ( result ) return result;
  return cancellable ? null : fallback;
}

/**
 * d20 dialog. Resolves {off, on, added, mode} or null (closed). For a group, mode may be "own".
 * @param {{title, parts, mode, sources?, stake?, group?}} options
 */
async function d20Dialog(options) {
  return open({ title: options.title, content: d20DialogHTML(options), parts: options.parts, d20: !options.group });
}

/**
 * Dice dialog. Resolves {off, added, mode ("own" = as worked out), crit} or null. With
 * cancellable: false (a roll after a cost is paid), closing rolls as shown.
 */
async function diceDialog(options) {
  const fallback = { off: [], on: [], added: [], invalid: [], mode: "own", crit: !!options.crit };
  return open({ title: options.title, content: diceDialogHTML(options), parts: options.parts, types: options.types, d20: false,
    cancellable: options.cancellable !== false, fallback });
}

/** Indirection for tests. `enabled` null = follow the setting. */
export const dialogs = { enabled: null, d20: d20Dialog, dice: diceDialog };

/** "own" means: keep the mode the system worked out. */
export const chosenMode = (choice, worked) => (!choice?.mode || choice.mode === "own" ? worked : choice.mode);
