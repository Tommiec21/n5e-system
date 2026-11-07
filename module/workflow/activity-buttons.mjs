/**
 * Chat card buttons for activities: attack, damage (and crit damage), targets' saves, healing and
 * temporary HP. Buttons carry their data in data-attributes so any card (cast card, attack card)
 * can use them; onActivityClick dispatches.
 *
 * Saves roll for the controlled tokens (or your assigned character). Healing and temp HP apply to the
 * controlled tokens (or the caster): temp HP doesn't stack (keep the higher). Damage is rolled here;
 * applying it to tokens (DR, resistance, interception) is Phase 4.
 */
import { esc, signed } from "../view-models/common.mjs";
import { unarmedFormula, critFormula } from "../rules/activity-parse.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { rollSpec } from "../dice/d20.mjs";
import { abilities } from "../config/core.mjs";

const attr = (k, v) => (v === undefined || v === null || v === "" ? "" : ` data-${k}="${esc(String(v))}"`);
const typeLabel = types => types.map(t => CONFIG.N5E.damageTypes?.[t]?.label ?? t).join(" / ");

/** Damage buttons (normal and critical) for a list of damage parts. */
export function damageButtons(parts, { label = "Damage", abilityMod = null } = {}) {
  if ( !parts?.length ) return "";
  const formula = parts.map(p => p.formula).join(" + ");
  const types = parts.map(p => p.type).filter(Boolean);
  const shown = formula.replace(/@unarmed/g, "[Unarmed]");
  return `<button type="button" data-n5e-act="damage"${attr("formula", formula)}${attr("types", types.join(","))}${attr("mod", abilityMod)}>
      <i class="fa-solid fa-burst"></i> ${esc(label)}: ${esc(shown)} ${esc(typeLabel(types))}</button>
    <button type="button" class="crit" data-n5e-act="damage" data-crit="1"${attr("formula", formula)}${attr("types", types.join(","))}${attr("mod", abilityMod)}>
      Critical</button>`;
}

/**
 * Buttons for a jutsu/feature's activities.
 * @param {Actor} actor
 * @param {Item} item
 * @param {object[]} activities
 */
