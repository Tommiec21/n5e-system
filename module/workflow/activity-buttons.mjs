import { createN5eRoll } from "../dice/n5e-roll.mjs";
/**
 * Chat card buttons for activities, and what happens when they're clicked.
 *
 * WHAT AN ACTIVITY IS
 *   One rollable or applicable part of an item: an attack, a save, damage, healing, a strike, an
 *   effect, a plain roll. Items either carry authored activities (system.activities, written by
 *   tools/content/automation.py or the item sheet) or get them parsed from their text
 *   (rules/activity-parse.mjs). effectiveActivities() picks which.
 *
 * TWO HALVES
 *   activityButtons() / damageButtons() / applyButtons()  build HTML for a card (cast card, item card,
 *     attack card). Each button stores everything its click needs in data-* attributes, because a
 *     chat card is saved as plain HTML in the ChatMessage and re-rendered later, possibly on another
 *     client; there is no in-memory object to point back to.
 *   onActivityClick()  runs when a [data-n5e-act] button is clicked (wired in dice/roll.mjs
 *     onRenderChatMessage). It reads the attributes, finds the caster from the message flags, pays a
 *     pool cost if the button has one, then does the action.
 *
 * BUTTON ATTRIBUTES (data-n5e-act="<kind>" plus):
 *   attack   bonus, scope (crit-range scope), label
 *   damage   parts (JSON [{formula, type}]), mod (ability mod, doubled on crits), crit, gen (Genjutsu:
 *            psychic ignores DR), weapon (counts as weapon damage: Binding Fury), pierce, cost
 *   save     ability, dc, four (four-tier Genjutsu save), resave, label, inflicts (JSON conditions
 *            offered as Apply buttons on a failure)
 *   heal     formula, pool (hp|cp|tempHp|tempCp)
 *   strike   strike (JSON: kind, dieSteps, extraDice, pierce, maximize, attacks), item, label, cost
 *   effect   effect (JSON: name, target, changes, expires, seconds, tempHp, state, exclusive, ampType),
 *            item, label, cost
 *   roll     formula, note, item, label, cost
 *   cost (any kind): JSON {pool, amount, roll, choose}; paid before the action. A rolled pool die is
 *     available to formulas as @poolRoll, a chosen amount as @amount; lvl(...) scales by level.
 *
 * WHO IT APPLIES TO
 *   Saves roll for the controlled tokens (else your assigned character). Healing and temp HP go to the
 *   controlled tokens (else the caster); temp HP doesn't stack (keep the higher). Damage is rolled
 *   here and posted as a damage card; its Apply buttons (workflow/apply-damage.mjs) run the damage
 *   pipeline on the selected tokens.
 *
 * ADDING A NEW ACTIVITY KIND
 *   1. Add its fields to activityFields() in data/fields/shared.mjs (unknown fields are dropped).
 *   2. Add a branch in activityButtons() that writes a button with data-n5e-act="<kind>".
 *   3. Add a case in onActivityClick() (and its kind to the cost list if it can have a cost).
 *   4. Optionally a builder in tools/content/automation.py; a test in tests/automation.test.mjs.
 *
 * Folder conventions (pure rules vs Foundry side, who runs what, ownership): workflow/turn.mjs header.
 */
import { esc, signed } from "../view-models/common.mjs";
import { unarmedFormula, critFormula } from "../rules/activity-parse.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { rollSpec } from "../dice/d20.mjs";
import { abilities } from "../config/core.mjs";
import { resistsAny } from "../rules/condition-lifecycle.mjs";
import { resolveFormula } from "../rules/unarmed.mjs";
import { featureDiscipline } from "../rules/features.mjs";
import { activeCoatings, spendCoatings } from "../rules/coatings.mjs";
import { executeActivity } from "./activity-execution.mjs";
import { activityKinds } from "../config/activities.mjs";
import { payPoolCost } from "./resources.mjs";
export { payPoolCost } from "./resources.mjs";
import { applyHealing } from "./health.mjs";
import { contextualModifiers } from "../rules/elements.mjs";

