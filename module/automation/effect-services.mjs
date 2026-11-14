import { EFFECT_EVENTS, validateServiceConfig, expirationStep } from "../rules/effect-services.mjs";
import { requestFingerprint } from "./receipts.mjs";
import { rule } from "../rules-settings.mjs";
import { withActorLock } from "../workflow/commands.mjs";

const providers = new Map(), visuals = new Map();
let queue = Promise.resolve(), macroRunning = false, queued = 0;
const actorOf = effect => effect.parent?.documentName === "Actor" ? effect.parent : effect.parent?.actor;
const warn = error => ui.notifications.warn(`N5e effect service: ${error.message ?? error}`);
const bindings = effect => validateServiceConfig(effect.flags?.n5e?.services ?? {});
async function macroApprovalKey(effect, macros) {
  const sources = [];
  for ( const binding of macros ) {
    const macro = await fromUuid(binding.uuid);
    if ( macro?.documentName !== "Macro" ) throw new Error("World Macro is unavailable.");
    sources.push({ uuid: macro.uuid, command: macro.command ?? macro._source?.command ?? "", type: macro.type, ownership: macro.ownership ?? {} });
  }
  return requestFingerprint("effect-macros", { effect: effect.uuid, macros, sources });
}

export function registerAppearanceProvider(id, provider) {
  if ( !/^[a-z][a-z0-9-]{0,59}$/.test(id) || providers.has(id) || typeof provider?.apply !== "function" || typeof provider?.remove !== "function" ) throw new Error("Invalid or duplicate appearance provider.");
  providers.set(id, provider);
  return () => { providers.delete(id); refreshEffectAppearances(); };
}
registerAppearanceProvider("filter", {
  apply(token, options) {
    const Filter = globalThis.PIXI?.filters?.ColorMatrixFilter ?? globalThis.PIXI?.ColorMatrixFilter;
    if ( !Filter || !token.mesh ) throw new Error("Token filter backend is unavailable.");
    if ( ![undefined, "grayscale", "sepia"].includes(options.preset) || (options.brightness !== undefined && (!Number.isFinite(options.brightness) || options.brightness < 0 || options.brightness > 2)) ) throw new Error("Invalid built-in filter settings.");
    const filter = new Filter();
    if ( options.preset === "grayscale" ) filter.desaturate();
    if ( options.preset === "sepia" ) filter.sepia();
    if ( options.brightness !== undefined ) filter.brightness(options.brightness, true);
    const mesh = token.mesh;
    mesh.filters = [...(mesh.filters ?? []), filter];
    return { mesh, filter };
  },
  remove(token, handle) {
    if ( handle.mesh && !handle.mesh.destroyed ) handle.mesh.filters = (handle.mesh.filters ?? []).filter(f => f !== handle.filter);
    handle.filter.destroy?.();
  }
});
export async function refreshEffectAppearances() {
  for ( const token of globalThis.canvas?.tokens?.placeables ?? [] ) {
    await withActorLock(`appearance:${token.document.uuid}`, async () => {
      const existing = visuals.get(token.document.uuid) ?? new Map(), wanted = new Map();
      if ( rule("effectAppearanceProviders") ) for ( const effect of token.actor?.allApplicableEffects?.() ?? [] ) {
        if ( !effect.active ) continue;
        try {
          for ( const [index, binding] of bindings(effect).appearance.entries() ) {
            const provider = providers.get(binding.provider);
            if ( !provider ) continue;
            const id = `${effect.uuid}:${index}:${JSON.stringify(binding)}`;
            wanted.set(id, { provider, binding, effect });
          }
        } catch (error) { warn(error); }
      }
      for ( const [id, entry] of existing ) if ( !wanted.has(id) || entry.mesh !== token.mesh || wanted.get(id).provider !== entry.provider ) {
        try { await entry.provider.remove(token, entry.handle); } catch (error) { warn(error); }
        existing.delete(id);
      }
      for ( const [id, entry] of wanted ) if ( !existing.has(id) ) {
        try { existing.set(id, { token, provider: entry.provider, mesh: token.mesh, handle: await entry.provider.apply(token, entry.binding.options, { actor: token.actor, effect: entry.effect }) }); }
        catch (error) { warn(error); }
      }
      visuals.set(token.document.uuid, existing);
    });
  }
}

