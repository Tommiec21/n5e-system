import { untargetable } from "../rules/positioning.mjs";
import { createN5eRoll } from "./n5e-roll.mjs";
/**
 * Rolling d20s from the sheet and posting them to chat (Foundry side). The rules live in dice/d20.mjs.
 *
 * Every roll opens the roll dialog first (dice/roll-dialog.mjs; ROLL1): its parts with ticks, added
 * modifiers, and Advantage/Normal/Disadvantage. No key combination changes a roll (King 2026-11-14).
 * Every card shows the breakdown, with unticked parts struck and added ones marked, and, while the
 * actor has Will of Fire, buttons to spend one for a reroll or advantage after the fact.
 */
import { MODES, critThreshold, rollSpec, readD20, willOfFireAward } from "./d20.mjs";
import { d20Parts, situationalParts, composeD20, groupParts } from "../rules/roll-math.mjs";
import { dialogs, wantsDialog } from "./roll-dialog.mjs";
import { esc, signed, breakdownTooltip } from "../view-models/common.mjs";
import { degreeOfSuccess } from "../rules/degree.mjs";
import { contextualSpec, contextualAdvantage } from "../rules/elements.mjs";
import { rule } from "../rules-settings.mjs";
import { flankingEffect } from "../rules/pf2e-emulation.mjs";
import { attackTargetRows, challengeVisible, descriptionVisible, ATTACK_RESULT_LABELS } from "../rules/parity.mjs";
import { advantageSources, resolveMode, sourcesNote } from "../rules/advantage.mjs";
import { addSheetToggle } from "./advantaged.mjs";
import { skills as skillConfig } from "../config/core.mjs";

const MODE_LABEL = { normal: "", advantage: "Advantage", disadvantage: "Disadvantage" };

/** Roll edits on cards: shown to everyone (default) or to the GM only (King Q-R5). */
const editsForGMOnly = () => rule("rollEditsVisibility") === "gm";

/** Flavor HTML for a d20 card. */
function cardHTML(spec, { mode, result, bonusText, wof, edited = false }) {
  const tip = spec.breakdown ? breakdownTooltip(spec.breakdown) : "";
  const gmOnly = edited && editsForGMOnly();
  const state = result.crit ? "crit" : result.fumble ? "fumble" : "";
  return `<div class="n5e-roll-card ${state}" data-n5e-roll>
    <header><b>${esc(spec.label)}</b>${MODE_LABEL[mode] ? `<span class="mode">${MODE_LABEL[mode]}</span>` : ""}
      <span class="bonus" ${tip && !gmOnly ? `data-tooltip-html="${esc(tip)}"` : ""}>${signed(spec.bonus)}${bonusText ? ` ${esc(bonusText)}` : ""}</span></header>
    ${tip ? `<details class="n5e-roll-breakdown"${gmOnly ? " data-n5e-gm-only" : ""}><summary>Roll breakdown${edited ? " (edited)" : ""}</summary>${tip}</details>` : ""}
    ${spec.note ? `<div class="note">${esc(spec.note)}</div>` : ""}
    ${spec.dcLine ? `<div class="note n5e-dc" data-n5e-dc>${esc(spec.dcLine)}</div>` : ""}
    ${spec.roll ? `<div class="vs"><b>Roll:</b> ${esc(spec.roll)}</div>` : ""}
    ${spec.outcome ? `<div class="outcome">${esc(spec.outcome)}</div>` : ""}
    ${result.crit ? `<div class="flag crit">${spec.kind === "attack" ? "Critical hit" : "Natural 20"}</div>` : ""}
    ${result.fumble ? `<div class="flag fumble">Natural 1${spec.kind === "attack" ? ": miss" : ""}</div>` : ""}
    ${spec.footer ?? ""}
    ${wof ? `<div class="wof-buttons">
      <button type="button" data-n5e-wof="reroll">Will of Fire: reroll</button>
      <button type="button" data-n5e-wof="advantage">Will of Fire: advantage</button></div>` : ""}
  </div>`;
}