// A data-* attribute, or nothing when the value is empty. Buttons carry everything their click needs
// in these attributes (JSON for parts/costs/effects), because chat cards are stored as plain HTML.
const attr = (k, v) => (v === undefined || v === null || v === "" ? "" : ` data-${k}="${esc(String(v))}"`);
const typeLabel = types => types.map(t => CONFIG.N5E.damageTypes?.[t]?.label ?? t).join(" / ");

/**
 * Damage buttons (normal and critical) for a list of damage parts.
 * Each part keeps its own type so the damage card can apply DR once and resistance per type.
 * "@unarmed" in a formula is replaced at click time with the actor's current Unarmed damage
 * (rules/unarmed.mjs), so a stance change between casting and rolling is respected.
 * @param {Array<{formula: string, type?: string}>} parts
 * @param {object} [o]
 * @param {string} [o.label]        button text before the formula
 * @param {number|null} [o.abilityMod]  modifier the formula already adds (doubled on a crit, King ruling)
 * @param {boolean} [o.genjutsu]    Genjutsu psychic damage ignores DR
 * @param {boolean} [o.weapon]      weapon/Bukijutsu damage (Binding Fury Stance watches for it)
 * @param {number} [o.pierce]       extra Pierce on top of the actor's (Raiding Strike)
 * @param {object|null} [o.cost]    pool cost paid when clicked
 */
export function damageButtons(parts, { label = "Damage", abilityMod = null, genjutsu = false, weapon = false, pierce = 0, cost = null,
  piercing = false, weaponId = "", activity = null, itemId = "" } = {}) {
  if ( !parts?.length ) return "";
  const json = JSON.stringify(parts.map(p => ({ formula: p.formula, type: p.type ?? "" })));
  const shown = parts.map(p => `${p.formula.replace(/@unarmed/g, "[Unarmed]")}${p.type ? ` ${typeLabel([p.type])}` : ""}`).join(" + ");
  const common = `${activity ? attr("activity", activity.id || activity.label || activity.type) + attr("once", activity.oncePerTurn ? 1 : "") + attr("activation", activity.activation || "") + attr("item", itemId) : ""}${attr("parts", json)}${attr("weapon-id", weaponId)}${attr("mod", abilityMod)}${attr("gen", genjutsu ? 1 : "")}${attr("weapon", weapon ? 1 : "")}${attr("pierce", pierce || "")}${cost?.pool ? attr("cost", JSON.stringify(cost)) : ""}${attr("piercing", piercing ? 1 : "")}`;
  return `<button type="button" data-n5e-act="damage"${common}><i class="fa-solid fa-burst"></i> ${esc(label)}: ${esc(shown)}</button>
    <button type="button" class="crit" data-n5e-act="damage" data-crit="1"${common}>Critical</button>`;
}

/**
 * Apply buttons for a rolled damage card. The card stores the rolled instances in its message flags
 * (flags.n5e.damage); these buttons only say how to apply them (full, half, double, or as healing).
 */
export function applyButtons() {
  return `<div class="n5e-apply" data-n5e-apply-row>
    <button type="button" data-n5e-apply="full" data-tooltip="Apply to the selected tokens (to intercept: select the interceptor)"><i class="fa-solid fa-heart-crack"></i> Apply</button>
    <button type="button" data-n5e-apply="half" data-tooltip="Half damage (e.g. a successful save)">Half</button>
    <button type="button" data-n5e-apply="double" data-tooltip="Double damage (vulnerability effects that say so)">×2</button>
    <button type="button" data-n5e-apply="heal" data-tooltip="Heal the selected tokens by this amount">Heal</button></div>`;
}

