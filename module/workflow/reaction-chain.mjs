/** Newest reactions resolve first. Apply callbacks retain their existing actor mutation locks. */
export function createReactionChain({ choose, authority, maxDepth = 16, maxSteps = 64 }) {
  if ( !Number.isSafeInteger(maxDepth) || maxDepth < 1 || maxDepth > 64
    || !Number.isSafeInteger(maxSteps) || maxSteps < 1 || maxSteps > 256 ) throw new Error("Invalid reaction chain bounds.");
  return async function resolve(actor, event, context, apply, options = {}) {
    if ( typeof apply !== "function" ) throw new Error("Reaction chain requires an application callback.");
    let steps = 0;
    const visit = async (actor, event, context, depth, supplied = undefined) => {
      if ( !authority() ) throw new Error("Reaction chain lost GM authority; reconcile the command.");
      if ( depth > maxDepth || ++steps > maxSteps ) throw new Error("Reaction chain limit reached; GM reconciliation required.");
      const selection = supplied === undefined ? await choose(actor, event, context) : supplied;
      if ( selection ) {
        const interruptions = await selection.interruptions();
        if ( !Array.isArray(interruptions) || interruptions.length > maxSteps ) throw new Error("Invalid reaction interruptions.");
        for ( const next of interruptions ) {
          if ( !next?.actor?.uuid || typeof next.event !== "string" || !next.event.trim() || !next.context || typeof next.context !== "object" ) throw new Error("Invalid reaction interruption descriptor.");
          // Each recursive frame completes before the interrupted frame can apply.
          await visit(next.actor, next.event, next.context, depth + 1);
        }
      }
      if ( !authority() ) throw new Error("Reaction chain lost GM authority before application.");
      return apply({ actor, event, context, selection, depth });
    };
    return visit(actor, event, context, 0, options.selection);
  };
}
