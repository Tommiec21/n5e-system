/**
 * Starting ability scores (King 2026-11-25): the first step of making a character. Offered on the
 * sheet (Ability Scores button) and before the first class, clan or background is applied, so those
 * increases land on top of the starting scores. Rules: rules/ability-generation.mjs.
 */
import { abilityGeneration, abilities } from "../config/core.mjs";
import { ABILITY_KEYS, METHODS, allowedMethods, scoreProblems, newAbilityValues, recordedIncreases, pointBuyCost } from "../rules/ability-generation.mjs";
import { rule } from "../rules-settings.mjs";
import { esc } from "../view-models/common.mjs";

const { DialogV2 } = foundry.applications.api;

/** Has this character's starting scores been set (or marked as set by hand)? */
export const hasStartingScores = actor => !!actor?.flags?.n5e?.abilityBase;

/** Pick the method (when the table allows more than one). */
async function pickMethod(actor, methods) {
  if ( methods.length === 1 ) return methods[0];
  return DialogV2.wait({
    window: { title: `${actor.name}: starting ability scores` },
    content: `<p>Choose how ${esc(actor.name)} gets the six starting ability scores. Clan, background and class increases are added on top.</p>`,
    buttons: [...methods.map((m, i) => ({ action: m, label: METHODS[m], default: i === 0 })),
      { action: "manual", label: "Already set by hand" }],
    rejectClose: false
  });
}

/** Roll 4d6 drop the lowest six times, post the rolls, and keep them on the character (no rerolls). */
async function rollScores(actor) {
  const kept = actor.flags?.n5e?.abilityRolls;
  if ( Array.isArray(kept) && kept.length === 6 ) return kept;
  const rolls = [];
  for ( let i = 0; i < 6; i++ ) rolls.push(await new Roll("4d6kh3").evaluate());
  const totals = rolls.map(r => r.total);
  await ChatMessage.implementation.create({ speaker: ChatMessage.getSpeaker({ actor }), rolls,
    content: `<p><strong>${esc(actor.name)}: starting ability scores</strong> (4d6, drop the lowest): ${totals.join(", ")}</p>` });
  await actor.setFlag("n5e", "abilityRolls", totals);
  return totals;
}

/** The assignment window for one method. Returns {str..cha} or null (cancelled). */
async function assign(actor, method, pool) {
  const prev = actor.flags?.n5e?.abilityBase?.scores ?? {};
  const pb = abilityGeneration.pointBuy;
  const field = k => {
    const label = abilities[k]?.label ?? k;
    if ( method === "pointBuy" ) return `<label class="ab-pick">${esc(label)} <input type="number" name="${k}" min="${pb.min}" max="${pb.max}" value="${prev[k] ?? pb.min}"></label>`;
    const opts = [...new Set(pool)].sort((a, b) => b - a).map(v => `<option value="${v}" ${Number(prev[k]) === v ? "selected" : ""}>${v}</option>`).join("");
    return `<label class="ab-pick">${esc(label)} <select name="${k}"><option value="">—</option>${opts}</select></label>`;
  };
  const intro = method === "pointBuy"
    ? `<p>${pb.points} points; each score 8 to 15 (costs: ${Object.entries(pb.cost).map(([s, c]) => `${s}=${c}`).join(", ")}). <b class="pb-total"></b></p>`
    : `<p>Assign each score once: ${pool.join(", ")}.</p>`;
  const content = `<div class="n5e-ability-setup">${intro}<div class="ab-grid">${ABILITY_KEYS.map(field).join("")}</div></div>`;
  while ( true ) {
    const scores = await DialogV2.wait({
      window: { title: `${actor.name}: ${METHODS[method]}` }, content,
      render: (event, dialog) => {
        // Point Buy: show the points spent as the player types.
        try {
          const root = dialog?.element ?? event?.target?.element;
          const out = root?.querySelector(".pb-total");
          if ( !out ) return;
          const update = () => {
            const s = Object.fromEntries(ABILITY_KEYS.map(k => [k, Number(root.querySelector(`[name="${k}"]`)?.value)]));
            const spent = pointBuyCost(s);
            out.textContent = spent === null ? "Scores must be 8 to 15." : `${spent} / ${pb.points} points spent.`;
          };
          root.addEventListener("input", update);
          update();
        } catch { /* the total is a convenience */ }
      },
      buttons: [{ action: "apply", label: "Apply", default: true,
        callback: (event, button) => Object.fromEntries(ABILITY_KEYS.map(k => [k, Number(button.form.elements[k].value)])) },
      { action: "cancel", label: "Cancel" }],
      rejectClose: false
    });
    if ( !scores || scores === "cancel" ) return null;
    const problems = scoreProblems(method, scores, pool);
    if ( !problems.length ) return scores;
    ui.notifications.warn(problems[0]);
  }
}

/**
 * Set (or change) a character's starting ability scores. Increases gained so far are kept.
 * @returns {Promise<boolean>} true when set (or marked as set by hand)
 */
export async function setStartingScores(actor) {
  if ( !actor?.isOwner ) return false;
  let ruleValue = "any";
  try { ruleValue = rule("abilityGeneration") ?? "any"; } catch { /* rules not ready: any */ }
  const method = await pickMethod(actor, allowedMethods(ruleValue));
  if ( !method ) return false;
  if ( method === "manual" ) {
    await actor.setFlag("n5e", "abilityBase", { method: "manual", scores: Object.fromEntries(ABILITY_KEYS.map(k => [k, actor._source.system.abilities[k].value])) });
    return true;
  }
  const pool = method === "standard" ? abilityGeneration.standardArray : method === "roll" ? await rollScores(actor) : [];
  const scores = await assign(actor, method, pool);
  if ( !scores ) return false;
  const current = Object.fromEntries(ABILITY_KEYS.map(k => [k, actor._source.system.abilities[k].value]));
  const old = actor.flags?.n5e?.abilityBase?.scores ?? null;
  const values = newAbilityValues(current, scores, old, recordedIncreases(actor.items));
  await actor.update({ ...Object.fromEntries(ABILITY_KEYS.map(k => [`system.abilities.${k}.value`, values[k]])),
    "flags.n5e.abilityBase": { method, scores } });
  ui.notifications.info(`${actor.name}: starting ability scores set (${METHODS[method]}).`);
  return true;
}

/** Before the first class, clan or background: offer the starting scores if they aren't set yet. */
export async function ensureStartingScores(actor) {
  if ( hasStartingScores(actor) ) return true;
  return setStartingScores(actor);
}