/**
 * Buttons for an item's activities, one row per activity.
 * The branches run in order and the first match handles an activity: strikes, effects, feature saves,
 * rolls and costed damage (authored kinds) come first; attack / save / damage / heal (the kinds the
 * text parser produces, also used by jutsu) last. Activities above the actor's level are skipped.
 * @param {Actor} actor   the owner (DCs, bonuses and pool labels come from them)
 * @param {Item} item
 * @param {object[]} activities  from effectiveActivities(item), or built on the fly (cast extras)
 * @returns {string} HTML
 */
export function activityButtons(actor, item, activities, { flags = {} } = {}) {
  const live = item.system.live ?? {};
  // Cast-time flags from the Moldings chosen (workflow/cast.mjs): Precise = advantage on the attack,
  // Heightened = the first target's save at disadvantage, Piercing = damage ignores resistance and half DR.
  const castAttrs = { attack: flags.precise ? attr("adv", 1) : "", save: flags.heightened ? attr("dis", 1) : "",
    damage: flags.piercing ? { piercing: true } : {} };
  const rows = [];
  const level = actor?.system?.level ?? 0;
  // Save DC: a jutsu's own; otherwise the discipline the activity names ("Taijutsu save DC"), else the item's.
  const dcFor = a => {
    if ( item.type === "jutsu" ) return live.dc;
    const src = a.save?.dc?.source;
    const disc = ["nin", "tai", "gen"].includes(src) ? src : (item.system.discipline || featureDiscipline(item));
    return actor.system.disciplines?.[disc === "buki" ? "tai" : disc]?.dc;
  };
  // Attributes every authored button shares: which item, its label, and its pool cost.
  const common = a => `${attr("activity", a.id || a.label || a.type)}${attr("once", a.oncePerTurn ? 1 : "")}${attr("activation", a.activation || "")}${attr("item", item.id)}${attr("label", a.label || item.name)}${a.cost?.pool ? attr("cost", JSON.stringify(a.cost)) : ""}`;
  // " · 1 Superiority Dice" after the button text, so the player sees the price before clicking.
  const costNote = a => (a.cost?.gain ? ` · +${a.cost.amount || 1} ${esc(actor.system.resources?.[a.cost.pool]?.label ?? a.cost.pool)}` : a.cost?.pool ? ` · ${a.cost.amount} ${esc(actor.system.resources?.[a.cost.pool]?.label ?? a.cost.pool)}` : "");
  // A save button for activities that have one (strikes and effects can carry a save too, e.g.
  // Bone Breaking Strike: attack, then the target's Strength save against Bruised).
  const saveButton = a => {
    if ( !a.save?.abilities || ![...a.save.abilities].length ) return "";
    const ab = [...a.save.abilities][0];
    const dc = dcFor(a);
    return `<button type="button" data-n5e-act="save"${attr("ability", ab)}${attr("dc", dc)}${attr("four", a.save?.fourTier ? 1 : "")}${attr("tiers", JSON.stringify(a.save?.tiers ?? {}))}${attr("resave", a.save?.resave ? 1 : "")}${castAttrs.save}
      ${attr("label", a.label || item.name)}${attr("inflicts", a.inflicts?.length ? JSON.stringify(a.inflicts) : "")}><i class="fa-solid fa-shield-halved"></i>
      DC ${dc} ${esc(abilities[ab]?.label ?? ab)} save${a.inflicts?.length ? ` · ${esc(a.inflicts.map(i => i.label).join(", "))}` : ""}</button>`;
  };
  // A save's cost belongs to the user, but the save button belongs to the defenders (any owner can
  // click it), so a costed save without damage buttons to carry the cost gets its own Pay button.
  const payButton = a => (a.cost?.pool && !a.damage?.parts?.length
    ? `<button type="button" data-n5e-act="roll"${common(a)}><i class="fa-solid fa-coins"></i> Use ${esc(a.label || item.name)}${costNote(a)}</button>` : "");
  for ( const a of activities ) {
    if ( a.minLevel && level < a.minLevel ) continue;
    if ( activityKinds[a.type] === "manual" || !activityKinds[a.type] ) {
      rows.push(`<p class="hint">${esc(a.label || a.type)}: ${esc(a.text || "Resolve this activity manually using the item description.")}</p>`);
      continue;
    }
    if ( a.type === "summon" && a.summon?.uuid ) {
      const units = { round: 6, minute: 60, hour: 3600, day: 86400 };
      const duration = item.system.duration ?? {};
      const seconds = (units[duration.unit] ?? 60) * (duration.value || 1);
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="summon"${common(a)}${attr("summon", JSON.stringify(a.summon))}${attr("seconds", seconds)}${attr("concentration", duration.concentration ? 1 : "")}>Summon: ${esc(a.label || item.name)} (GM)</button></div>`);
      continue;
    }
    // Strike: an Unarmed or weapon attack with changes (workflow/attack.mjs strikeAttack). The label
    // summarizes the changes, e.g. "Wolf Fang Fist (Unarmed, die +1 step)".
    if ( a.type === "attack" && a.strike?.kind ) {
      const s = a.strike;
      const bits = [s.kind === "unarmed" ? "Unarmed" : "Weapon", s.dieSteps ? `die ${s.dieSteps > 0 ? "+" : ""}${s.dieSteps} step` : "",
        s.extraDice ? `+${s.extraDice.replace(/lvl\([^)]*\)/g, "")}` : "", s.pierce ? `Pierce ${s.pierce}` : "", s.maximize ? "max die" : ""].filter(Boolean).join(", ");
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="strike"${common(a)}${attr("strike", JSON.stringify(s))}>
        <i class="fa-solid fa-hand-fist"></i> ${esc(a.label || "Strike")} (${esc(bits)})${costNote(a)}</button>${saveButton(a)}</div>`);
      continue;
    }
    // Effect: creates an Active Effect on the caster or the targeted tokens (workflow/trackers.mjs
    // applyActivityEffect), optionally ending on the caster's turn.
    if ( a.type === "effect" ) {
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="effect"${common(a)}${attr("effect", JSON.stringify(a.effect ?? {}))}>
        <i class="fa-solid fa-wand-sparkles"></i> ${esc(a.label || "Apply")}${a.effect?.target === "targets" ? " (targets)" : ""}${costNote(a)}</button>${saveButton(a)}</div>`);
      continue;
    }
    // Feature save with a named DC source ("vs your Taijutsu save DC"): save button + optional damage.
    if ( a.type === "save" && a.save?.dc?.source && item.type !== "jutsu" ) {
      rows.push(`<div class="act-row">${payButton(a)}${saveButton(a)}${damageButtons(a.damage?.parts, { cost: a.cost, label: a.label ? `${a.label} damage` : "Damage" })}</div>`);
      continue;
    }
    // Roll: "roll this and add it" (Tactics +2, Tenacious 1d10). With an empty formula the button
    // only pays its cost, which rolls the pool die (Seize, Knock Back).
    if ( a.type === "roll" ) {
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="roll"${common(a)}${attr("formula", a.roll?.formula)}${attr("note", a.roll?.note)}>
        <i class="fa-solid fa-dice"></i> ${esc(a.label || "Roll")}${a.roll?.formula ? `: ${esc(a.roll.formula.replace(/lvl\(([^)]*)\)/g, "…"))}` : ""}${costNote(a)}</button></div>`);
      continue;
    }
    // Check: a skill check for the user (Hunters Exploits, Eye for Skill): "Perception check vs its AC".
    if ( a.type === "check" && (a.check?.skill || a.check?.tool) ) {
      const key = a.check.skill || a.check.tool;
      const label = a.check.skill ? CONFIG.N5E?.skills?.[key]?.label ?? key : CONFIG.N5E?.toolkits?.[key]?.label ?? key;
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="check"${common(a)}${attr("skill", a.check.skill)}${attr("tool", a.check.tool)}>
        <i class="fa-solid fa-dice-d20"></i> ${esc(a.label || `${label} check`)}${costNote(a)}</button>${a.text ? `<span class="hint">${esc(a.text)}</span>` : ""}</div>`);
      continue;
    }
    // Damage that costs a pool (Warfare's attack bonus): the cost rides on the damage buttons.
    if ( a.type === "damage" && a.cost?.pool ) {
      rows.push(`<div class="act-row">${damageButtons(a.damage?.parts, { cost: a.cost, activity: a, itemId: item.id, label: a.label || "Damage" })}</div>`);
      continue;
    }
    // Parsed kinds. Attack bonus: a jutsu's own live bonus (ability, Hijutsu, effects); otherwise the
    // discipline's (Bukijutsu attacks use the Taijutsu numbers).
    if ( a.type === "attack" ) {
      const disc = a.attack?.discipline || item.system.discipline;
      const bonus = item.type === "jutsu" ? live.attack : actor.system.disciplines?.[disc === "buki" ? "tai" : disc]?.attack ?? 0;
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="attack"${attr("bonus", bonus)}${attr("scope", disc)}${castAttrs.attack}
        ${attr("label", `${a.authored && a.label ? a.label : item.name} attack`)}><i class="fa-solid fa-dice-d20"></i> ${esc(a.authored && a.label ? `${a.label}: ` : "")}${esc(a.attack?.range === "ranged" ? "Ranged" : "Melee")} attack ${signed(bonus)}${flags.precise ? " (advantage)" : ""}</button>
        ${damageButtons(a.damage?.parts, { genjutsu: item.system.discipline === "gen" || disc === "gen", weapon: item.system.discipline === "buki", ...castAttrs.damage })}</div>`);
    } else if ( a.type === "save" ) {
      const ab = [...(a.save?.abilities ?? [])][0];
      const dc = dcFor(a);
      rows.push(`<div class="act-row">${payButton(a)}<button type="button" data-n5e-act="save"${attr("ability", ab)}${attr("dc", dc)}${castAttrs.save}
        ${attr("four", a.save?.fourTier ? 1 : "")}${attr("tiers", JSON.stringify(a.save?.tiers ?? {}))}${attr("resave", a.save?.resave ? 1 : "")}${attr("label", item.name)}${attr("inflicts", a.inflicts?.length ? JSON.stringify(a.inflicts) : "")}><i class="fa-solid fa-shield-halved"></i>
        DC ${dc} ${esc(abilities[ab]?.label ?? ab)} save${a.save?.onSuccess === "half" ? " (half on success)" : ""}${a.save?.fourTier ? " · four-tier" : ""}${a.inflicts?.length ? ` · ${esc(a.inflicts.map(i => i.label).join(", "))}` : ""}${flags.heightened ? " (first target: disadvantage)" : ""}</button>
        ${damageButtons(a.damage?.parts, { genjutsu: item.system.discipline === "gen", weapon: item.system.discipline === "buki", ...castAttrs.damage })}</div>`);
    } else if ( a.type === "damage" ) {
      // Authored damage keeps its own name on the button ("Lethal Attack", "Take Life").
      rows.push(`<div class="act-row">${damageButtons(a.damage?.parts, { genjutsu: item.system.discipline === "gen", weapon: item.system.discipline === "buki",
        activity: a, itemId: item.id, label: a.label && a.label !== "Damage" ? a.label : "Damage" })}${a.text ? `<span class="hint">${esc(a.text)}</span>` : ""}</div>`);
    } else if ( a.type === "heal" ) {
      rows.push(`<div class="act-row"><button type="button" data-n5e-act="heal"${attr("formula", a.heal?.formula)}${attr("pool", a.heal?.pool)}${a.cost?.pool ? attr("cost", JSON.stringify(a.cost)) : ""}>
        <i class="fa-solid fa-heart"></i> ${esc(a.label)}: ${esc(String(a.heal?.formula ?? "").replace(/lvl\(([^)]*)\)/g, "…"))}${costNote(a)}</button>${a.text ? `<span class="hint">${esc(a.text)}</span>` : ""}</div>`);
    }
  }
  return rows.length ? `<div class="n5e-acts">${rows.join("")}</div>` : `<p class="hint">No rollable parts found in the text.</p>`;
}