/**
 * Roll a d20 for an actor.
 * @param {Actor} actor
 * @param {string} type            ability | save | skill | tool | initiative | attack | skillAction
 * @param {string} [key]
 * @param {object} [options]
 * @param {Event} [options.event]  click event (modifier keys)
 * @param {string} [options.mode]  force normal | advantage | disadvantage
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollD20(actor, type, key, options = {}) {
  const spec = rollSpec(actor, type, key);
  if ( !spec ) return null;
  // FIN2a: size limits, "while grappling" and Escape are checked before the roll.
  let skillTargets = null;
  if ( type === "skillAction" ) {
    const chosen = options.targetActors ?? Array.from(globalThis.game?.user?.targets ?? []).map(t => t.actor).filter(Boolean);
    const gate = await import("../workflow/skill-actions.mjs").then(m => m.prepareSkillAction(actor, key, chosen));
    if ( gate.refuse ) { ui.notifications.warn(`${spec.label}: ${gate.refuse}`); return null; }
    skillTargets = gate.targets;
    if ( gate.disadvantage.length ) spec.disadvantageSources = [...(spec.disadvantageSources ?? []), ...gate.disadvantage];
  }
  const message = await rollWithSpec(actor, spec, { ...options, ...(options.targetActors ? { target: options.targetActors.length === 1 ? options.targetActors[0] : null } : {}) });
  // Skill actions against one target: passive, fixed DC or contest resolution (SKILL1).
  if ( message && type === "skillAction" ) {
    const targets = skillTargets ?? [];
    await import("../workflow/skill-actions.mjs").then(m => m.resolveSkillAction(actor, key, message, targets, { weaponId: options.weaponId ?? "" }))
      .catch(error => ui.notifications.warn(error.message));
  }
  return message;
}

/**
 * Roll any d20 spec ({label, bonus, kind, scope?, breakdown?, note?}).
 * Every d20 in the system ends up here: sheet rolls, attacks, saves from cards, removal checks,
 * resaves. The message carries flags.n5e.roll so Will of Fire can reroll it later.
 * @param {object} [options]
 * @param {Event} [options.event]        the click (kept for callers; keys no longer change the roll)
 * @param {string} [options.mode]        one more source: normal | advantage | disadvantage (e.g. condition resistance)
 * @param {boolean} [options.dialog]     false: no dialog (Will of Fire style rolls with no choice to make)
 * @param {object} [options.prepared]    a choice made already (one dialog for a group, King Q-R2): {off, added, mode}
 * @param {Array} [options.situational]  modifiers listed unticked in the dialog: [{label, value, when}]
 * @param {number} [options.dc]          compare against a DC (saves from a card)
 * @param {boolean} [options.fourTier]   report Genjutsu four-tier results
 * @param {string} [options.source]      id of the card whose button made this roll (RES1 per-target resolution)
 * @param {string} [options.onSuccess]   a save's share on success: half | none (RES1)
 * @param {string} [options.effect]      which effect of the action this save belongs to (FIN3: one save per effect)
 * @param {string} [options.onFail]      HTML added to the card only on a failure (Apply-condition buttons)
 * @param {Function} [options.onResult]  called with {natural, crit, fumble, degree, success, message}
 */