export function activityButtons(actor, item, activities) {
  const live = item.system.live ?? {};
  const rows = [];
  for ( const a of activities ) {
    if ( a.type === "attack" ) {
      const disc = a.attack?.discipline || item.system.discipline;
      const bonus = item.type === "jutsu" ? live.attack : actor.system.disciplines?.[disc === "buki" ? "tai" : disc]?.attack ?? 0;
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="attack"${attr("bonus", bonus)}${attr("scope", disc)}
        ${attr("label", `${item.name} attack`)}><i class="fa-solid fa-dice-d20"></i> ${esc(a.attack?.range === "ranged" ? "Ranged" : "Melee")} attack ${signed(bonus)}</button>
        ${damageButtons(a.damage?.parts)}</div>`);
    } else if ( a.type === "save" ) {
      const ab = [...(a.save?.abilities ?? [])][0];
      const dc = item.type === "jutsu" ? live.dc : actor.system.disciplines?.[item.system.discipline]?.dc;
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="save"${attr("ability", ab)}${attr("dc", dc)}
        ${attr("four", a.save?.fourTier ? 1 : "")}${attr("label", item.name)}><i class="fa-solid fa-shield-halved"></i>
        DC ${dc} ${esc(abilities[ab]?.label ?? ab)} save${a.save?.onSuccess === "half" ? " (half on success)" : ""}${a.save?.fourTier ? " · four-tier" : ""}</button>
        ${damageButtons(a.damage?.parts)}</div>`);
    } else if ( a.type === "damage" ) {
      rows.push(`<div class="act-row">${damageButtons(a.damage?.parts)}</div>`);
    } else if ( a.type === "heal" ) {
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="heal"${attr("formula", a.heal?.formula)}${attr("pool", a.heal?.pool)}>
        <i class="fa-solid fa-heart"></i> ${esc(a.label)}: ${esc(a.heal?.formula)}</button></div>`);
    }
  }
  return rows.length ? `<div class="n5e-acts">${rows.join("")}</div>` : `<p class="hint">No rollable parts found in the text.</p>`;
}

/** Actors a save/heal applies to: controlled tokens, else the user's character, else the fallback. */
function targetsOrSelf(fallback) {
  const controlled = canvas?.tokens?.controlled?.map(t => t.actor).filter(Boolean) ?? [];
  if ( controlled.length ) return controlled;
  if ( game.user.character ) return [game.user.character];
  return fallback ? [fallback] : [];
}

/**
 * Handle a click on a [data-n5e-act] button.
 * @param {ChatMessage} message
 * @param {HTMLElement} button
 * @param {Event} event
 */
export async function onActivityClick(message, button, event) {
  const d = button.dataset;
  const speaker = CONFIG.ChatMessage.documentClass.getSpeaker;
  const casterUuid = message.getFlag("n5e", "cast")?.actorUuid ?? message.getFlag("n5e", "roll")?.actorUuid
    ?? message.getFlag("n5e", "actorUuid");
  const caster = casterUuid ? await fromUuid(casterUuid) : message.speakerActor;
  switch ( d.n5eAct ) {
    case "attack": {
      if ( !caster?.isOwner ) return ui.notifications.warn("Only the caster's owner can roll this attack.");
      return rollWithSpec(caster, { type: "jutsuAttack", kind: "attack", label: d.label, bonus: Number(d.bonus) || 0, scope: d.scope }, { event });
    }
    case "damage": {
      const actor = caster;
      let formula = d.formula;
      let abilityMod = d.mod !== undefined ? Number(d.mod) : null;
      if ( formula.includes("@unarmed") ) {
        formula = formula.replace(/@unarmed/g, `(${unarmedFormula(actor)})`);
        abilityMod = abilityMod ?? actor?.system.abilities?.str?.mod ?? null;
      }
      const crit = !!d.crit;
      const final = crit ? critFormula(formula, abilityMod) : formula;
      const roll = await new Roll(final, actor?.getRollData?.() ?? {}).evaluate();
      const types = (d.types || "").split(",").filter(Boolean);
      return roll.toMessage({ speaker: speaker({ actor }),
        flavor: `<div class="n5e-roll-card damage"><header><b>${crit ? "Critical damage" : "Damage"}</b>
          <span class="mode">${esc(typeLabel(types))}</span></header>
          ${crit ? "<div class=\"note\">Dice and ability modifier doubled.</div>" : ""}</div>`,
        flags: { n5e: { damage: { types, crit, total: roll.total } } } });
    }
    case "save": {
      const dc = Number(d.dc);
      const targets = targetsOrSelf(null);
      if ( !targets.length ) return ui.notifications.info("Select the tokens that roll the save.");
      for ( const t of targets ) {
        if ( !t.isOwner ) continue;
        const spec = { ...rollSpec(t, "save", d.ability), label: `${abilities[d.ability]?.label ?? d.ability} save vs ${d.label}` };
        await rollWithSpec(t, spec, { event, dc, fourTier: !!d.four });
      }
      return null;
    }
    case "heal": {
      const roll = await new Roll(d.formula, caster?.getRollData?.() ?? {}).evaluate();
      const pool = d.pool || "hp";
      const names = [];
      for ( const t of targetsOrSelf(caster) ) {
        if ( !t.isOwner ) continue;
        const s = t.system;
        if ( pool === "tempHp" ) await t.update({ "system.hp.temp": Math.max(s.hp.temp ?? 0, roll.total) });
        else if ( pool === "tempCp" ) await t.update({ "system.cp.temp": Math.max(s.cp.temp ?? 0, roll.total) });
        else if ( pool === "cp" ) await t.update({ "system.cp.value": Math.min(s.cp.max, s.cp.value + roll.total) });
        else await t.update({ "system.hp.value": Math.min(s.hp.max, s.hp.value + roll.total) });
        names.push(t.name);
      }
      const what = { tempHp: "temporary HP", tempCp: "temporary CP", cp: "CP", hp: "HP" }[pool];
      return roll.toMessage({ speaker: speaker({ actor: caster }),
        flavor: `<div class="n5e-roll-card heal"><header><b>${esc(what)}</b></header>
          <div class="note">${names.length ? `Applied to ${esc(names.join(", "))}${pool.startsWith("temp") ? " (temporary HP doesn't stack: keeps the higher)" : ""}` : "Not applied (no owned target)"}</div></div>` });
    }
    default:
      return null;
  }
}