/**
 * Actors a save/heal applies to: controlled tokens, else the user's assigned character, else the
 * fallback (the caster, for healing). Saves pass no fallback: someone must be selected.
 */
function targetsOrSelf(fallback) {
  const controlled = canvas?.tokens?.controlled?.map(t => t.actor).filter(Boolean) ?? [];
  if ( controlled.length ) return controlled;
  if ( game.user.character ) return [game.user.character];
  return fallback ? [fallback] : [];
}

/**
 * Handle a click on a [data-n5e-act] button.
 * The caster is whoever the card belongs to: cast cards store flags.n5e.cast.actorUuid, roll cards
 * flags.n5e.roll.actorUuid, item and damage cards flags.n5e.actorUuid; else the message speaker.
 * @param {ChatMessage} message  the card's message
 * @param {HTMLElement} button   the clicked button (its dataset holds the activity data)
 * @param {Event} event          the click (Shift/Alt/Ctrl pick the roll mode, see dice/d20.mjs)
 */
async function executeActivityClick(message, button, event, { healingTargets = null } = {}) {
  const d = button.dataset;
  const speaker = CONFIG.ChatMessage.documentClass.getSpeaker;
  const casterUuid = message.getFlag("n5e", "cast")?.actorUuid ?? message.getFlag("n5e", "roll")?.actorUuid
    ?? message.getFlag("n5e", "actorUuid");
  const caster = casterUuid ? await fromUuid(casterUuid) : message.speakerActor;
  // Activities with a pool cost (e.g. 1 Superiority Die) pay it first; a rolled pool die is @poolRoll.
  let poolRoll = null;
  let amount = 1;
  let payment = null;
  if ( d.cost && ["strike", "effect", "attack", "damage", "heal", "roll", "check"].includes(d.n5eAct) ) {
    if ( !caster?.isOwner ) return fail("warn", "Only the owner can use this.");
    const paid = await payPoolCost(caster, JSON.parse(d.cost), { locked: true });
    if ( !paid ) return null;
    payment = paid;
    poolRoll = paid.roll;
    amount = paid.amount;
  }
  // Formula pre-processing: @amount (chosen pool amount), @poolRoll (rolled pool die), lvl(...)
  // (level scaling) and @level. Everything else (@abilities..., dice) is left for Roll.
  const level = f => resolveFormula(String(f ?? "").replace(/@amount/g, String(amount)).replace(/@poolRoll/g, String(poolRoll ?? 0)), caster);
  // One case per data-n5e-act value written by activityButtons()/damageButtons().
  switch ( d.n5eAct ) {
    case "summon": {
      if ( !game.user.isGM ) return fail("info", "Ask the GM to use the Summon button on this card.");
      const { summonTokens } = await import("./automation.mjs");
      try {
        return await summonTokens(caster, caster?.items.get(d.item), { ...JSON.parse(d.summon || "{}"), seconds: Number(d.seconds), concentration: !!d.concentration });
      } catch (error) { return fail("warn", error.message); }
    }
    case "strike": {
      if ( !caster?.isOwner ) return fail("warn", "Only the owner can make this attack.");
      const { strikeAttack } = await import("./attack.mjs");
      return strikeAttack(caster, JSON.parse(d.strike || "{}"), { event, label: d.label, poolRoll });
    }
    case "check": {
      if ( !caster?.isOwner ) return fail("warn", "Only the owner can roll this check.");
      const spec = d.skill ? rollSpec(caster, "skill", d.skill) : rollSpec(caster, "tool", d.tool);
      return rollWithSpec(caster, { ...spec, label: d.label || spec.label }, { event });
    }
    case "roll": {
      const formula = level(d.formula);
      const roll = formula ? await createN5eRoll(formula, caster?.getRollData?.() ?? {}).evaluate() : null;
      if ( !roll ) return payment;
      return roll.toMessage({ speaker: speaker({ actor: caster }),
        flavor: `<div class="n5e-roll-card"><header><b>${esc(d.label)}</b><span class="bonus">${roll.total}</span></header>${d.note ? `<div class="note">${esc(d.note)}</div>` : ""}</div>` });
    }
    case "effect": {
      if ( !caster?.isOwner ) return fail("warn", "Only the owner can use this.");
      const { applyActivityEffect } = await import("./trackers.mjs");
      return applyActivityEffect(caster, JSON.parse(d.effect || "{}"), { label: d.label, item: caster.items.get(d.item), poolRoll });
    }
    case "attack": {
      if ( !caster?.isOwner ) return fail("warn", "Only the caster's owner can roll this attack.");
      return rollWithSpec(caster, { type: "jutsuAttack", kind: "attack", label: d.label, bonus: Number(d.bonus) || 0, scope: d.scope },
        { event, mode: d.adv ? "advantage" : undefined });
    }
    case "damage": {
      // Roll each part on its own so every damage type keeps its amount (the damage pipeline needs
      // typed instances). Crits double every die and the ability modifier, nothing else.
      const actor = caster;
      const parts = JSON.parse(d.parts || "[]");
      const weapon = d.weaponId ? actor?.items.get(d.weaponId) : null;
      const coatings = weapon ? activeCoatings(weapon, game.time.worldTime) : [];
      if ( coatings.length && !weapon.isOwner ) return fail("warn", "Only the weapon owner can roll coated damage.");
      parts.push(...coatings.flatMap(c => c.parts.map(p => ({ ...p, abilityMod: 0 }))));
      const targets = Array.from(game.user?.targets ?? []);
      const modifiers = actor ? contextualModifiers(actor, { kind: "damage", type: "damage", scope: d.weapon ? "weapon" : d.gen ? "gen" : "" }, targets.length === 1 ? targets[0].actor : null) : { parts: [], bonus: 0 };
      if ( modifiers.bonus && parts.length ) parts[0] = { ...parts[0], formula: `(${parts[0].formula}) + (${modifiers.bonus})` };
      const crit = !!d.crit;
      const strMod = actor?.system.abilities?.str?.mod ?? 0;
      const instances = [];
      const rolls = [];
      for ( const p of parts ) {
        let formula = level(p.formula);
        let abilityMod = p.abilityMod ?? (d.mod !== undefined ? Number(d.mod) : null);
        if ( formula.includes("@unarmed") ) {
          formula = formula.replace(/@unarmed/g, `(${unarmedFormula(actor)})`);
          abilityMod = abilityMod ?? strMod;
        }
        const roll = await createN5eRoll(crit ? critFormula(formula, abilityMod) : formula, actor?.getRollData?.() ?? {}).evaluate();
        rolls.push(roll);
        instances.push({ amount: roll.total, type: p.type });
      }
      const total = instances.reduce((t, i) => t + i.amount, 0);
      if ( coatings.length ) await weapon.update({ "flags.n5e.coatings": spendCoatings(coatings) });
      // Binding Fury Stance: the first weapon damage each turn grants Fury (no-op otherwise).
      if ( d.weapon && actor?.isOwner ) await import("./trackers.mjs").then(m => m.onWeaponDamage(actor));
      // Pierce lowers the target's DR when applied: the actor's own plus the button's (Raiding Strike).
      const pierce = (actor?.system.pierce ?? 0) + (Number(d.pierce) || 0);
      const types = instances.map(i => i.type).filter(Boolean);
      const lines = instances.map(i => `${i.amount}${i.type ? ` ${typeLabel([i.type])}` : ""}`).join(" + ");
      // The damage card. flags.n5e.damage is what its Apply buttons read (workflow/apply-damage.mjs).
      const ChatMessageCls = CONFIG.ChatMessage.documentClass;
      return ChatMessageCls.create({ speaker: speaker({ actor }), rolls,
        content: `<div class="n5e-roll-card damage"><header><b>${crit ? "Critical damage" : "Damage"}</b>
          <span class="mode">${esc(typeLabel(types))}</span><span class="bonus">${total}</span></header>
          <div class="note">${esc(lines)}${pierce ? ` · Pierce ${pierce}` : ""}${crit ? " · dice and ability modifier doubled" : ""}</div>
          ${modifiers.parts.length ? `<div class="note">${esc(modifiers.parts.map(p => `${p.label}: ${signed(p.value)}`).join(" · "))}</div>` : ""}
          ${coatings.length ? `<div class="note">${esc(coatings.map(c => c.label).join(", "))} · uses spent on this damage roll</div>` : ""}
          ${applyButtons()}</div>`,
        flags: { n5e: { damage: { instances, crit, total, pierce, genjutsu: !!d.gen, piercing: !!d.piercing }, actorUuid: actor?.uuid ?? null } } });
    }
    case "save": {
      const dc = Number(d.dc);
      const targets = targetsOrSelf(null);
      if ( !targets.length ) return fail("info", "Select the tokens that roll the save.");
      let first = true;
      let rolled = 0;
      for ( const t of targets ) {
        if ( !t.isOwner ) continue;
        const spec = { ...rollSpec(t, "save", d.ability), label: `${abilities[d.ability]?.label ?? d.ability} save vs ${d.label}` };
        // What a failure inflicts becomes Apply buttons on the save card (not automatic: many jutsu
        // only inflict under conditions in their text). With a resave, the applied condition remembers
        // the save so the end-of-turn card can offer it again (workflow/trackers.mjs).
        const inflicts = JSON.parse(d.inflicts || "[]");
        const onFail = inflicts.length ? `<div class="n5e-apply">${inflicts.map(i =>
          `<button type="button" data-n5e-inflict="${esc(i.key)}" data-kind="${esc(i.kind)}" data-ranks="${i.ranks}"${d.resave ? ` data-resave="${esc(JSON.stringify({ ability: d.ability, dc, label: d.label }))}"` : ""}>Apply ${esc(i.label)}${i.kind === "condition" ? ` ${i.ranks}` : ""}</button>`).join("")}</div>` : "";
        // Condition resistance (optional rule): advantage on saves against a condition you resist.
        const resisted = resistsAny(t, inflicts.filter(i => i.kind === "condition").map(i => i.key));
        if ( resisted ) spec.note = [spec.note, "Advantage: resists the condition"].filter(Boolean).join(" · ");
        // Heightened Ninjutsu: the first target rolls at disadvantage (resistance cancels it out).
        const dis = d.dis && first;
        first = false;
        const mode = resisted && dis ? undefined : resisted ? "advantage" : dis ? "disadvantage" : undefined;
        await rollWithSpec(t, spec, { event, dc, fourTier: !!d.four, onFail, mode, target: caster, tiers: JSON.parse(d.tiers || "{}") });
        rolled++;
      }
      return rolled ? { saves: rolled } : null;
    }
    case "heal": {
      const roll = await createN5eRoll(level(d.formula), caster?.getRollData?.() ?? {}).evaluate();
      const pool = d.pool || "hp";
      const names = [];
      for ( const t of healingTargets ?? targetsOrSelf(caster) ) {
        if ( !t.isOwner ) continue;
        const result = await applyHealing(t, roll.total, pool, { locked: true });
        if ( result.blocked ) ui.notifications.warn(`${t.name}: ${result.blocked}`);
        else names.push(t.name);
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

/**
 * Warn (or inform) and report a failed click. The runner (activity-execution.mjs) refunds any cost
 * and skips the once-per-turn and action-economy bookkeeping when a handler returns null.
 */
function fail(level, message) {
  ui.notifications[level](message);
  return null;
}

/** All activity kinds share validation, turn limits, resource refund and hook handling. */
export function onActivityClick(message, button, event) {
  return executeActivity(message, button, event, executeActivityClick, targetsOrSelf);
}
