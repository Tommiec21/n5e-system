/**
 * Shortcuts in text (Foundry side): turns [[/save ...]], [[/check ...]], [[/damage ...]], [[/heal ...]],
 * @Condition[...] and @State[...] into clickable links wherever Foundry enriches text (journal pages,
 * item descriptions, cast cards, chat). The syntax and parsing are module/rules/enrichers.mjs.
 *
 * Links are <a class="n5e-link" data-n5e-link="..."> elements; one delegated click listener (added at
 * init) handles them all, so they work in any window, including ones rendered later.
 *   save    rolls for the clicker's selected tokens (else their character), through the same save
 *           code as cast-card buttons (Apply buttons for inflict=..., resistance advantage)
 *   check   same tokens, skill / toolkit / ability check, with the DC on the card when given
 *   damage  a damage card with Apply buttons, rolled with the source's numbers (@-references)
 *   heal    heals the selected tokens (else the user's character)
 *   condition / state   click applies to the selected tokens; Shift+click removes; hover shows rules
 * The source actor (for dc=nin and @-references) is the owner of the item the text belongs to, or the
 * actor itself; with neither, the user's selected token or assigned character.
 */
import { parseRollLink, parseConditionLink } from "../rules/enrichers.mjs";
import { esc } from "../view-models/common.mjs";

const ICONS = { save: "fa-shield-halved", check: "fa-dice-d20", damage: "fa-burst", heal: "fa-heart", condition: "fa-bolt", state: "fa-flag" };

/** The registries the parser needs, plus the source actor's DCs. */
function context(source) {
  const N = CONFIG.N5E;
  return {
    abilities: N.abilities, skills: N.skills, toolkits: N.toolkits, damageTypes: N.damageTypes,
    conditions: { ...N.conditions, ...(N.clanConditions ?? {}) }, states: N.states, disciplines: N.disciplines,
    conditionText: N.conditionText,
    dcFor: d => source?.system?.disciplines?.[d]?.dc ?? null
  };
}

/** The actor the text belongs to: an item's owner, an actor, or a journal's (none). */
function sourceOf(relativeTo) {
  if ( !relativeTo ) return null;
  if ( relativeTo.documentName === "Actor" ) return relativeTo;
  if ( relativeTo.documentName === "Item" ) return relativeTo.actor ?? null;
  if ( relativeTo.documentName === "ChatMessage" ) return relativeTo.speakerActor ?? null;
  return relativeTo.actor ?? null;
}

/** The link element for a parsed shortcut. */
function linkElement(spec, custom, source) {
  const a = document.createElement("a");
  a.classList.add("n5e-link", `n5e-link-${spec.kind}`);
  a.dataset.n5eLink = spec.kind;
  a.dataset.spec = JSON.stringify(spec);
  if ( source ) a.dataset.sourceUuid = source.uuid;
  if ( spec.text ) a.dataset.tooltip = `${spec.label}: ${spec.text}${spec.ends ? `. Ends: ${spec.ends}` : ""}`;
  a.innerHTML = `<i class="fa-solid ${ICONS[spec.kind] ?? "fa-link"}"></i> ${esc(custom || spec.label)}`;
  return a;
}

/** Called at init: the two patterns and the click listener. */
export function registerEnrichers() {
  CONFIG.TextEditor ??= {};
  CONFIG.TextEditor.enrichers ??= [];
  CONFIG.TextEditor.enrichers.push(
    {
      id: "n5eRoll",
      pattern: /\[\[\/(save|check|damage|heal)\s+([^\]]+?)\]\](?:\{([^}]+)\})?/gi,
      enricher: async (match, options) => {
        const source = sourceOf(options?.relativeTo);
        const spec = parseRollLink(match[1], match[2], context(source));
        if ( !spec ) return null;
        return linkElement(spec, match[3], source);
      }
    },
    {
      id: "n5eCondition",
      pattern: /@(Condition|State)\[([^\]]+)\](?:\{([^}]+)\})?/g,
      enricher: async (match, options) => {
        const spec = parseConditionLink(match[1], match[2], context(null));
        if ( !spec ) return null;
        return linkElement(spec, match[3], sourceOf(options?.relativeTo));
      }
    }
  );
  globalThis.document?.addEventListener("click", event => {
    const link = event.target?.closest?.("a.n5e-link[data-n5e-link]");
    if ( !link ) return;
    event.preventDefault();
    event.stopPropagation();
    onLinkClick(link, event);
  });
}

/** The clicking user's selected tokens' actors, else their character. */
function selectedActors() {
  const controlled = canvas?.tokens?.controlled?.map(t => t.actor).filter(Boolean) ?? [];
  if ( controlled.length ) return controlled;
  return game.user.character ? [game.user.character] : [];
}

/**
 * The card-button code expects a chat message to find the caster; text links have none, so give
 * it a stand-in that answers with the source actor.
 */
function standInMessage(actor) {
  return { getFlag: (scope, key) => (key === "actorUuid" ? actor?.uuid : undefined), speakerActor: actor };
}

/** Handle a click on a text link. */
export async function onLinkClick(link, event) {
  const spec = JSON.parse(link.dataset.spec || "{}");
  const source = link.dataset.sourceUuid ? await fromUuid(link.dataset.sourceUuid) : null;
  const fallback = source ?? selectedActors()[0] ?? null;
  const { onActivityClick } = await import("../workflow/activity-buttons.mjs");
  // A pretend button carrying the same data-* the cast-card buttons use.
  const button = document.createElement("button");
  switch ( spec.kind ) {
    case "save": {
      let dc = spec.dc;
      if ( dc == null && spec.dcSource ) dc = source?.system?.disciplines?.[spec.dcSource]?.dc ?? null;
      Object.assign(button.dataset, { n5eAct: "save", ability: spec.ability, label: link.textContent.trim() || spec.label,
        inflicts: JSON.stringify(spec.inflicts ?? []) });
      if ( dc != null ) button.dataset.dc = String(dc);
      return onActivityClick(standInMessage(source), button, event);
    }
    case "check": {
      const actors = selectedActors();
      if ( !actors.length ) return ui.notifications.info("Select the tokens that make the check.");
      const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
      for ( const a of actors ) {
        if ( !a.isOwner ) continue;
        const s = rollSpec(a, spec.type, spec.key);
        await rollWithSpec(a, s, { event, dc: spec.dc });
      }
      return null;
    }
    case "damage":
      Object.assign(button.dataset, { n5eAct: "damage", parts: JSON.stringify(spec.parts) });
      return onActivityClick(standInMessage(fallback), button, event);
    case "heal":
      Object.assign(button.dataset, { n5eAct: "heal", formula: spec.formula, pool: spec.pool });
      return onActivityClick(standInMessage(fallback), button, event);
    case "condition":
    case "state": {
      const actors = selectedActors().filter(a => a.isOwner);
      if ( !actors.length ) return ui.notifications.info(`Select tokens you own to ${event.shiftKey ? "remove" : "apply"} ${spec.label}.`);
      for ( const a of actors ) {
        if ( spec.kind === "condition" ) {
          if ( event.shiftKey ) await a.removeCondition(spec.key, spec.ranks > 1 ? spec.ranks : "all");
          else await a.addCondition(spec.key, spec.ranks);
        } else await a.toggleStatusEffect(spec.key, { active: !event.shiftKey });
      }
      return null;
    }
    default:
      return null;
  }
}
