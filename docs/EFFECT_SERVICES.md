# Effect services — alpha11

## Dynamic numeric fields
Use =1 + @level / 2 or =@base + @source.level. N5e addition/subtraction precedes multiplication/division. Context is a fixed source snapshot, not recursively derived effect output. Available: stored system fields, abilities with base modifiers, prepared base level/prof; @target aliases the receiving snapshot. @source requires an origin resolving to an actor or owned item. Missing/unsafe references, dice and invalid expressions skip only that change; actor._n5eEffectErrors records diagnostics. Core mode/priority still applies after evaluation. Cost adjustments may be numeric expressions; literal *0.5 and /2 retain their existing semantics.

## Service authoring
In the effect's Changes tab, open Effect services and enter JSON:

    {"expiration":[{"event":"damageTaken","count":1}],"macros":[{"event":"apply","uuid":"Macro.ID"}],"appearance":[{"provider":"filter","options":{"preset":"grayscale"}}]}

Supported lifecycle events: apply, remove, enable, disable. Supported qualifying events: turnStart, turnEnd, combatEnd, damageTaken, successfulHit, rest. Expiration supports qualifying events and a positive event count. Matching events are delivered to active applicable effects on the receiving actor. Custom callers use game.n5e.api.emitEffectEvent(actor,event,{id:stableEventId,...context}); macros execute on the active GM only. Reaction timing restrictions remain separate and unchanged.

## Macro approval
Save bindings, use Approve saved Macro bindings as active GM, then enable Effect world Macro execution in N5e Rules. Approval is stored in a GM-controlled world setting, not player-editable effect flags. Changing effect bindings, Macro code or ownership invalidates approval. World Macros execute trusted code with GM privileges and are not sandboxed. Context includes actor, effect, event and eventId. Errors are isolated per binding. Recursive queued emissions are bounded; long-running arbitrary world Macro code cannot be forcibly sandboxed or cancelled. Native workflow event delivery is queued without blocking the originating mutation queue.

## Appearance
Effect token appearance providers can be disabled in Rules. Built-in filter supports preset grayscale/sepia and brightness 0..2. It adds/removes only its own visual filter, never overwrites token image/tint or other modules' filters. Optional integrations register registerAppearanceProvider(id,{apply(token,options,context),remove(token,handle)}), which returns an unregister function. Backend absence is reported without breaking other effects. Cleanup covers disabled/removed effects, provider unregister, token removal and scene teardown. Third-party appearance module adapters are not bundled or claimed tested.

## Verification
17 focused tests passed on first attempt; one CI full gate reserved. No live verification, by user instruction. No automatic DAE script import, universal stacking engine, or guarantees of atomic multi-document macros. Existing editor and native permission rules remain in force.
