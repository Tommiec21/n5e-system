/**
 * Action effects (STD2; docs/STD_SPEC.md). An Active Effect on a feature marked
 * flags.n5e.applyTo = "action" never acts from the actor: when the feature is chosen for an action
 * (a Molding, a Maneuver, a cast option), the effect's rule elements are copied onto that action's
 * card, and they act on the rolls made from the card:
 *   - direction "self": the acting creature's own rolls from the card (Precise: its attack);
 *   - direction "imposed": other creatures' rolls against the card (Heightened: a target's save).
 * `uses` counts matching rolls made from the card; with targets "one" the count is shared by every
 * target (the first target to roll uses it), otherwise each target has its own count.
 * Pure: the card's list and the earlier rolls are passed in.
 */

/** The action effects of the items chosen for an action: [{id, origin, label, rules}]. */
export function actionEffectsOf(items) {
  const out = [];
  for ( const item of items ?? [] ) {
    for ( const effect of [...(item?.effects ?? [])] ) {
      if ( effect?.flags?.n5e?.applyTo !== "action" ) continue;
      const rules = (Array.isArray(effect.flags.n5e.rules) ? effect.flags.n5e.rules : []).filter(r => r && typeof r === "object");
      out.push({ id: `${item.id}.${effect.id ?? effect._id}`, origin: item.name, label: effect.name || item.name, rules: structuredClone(rules) });
    }
  }
  return out;
}

/**
 * The card's elements for one roll.
 * @param {object[]} actionEffects   the card's list (actionEffectsOf)
 * @param {object} o
 * @param {boolean} o.isActor        the roller is the creature that took the action
 * @param {string} o.rollerUuid
 * @param {{elementId: string, rollerUuid: string}[]} o.consumed  uses already spent on this card
 * @returns {{element, label, elementId}[]}
 */
export function cardElements(actionEffects, { isActor, rollerUuid, consumed = [] } = {}) {
  const out = [];
  for ( const fx of actionEffects ?? [] ) {
    fx.rules.forEach((element, i) => {
      const direction = element.direction ?? "self";
      if ( direction === "against" || element.on ) return;
      if ( (direction === "self") !== !!isActor ) return;
      const elementId = `${fx.id}#${i}`;
      const uses = Number(element.uses) || 0;
      if ( uses > 0 ) {
        const spent = consumed.filter(c => c.elementId === elementId && (element.targets === "one" || c.rollerUuid === rollerUuid)).length;
        if ( spent >= uses ) return;
      }
      out.push({ element, label: element.label || fx.label, elementId });
    });
  }
  return out;
}

/** Which of the elements a roll used should be counted as spent (those with uses). */
export const spentBy = (used, rollerUuid) => used.filter(u => Number(u.element.uses) > 0).map(u => ({ elementId: u.elementId, rollerUuid }));

/** A plain-language line for an element (the card and, in STD5, the Automation tab). */
export function describeElement(e = {}) {
  const sel = [].concat(e.selector ?? []).join(", ") || "rolls";
  const whose = e.direction === "imposed" ? (e.targets === "one" ? "one target's" : "targets'") : e.direction === "against" ? "rolls against this creature:" : "";
  const first = Number(e.uses) === 1 ? "first " : Number(e.uses) > 1 ? `first ${e.uses} ` : "";
  const what = `${whose ? `${whose} ` : ""}${first}${sel}`.trim();
  switch ( e.key ) {
    case "advantage": return `Advantage on ${what}`;
    case "disadvantage": return `Disadvantage on ${what}`;
    case "modifier": return `${Number(e.value) >= 0 ? "+" : ""}${Number(e.value)} to ${what}`;
    case "degreeShift": return `${Number(e.value) >= 0 ? "+" : ""}${Number(e.value)} degree on ${what}`;
    case "autoFail": return `${what}: automatic failure`;
    case "autoSucceed": return `${what}: automatic success`;
    case "reroll": return `Reroll ${what} (keep the ${e.mode === "lower" ? "lower" : e.mode === "higher" ? "higher" : "new"} result)`;
    case "critRange": return `Critical range +${Number(e.value) || 0} on ${what}`;
    case "maximizeDice": return `${Number(e.value) || 0} die maximized on ${what}`;
    case "minimumDie": return `Each die at least ${Number(e.value) || 0} on ${what}`;
    case "damage": return `+${e.formula ?? ""}${e.damageType ? ` ${e.damageType}` : ""} damage on ${what}`;
    case "damageHandling": return [e.drMultiplier != null && Number(e.drMultiplier) !== 1 ? `DR ×${Number(e.drMultiplier)}` : "",
      e.ignoreResistance ? "ignores resistance" : "", e.immunityAsResistance ? "immunity counts as resistance" : ""].filter(Boolean).join(", ") || "Damage handling";
    case "addRanks": return `+${Number(e.value) || 0} rank on conditions inflicted`;
    case "inflict": return `Inflicts ${e.condition ?? ""}${e.ranks ? ` ${e.ranks}` : ""}`;
    case "note": return e.text ?? "";
    default: return e.key ?? "";
  }
}
