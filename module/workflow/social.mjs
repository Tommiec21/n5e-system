/**
 * Social encounters (PRESTD1 Part F, SOCIAL1; the Bingo Book). The GM starts one for a selected NPC;
 * two chat cards hold it:
 *   - the tracker (everyone): type, attitude, round of Patience, PoA and PoF, what has been revealed,
 *     and the players' buttons (arguments, support, See Through Lies) with a "Uses a Motivation" tick;
 *   - the GM card (GM only): the hidden Motivations and Pitfalls with Reveal buttons, Pitfall
 *     triggered, the NPC's actions and reactions, the type's risk, point adjustments, next round, end.
 * A player's roll goes to the active GM (owner intent "socialResult"), who works out the DC (the NPC's
 * Standard DC, King Q-P10), applies the Argument Results table and updates the tracker. When Patience
 * runs out (or the GM ends it) the score gives the outcome and the type's result text.
 * Rules: rules/social.mjs; tables: config/social.mjs.
 */
import { socialAttitudes, socialTypes, socialMotivations, socialPitfalls, socialActions, socialNpcActions, socialOutcomeLabels } from "../config/social.mjs";
import { socialSetup, primaryPoints, argumentResult, socialScore, socialOutcome, actionDC, patienceSpent } from "../rules/social.mjs";
import { esc } from "../view-models/common.mjs";

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const whisperGM = text => ChatMessage.create({ whisper: gmIds(), content: `<div class="n5e-roll-card"><b>Social encounter</b><div>${text}</div></div>` });

function trackerHTML(s) {
  const t = socialTypes[s.type] ?? socialTypes.diplomatic;
  const score = socialScore(s);
  const buttons = Object.entries(socialActions).map(([k, a]) => `<button type="button" data-n5e-social="${k}">${esc(a.label)}</button>`).join("");
  const outcome = s.ended ? `<div class="social-outcome"><b>${esc(socialOutcomeLabels[s.ended])}</b> (score ${score}): ${esc(t.outcomes[s.ended])}</div>` : "";
  return `<div class="n5e-roll-card n5e-social"><b>Social encounter: ${esc(s.npcName)}</b>
    <div>${esc(t.label)} · ${esc(socialAttitudes[s.attitude]?.label ?? s.attitude)} · round ${Math.min(s.round, s.patience)} of ${s.patience}</div>
    <div class="social-points"><b>${s.poa}</b> Points of Agreement · <b>${s.pof}</b> Points of Frustration · score ${score}</div>
    ${s.perform ? "<div class=\"hint\">Perform: the next Primary Argument gets +2.</div>" : ""}
    ${s.revealed.length ? `<div>Known: ${s.revealed.map(esc).join("; ")}</div>` : ""}
    ${s.log.slice(-6).map(l => `<div class="hint">${esc(l)}</div>`).join("")}
    ${s.ended ? outcome : `<label class="checkbox"><input type="checkbox" data-n5e-social-motivation> Uses a Motivation (+2; +1 PoA on a success)</label><div class="n5e-buttons">${buttons}</div>`}
  </div>`;
}

function controlHTML(s, h) {
  const t = socialTypes[s.type] ?? socialTypes.diplomatic;
  const list = (kind, items) => items.map((it, i) => `<div>${esc(it.text)} ${it.revealed ? "(revealed)" : `<button type="button" data-n5e-social-gm="reveal" data-kind="${kind}" data-index="${i}">Reveal</button>`}</div>`).join("");
  const npc = Object.entries(socialNpcActions).map(([k, a]) => `<button type="button" data-n5e-social-gm="npc" data-npc="${k}">${esc(a.label)}</button>`).join("");
  return `<div class="n5e-roll-card n5e-social-gm"><b>Social encounter (GM): ${esc(s.npcName)}</b>
    <div class="hint">NPC favors ${esc(t.favors)}. Risk: ${esc(t.risk)}</div>
    <div><b>Motivations</b>${list("motivations", h.motivations)}</div>
    <div><b>Pitfalls</b>${list("pitfalls", h.pitfalls)}</div>
    <div class="hint">Recall Knowledge DC ${h.recallDC}. ${h.pitfallRound ? "A Pitfall was triggered this round (−4 on this round's checks)." : ""}</div>
    <div class="n5e-buttons">
      <button type="button" data-n5e-social-gm="pitfall">Pitfall triggered (+1 PoF, −4)</button>
      <button type="button" data-n5e-social-gm="exposed">Deception exposed (+2 PoF)</button>
      ${s.type === "intrigue" ? "<button type=\"button\" data-n5e-social-gm=\"purpose\">Revealing True Purpose</button>" : ""}
      <button type="button" data-n5e-social-gm="pressure">Pressure landed on the targeted player</button>
    </div>
    <div class="n5e-buttons">NPC: ${npc}</div>
    <div class="n5e-buttons">
      <button type="button" data-n5e-social-gm="adjust" data-poa="1">+1 PoA</button><button type="button" data-n5e-social-gm="adjust" data-pof="1">+1 PoF</button>
      <button type="button" data-n5e-social-gm="adjust" data-poa="-1">−1 PoA</button><button type="button" data-n5e-social-gm="adjust" data-pof="-1">−1 PoF</button>
      <button type="button" data-n5e-social-gm="next">Next round</button><button type="button" data-n5e-social-gm="end">End now</button>
    </div></div>`;
}

