/** Trusted system/module adapters. No scripts are evaluated from item text or socket payloads. */
export function createReactionDispatcher({ authority, stamp, open, wait }) {
  const adapters = new Map();
  const requireAuthority = () => {
    if ( !authority() ) throw new Error("Only the active GM resolves reactions.");
  };
  const checkOffer = (actor, offer) => {
    if ( !offer ) return null;
    if ( !offer.item?.id || !actor.items.some(i => i.id === offer.item.id) ) throw new Error("Reaction must belong to the reacting actor.");
    // Terms contain only small JSON values; adapters put costs/scaling here for revalidation.
    const terms = JSON.stringify(offer.terms ?? {});
    if ( terms.length > 4000 ) throw new Error("Reaction terms are too large.");
    return { offer, signature: JSON.stringify([offer.item.id, offer.item._stats?.modifiedTime ?? null, terms]) };
  };
  return {
    register(id, adapter) {
      if ( !/^[a-z][a-z0-9-]{0,79}$/.test(id) || adapters.has(id) ) throw new Error("Invalid or duplicate reaction adapter.");
      if ( !adapter || !Array.isArray(adapter.events) || !adapter.events.length
        || adapter.events.some(e => typeof e !== "string" || !e.trim())
        || typeof adapter.offer !== "function" || typeof adapter.prepare !== "function"
        || (adapter.interruptions !== undefined && typeof adapter.interruptions !== "function")
        || !Number.isFinite(adapter.priority ?? 0) ) throw new Error("Invalid reaction adapter contract.");
      const entry = Object.freeze({ ...adapter, events: Object.freeze([...adapter.events]) });
      adapters.set(id, entry);
      return () => { if ( adapters.get(id) === entry ) adapters.delete(id); };
    },
    list() { return [...adapters].map(([id, a]) => ({ id, events: [...a.events], priority: a.priority ?? 0 })); },
    async choose(actor, event, context = {}) {
      requireAuthority();
      const originalStamp = stamp();
      // Snapshot registrations so additions during a prompt cannot alter its meaning.
      const candidates = [...adapters].filter(([, a]) => a.events.includes(event))
        .sort(([ka, a], [kb, b]) => (b.priority ?? 0) - (a.priority ?? 0) || ka.localeCompare(kb));
      for ( const [id, adapter] of candidates ) {
        requireAuthority();
        const offered = await adapter.offer(actor, context);
        for ( const raw of (Array.isArray(offered) ? offered : [offered]) ) {
        const initial = checkOffer(actor, raw);
        if ( !initial ) continue;
        const window = await open(actor, initial.offer.item, { label: initial.offer.label ?? initial.offer.item.name, trigger: initial.offer.trigger ?? "Use this reaction?", requestId: context.requestId });
        const decision = await wait(window);
        requireAuthority();
        if ( decision !== "accepted" ) continue;
        let attempted = false;
        return {
          id, itemId: initial.offer.item.id,
          async interruptions() {
            requireAuthority();
            if ( adapters.get(id) !== adapter || originalStamp !== stamp() ) throw new Error("Reaction changed before interruption discovery.");
            return adapter.interruptions ? await adapter.interruptions(actor, initial.offer, context) : [];
          },
          // Called inside the existing mutation queue. Selection itself never spends resources.
          async prepare(currentActor = actor) {
            if ( attempted ) throw new Error("Reaction preparation cannot be repeated.");
            attempted = true;
            requireAuthority();
            if ( currentActor.uuid !== actor.uuid || originalStamp !== stamp() || adapters.get(id) !== adapter ) throw new Error("Reaction context changed; reconcile this action.");
            const refreshed = await adapter.offer(currentActor, context);
            const current = checkOffer(currentActor, (Array.isArray(refreshed) ? refreshed : [refreshed]).find(o => o?.item?.id === initial.offer.item.id));
            if ( !current || current.signature !== initial.signature ) throw new Error("Reaction eligibility or terms changed; reconcile this action.");
            const revision = currentActor._stats?.modifiedTime;
            const result = await adapter.prepare(currentActor, current.offer, context);
            requireAuthority();
            if ( revision !== currentActor._stats?.modifiedTime || originalStamp !== stamp() ) throw new Error("Actor or turn changed during reaction preparation; reconcile this action.");
            if ( !result || typeof result !== "object" ) throw new Error("Reaction adapter must return a preparation result.");
            return { ...result, label: result.label ?? current.offer.label ?? current.offer.item.name, validate: async () => {
              requireAuthority();
              if ( revision !== currentActor._stats?.modifiedTime || originalStamp !== stamp() || adapters.get(id) !== adapter ) throw new Error("Reaction changed before commit; reconcile this action.");
              const refreshed = await adapter.offer(currentActor, context);
              const final = checkOffer(currentActor, (Array.isArray(refreshed) ? refreshed : [refreshed]).find(o => o?.item?.id === initial.offer.item.id));
              if ( !final || final.signature !== initial.signature ) throw new Error("Reaction eligibility changed before commit.");
              requireAuthority();
              if ( revision !== currentActor._stats?.modifiedTime || originalStamp !== stamp() ) throw new Error("Reaction changed before commit.");
            } };
          }
        };
        }
      }
      return null;
    }
  };
}
