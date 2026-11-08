/**
 * Condition lifecycle (Foundry side); rules in rules/condition-lifecycle.mjs.
 *   - Turn start: a damage card for Burned / Bleed with Apply (to that creature, ignoring DR).
 *   - Turn end: rank decay and endings, posted as one short card.
 *   - "Try to end" from the sheet: pick the check, roll vs the DC, spend the Action.
 */
import { conditionTurnStart, conditionTurnEnd, removalOptions, removalResult } from "../rules/condition-lifecycle.mjs";
import { applyButtons } from "./activity-buttons.mjs";
import { rollWithSpec } from "../dice/roll.mjs";
import { rollSpec } from "../dice/d20.mjs";
import { esc } from "../view-models/common.mjs";

const ChatMessage = () => CONFIG.ChatMessage.documentClass;

/** Turn start: roll condition damage and post it (applied with the card's Apply button). */
export async function postConditionDamage(actor) {
  const hits = conditionTurnStart(actor);
  if ( !hits.length ) return null;
  const rolls = [];
  const instances = [];
  for ( const h of hits ) {
    const r = await new Roll(h.formula).evaluate();
    rolls.push(r);
    instances.push({ amount: r.total, type: h.type, label: `${h.name}${h.ranks > 1 ? ` ${h.ranks}` : ""}` });
  }
  const total = instances.reduce((t, i) => t + i.amount, 0);
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), rolls,
    content: `<div class="n5e-roll-card damage"><header><b>${esc(actor.name)}: condition damage</b><span class="bonus">${total}</span></header>
      <div class="note">${esc(instances.map(i => `${i.label}: ${i.amount} ${i.type}`).join(" · "))} · ignores DR</div>
      ${applyButtons()}</div>`,
    flags: { n5e: { damage: { instances, total, ignoreDR: true, targetUuid: actor.uuid }, actorUuid: actor.uuid } } });
}

/** Turn end: decay ranks, end turn-end conditions and expired ones. */
export async function processConditionTurnEnd(actor, now) {
  const isExpired = e => e.duration?.type && e.duration.type !== "none" && (e.duration.remaining ?? 1) <= 0;
  const { decay, end } = conditionTurnEnd(actor, { now, isExpired });
  if ( !decay.length && !end.length ) return null;
  for ( const d of decay ) await actor.removeCondition(d.key, d.ranks);
  for ( const e of end ) await actor.removeCondition(e.key, "all");
  const lines = [...decay.map(d => `${esc(d.name)}: −${d.ranks} rank`), ...end.map(e => `${esc(e.name)} ends (${esc(e.reason)})`)];
  return ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }),
    content: `<div class="n5e-turn-card"><b>${esc(actor.name)}: end of turn</b>${lines.map(l => `<div>${l}</div>`).join("")}</div>` });
}

/** Try to end a condition with a check (an Action). */
export async function tryEndCondition(actor, effect, event) {
  const options = removalOptions(effect).filter(o => o.checks.length);
  const notes = removalOptions(effect).filter(o => o.text).map(o => `<p class="sub">${esc(o.text)}</p>`).join("");
  if ( !options.length ) return ui.notifications.info(`${effect.name} can't be ended with a check.`);
  const buttons = options.flatMap((o, oi) => o.checks.map(c => {
    const spec = rollSpec(actor, c.type, c.key);
    return { action: `${oi}:${c.type}:${c.key}`, label: `${c.label} (${spec.bonus >= 0 ? "+" : ""}${spec.bonus}) vs DC ${o.dc}` };
  }));
  const { DialogV2 } = foundry.applications.api;
  const picked = await DialogV2.wait({
    window: { title: `${actor.name}: end ${effect.name}`, icon: "fa-solid fa-hand-sparkles" },
    content: `<p>Uses your Action.${options[0].requiresTool ? ` Needs a ${esc(options[0].requiresTool)} kit.` : ""}</p>${notes}`,
    buttons: [...buttons, { action: "cancel", label: "Cancel" }],
    rejectClose: false
  });
  if ( !picked || picked === "cancel" ) return null;
  const [oi, type, key] = picked.split(":");
  const option = options[Number(oi)];
  const spec = { ...rollSpec(actor, type, key), label: `${rollSpec(actor, type, key).label}: end ${effect.name}` };
  if ( game.combat?.started ) await actor.update({ "flags.n5e.economy.action": true });
  return rollWithSpec(actor, spec, { event, dc: option.dc, onResult: async r => {
    const res = removalResult(option, r.message?.rolls?.[0]?.total ?? 0, effect.system.ranks);
    let text;
    if ( res.success ) {
      await actor.removeCondition(effect.system.key, res.ranks);
      text = res.ranks === "all" ? `${effect.name} ends.` : `${effect.name}: −${res.ranks} rank${res.ranks > 1 ? "s" : ""}.`;
    } else if ( res.raiseDC ) {
      await effect.setFlag("n5e", "removalDC", (effect.flags?.n5e?.removalDC ?? 0) + res.raiseDC);
      text = `${effect.name} holds: its removal DC rises by ${res.raiseDC}.`;
    } else text = `${effect.name} holds.`;
    await ChatMessage().create({ speaker: ChatMessage().getSpeaker({ actor }), content: `<div class="n5e-roll-card"><div class="note">${esc(text)}</div></div>` });
  } });
}
