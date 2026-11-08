/**
 * Rest dialogs (Foundry side). Short: choose Hit Dice and Chakra Dice to spend (rolled together,
 * + Con per die). Long: with or without food and drink. Full: confirm. Each shows the limit or ration
 * check first, applies the plan, spends rations (through the GM when a player rests), and posts a card.
 */
import { restCheck, restPlan, shortRestDice, REST_LABELS } from "../rules/rest.mjs";
import { rule } from "../rules-settings.mjs";
import { esc } from "../view-models/common.mjs";

/** Spend rations (GM writes the world setting; players ask the GM over the socket). */
export async function spendRations(amount) {
  if ( !amount ) return;
  if ( game.user.isGM ) return game.settings.set("n5e", "rationPool", Math.max(0, rule("rationPool") - amount));
  game.socket.emit("system.n5e", { type: "spendRations", amount });
}

/** GM side of the socket. */
export function registerRestSocket() {
  game.socket?.on("system.n5e", async data => {
    if ( data?.type !== "spendRations" || !game.users.activeGM?.isSelf ) return;
    await game.settings.set("n5e", "rationPool", Math.max(0, rule("rationPool") - (Number(data.amount) || 0)));
  });
}

function dialogContent(actor, type, check) {
  const sys = actor.system;
  const status = [
    check.reason ? `<p class="${check.benefit ? "warn" : "problem"}">${esc(check.reason)}</p>` : "",
    rule("rations") ? `<p>Ration Pool: ${rule("rationPool")} / ${rule("rationMax")}${check.rationCost ? ` · this rest costs ${check.rationCost}` : ""}</p>` : ""
  ].join("");
  if ( type === "short" ) {
    const hdMax = shortRestDice(sys.hitDice);
    const cdMax = shortRestDice(sys.chakraDice);
    return `<div class="n5e-rest">${status}
      <p>Spend up to half your Hit Dice and, separately, up to half your Chakra Dice. Each die + Con (${sys.abilities.con.mod >= 0 ? "+" : ""}${sys.abilities.con.mod}).</p>
      <label>Hit Dice (${sys.hitDice.die || "—"}) <input type="number" name="hd" value="0" min="0" max="${hdMax}"> <span class="sub">of ${hdMax} (${sys.hitDice.value} left)</span></label>
      <label>Chakra Dice (${sys.chakraDice.die || "—"}) <input type="number" name="cd" value="0" min="0" max="${cdMax}"> <span class="sub">of ${cdMax} (${sys.chakraDice.value} left)</span></label>
      <p class="sub">HP ${sys.hp.value} / ${sys.hp.max} · CP ${sys.cp.value} / ${sys.cp.max}</p></div>`;
  }
  if ( type === "long" ) {
    return `<div class="n5e-rest">${status}
      <p>Regain half your max HP and CP and half your spent Hit and Chakra Dice. Temporary HP and CP end. Counts as a Short Rest for anything that recovers on one.</p>
      <label class="opt"><input type="checkbox" name="food" checked> Food and drink (−2 Exhaustion)</label></div>`;
  }
  return `<div class="n5e-rest">${status}<p>Regain all HP, CP, Hit Dice and Chakra Dice, and recover from conditions that persist.</p></div>`;
}

/** Open a rest dialog for an actor. */
export async function restDialog(actor, type) {
  const check = restCheck(actor, type, { now: game.time.worldTime });
  const { DialogV2 } = foundry.applications.api;
  const choice = await DialogV2.wait({
    window: { title: `${actor.name}: ${REST_LABELS[type]}`, icon: "fa-solid fa-bed" },
    content: dialogContent(actor, type, check),
    buttons: [
      ...(check.ok ? [{ action: "rest", label: REST_LABELS[type], default: true, callback: (event, button) => {
        const f = button.form.elements;
        return { hd: Number(f.hd?.value) || 0, cd: Number(f.cd?.value) || 0, food: f.food ? f.food.checked : true };
      } }] : []),
      { action: "cancel", label: check.ok ? "Cancel" : "Close", callback: () => null }
    ],
    rejectClose: false
  });
  if ( !choice ) return null;
  return takeRest(actor, type, choice, check);
}

/** Roll, apply, post. */
export async function takeRest(actor, type, { hd = 0, cd = 0, food = true } = {}, check = restCheck(actor, type, { now: game.time.worldTime })) {
  const sys = actor.system;
  const con = sys.abilities.con.mod;
  const rolls = [];
  let hdRoll = 0;
  let cdRoll = 0;
  hd = Math.min(hd, shortRestDice(sys.hitDice));
  cd = Math.min(cd, shortRestDice(sys.chakraDice));
  if ( type === "short" && check.benefit ) {
    if ( hd && sys.hitDice.die ) {
      const r = await new Roll(`${hd}${sys.hitDice.die} + ${con * hd}`).evaluate();
      rolls.push(r);
      hdRoll = r.total;
    }
    if ( cd && sys.chakraDice.die ) {
      const r = await new Roll(`${cd}${sys.chakraDice.die} + ${con * cd}`).evaluate();
      rolls.push(r);
      cdRoll = r.total;
    }
  }
  const plan = restPlan(actor, type, { hdSpent: hdRoll ? hd : 0, cdSpent: cdRoll ? cd : 0, hdRoll, cdRoll, food,
    now: game.time.worldTime, benefit: check.benefit });
  await actor.update(plan.update);
  if ( plan.items.length ) await actor.updateEmbeddedDocuments("Item", plan.items);
  for ( const c of plan.conditions ) await actor.removeCondition(c.key, c.ranks);
  if ( check.rationCost ) await spendRations(check.rationCost);
  const ChatMessageCls = CONFIG.ChatMessage.documentClass;
  return ChatMessageCls.create({ speaker: ChatMessageCls.getSpeaker({ actor }), rolls,
    content: `<div class="n5e-rest-card"><b>${esc(REST_LABELS[type])}</b>${check.rationCost ? `<span class="sub"> · ${check.rationCost} rations</span>` : ""}
      ${plan.lines.map(l => `<div>${esc(l)}</div>`).join("") || "<div>Nothing to recover.</div>"}</div>` });
}
