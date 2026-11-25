/**
 * Starting ability scores (King 2026-11-25; CREATE1 C1). One window: the player toggles between the
 * methods the GM turned on (Point Buy, the Standard Array, Roll), assigns the six scores and applies.
 * Offered when a character is made (to its creator, and to an owning player the first time they open
 * it), before its first class, clan or background, and from the sheet. Rules: rules/ability-generation.mjs.
 */
import { abilityGeneration, abilities } from "../config/core.mjs";
import { ABILITY_KEYS, methodsFrom, scoreProblems, newAbilityValues, recordedIncreases, pointBuyCost, DEFAULT_CONFIG } from "../rules/ability-generation.mjs";
import { esc } from "../view-models/common.mjs";

const { DialogV2 } = foundry.applications.api;

/** Has this character's starting scores been set (or marked as set by hand)? */
export const hasStartingScores = actor => !!actor?.flags?.n5e?.abilityBase;

/** The GM's setup (world setting). */
export function generationConfig() {
  try { return game.settings.get("n5e", "abilityGenerationConfig") ?? DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; }
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

/** The window's HTML: a method toggle and one section per method. */
function windowHTML(actor, methods, rolls) {
  const prev = actor.flags?.n5e?.abilityBase ?? {};
  const pb = abilityGeneration.pointBuy;
  const first = methods.find(m => m.key === prev.method)?.key ?? methods[0].key;
  const pick = (method, k, pool) => {
    const v = prev.method === method ? Number(prev.scores?.[k]) : NaN;
    const opts = [...pool].sort((a, b) => b - a).map(n => `<option value="${n}" ${v === n ? "selected" : ""}>${n}</option>`).join("");
    return `<label class="ab-pick">${esc(abilities[k]?.label ?? k)} <select name="${method}-${k}"><option value="">—</option>${opts}</select></label>`;
  };
  const toggle = methods.length > 1 ? `<div class="ab-methods" role="radiogroup">${methods.map(m =>
    `<label class="ab-method"><input type="radio" name="method" value="${m.key}" ${m.key === first ? "checked" : ""}> ${esc(m.label)}</label>`).join("")}</div>`
    : `<input type="hidden" name="method" value="${first}"><p><b>${esc(methods[0].label)}</b></p>`;
  const section = m => {
    let body = "";
    if ( m.key === "pointBuy" ) {
      body = `<p>${m.points} points; each score ${pb.min} to ${pb.max} before clan and background (costs: ${Object.entries(pb.cost).map(([s, c]) => `${s}=${c}`).join(", ")}). <b class="pb-total"></b></p>`
        + `<div class="ab-grid">${ABILITY_KEYS.map(k => `<label class="ab-pick">${esc(abilities[k]?.label ?? k)} <input type="number" name="pointBuy-${k}" min="${pb.min}" max="${pb.max}" value="${prev.method === "pointBuy" ? prev.scores?.[k] ?? pb.min : pb.min}"></label>`).join("")}</div>`;
    } else if ( m.key === "standard" ) {
      body = `<p>Assign each score once: ${m.values.join(", ")}.</p><div class="ab-grid">${ABILITY_KEYS.map(k => pick("standard", k, m.values)).join("")}</div>`;
    } else {
      body = rolls
        ? `<p>Rolled (4d6, drop the lowest): ${rolls.join(", ")}. Assign each once.</p><div class="ab-grid">${ABILITY_KEYS.map(k => pick("roll", k, rolls)).join("")}</div>`
        : `<p>Roll six scores (4d6, drop the lowest; posted to chat, no rerolls), then assign them.</p><button type="button" data-ab-roll><i class="fa-solid fa-dice"></i> Roll the six scores</button>`;
    }
    return `<section class="ab-section" data-method="${m.key}" ${m.key === first ? "" : "hidden"}>${body}</section>`;
  };
  return `<div class="n5e-ability-setup"><p>Clan, background and class increases are added on top of these.</p>${toggle}${methods.map(section).join("")}</div>`;
}

/** Wire the toggle, the live Point Buy total and the Roll button (DialogV2's render callback). */
function wire(root, methods, onRoll) {
  if ( !root ) return;
  const show = () => {
    const m = root.querySelector('[name="method"]:checked')?.value ?? root.querySelector('[name="method"]')?.value;
    for ( const s of root.querySelectorAll(".ab-section") ) s.hidden = s.dataset.method !== m;
  };
  const pb = methods.find(m => m.key === "pointBuy");
  const total = () => {
    const out = root.querySelector(".pb-total");
    if ( !out || !pb ) return;
    const s = Object.fromEntries(ABILITY_KEYS.map(k => [k, Number(root.querySelector(`[name="pointBuy-${k}"]`)?.value)]));
    const spent = pointBuyCost(s);
    out.textContent = spent === null ? "Scores must be 8 to 15." : `${spent} / ${pb.points} points spent.`;
  };
  root.addEventListener("change", ev => { if ( ev.target.name === "method" ) show(); total(); });
  root.addEventListener("input", total);
  root.querySelector("[data-ab-roll]")?.addEventListener("click", onRoll);
  show(); total();
}

/**
 * Set (or change) a character's starting ability scores. Increases gained so far are kept.
 * @returns {Promise<boolean>} true when set (or marked as set by hand)
 */
export async function setStartingScores(actor) {
  if ( !actor?.isOwner ) return false;
  const methods = methodsFrom(generationConfig());
  let rolls = actor.flags?.n5e?.abilityRolls?.length === 6 ? actor.flags.n5e.abilityRolls : null;
  while ( true ) {
    let rolledNow = false;
    const result = await DialogV2.wait({
      window: { title: `${actor.name}: starting ability scores` }, position: { width: 560 },
      content: windowHTML(actor, methods, rolls),
      render: (event, dialog) => {
        const root = dialog?.element ?? (dialog instanceof HTMLElement ? dialog : null) ?? event?.target?.element;
        try {
          wire(root, methods, async () => {
            rolls = await rollScores(actor);
            rolledNow = true;
            // Re-open with the rolls to assign.
            (dialog?.close ? dialog : event?.target)?.close?.();
          });
        } catch { /* the toggle and total are conveniences; Apply still checks everything */ }
      },
      buttons: [
        { action: "apply", label: "Apply", default: true, callback: (event, button) => {
          const f = button.form.elements;
          const method = button.form.querySelector('[name="method"]:checked')?.value ?? f.method?.value;
          return { method, scores: Object.fromEntries(ABILITY_KEYS.map(k => [k, Number(f[`${method}-${k}`]?.value)])) };
        } },
        { action: "manual", label: "Already set by hand" },
        { action: "cancel", label: "Cancel" }
      ],
      rejectClose: false
    });
    if ( rolledNow ) continue;
    if ( !result || result === "cancel" ) return false;
    if ( result === "manual" ) {
      await actor.setFlag("n5e", "abilityBase", { method: "manual", scores: Object.fromEntries(ABILITY_KEYS.map(k => [k, actor._source.system.abilities[k].value])) });
      return true;
    }
    const m = methods.find(x => x.key === result.method) ?? methods[0];
    const problems = scoreProblems(m.key, result.scores, { pool: m.key === "roll" ? (rolls ?? []) : m.values, points: m.points });
    if ( problems.length ) { ui.notifications.warn(problems[0]); continue; }
    const current = Object.fromEntries(ABILITY_KEYS.map(k => [k, actor._source.system.abilities[k].value]));
    const old = actor.flags?.n5e?.abilityBase?.scores ?? null;
    const values = newAbilityValues(current, result.scores, old?.method === "manual" ? null : old, recordedIncreases(actor.items));
    await actor.update({ ...Object.fromEntries(ABILITY_KEYS.map(k => [`system.abilities.${k}.value`, values[k]])),
      "flags.n5e.abilityBase": { method: m.key, scores: result.scores } });
    ui.notifications.info(`${actor.name}: starting ability scores set (${m.label}).`);
    return true;
  }
}

/** Before the first class, clan or background: offer the starting scores if they aren't set yet. */
export async function ensureStartingScores(actor) {
  if ( hasStartingScores(actor) ) return true;
  return setStartingScores(actor);
}

/**
 * CREATE1 Q-C2 (both): prompt the user who made a character, and a player the first time they open a
 * character someone else made for them (once per user, kept on the actor).
 */
export function registerStartingScorePrompts() {
  Hooks.on("createActor", (actor, options, userId) => {
    if ( actor.type !== "character" || userId !== game.user.id || hasStartingScores(actor) ) return;
    // The sheet opens first; the window sits on top of it.
    setTimeout(() => { actor.sheet?.render(true); void setStartingScores(actor); }, 200);
  });
  Hooks.on("renderCharacterSheet", app => maybePromptOwner(app.actor));
}

const asking = new Set();

/** A player opening their character for the first time: offer the scores once. */
export function maybePromptOwner(actor) {
  if ( !actor || actor.type !== "character" || game.user.isGM || !actor.isOwner || hasStartingScores(actor) ) return;
  if ( actor.items.some(i => i.type === "class") || asking.has(actor.id) ) return;
  const asked = actor.flags?.n5e?.abilityPrompted ?? [];
  if ( asked.includes(game.user.id) ) return;
  asking.add(actor.id);
  void actor.setFlag("n5e", "abilityPrompted", [...asked, game.user.id]).then(() => setStartingScores(actor));
}
