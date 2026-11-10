# Expanded effect editor — alpha10

Open an existing actor/item effect and select **Changes**. The native Details and Duration tabs remain available. Search the typed field browser, add rows or presets, and inspect validation messages. Add/remove/preset/import edits are drafts until **Save effect**. Closing the sheet discards draft changes. **Create disabled copy** is a separate explicit write with confirmation.

| Capability | Implemented scope |
| --- | --- |
| Searchable fields | Current N5e key registry; type, example and behavior contracts |
| Values and modes | Numeric, simple dice, mastery labels, ability keys and cost adjustments; core mode/priority distinction |
| Validation | Reject new unsupported/unsafe fields, invalid values and invalid predicates; retain unchanged legacy rows |
| Suppression/transfer | Existing level and stance restrictions; native transfer/disabled controls |
| Conditional bonuses | Existing modifier/degreeShift JSON with all/any/not predicates and roll selectors |
| Stacking | Existing additive rules and activity exclusivity group; no universal stacking policy |
| Timing | Native duration controls plus existing source-turn expiration flags and diagnostics |
| Presets | DR, AC and speed, editable after insertion |
| Preview | Per-row stored core-field estimates and effect-only N5e contributions; not a complete actor simulation |
| Draft source | Read-only JSON and source/duration diagnostics |
| Portability | N5e versioned JSON, disabled import/copy; IDs, foreign/script flags and old source-turn links excluded |
| Legacy data | Existing unknown flags and unchanged rows preserved when editing the original |
| Dynamic field formulas | Unavailable until the dynamic formula service; entering formulas is rejected rather than silently ignored |
| New expiration events | Unavailable until that service |
| Effect macros/scripts | Unavailable; foreign scripts are not converted |
| Token appearance integrations | Unavailable until providers exist |
| Automatic DAE import | Not supported; this is native N5e authoring |

N5e custom keys do not inherit Foundry's generic mode behavior. Core field estimates use the actor's stored value separately for each row, so they exclude other effects, full ordering and derived-stat recalculation. Save recalculates the actor normally. Source-turn expiration requires the referenced source in combat. Activity exclusivity is consumed by activity application; editing a group does not retroactively replace every other effect.

Automated evidence: nine focused checks passed for types/validation, predicates, legacy preservation, safe portability, previews, draft-only actions, stale saves and template compilation. CI is the sole full verification/build gate. No live tests by user instruction; in-game acceptance remains with the user.

Alpha11: dynamic formulas, event expiration, GM-approved Macro bindings and appearance providers are now implemented. See EFFECT_SERVICES.md; the alpha10 unavailable-service rows above are historical and superseded.