export async function rollWithSpec(actor, spec, { event, mode: forced, dc = null, fourTier = false, onFail = "", onResult = null,
  target = undefined, tiers = null, source = "", onSuccess = "", card = undefined, dialog = true, prepared = null, situational = null, effect = "" } = {}) {
  // Multiple targets can have different defenses: never borrow the first target's facts for all.
  if ( target === undefined ) {
    const targets = Array.from(globalThis.game?.user?.targets ?? []);
    target = targets.length === 1 ? targets[0].actor : null;
  }
  // Total cover (POS1): a creature behind it can't be targeted directly by an attack.
  if ( spec.kind === "attack" ) {
    const aimed = target ? [target] : Array.from(globalThis.game?.user?.targets ?? []).map(t => t.actor).filter(Boolean);
    const covered = aimed.filter(a => untargetable(a.statuses));
    if ( covered.length ) {
      ui.notifications.warn(`Total cover: ${covered.map(a => a.name).join(", ")} can't be targeted directly.`);
      return null;
    }
  }
  spec = contextualSpec(actor, spec, target);
  const type = spec.type ?? "custom";
  const key = spec.key ?? "";
  // Advantage engine (ADV1): conditions and states on the roller and its single target are counted
  // with the click (or a forced mode); any advantage and any disadvantage cancel.
  const sources = advantageSources({ roller: rollFacts(actor), target: target ? rollFacts(target) : null,
    kind: spec.kind === "attack" ? "attack" : spec.kind === "save" ? "save" : "check", ability: rollAbility(spec), ranged: !!spec.ranged });
  // Rule-element advantage on d20 rolls too (any dice roll, King 2026-11-13).
  const authored = contextualAdvantage(actor, spec, target);
  sources.advantage.push(...authored.advantage);
  sources.disadvantage.push(...authored.disadvantage);
  // Sources the caller worked out (weapon properties and range, ATK1).
  sources.advantage.push(...(spec.advantageSources ?? []));
  // PRESTD1 Part D (rule flanking; King Q-P6): a melee attack on a flanked target.
  if ( spec.kind === "attack" && !spec.ranged && target && rule("flanking") !== "off" ) {
    const effect = flankingEffect(rule("flanking"));
    const attackerToken = actor.getActiveTokens?.()[0];
    const targetToken = Array.from(globalThis.game?.user?.targets ?? []).find(t => t.actor === target) ?? target.getActiveTokens?.()[0];
    const ally = effect ? await (await import("../canvas/flanking.mjs")).flankingAlly(attackerToken, targetToken).catch(() => null) : null;
    if ( ally ) {
      if ( effect.advantage ) sources.advantage.push(`${effect.advantage} with ${ally.name}`);
      if ( effect.bonus ) {
        const parts = [...(spec.breakdown?.parts ?? d20Parts(spec).map(p => ({ label: p.label, value: p.value }))), { label: `${effect.label} with ${ally.name}`, value: effect.bonus }];
        spec = { ...spec, bonus: (Number(spec.bonus) || 0) + effect.bonus, breakdown: { ...(spec.breakdown ?? {}), parts } };
      }
    }
  }
  sources.disadvantage.push(...(spec.disadvantageSources ?? []));
  // Minions automatically fail saving throws (Bingo Book; NPC1).
  if ( spec.kind === "save" && actor.system?.autoFailSaves && !sources.autoFail ) sources.autoFail = "Minion";
  addSheetToggle(sources, actor, "d20");
  if ( actor.system?.conditionPenalties?.flags?.noAttackAdvantage && spec.kind === "attack" ) sources.advantage.length = 0;
  let mode = resolveMode(sources, forced ?? "normal");
  const sourceNote = sourcesNote(sources);
  if ( sourceNote ) spec = { ...spec, note: [spec.note, sourceNote].filter(Boolean).join(" · ") };
  // The roll dialog (ROLL1): every part with a tick, added modifiers, the mode. A group shares one
  // choice made before (prepared); "own" keeps each creature's worked-out mode.
  const parts = [...d20Parts(spec), ...situationalParts(situational ?? spec.situational ?? [])];
  let choice = prepared ? { ...prepared, off: prepared.off ?? parts.filter(p => (prepared.offLabels ?? []).includes(p.label)).map(p => p.id), on: [] } : null;
  // PRESTD1 (rule secretChecks): Stealth, Insight and identify checks start ticked as secret.
  const secretOffer = rule("secretChecks") && spec.kind !== "attack" ? { checked: secretByDefault(spec) } : null;
  if ( !choice && dialog && wantsDialog() ) {
    choice = await dialogs.d20({ title: `${actor.name}: ${spec.label}`, parts, mode, sources, secret: secretOffer,
      stake: stakeLine(spec, { dc, target, autoFail: sources.autoFail, actor }) });
    if ( !choice ) return null;
  }
  const secret = secretOffer ? (choice && "secret" in choice ? !!choice.secret : secretOffer.checked) : false;
  let extra = "";
  let edited = false;
  if ( choice ) {
    if ( choice.mode && choice.mode !== "own" ) mode = choice.mode;
    const composed = composeD20(parts, choice, spec.label);
    spec = { ...spec, bonus: composed.bonus, breakdown: composed.breakdown };
    extra = composed.extra;
    edited = composed.edited;
  }
  const formula = `${MODES[mode]} + @bonus${extra ? ` + ${extra}` : ""}`;
  const roll = await createN5eRoll(formula, { bonus: spec.bonus }).evaluate();
  const threshold = critThreshold(actor, spec.scope, spec.critBonus);
  const result = readD20(roll, threshold);
  const wof = (actor.system.willOfFire?.value ?? 0) > 0;
  let degree = null;
  if ( dc != null ) {
    const d = degreeOfSuccess(roll.total, dc, { natural: result.natural, isSave: spec.kind === "save", shift: spec.degreeShift });
    // Automatic failure (Petrified/Stunned Str and Dex, Unconscious all): a plain Failure.
    if ( sources.autoFail && spec.kind === "save" ) {
      if ( d.degree > 1 ) Object.assign(d, { degree: 1, key: "failure" });
      spec = { ...spec, note: [spec.note, `Automatic failure: ${sources.autoFail}`].filter(Boolean).join(" · ") };
    }
    degree = d.degree;
    const outcomeKey = fourTier ? d.key : d.degree >= 2 ? "success" : "failure";
    const labels = ["Critical Failure", "Failure", "Success", "Critical Success"];
    spec = { ...spec, dcLine: `vs DC ${dc}: ${fourTier ? labels[d.degree] : (d.degree >= 2 ? "Success" : "Failure")}`,
      // Buttons that only matter on a failure (apply a condition, etc.).
      footer: `${spec.footer ?? ""}${tiers?.[outcomeKey] ? `<div class="n5e-save-outcome"><b>Result</b>: ${esc(tiers[outcomeKey])}</div>` : ""}${degree < 2 && onFail && !Object.values(tiers ?? {}).some(Boolean) ? onFail : ""}` };
  }
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  const message = await roll.toMessage({
    speaker: ChatMessageCls.getSpeaker({ actor }),
    ...(secret ? { whisper: (globalThis.game?.users ?? []).filter(u => u.isGM).map(u => u.id), blind: true } : {}),
    flavor: cardHTML(spec, { mode, result, bonusText: extra ? `+ ${extra}` : "", wof, edited }) + (spec.kind === "attack"
      ? '<div class="n5e-attack-targets" data-n5e-attack-targets></div><button type="button" data-n5e-hit="1">Successful hit: reactions</button>' : ""),
    flags: { n5e: { roll: { type, key: key ?? "", mode, bonus: spec.bonus, extra, threshold,
      natural: result.natural, label: spec.label, kind: spec.kind, actorUuid: actor.uuid,
      dc, degree, fourTier, tiers, degreeShift: spec.degreeShift, breakdown: spec.breakdown, targetUuid: target?.uuid ?? null,
      total: roll.total, targets: spec.kind === "attack" ? attackTargetSnapshot() : undefined,
      source: source || undefined, onSuccess: onSuccess || undefined, effect: effect !== "" && effect != null ? String(effect) : undefined, name: actor.name }, ...(card ? { card } : {}) } }
  });
  // Help is spent by the roll it helped.
  if ( sources.consume.includes("helped") && actor.isOwner && actor.statuses?.has("helped") ) {
    await actor.toggleStatusEffect?.("helped", { active: false });
  }
  await awardWillOfFire(actor, result);
  if ( onResult ) await onResult({ ...result, degree, success: degree == null ? null : degree >= 2, message });
  return message;
}

