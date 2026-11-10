# Damage roll/application trace — alpha12

Damage cards now show the actual stored formula and die results, including discarded dice and the normal-to-critical formula basis. Damage application uses the same saved amounts; it does not evaluate a new Roll. If saved dice totals, typed parts and card total disagree, application is refused before changing resources.

The applied card includes the source roll snapshot and a View source damage roll button. Each recipient shows: rolled total → rounded damage input → DR and multiplier steps → final typed damage; HP/CP and temporary pools before/after; reaction name and rolled reduction/multiplier when present. Full incoming damage can exceed actual HP lost because temporary HP absorbs it or HP stops at zero; the pool lines make that distinction explicit. Damage rules and critical arithmetic were not changed.

The source ChatMessage UUID, original activity-card UUID when available, roll snapshot and recipient calculation records are stored in flags.n5e.damageApplication. Source whisper/blind visibility is preserved on the applied summary; source inspection checks content visibility. Legacy/manual entries without attached saved dice are labeled unverified and do not fabricate a formula or dice. Direct manual quick-damage API entries have no source roll and say so.

Attack-card actions now search stored flavor and content, and both are fingerprinted. Tooltip-only rendering metadata is excluded from action identity; action fields/critical flags/formulas remain validated. Previously pending requests may be refused after the fingerprint change; use a fresh card and check prior outcomes before retrying.

Automated evidence: six focused checks passed for source association/dice/crit details, mismatch refusal, legacy handling, DR/temp pools, actual application without reroll and private provenance, and flavor-backed validation/tamper refusal. One CI gate reserved; no live verification. This does not fix the separate ActorDelta item duplication report, or change routine-action GM approval policy.

## Alpha13 presentation supersedes the above visible-detail description

The user rejected verbose diagnostic chat output. New damage cards now use the native expandable Foundry roll display: actual formula/dice/total, with no damage-type repetition or normal/critical comparison. New applied cards show the recipient/result and one compact dice icon for source access; no public audit block or coordination boilerplate. Structured provenance/verification remains internal and math is unchanged. Previously saved chat HTML is not rewritten; create a new roll to see the compact layout.