async function saveTracker(message, s) {
  return message.update({ content: trackerHTML(s), "flags.n5e.social": s });
}

async function saveControl(control, s, h) {
  return control.update({ content: controlHTML(s, h), "flags.n5e.socialGM": h });
}

/** GM: start a social encounter with the selected NPC token. */
export async function startSocialEncounter() {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM starts a social encounter.");
  const npc = canvas?.tokens?.controlled?.[0]?.actor;
  if ( !npc ) return ui.notifications.warn("Select the NPC's token first.");
  const opts = (o, v) => Object.entries(o).map(([k, x]) => `<option value="${k}" ${k === v ? "selected" : ""}>${esc(x.label)}</option>`).join("");
  const boxes = (name, items) => items.map((t, i) => `<label class="checkbox"><input type="checkbox" name="${name}${i}"> ${esc(t)}</label>`).join("");
  const picked = await foundry.applications.api.DialogV2.prompt({ window: { title: `Social encounter: ${npc.name}` }, position: { width: 560 },
    content: `<label>Type <select name="type">${opts(socialTypes, "diplomatic")}</select></label>
      <label>Attitude <select name="attitude">${opts(socialAttitudes, "indifferent")}</select></label>
      <fieldset><legend>Motivations (2 to 3; hidden)</legend>${boxes("m", socialMotivations)}<input type="text" name="mCustom" placeholder="Others, separated by ;"></fieldset>
      <fieldset><legend>Pitfalls (1 to 2; hidden)</legend>${boxes("p", socialPitfalls)}<input type="text" name="pCustom" placeholder="Others, separated by ;"></fieldset>
      <label>Recall Knowledge DC <input type="number" name="recallDC" value="15" min="0"></label>`,
    ok: { label: "Start", callback: (event, button) => {
      const f = button.form.elements;
      const custom = v => String(v ?? "").split(";").map(x => x.trim()).filter(Boolean);
      return { type: f.type.value, attitude: f.attitude.value, recallDC: Number(f.recallDC.value) || 15,
        motivations: [...socialMotivations.filter((t, i) => f[`m${i}`].checked), ...custom(f.mCustom.value)],
        pitfalls: [...socialPitfalls.filter((t, i) => f[`p${i}`].checked), ...custom(f.pCustom.value)] };
    } }, rejectClose: false });
  if ( !picked ) return null;
  const setup = socialSetup(picked.attitude);
  const s = { npcUuid: npc.uuid, npcName: npc.name, type: picked.type, attitude: picked.attitude, round: 1, ...setup,
    revealed: [], perform: false, disadvantage: [], partyDisadvantage: false, log: [], ended: null, controlId: null };
  const h = { motivations: picked.motivations.map(text => ({ text, revealed: false })), pitfalls: picked.pitfalls.map(text => ({ text, revealed: false })),
    pitfallRound: false, recallDC: picked.recallDC, trackerId: null };
  const tracker = await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: npc }), content: trackerHTML(s), flags: { n5e: { social: s } } });
  const control = await ChatMessage.create({ whisper: gmIds(), content: controlHTML(s, { ...h, trackerId: tracker.id }), flags: { n5e: { socialGM: { ...h, trackerId: tracker.id } } } });
  s.controlId = control.id;
  return saveTracker(tracker, s);
}

/** Which actor speaks for this user: a controlled token they own, else their character. */
function speaker() {
  const token = canvas?.tokens?.controlled?.find(t => t.actor?.isOwner);
  return token?.actor ?? game.user.character ?? null;
}