/** First natural 1 or 20 in an encounter grants a Will of Fire (max 3). */
async function awardWillOfFire(actor, result) {
  const combat = game.combat?.started ? game.combat : null;
  const award = willOfFireAward(actor, result, combat?.id ?? null);
  if ( !award.award || !actor.isOwner ) return;
  await actor.update({ "system.willOfFire.value": award.value, "flags.n5e.wofEncounter": combat.id });
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  await ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }),
    content: `<div class="n5e-roll-card wof"><b>Will of Fire</b> from a natural ${result.natural} (${award.value} / 3).</div>` });
}

/**
 * Spend a Will of Fire on a posted d20: reroll it, or roll another d20 and keep the higher.
 * @param {ChatMessage} message
 * @param {"reroll"|"advantage"} how
 */
export async function spendWillOfFire(message, how) {
  const data = message.getFlag("n5e", "roll");
  const actor = data?.actorUuid ? await fromUuid(data.actorUuid) : null;
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the roller's owner can spend their Will of Fire.");
  const wof = actor.system.willOfFire?.value ?? 0;
  if ( wof < 1 ) return ui.notifications.warn(`${actor.name} has no Will of Fire left.`);
  await actor.update({ "system.willOfFire.value": wof - 1 });
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  const extra = data.extra ? ` + ${data.extra}` : "";
  // Re-evaluate the original DC using the original contextual bonus, rather than carrying a stale
  // degree onto the reroll. Tier effects are exclusive: only the newly selected result is printed.
  const outcome = (total, natural) => {
    if ( data.dc == null ) return { degree: null, html: "" };
    const d = degreeOfSuccess(total, data.dc, { natural, isSave: data.kind === "save", shift: data.degreeShift });
    const key = data.fourTier ? d.key : d.degree >= 2 ? "success" : "failure";
    const label = data.fourTier ? ["Critical Failure", "Failure", "Success", "Critical Success"][d.degree] : d.degree >= 2 ? "Success" : "Failure";
    return { degree: d.degree, html: `<div class="note">vs DC ${data.dc}: ${label}</div>${data.tiers?.[key] ? `<div class="n5e-save-outcome">${esc(data.tiers[key])}</div>` : ""}` };
  };
  if ( how === "reroll" ) {
    const roll = await createN5eRoll(`${MODES[data.mode] ?? "1d20"} + @bonus${extra}`, { bonus: data.bonus }).evaluate();
    const result = readD20(roll, data.threshold ?? 20);
    const resolved = outcome(roll.total, result.natural);
    return roll.toMessage({ speaker: ChatMessageCls.getSpeaker({ actor }),
      flavor: `<div class="n5e-roll-card ${result.crit ? "crit" : result.fumble ? "fumble" : ""}"><header><b>${esc(data.label)}</b>
        <span class="mode">Will of Fire reroll</span></header>${resolved.html}</div>`,
      flags: { n5e: { roll: { ...data, natural: result.natural, degree: resolved.degree, total: roll.total, rerollOf: message.id, ...(message.flags?.n5e?.card ? { source: message.id } : {}) } } } });
  }
  // Advantage after the fact: one more d20, keep the higher natural.
  const extraDie = await createN5eRoll("1d20").evaluate();
  const kept = Math.max(data.natural ?? 1, extraDie.total);
  const total = createN5eRoll(`${kept} + @bonus${extra}`, { bonus: data.bonus });
  await total.evaluate();
  const resolved = outcome(total.total, kept);
  return total.toMessage({ speaker: ChatMessageCls.getSpeaker({ actor }),
    flavor: `<div class="n5e-roll-card ${kept >= (data.threshold ?? 20) ? "crit" : ""}"><header><b>${esc(data.label)}</b>
      <span class="mode">Will of Fire advantage</span></header>
      <div class="note">First d20 ${data.natural}, second ${extraDie.total}: keeps ${kept}.</div>${resolved.html}</div>`,
    flags: { n5e: { roll: { ...data, natural: kept, degree: resolved.degree, total: total.total, rerollOf: message.id, ...(message.flags?.n5e?.card ? { source: message.id } : {}) } } } });
}

