# Maintenance boundaries and upgrade checks

## Stable extension paths

Keep existing document IDs. Add schema fields with defaults. Renaming, moving or removing stored
fields requires an idempotent migration; never rely on the importer to update existing world items.

| Responsibility | Entry point |
| --- | --- |
| Activity schema | `data/fields/shared.mjs` → `activityFields()` |
| Activity capability | `config/activities.mjs` (`execute` or explicit `manual`) |
| Button presentation | `workflow/activity-buttons.mjs` |
| Execution requirements, turn limits, refunds | `workflow/activity-execution.mjs` |
| Actor command sequencing | `workflow/commands.mjs` |
| Resource arithmetic and validation | `rules/resources.mjs` |
| Resource payment and optional dice | `workflow/resources.mjs` |
| Healing rules and revival cleanup | `rules/damage.mjs` + `workflow/health.mjs` |
| Damage application | `workflow/apply-damage.mjs`, using the same actor command queue |
| Rules extensions | `api.mjs` registration helpers; parsers read current registries |
| Privileged changes | `socket.mjs`, validated request with explicit GM review |
| Versioned upgrades | `migration/runner.mjs` |

For a new activity, first define its fields and capability. Then add its presentation and focused
execution handler. Run it through the common executor rather than duplicating resource, action or
turn-limit logic. Do not manually write HP when an effect is healing: use `applyHealing`.

`n5e.preActivity(actor, item, activity, buttonData)` can return false to cancel before resource
payment. `n5e.activityComplete(actor, item, activity, result)` fires after successful execution.
These hooks are synchronous. `n5e.registryChanged(registry, key, data)` announces registration changes.

## Command semantics

- Resource amounts are finite, non-negative integers; an explicit zero means zero. Gains and spends
  are distinct operations. A chosen amount is checked again after the input dialog.
- Actor commands execute sequentially on one client, including casts, feature use, activities, rests,
  healing and damage application. Healing commands lock their participating actors in a consistent order.
- These queues are **not distributed transactions**. Foundry's document API has no compare-and-swap
  update. Two clients controlling the same actor can still race; use one controlling client per actor.
  A future authoritative transport can replace this boundary without rewriting the rules or content.
- A cancelled/failed activity refunds its own pool payment while its locks are held. It cannot roll
  back messages already posted or effects already created on other actors; those operations are not
  a database transaction. Author multi-step activities with that boundary in mind.
- Once-per-turn activities on one feature share that feature's allowance, including alternative
  damage buttons. Usage is stamped with encounter, round and turn; outside combat it is unrestricted.
  Defender save buttons remain available to each defender. Save-only features consume their allowance
  when the owner initiates them through Use.
- Activity-specific action slots are recorded after successful execution when action tracking is on.
  Action tracking retains the existing informational behavior; it does not invent exceptions or
  automatically reject every repeated Action (Extra Attack and other features can allow repeats).

## Text and runtime registrations

Structured activities are the authoritative automation format. The text parser is a fallback, not a
rules interpreter. Recognized alternative save clauses keep separate outcome text and do not add
their damage together. Immunity/removal language is not an instruction to apply a condition.
Unusual wording still needs reviewed activities. Manual activity kinds display instructions.

Condition and damage-type lookups are built from the current registry, including runtime additions.
Registration keys and labels are validated. The content check rejects undeclared nested activity
fields and unknown activity kinds, so importer/schema drift fails the build.

## GM requests

System socket messages do not provide a trusted sender identity. Claiming a user ID in a payload is
not authentication. Consequently, remote changes to GM-controlled data require the GM to review the
validated request. Owned-actor effects execute directly. Effect requests accept typed effects with
system/custom-rule change keys, not arbitrary documents or ownership changes. The old remote delete
operation is removed; lifecycle deletion runs on the GM's client. Requests have bounded replay
protection and completion acknowledgements. A reply is a completion notification, not an authenticated
authority token for any privileged operation.

Player rests await GM approval of ration spending before receiving benefits. Failed or declined
requests do not silently grant ration-dependent benefits. This adds an intentional in-game GM prompt.

## Migrations

Migration 2 retries remaining legacy-shaped documents and repairs `cost.gain`, `cost.choose` and
`save.resave` from linked compendium sources. It patches only those newly supported booleans, matching
activity IDs; names, formulas, quantities and item IDs are preserved. Unlinked/custom items cannot be
reconstructed from a book source and remain untouched.

Failed migrations leave the version marker unchanged and store failure UUIDs/messages in the hidden
world setting `migrationFailures`. Fix the underlying error and retry at the next GM login. Successful
documents can be visited again safely. Replacement data is validated before deletion. A failed
delete/recreate replacement attempts to restore the original source and ID; a restoration failure
is reported explicitly and still requires recovery from the world's backup.

World-compendium migration and old unlinked scene-token migration remain outside this repair pass.

## Verification and releases

`npm run verify` runs lint, the complete test suite and consistency/content-schema checks. Both CI
and publishing call it; manual `npm run release -- <version>` also refuses to build before it passes.
Tests cover all authored activities, multi-click resource use, refunds, turn limits, healing/revival,
relay rejection/approval, migration failure markers, repair preservation and replacement recovery.

For an actual Foundry v13 client check, after installing the release, open a world as GM and run:

```js
await game.n5e.api.runSmokeTests()
```

This briefly opens/closes the rules window, constructs an **unsaved** NPC with a real item model,
round-trips its data through serialization, and checks healing and resource execution using local
update overrides. It does not create, change or delete world documents or settings. It prints a result
table and throws on failure. This opt-in smoke check is separate from Node tests; running Node tests
alone does not establish live Foundry compatibility or multiplayer behavior.

Before play, also verify a real player/GM ration approval and a targeted effect request in a disposable
world, then check an existing character's migrated resource-gain buttons. Keep a world backup.
