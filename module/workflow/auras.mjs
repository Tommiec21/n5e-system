/**
 * Aura sync (ENG1d; rules/auras.mjs decides). The active GM keeps every aura's child effects in step
 * when tokens move, effects change and turns change.
 */
import { auraPlan } from "../rules/auras.mjs";

let pending = null;

/** Recompute every aura on the current scene (debounced). */
export function scheduleAuraSync() {
  if ( !game.users.activeGM?.isSelf || !canvas?.ready ) return;
  clearTimeout(pending);
  pending = setTimeout(() => { void syncAuras().catch(error => console.warn("n5e | auras", error)); }, 150);
}

export async function syncAuras() {
  if ( !game.users.activeGM?.isSelf || !canvas?.ready ) return;
  const tokens = canvas.tokens.placeables.filter(t => t.actor);
  const byActor = new Map(tokens.map(t => [t.actor.uuid, t]));
  const auras = tokens.flatMap(t => t.actor.effects.filter(e => !e.disabled && e.flags?.n5e?.aura)
    .map(e => ({ uuid: e.uuid, actorUuid: t.actor.uuid, disposition: t.document.disposition, aura: e.flags.n5e.aura, effect: e })));
  const creatures = tokens.map(t => ({
    actorUuid: t.actor.uuid, disposition: t.document.disposition,
    distanceTo: uuid => { const o = byActor.get(uuid); return o ? canvas.grid.measurePath([t.center, o.center]).distance : Infinity; },
    children: t.actor.effects.filter(e => e.flags?.n5e?.auraFrom).map(e => ({ auraFrom: e.flags.n5e.auraFrom, effectId: e.id }))
  }));
  const plan = auraPlan(auras, creatures);
  for ( const r of plan.remove ) await byActor.get(r.actorUuid)?.actor.deleteEmbeddedDocuments("ActiveEffect", [r.effectId]);
  for ( const a of plan.add ) {
    const src = auras.find(x => x.uuid === a.auraUuid);
    const child = src.aura.effect ?? {};
    await byActor.get(a.actorUuid)?.actor.createEmbeddedDocuments("ActiveEffect", [{
      name: child.name || src.effect.name, img: src.effect.img, origin: src.effect.origin ?? null,
      changes: (child.changes ?? []).map(c => ({ key: c.key, value: String(c.value), mode: c.mode ?? 2 })),
      flags: { n5e: { auraFrom: src.uuid, ...(child.rules?.length ? { rules: child.rules } : {}), ...(child.state ? { state: child.state } : {}) } } }]);
  }
}

export function registerAuraHooks() {
  Hooks.on("updateToken", (doc, change) => { if ( "x" in change || "y" in change || "disposition" in change ) scheduleAuraSync(); });
  Hooks.on("createToken", scheduleAuraSync);
  Hooks.on("deleteToken", scheduleAuraSync);
  Hooks.on("createActiveEffect", effect => { if ( effect.flags?.n5e?.aura ) scheduleAuraSync(); });
  Hooks.on("deleteActiveEffect", effect => { if ( effect.flags?.n5e?.aura ) scheduleAuraSync(); });
  Hooks.on("updateCombat", scheduleAuraSync);
  Hooks.on("canvasReady", scheduleAuraSync);
}
