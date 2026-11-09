/** Observer-specific Foundry13 detection. Never uses GM/global canvas visibility as a substitute. */
const QUALIFYING = new Set(["basicSight", "lightPerception", "senseAll", "seeAll", "seeInvisibility"]);
const has = (actor, key) => actor?.statuses?.has(key);

export function observerVisibility(observer, target, { canvasState = globalThis.canvas, config = globalThis.CONFIG } = {}) {
  const unknown = reason => ({ visible: null, reason });
  if ( !canvasState?.ready || !observer?.document || !target?.document || !target.center ) return unknown("Rendered observer and source tokens are required.");
  if ( observer.document.parent?.id !== target.document.parent?.id || target.document.parent?.id !== canvasState.scene?.id ) return unknown("Tokens must be on the viewed scene.");
  if ( observer.document.elevation !== target.document.elevation ) return unknown("Elevated sight requires a validated geometry provider.");
  if ( target.document.hidden ) return unknown("Hidden scene tokens are not automatically disclosed.");
  const source = observer.vision;
  if ( source?.object !== observer || !source.los || !observer.document.sight?.enabled ) return unknown("The observer has no prepared vision source.");
  const relational = [...(target.actor?.effects ?? [])].some(e => e.active !== false && !e.disabled && ["hidden", "undetected"].includes(e.system?.key)
    && (!e.system.target || [observer.actor?.uuid, observer.document.uuid].includes(e.system.target)));
  if ( relational || has(target.actor, "hidden") || has(target.actor, "undetected") ) return unknown("Observer-specific stealth requires a resolved awareness result.");
  const modes = observer.document.detectionModes.filter(m => m.enabled && QUALIFYING.has(m.id));
  const blinded = has(observer.actor, "blinded");
  const size = target.document.getSize?.() ?? { width: 0, height: 0 };
  const tolerance = Math.max(0, Math.min(size.width, size.height) / 4);
  const offsets = tolerance > 0 ? [[0, 0], [-1, -1], [-1, 1], [1, 1], [1, -1], [-1, 0], [1, 0], [0, -1], [0, 1]] : [[0, 0]];
  let tested = false, unavailable = false;
  for ( const mode of modes ) {
    if ( blinded && mode.id !== "senseAll" ) continue;
    // Chakra sensing and Tremor Sense are intentionally absent; Blindsight explicitly qualifies.
    const backend = config?.Canvas?.detectionModes?.[mode.id];
    if ( !backend?.testVisibility ) { unavailable = true; continue; }
    try {
      const tests = offsets.map(([dx, dy]) => ({ point: { x: target.center.x + dx * tolerance, y: target.center.y + dy * tolerance, elevation: target.document.elevation ?? 0 }, los: new Map() }));
      const visible = backend.testVisibility(source, mode, { object: target, tests });
      if ( visible === true ) return { visible: true, reason: `Observer detection: ${mode.id}`, mode: mode.id };
      if ( visible === false ) tested = true; else unavailable = true;
    } catch { unavailable = true; }
  }
  if ( unavailable ) return unknown("A configured sight provider could not evaluate visibility.");
  return { visible: false, reason: tested ? "The observer's configured sight cannot detect the source." : "No qualifying usable sight mode." };
}

/** Do not guess which of several linked tokens was attacked or produced the damage. */
export function damageSourceVisibility(defender, message) {
  if ( !globalThis.canvas?.ready || !message.speaker?.token || message.speaker.scene !== canvas.scene?.id ) return { visible: null, reason: "Damage card must identify its source token on the viewed scene." };
  const source = canvas.tokens.get(message.speaker.token);
  const sourceActor = message.getFlag("n5e", "actorUuid");
  if ( !sourceActor || source?.actor?.uuid !== sourceActor ) return { visible: null, reason: "The card does not identify a verified source actor/token pair." };
  const controlled = canvas.tokens.controlled.filter(t => t.actor?.uuid === defender.uuid);
  const matches = controlled.length ? controlled : defender.getActiveTokens?.(true) ?? [];
  if ( matches.length !== 1 || !source ) return { visible: null, reason: "Choose exactly one reacting token and a known source token." };
  return observerVisibility(matches[0], source);
}
