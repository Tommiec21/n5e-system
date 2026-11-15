/**
 * PRESTD1 A-iv (King 2026-11-15): the crit and fumble tables, homebrew elements and the World Clock.
 */
import { rule } from "../rules-settings.mjs";
import { parseHomebrew, mergeHomebrew, worldTimeParts, CLOCK_STEPS, tableFor } from "../rules/variants.mjs";
import { esc } from "../view-models/common.mjs";

const { ApplicationV2 } = foundry.applications.api;

/** Homebrew keywords, weapon groups, damage types and languages join the config lists (at ready). */
export function applyHomebrew() {
  const N5E = CONFIG.N5E;
  mergeHomebrew(N5E.keywords, parseHomebrew(rule("homebrewKeywords")), label => ({ label, scope: "universal", homebrew: true }));
  mergeHomebrew(N5E.weaponGroups, parseHomebrew(rule("homebrewWeaponGroups")));
  mergeHomebrew(N5E.damageTypes, parseHomebrew(rule("homebrewDamageTypes")), label => ({ label, group: "special", homebrew: true }));
  mergeHomebrew(N5E.languages, parseHomebrew(rule("homebrewLanguages")));
}

/** A natural 20 or 1 on an attack card: a button that draws from the GM's table. */
export function renderTableButton(message, html) {
  const roll = message.flags?.n5e?.roll;
  const pick = roll ? tableFor(roll, { crit: rule("critTable"), fumble: rule("fumbleTable") }) : null;
  const card = html.querySelector("[data-n5e-roll]");
  if ( !pick || !card || card.querySelector("[data-n5e-table]") ) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.n5eTable = pick.name;
  button.innerHTML = `<i class="fa-solid fa-table-list"></i> ${pick.which === "crit" ? "Critical hit" : "Fumble"}: draw from ${esc(pick.name)}`;
  button.addEventListener("click", async ev => {
    ev.preventDefault();
    const table = game.tables.getName(pick.name);
    if ( !table ) return ui.notifications.warn(`No roll table named "${pick.name}".`);
    return table.draw();
  });
  card.append(button);
}

/** The World Clock window: the day and time for everyone; advance buttons for the GM. */
export class WorldClock extends ApplicationV2 {
  static DEFAULT_OPTIONS = { id: "n5e-world-clock", classes: ["n5e", "n5e-v2", "n5e-world-clock"], window: { title: "World Clock", icon: "fa-solid fa-clock" },
    position: { width: 320, height: "auto" }, actions: { advance: WorldClock.#onAdvance } };

  static #instance;
  static open() {
    this.#instance ??= new WorldClock();
    return this.#instance.render({ force: true });
  }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  /** @override */
  async _renderHTML() {
    const t = worldTimeParts(game.time.worldTime);
    const div = document.createElement("div");
    div.className = "n5e-clock";
    div.innerHTML = `<div class="time"><b>${esc(t.label)}</b></div>
      ${game.user.isGM ? `<div class="steps">${CLOCK_STEPS.map(s => `<button type="button" data-action="advance" data-seconds="${s.seconds}">${esc(s.label)}</button>`).join("")}</div>` : ""}`;
    return div;
  }

  /** @override */
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onAdvance(event, target) {
    if ( !game.user.isGM ) return null;
    return game.time.advance(Number(target.dataset.seconds) || 0);
  }
}

export function registerVariantTools() {
  Hooks.once("ready", () => { try { applyHomebrew(); } catch (error) { console.warn("n5e | homebrew elements", error); } });
  Hooks.on("updateWorldTime", () => WorldClock.refresh());
  Hooks.on("getSceneControlButtons", controls => {
    if ( !rule("worldClock") ) return;
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools ) return;
    tokens.tools.n5eClock = { name: "n5eClock", title: "N5e World Clock", icon: "fa-solid fa-clock", button: true,
      order: Object.keys(tokens.tools).length + 1, onChange: () => WorldClock.open() };
  });
}
