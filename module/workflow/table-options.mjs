/**
 * PRESTD1 A-ii (King 2026-11-15): optional table rules that act on tokens and the combat tracker.
 *   sharedVision       players see through every player character's token with vision
 *   scaleTokens        token size follows creature size
 *   defeatedMarker     dead creatures and NPCs at 0 HP marked defeated in the tracker
 *   encumbranceStatus  the Encumbered state follows the inventory
 * The party overview for players (partyStatsVisible) is in applications/gm/party-overview.mjs.
 */
import { rule } from "../rules-settings.mjs";
import { tokenSizeFor, isDefeated, encumbranceChange } from "../rules/token-size.mjs";

const activeGM = () => !!globalThis.game?.users?.activeGM?.isSelf;

/** Vision: wrap the token class so player characters' tokens are vision sources for every player. */
function patchSharedVision() {
  const cls = CONFIG.Token?.objectClass;
  const proto = cls?.prototype;
  if ( !proto || proto._n5eSharedVision || typeof proto._isVisionSource !== "function" ) return;
  const original = proto._isVisionSource;
  proto._isVisionSource = function() {
    if ( rule("sharedVision") && !game.user.isGM && this.document?.sight?.enabled && !this.document.hidden
      && this.actor?.type === "character" && this.actor.hasPlayerOwner ) return true;
    return original.call(this);
  };
  proto._n5eSharedVision = true;
}

async function scaleTokensOf(actor) {
  const dims = tokenSizeFor(actor.system?.traits?.size);
  if ( !dims ) return;
  for ( const token of actor.getActiveTokens?.(false, true) ?? [] ) {
    if ( token.flags?.n5e?.manualSize || (token.width === dims.width && token.height === dims.height) ) continue;
    await token.update(dims);
  }
  if ( !actor.isToken && (actor.prototypeToken?.width !== dims.width || actor.prototypeToken?.height !== dims.height) ) {
    await actor.update({ "prototypeToken.width": dims.width, "prototypeToken.height": dims.height });
  }
}

async function markDefeated(actor) {
  const combat = game.combat;
  if ( !combat ) return;
  const defeated = isDefeated({ type: actor.type, hp: actor.system?.hp?.value, statuses: actor.statuses });
  const updates = combat.combatants.filter(c => c.actor?.uuid === actor.uuid && c.defeated !== defeated).map(c => ({ _id: c.id, defeated }));
  if ( updates.length ) await combat.updateEmbeddedDocuments("Combatant", updates);
}

async function syncEncumbrance(actor) {
  const change = encumbranceChange(!!actor.system?.inventory?.encumbered, !!actor.statuses?.has("encumbered"));
  if ( change ) await actor.toggleStatusEffect("encumbered", { active: change === "add" });
}

export function registerTableOptions() {
  Hooks.once("setup", patchSharedVision);
  Hooks.on("preCreateToken", (doc, data) => {
    if ( !rule("scaleTokens") || data.flags?.n5e?.manualSize ) return;
    const dims = tokenSizeFor(doc.actor?.system?.traits?.size);
    if ( dims ) doc.updateSource(dims);
  });
  Hooks.on("updateActor", (actor, changes) => {
    if ( !activeGM() ) return;
    const has = path => foundry.utils.hasProperty(changes, path);
    if ( rule("scaleTokens") && has("system.traits.size") ) void scaleTokensOf(actor).catch(error => console.warn("n5e | token size", error));
    if ( rule("defeatedMarker") && has("system.hp") ) void markDefeated(actor).catch(error => console.warn("n5e | defeated", error));
  });
  const effectChanged = effect => {
    const actor = effect.parent;
    if ( !activeGM() || actor?.documentName !== "Actor" ) return;
    if ( rule("defeatedMarker") && effect.statuses?.has("dead") ) void markDefeated(actor).catch(error => console.warn("n5e | defeated", error));
  };
  Hooks.on("createActiveEffect", effectChanged);
  Hooks.on("deleteActiveEffect", effectChanged);
  // Encumbrance follows the items and the actor's Strength.
  const inventoryChanged = doc => {
    const actor = doc.documentName === "Actor" ? doc : doc.parent;
    if ( !activeGM() || !rule("encumbranceStatus") || actor?.documentName !== "Actor" ) return;
    void syncEncumbrance(actor).catch(error => console.warn("n5e | encumbrance", error));
  };
  for ( const hook of ["createItem", "updateItem", "deleteItem", "updateActor"] ) Hooks.on(hook, inventoryChanged);
}