/**
 * Wire chat card buttons (call from the renderChatMessageHTML hook).
 * Cards are stored as HTML, so buttons are found by their data attributes on every render:
 *   data-n5e-apply / -inflict / -undo / -concheck / -deathsave   workflow/apply-damage.mjs
 *   data-n5e-act (attack, damage, save, heal, strike, effect, roll)  workflow/activity-buttons.mjs
 *   data-n5e-track / data-n5e-resave                               workflow/trackers.mjs
 *   data-n5e-wof                                                   Will of Fire (below)
 * A new kind of card button: pick a new data-n5e-* attribute and add a loop here. The handlers are
 * imported on click so loading the chat log stays cheap.
 */
/** Plain facts the advantage rules read (rules/advantage.mjs). */
function rollFacts(actor) {
  return { flags: actor?.system?.conditionPenalties?.flags ?? {}, statuses: actor?.statuses ?? new Set(), senses: actor?.system?.senses ?? {} };
}

/**
 * One roll dialog for several creatures rolling the same thing (King Q-R2). Resolves:
 *   undefined  one creature, or no dialog: each roll goes on as usual;
 *   null       the dialog was closed: nothing is rolled;
 *   {offLabels, added, mode}  pass as `prepared` to each rollWithSpec ("own" keeps each creature's mode).
 * @param {Array<{actor, spec}>} entries
 */
export async function groupRollChoice(entries, title) {
  if ( entries.length < 2 || !wantsDialog() ) return undefined;
  const rows = groupParts(entries.map(e => e.spec));
  const choice = await dialogs.d20({ title, parts: rows, mode: "own", group: entries.map(e => e.actor.name) });
  if ( !choice ) return null;
  return { offLabels: rows.filter(r => choice.off.includes(r.id)).map(r => r.label), added: choice.added, mode: choice.mode };
}