/** A player's button on the tracker. */
export async function onSocialClick(message, button, event) {
  const s = message.flags?.n5e?.social;
  if ( !s || s.ended ) return null;
  const key = button.dataset.n5eSocial;
  const action = socialActions[key];
  const actor = speaker();
  if ( !action || !actor ) return ui.notifications.warn("Select your token (or set your character) first.");
  const motivation = !!message.id && !!button.closest(".n5e-social")?.querySelector("[data-n5e-social-motivation]")?.checked && action.kind === "primary";
  let total = null, usedPerform = false;
  if ( key !== "perform" ) {
    let skill = action.skill;
    if ( !skill ) {
      skill = await foundry.applications.api.DialogV2.prompt({ window: { title: "Other skill" },
        content: `<p>The GM must approve this argument.</p><label>Skill <select name="skill">${Object.entries(CONFIG.N5E.skills).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></label>`,
        ok: { label: "Roll", callback: (ev, b) => b.form.elements.skill.value }, rejectClose: false });
      if ( !skill ) return null;
    }
    const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
    let spec = { ...rollSpec(actor, "skill", skill), label: `${action.label} (${CONFIG.N5E.skills[skill]?.label ?? skill})` };
    const extra = [];
    if ( motivation ) extra.push({ label: "Motivation", value: 2 });
    if ( action.kind === "primary" && s.perform ) { extra.push({ label: "Perform", value: 2 }); usedPerform = true; }
    if ( extra.length ) {
      const { d20Parts } = await import("../rules/roll-math.mjs");
      const parts = [...d20Parts(spec).map(p => ({ label: p.label, value: p.value })), ...extra];
      spec = { ...spec, bonus: (Number(spec.bonus) || 0) + extra.reduce((a, p) => a + p.value, 0), breakdown: { ...(spec.breakdown ?? {}), parts } };
    }
    if ( action.kind === "primary" && (s.partyDisadvantage || s.disadvantage.includes(actor.uuid)) ) {
      spec.disadvantageSources = [...(spec.disadvantageSources ?? []), s.partyDisadvantage ? "Revealing True Purpose" : "Pressured"];
    }
    let rolled = null;
    await rollWithSpec(actor, spec, { event, onResult: r => { rolled = r.message; } });
    if ( !rolled ) return null;
    total = Number(rolled.flags?.n5e?.roll?.total) || 0;
  }
  const data = { messageId: message.id, action: key, total: total ?? 0, motivation, usedPerform };
  if ( game.users.activeGM?.isSelf ) return receiveSocial(actor, data);
  const { submitIntent } = await import("../automation/owner-intents.mjs");
  return submitIntent(actor, "socialResult", data).catch(error => ui.notifications.warn(error.message));
}

/** GM side: apply a player's roll to the tracker. */
export async function receiveSocial(actor, data) {
  const message = game.messages.get(data.messageId);
  const s = structuredClone(message?.flags?.n5e?.social ?? null);
  if ( !s || s.ended ) throw new Error("This social encounter is over.");
  const control = game.messages.get(s.controlId);
  const h = structuredClone(control?.flags?.n5e?.socialGM ?? { motivations: [], pitfalls: [], recallDC: 15 });
  const npc = (await fromUuid(s.npcUuid))?.system ?? {};
  const action = socialActions[data.action];
  const who = actor.name;
  if ( data.action === "perform" ) {
    s.perform = true;
    s.log.push(`${who} performs: the next Primary Argument gets +2.`);
  } else if ( action.kind === "primary" ) {
    const dc = actionDC(data.action === "other" ? "impression" : data.action, npc) ?? 10;
    const p = primaryPoints({ margin: data.total - dc, motivation: data.motivation, pitfall: !!h.pitfallRound, action: data.action, type: s.type });
    s.poa += p.poa; s.pof += p.pof;
    s.log.push(`${who}, ${action.label}${data.motivation ? " (Motivation)" : ""}: ${p.success ? "success" : "failure"}, ${p.poa ? `+${p.poa} PoA` : ""}${p.poa && p.pof ? ", " : ""}${p.pof ? `+${p.pof} PoF` : ""}.`);
    if ( p.reveal ) await whisperGM(`${esc(who)} succeeded by 10 or more: reveal one Motivation or Pitfall of your choice.`);
    if ( p.newPitfall ) await whisperGM(`${esc(who)} failed by 5 or more: the NPC gains a new Pitfall of your choice.`);
    if ( data.usedPerform ) s.perform = false;
    s.disadvantage = s.disadvantage.filter(u => u !== actor.uuid);
    s.partyDisadvantage = false;
  } else if ( data.action === "sense" ) {
    const dc = actionDC("sense", npc) ?? 10;
    const ok = data.total >= dc;
    s.log.push(`${who} reads the NPC: ${ok ? "success" : "nothing"}.`);
    if ( ok ) await whisperGM(`${esc(who)}'s Sense Motive succeeded (${data.total} vs DC ${dc}): reveal one Motivation or Pitfall that can be read from visual cues.`);
  } else if ( data.action === "recall" ) {
    const r = argumentResult(data.total - h.recallDC);
    s.log.push(`${who} recalls what they know: ${r.success ? "something comes to mind" : "nothing"}.`);
    if ( r.success ) await whisperGM(`${esc(who)}'s Recall Knowledge (${data.total} vs DC ${h.recallDC}): ${data.total - h.recallDC >= 10 ? "reveal a Motivation or Pitfall in full" : "give a contextual hint about one Motivation or Pitfall"}.`);
  } else if ( data.action === "seeThrough" ) {
    s.log.push(`${who} watches for lies.`);
    await whisperGM(`${esc(who)}'s See Through Lies: Insight ${data.total}. Compare it with the NPC's Counter-Argue (or Convince or Misdirect) check; on a player success they know whether the statement is true.`);
  }
  await saveTracker(message, s);
  return { score: socialScore(s) };
}