export async function approveEffectMacros(effect) {
  if ( !game.user.isGM || !game.users.activeGM?.isSelf ) throw new Error("Only the active GM approves effect macros.");
  const config = bindings(effect);
  for ( const binding of config.macros ) {
    const macro = await fromUuid(binding.uuid);
    if ( macro?.documentName !== "Macro" ) throw new Error("Binding must reference an existing world Macro.");
  }
  if ( !config.macros.length ) throw new Error("Save Macro bindings on this effect first.");
  if ( !await foundry.applications.api.DialogV2.confirm({ window: { title: "Approve saved effect macros" },
    content: "<p>Approve this effect's saved world Macro bindings? With Effect Macros enabled, these execute with GM privileges. World macros are trusted code, not sandboxed. Editing the bindings invalidates this approval.</p>", rejectClose: false }) ) return false;
  const key = await macroApprovalKey(effect, config.macros);
  const approvals = { ...(game.settings.get("n5e", "effectMacroApprovals") ?? {}) };
  approvals[effect.uuid] = key;
  await game.settings.set("n5e", "effectMacroApprovals", approvals);
  return true;
}

export function emitEffectEvent(actor, event, { id = crypto.randomUUID(), ...context } = {}) {
  if ( !EFFECT_EVENTS.includes(event) ) return Promise.reject(new Error("Unsupported effect event."));
  if ( !game.users.activeGM?.isSelf || !actor ) return Promise.resolve([]);
  if ( queued >= 64 ) { warn("Event queue limit reached; recursive macro events stopped."); return Promise.resolve([]); }
  queued++;
  const task = queue.catch(() => {}).then(async () => {
    if ( !game.users.activeGM?.isSelf ) return;
    const effects = context.effect ? [context.effect] : [...actor.allApplicableEffects?.() ?? actor.effects ?? []];
    for ( const effect of effects ) {
      try {
        if ( !context.effect && !effect.active ) continue;
        if ( !effect.flags?.n5e?.services ) continue;
        const config = bindings(effect), current = effect.flags?.n5e?.serviceState ?? {};
        if ( !config.expiration.length && !config.macros.length ) continue;
        if ( current.events?.includes(id) ) continue;
        const signature = await requestFingerprint("expiration", config.expiration);
        const step = expirationStep(config, current.signature === signature ? current.counts ?? {} : {}, event, id);
        const state = { signature, counts: step.state, events: [...(current.events ?? []), id].slice(-32) };
        if ( event !== "remove" ) await effect.setFlag("n5e", "serviceState", state);
        if ( rule("effectMacros") && config.macros.length ) {
          const key = await macroApprovalKey(effect, config.macros);
          if ( game.settings.get("n5e", "effectMacroApprovals")?.[effect.uuid] === key ) for ( const binding of config.macros.filter(b => b.event === event) ) {
            if ( !game.users.activeGM?.isSelf ) return;
            try {
              const macro = await fromUuid(binding.uuid);
              if ( macro?.documentName !== "Macro" ) continue;
              macroRunning = true;
              await macro.execute({ actor, effect, event, eventId: id, ...context });
            } catch (error) { warn(error); } finally { macroRunning = false; }
          }
        }
        if ( step.expired && event !== "remove" && game.users.activeGM?.isSelf ) await effect.delete();
      } catch (error) { warn(error); }
    }
  }).finally(() => { queued--; });
  queue = task;
  return macroRunning ? Promise.resolve([]) : task;
}

let registered = false;
export function registerEffectServices() {
  if ( registered ) return;
  registered = true;
  const refresh = () => { refreshEffectAppearances().catch(warn); };
  const lifecycle = (event, effect) => {
    refresh();
    emitEffectEvent(actorOf(effect), event, { effect, id: `${event}:${effect.uuid}:${effect._stats?.modifiedTime ?? Date.now()}` }).catch(warn);
  };
  Hooks.on("createActiveEffect", effect => lifecycle("apply", effect));
  Hooks.on("deleteActiveEffect", effect => lifecycle("remove", effect));
  Hooks.on("updateActiveEffect", (effect, changes) => {
    refresh();
    if ( "disabled" in changes ) lifecycle(changes.disabled ? "disable" : "enable", effect);
  });
  for ( const hook of ["drawToken", "updateToken", "updateActor", "updateItem", "canvasReady", "updateSetting"] ) Hooks.on(hook, refresh);
  Hooks.on("canvasTearDown", async () => {
    for ( const entries of visuals.values() ) for ( const entry of entries.values() ) {
      try { await entry.provider.remove(entry.token, entry.handle); } catch (error) { warn(error); }
    }
    visuals.clear();
  });
  Hooks.on("deleteToken", document => {
    const entries = visuals.get(document.uuid);
    for ( const entry of entries?.values() ?? [] ) Promise.resolve(entry.provider.remove(document.object, entry.handle)).catch(warn);
    visuals.delete(document.uuid);
  });
  // Turn start/end and combat end events come from N5eCombat (documents/combat.mjs, workflow/turn.mjs).
  refresh();
}