/** What the dialog says is at stake: the DC, the target, an automatic failure. */
function stakeLine(spec, { dc = null, target = null, autoFail = null, actor = null } = {}) {
  const out = [];
  if ( dc != null ) {
    const owned = globalThis.game?.users?.some?.(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER")) ?? false;
    out.push(challengeVisible(rule("challengeVisibility"), globalThis.game?.user, owned) ? `vs DC ${dc}` : "Against a DC");
  }
  if ( target && spec.kind === "attack" ) out.push(`Attacking ${target.name}`);
  if ( autoFail ) out.push(`Automatic failure: ${autoFail}`);
  return out.join(" · ");
}

/** PRESTD1: checks that start as secret (Stealth, Insight, identify). */
export function secretByDefault(spec) {
  if ( spec.type === "skill" && ["ste", "ins"].includes(spec.key) ) return true;
  return /identify/i.test(`${spec.key ?? ""} ${spec.label ?? ""}`);
}

/** The ability a roll uses: attack ability, save key, or a skill's ability. */
function rollAbility(spec) {
  if ( spec.ability ) return spec.ability;
  if ( spec.kind === "save" || spec.type === "ability" ) return spec.key;
  if ( spec.type === "skill" ) return skillConfig[spec.key]?.ability ?? null;
  return null;
}

// Loaded once at startup (registerResolution) so damage cards can draw their rows synchronously.
let resolutionModule = null;
export async function registerResolution() {
  resolutionModule = await import("../workflow/resolution.mjs");
  resolutionModule.registerResolutionHooks();
  clashModule = await import("../workflow/clash.mjs");
  clashModule.registerClashHooks().catch(error => console.warn("n5e | clash hooks", error));
  actionCardModule = await import("../workflow/action-card.mjs");
  await actionCardModule.registerActionCardHooks();
  privacyModule = await import("../workflow/npc-privacy.mjs");
  privacyModule.registerPrivacyHooks();
  variantModule = await import("../workflow/variant-tools.mjs");
}
let clashModule = null;
let actionCardModule = null;
let privacyModule = null;
let variantModule = null;

/** The attacker's targets when the attack is rolled, with their AC (dnd5e chat target list). */
function attackTargetSnapshot() {
  return [...(globalThis.game?.user?.targets ?? [])].filter(t => t.actor).slice(0, 20)
    .map(t => ({ uuid: t.actor.uuid, name: t.name ?? t.actor.name, ac: Number(t.actor.system?.ac?.value ?? t.actor.system?.attributes?.ac?.value) }));
}

/** Does a non-GM user own this actor? (dnd5e "player" challenge visibility) */
const hasPlayerOwner = actor => !!actor && (globalThis.game?.users ?? []).some(u => !u.isGM && actor.testUserPermission?.(u, "OWNER"));

/**
 * Per-viewer parts of a card: attack target rows, DC visibility, concealed NPC descriptions.
 * Cards are shared HTML; each client hides what its user may not see (dnd5e parity).
 */
export async function renderParityParts(message, html) {
  const roll = message.getFlag?.("n5e", "roll");
  const user = game.user;
  const box = html.querySelector("[data-n5e-attack-targets]");
  if ( box && roll?.targets?.length ) {
    const rows = attackTargetRows({ total: roll.total ?? message.rolls?.[0]?.total, natural: roll.natural, threshold: roll.threshold },
      roll.targets, { visibility: rule("attackRollVisibility"), isGM: user.isGM });
    box.innerHTML = rows.map(r => `<div class="n5e-target-row ${r.result ?? ""}"><span>${esc(r.name)}</span>${r.ac != null ? `<span class="ac">AC ${r.ac}</span>` : ""}${r.result ? `<b>${esc(ATTACK_RESULT_LABELS[r.result])}</b>` : ""}</div>`).join("");
  }
  if ( roll?.dc != null && html.querySelector("[data-n5e-dc]") ) {
    const actor = roll.actorUuid ? await fromUuid(roll.actorUuid) : null;
    if ( !challengeVisible(rule("challengeVisibility"), user, hasPlayerOwner(actor)) ) {
      for ( const el of html.querySelectorAll("[data-n5e-dc], .n5e-save-outcome") ) el.remove();
    }
  }
  const actor = message.speakerActor;
  if ( actor && html.querySelector(".desc") && !descriptionVisible(rule("concealItemDescriptions"), user, { isNPC: actor.type === "npc", isOwner: actor.isOwner }) ) {
    for ( const el of html.querySelectorAll(".desc") ) el.remove();
  }
}

/** Roll buttons on cards (the roll dialog opens from each; ROLL1 removed the separate Adv/Dis buttons). */
export const ROLL_BUTTONS = '[data-n5e-act="attack"], [data-n5e-act="damage"], [data-n5e-act="save"], [data-n5e-act="heal"], '
  + '[data-n5e-act="roll"], [data-n5e-act="check"], [data-n5e-act="strike"], [data-n5e-resave], [data-n5e-concheck], [data-n5e-request-roll]';

export function onRenderChatMessage(message, html) {
  // Roll edits for the GM only (rule rollEditsVisibility): players see the total and the result.
  if ( !globalThis.game?.user?.isGM ) for ( const el of html.querySelectorAll("[data-n5e-gm-only]") ) el.remove();
  // PRESTD1 Part A: NPC roll breakdowns and names for players.
  privacyModule?.renderPrivacy(message, html);
  // PRESTD1: crit and fumble table buttons.
  variantModule?.renderTableButton(message, html);
  // Per-target rows on damage cards (RES1), drawn before the Apply listeners are bound below.
  if ( message.flags?.n5e?.damage ) resolutionModule?.renderResolution(message, html);
  // Jutsu Clash cards (CLASH1), drawn before their listeners are bound below.
  if ( message.flags?.n5e?.clash ) clashModule?.renderClash(message, html);
  // Single action card (CARD1): sections and per-target rows, or the one-line view of a linked roll.
  actionCardModule?.renderActionCard(message, html);
  for ( const btn of html.querySelectorAll("[data-n5e-card-apply], [data-n5e-card-undo], [data-n5e-card-save], [data-n5e-card-inflict], [data-n5e-card-effect], [data-n5e-card-wof], [data-n5e-card-hit], [data-n5e-card-concheck], [data-n5e-card-saveall], [data-n5e-card-defense], [data-n5e-card-counter], [data-n5e-rider-use], [data-n5e-rider-cancel], [data-n5e-rider-eventsave], [data-n5e-rider-save], [data-n5e-rider-apply]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    actionCardModule?.onActionCardClick(message, btn, ev).catch(error => ui.notifications.warn(error.message));
  });
  for ( const btn of html.querySelectorAll("[data-n5e-clash], [data-n5e-clash-roll], [data-n5e-clash-lose], [data-n5e-clash-auto], [data-n5e-clash-dispel]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    const d = btn.dataset;
    const run = async m => {
      if ( d.n5eClashRoll ) return m.rollClash(message, d.n5eClashRoll, ev);
      if ( d.n5eClashLose ) return m.applyClashLoss(d.n5eClashLose, message, d.side ?? null);
      if ( d.n5eClashAuto ) return m.decideClash(message, d.n5eClashAuto);
      if ( d.n5eClashDispel ) { for ( const k of d.n5eClashDispel.split(",") ) await m.dispelSide(message, k); return true; }
      return m.startClash(message);
    };
    import("../workflow/clash.mjs").then(run).catch(error => ui.notifications.warn(error.message));
  });
  // NPC1c C5: what the party can learn from a Read the Enemy success.
  if ( message.flags?.n5e?.learn ) {
    import("../workflow/npc-knowledge.mjs").then(m => {
      const box = document.createElement("div");
      box.innerHTML = m.learnSectionHTML(message);
      (html.querySelector(".n5e-roll-card") ?? html).append(...box.childNodes);
      for ( const b of html.querySelectorAll("[data-n5e-learn-offer]") ) b.addEventListener("click", ev => { ev.preventDefault(); m.onLearnOffer(message); });
      for ( const b of html.querySelectorAll("[data-n5e-learn-pick]") ) b.addEventListener("click", ev => {
        ev.preventDefault();
        m.onLearnPick(message, b.dataset.n5eLearnPick).catch(error => ui.notifications.warn(error.message));
      });
    }).catch(error => console.warn("n5e | learn", error));
  }
  for ( const btn of html.querySelectorAll("[data-n5e-read-choice]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    import("../workflow/jutsu-defense.mjs").then(m => m.onReadChoiceClick(message, btn)).catch(error => ui.notifications.warn(error.message));
  });
  for ( const btn of html.querySelectorAll("[data-n5e-contest], [data-n5e-skill-apply], [data-n5e-skill-release]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    import("../workflow/skill-actions.mjs").then(m => (btn.dataset.n5eContest ? m.onContestClick(message, btn, ev)
      : btn.dataset.n5eSkillRelease ? m.onSkillReleaseClick(btn) : m.onSkillApplyClick(btn)))
      .catch(error => ui.notifications.warn(error.message));
  });
  for ( const btn of html.querySelectorAll("[data-n5e-exposure-roll]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    import("../workflow/environment.mjs").then(m => m.onExposureRollClick(btn, ev)).catch(error => ui.notifications.warn(error.message));
  });
  for ( const btn of html.querySelectorAll("[data-n5e-breath-set]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    import("../workflow/environment.mjs").then(m => m.setBreath(btn.dataset.n5eBreathSet)).catch(error => ui.notifications.warn(error.message));
  });
  for ( const btn of html.querySelectorAll("[data-n5e-terrain-save]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    import("../workflow/environment.mjs").then(m => m.onTerrainSaveClick(btn, ev)).catch(error => ui.notifications.warn(error.message));
  });
  for ( const btn of html.querySelectorAll("[data-n5e-oa]") ) btn.addEventListener("click", ev => {
    ev.preventDefault();
    import("../workflow/positioning.mjs").then(m => m.onOpportunityClick(btn, ev)).catch(error => ui.notifications.warn(error.message));
  });
  if ( message.getFlag?.("n5e", "rollRequest") ) import("../workflow/roll-request.mjs").then(m => m.renderRollRequest(message, html));
  void renderParityParts(message, html).catch(error => console.warn("n5e | card visibility", error));
  for ( const button of html.querySelectorAll("[data-n5e-source]") ) button.addEventListener("click", async event => {
    event.preventDefault();
    try {
      const source = await fromUuid(button.dataset.n5eSource);
      if ( !source || source.visible === false || source.isContentVisible === false ) return ui.notifications.warn("The source roll is unavailable or private.");
      const { damageFromMessage } = await import("../rules/damage-trace.mjs");
      const { renderDamageRolls } = await import("../view-models/damage-trace.mjs");
      await foundry.applications.api.DialogV2.wait({ window: { title: "Source damage roll" }, content: await renderDamageRolls(source.rolls, damageFromMessage(source).rollTrace),
        render: (event, dialog) => { for ( const roll of dialog.element.querySelectorAll('[data-action="expandRoll"]') ) roll.addEventListener("click", click => { click.preventDefault(); click.stopPropagation(); roll.classList.toggle("expanded"); }); },
        buttons: [{ action: "close", label: "Close", default: true }], rejectClose: false });
    } catch (error) { ui.notifications.warn(error.message); }
  });
  for ( const btn of html.querySelectorAll("[data-n5e-hit], [data-n5e-retarget], [data-n5e-apply], [data-n5e-inflict], [data-n5e-undo], [data-n5e-concheck], [data-n5e-deathsave]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/apply-damage.mjs").then(m => m.onApplyClick(message, btn, ev));
    });
  }
  for ( const btn of html.querySelectorAll("[data-n5e-act]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/activity-buttons.mjs").then(m => m.onActivityClick(message, btn, ev));
    });
  }
  for ( const btn of html.querySelectorAll("[data-n5e-track], [data-n5e-resave]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/trackers.mjs").then(m => (btn.dataset.n5eResave ? m.rollResave(btn, ev, { message }) : m.onTrackerClick(message, btn)));
    });
  }
  // Effect-application cards: the owner of each recipient applies (workflow/effect-application.mjs).
  for ( const btn of html.querySelectorAll("[data-n5e-effect-apply]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/effect-application.mjs").then(m => m.applyEffectFromCard(message, btn.dataset.n5eEffectApply))
        .catch(error => ui.notifications.warn(error.message));
    });
  }
  // Place a jutsu's area on the map (workflow/areas.mjs).
  for ( const btn of html.querySelectorAll("[data-n5e-area]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      import("../workflow/areas.mjs").then(m => m.onAreaClick(message, btn));
    });
  }
  for ( const btn of html.querySelectorAll("[data-n5e-wof]") ) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      btn.disabled = true;
      spendWillOfFire(message, btn.dataset.n5eWof);
    });
  }
}