/** GM controls on the GM card. */
export async function onSocialGMClick(control, button) {
  if ( !game.user.isGM ) return null;
  const h = structuredClone(control.flags.n5e.socialGM);
  const message = game.messages.get(h.trackerId);
  const s = structuredClone(message?.flags?.n5e?.social ?? null);
  if ( !s || s.ended ) return ui.notifications.info("This social encounter is over.");
  const cmd = button.dataset.n5eSocialGm;
  if ( cmd === "reveal" ) {
    const item = h[button.dataset.kind]?.[Number(button.dataset.index)];
    if ( !item ) return null;
    item.revealed = true;
    s.revealed.push(`${button.dataset.kind === "pitfalls" ? "Pitfall" : "Motivation"}: ${item.text}`);
  } else if ( cmd === "pitfall" ) { s.pof += 1; h.pitfallRound = true; s.log.push("The NPC bristles (+1 PoF)."); }
  else if ( cmd === "exposed" ) { s.pof += 2; s.log.push("A deception is exposed (+2 PoF)."); }
  else if ( cmd === "purpose" ) { s.pof += 1; s.partyDisadvantage = true; s.log.push("The NPC sees the party's true purpose (+1 PoF; the next Primary Argument at disadvantage)."); }
  else if ( cmd === "pressure" ) {
    const target = Array.from(game.user.targets ?? [])[0]?.actor;
    if ( !target ) return ui.notifications.warn("Target the pressured player's token first.");
    s.pof += 1; s.disadvantage = [...new Set([...s.disadvantage, target.uuid])];
    s.log.push(`${target.name} is pressured (+1 PoF; their next Primary Argument at disadvantage).`);
  } else if ( cmd === "npc" ) {
    const a = socialNpcActions[button.dataset.npc];
    const npc = await fromUuid(s.npcUuid);
    if ( npc && a?.skills.length ) {
      const skill = a.skills.length === 1 ? a.skills[0] : await foundry.applications.api.DialogV2.wait({ window: { title: a.label },
        content: "<p>Which skill?</p>", buttons: a.skills.map(k => ({ action: k, label: CONFIG.N5E.skills[k]?.label ?? k })), rejectClose: false });
      if ( !skill ) return null;
      const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
      await rollWithSpec(npc, { ...rollSpec(npc, "skill", skill), label: `${a.label} (secret)` });
    }
    await whisperGM(`${esc(a.label)}: on a success add ${a.pof} PoF with the buttons below.`);
    return null;
  } else if ( cmd === "adjust" ) {
    s.poa = Math.max(0, s.poa + (Number(button.dataset.poa) || 0));
    s.pof = Math.max(0, s.pof + (Number(button.dataset.pof) || 0));
  } else if ( cmd === "next" ) {
    s.round += 1; h.pitfallRound = false;
    if ( patienceSpent(s) ) s.ended = socialOutcome(socialScore(s));
    else s.log.push(`Round ${s.round} begins.`);
  } else if ( cmd === "end" ) s.ended = socialOutcome(socialScore(s));
  await saveTracker(message, s);
  return saveControl(control, s, h);
}

export async function registerSocial() {
  const { registerIntentHandler } = await import("../automation/owner-intents.mjs");
  registerIntentHandler("socialResult", (actor, data) => receiveSocial(actor, data));
}
