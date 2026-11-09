import { validateReactionRecipe } from "../../rules/authored-reactions.mjs";
import { n5eRollFormula } from "../../dice/n5e-roll.mjs";
import { esc } from "../../view-models/common.mjs";

export async function editReaction(item) {
  if ( !game.user.isGM || !item.isOwner ) throw new Error("A GM must configure reaction automation.");
  const value = item.flags?.n5e?.reaction ?? { version: 1, enabled: false, reduction: "", multiplier: 1, pool: "", cost: 0, requireSight: false, spendReaction: true };
  const check = key => value[key] ? "checked" : "";
  const result = await foundry.applications.api.DialogV2.prompt({ window: { title: `${item.name}: damage reaction` },
    content: `<p>Configure this ability's existing rules. Offered before damage in active combat. Flat reduction follows DR rules; a creature chooses its damage type allocation. One accepted reaction is resolved per damage command.</p>
      <label><input type="checkbox" name="enabled" ${check("enabled")}> Enable</label>
      <label>DR formula (optional)<input name="reduction" value="${esc(value.reduction)}" placeholder="1d12"></label>
      <label>Damage multiplier<select name="multiplier">${[0.5, 1, 2].map(n => `<option value="${n}" ${value.multiplier === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label>Resource pool key (optional)<input name="pool" value="${esc(value.pool)}" placeholder="discipline"></label>
      <label>Resource cost<input type="number" name="cost" min="0" step="1" value="${value.cost}"></label>
      <label><input type="checkbox" name="requireSight" ${check("requireSight")}> Requires seeing the source</label>
      <label><input type="checkbox" name="spendReaction" ${check("spendReaction")}> Spends reaction</label>
      <p>Does not implement attack redirection, free-use turn limits or additional targets. Leave unsupported abilities disabled. Do not duplicate a built-in reaction on the same ability.</p>`,
    ok: { label: "Save", callback: (event, button) => {
      const form = button.form.elements;
      return validateReactionRecipe({ version: 1, enabled: form.enabled.checked, reduction: form.reduction.value,
        multiplier: Number(form.multiplier.value), pool: form.pool.value.trim(), cost: Number(form.cost.value),
        requireSight: form.requireSight.checked, spendReaction: form.spendReaction.checked });
    } }, rejectClose: false });
  if ( !result ) return;
  if ( result.reduction ) n5eRollFormula(result.reduction, item.actor?.getRollData?.() ?? {});
  if ( !game.user.isGM || !item.isOwner ) throw new Error("Permission changed before saving reaction.");
  return item.setFlag("n5e", "reaction", result);
}