/**
 * Initiative from the sheet. In a combat the combatant's initiative is set; Adaptive Initiative
 * (Scout-Nin) offers Athletics, Ninshou, Illusions or Insight instead of Initiative.
 */
export async function rollInitiative(actor, { event } = {}) {
  let skill = null;
  const adaptive = actor.items.some(i => i.system.identifier === "adaptive-initiative");
  if ( adaptive ) {
    const { DialogV2 } = foundry.applications.api;
    const choices = [["", `Initiative (${signed(actor.system.initiative.total)})`], ["ath", "Athletics"], ["nin", "Ninshou"],
      ["ill", "Illusions"], ["ins", "Insight"]];
    skill = await DialogV2.wait({ window: { title: "Adaptive Initiative" },
      content: "<p>Substitute a skill if it fits how combat started (GM decides).</p>",
      buttons: choices.map(([k, label]) => ({ action: k || "init", label: k ? `${label} (${signed(actor.system.skills[k]?.total ?? 0)})` : label,
        default: !k, callback: () => k })), rejectClose: false });
    if ( skill === null || skill === undefined ) return null;
  }
  const combatant = game.combat?.getCombatantsByActor?.(actor)?.[0];
  if ( combatant ) return game.combat.rollInitiative([combatant.id], { updateTurn: false, n5eSkill: skill });
  return skill ? rollD20(actor, "skill", skill, { event }) : rollD20(actor, "initiative", "", { event });
}

/**
 * The initiative formula for combatants, through the roll dialog (ROLL1 A9): one dialog for one
 * creature, one for a group (King Q-R2). Resolves {[combatantId]: formula} or null when closed.
 * @param {Array<{id, actor}>} combatants
 * @param {string|null} [skill]  Adaptive Initiative's skill, if one was chosen
 */
export async function initiativeFormulas(combatants, skill = null) {
  const entries = combatants.filter(c => c.actor).map(c => ({ c, actor: c.actor,
    spec: skill ? rollSpec(c.actor, "skill", skill) : rollSpec(c.actor, "initiative", "") }));
  const out = {};
  if ( !entries.length ) return out;
  const formulaFor = (e, choice) => {
    const sources = { advantage: [], disadvantage: [] };
    addSheetToggle(sources, e.actor, "d20");
    let mode = resolveMode(sources, "normal");
    if ( choice?.mode && choice.mode !== "own" ) mode = choice.mode;
    const parts = d20Parts(e.spec);
    const off = choice?.off ?? parts.filter(p => (choice?.offLabels ?? []).includes(p.label)).map(p => p.id);
    const composed = composeD20(parts, { off, added: choice?.added ?? [] });
    return `${MODES[mode]} + ${composed.bonus}${composed.extra ? ` + ${composed.extra}` : ""}`;
  };
  if ( entries.length === 1 ) {
    const e = entries[0];
    let choice = null;
    if ( wantsDialog() ) {
      const sources = { advantage: [], disadvantage: [] };
      addSheetToggle(sources, e.actor, "d20");
      choice = await dialogs.d20({ title: `${e.actor.name}: ${e.spec.label}`, parts: d20Parts(e.spec), mode: resolveMode(sources, "normal"), sources });
      if ( !choice ) return null;
    }
    out[e.c.id] = formulaFor(e, choice);
    return out;
  }
  const prepared = await groupRollChoice(entries.map(e => ({ actor: e.actor, spec: e.spec })), "Initiative");
  if ( prepared === null ) return null;
  for ( const e of entries ) out[e.c.id] = formulaFor(e, prepared);
  return out;
}

