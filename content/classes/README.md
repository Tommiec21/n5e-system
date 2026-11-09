# Complete class content: seven supported classes

Source: the user's `N5e-Rules-KB/_source/classes/orochimaru-full.md` transcription.
Included: Genjutsu Specialist, Hunter-Nin, Medical-Nin, Ninjutsu Specialist, Scout-Nin,
Taijutsu Specialist and Weapon Specialist, through level 20. Excluded: Puppet Master/Puppet Nin,
Cooking Nin, Science Nin, Intelligence Operative and the legacy Taijutsu section.

## Rebuilding

`node tools/content/build-class-expansion.mjs <N5e-Rules-KB directory>`

The expansion works on the existing base sources, preserving their IDs, authored effects and
activities. The legacy Python base builder also invokes this expansion after its original import,
so a full rebuild does not silently return the classes to the old level-5 slice. The Node expansion
was executed and tested in this environment. The Python entry point was updated but not executed
because a usable Python interpreter was unavailable.

New class/subclass documents stay in the existing Classes compendium. New feature and option
documents stay in Class & Clan Features. New source records are under each pack's `expanded/`
directory, grouped by class and then subclass/core/options. Foundry folders mirror the class and
subclass hierarchy. The Backgrounds pack remains separate and untouched.

## Content and progression

- All 30 previously missing standalone core feature headings.
- All 13 previously missing subclass documents; 42 subclasses total.
- Every audited subclass feature heading (313 total, including the existing early features).
- All 258 audited class-option headings, including the 85 previously missing ones.
- Additional records for explicit choices inside later features: evolutions, signature modifications,
  Signature Paths, Superior Discipline benefits, stance expertise and conditional Inception upgrades.
- 408 new feature/option records, with full rules text. Existing record IDs and identifiers retained.
- Later option-count increases follow the class tables; fixed Mastery progression is recorded.
- Ninjutsu traditions grant their corresponding elemental access.
- Shared Scout maneuver costs use Superiority Dice; cast options recognize the new maneuver tag.

The picker filters structured level requirements and explicit item dependencies. Apply-time
validation rejects out-of-pool, duplicate, stale and premature item selections. Source prerequisites
that cannot be expressed as known imported item dependencies remain visible for manual review;
this is not a complete natural-language prerequisite engine.

## Automation boundary

Import completeness is not complete rules automation. Existing authored automation is preserved.
New entries contain their source rules and conservative action labels; context-sensitive bonuses,
conditional grants (for example extra jutsu when an affinity was already known), summoned-creature
construction, special senses, class-specific transformations, expertise benefits and many new
subclass counters still need adjudication or a separate automation pass. No unconditional effects
were invented to represent conditional rules. Source options and their grants are available even
where their rules must be resolved manually.

## Existing characters

Compendium updates do not overwrite owned class/subclass copies. Existing characters therefore
retain their saved data and choices. Their older advancement arrays need deliberate reconciliation
before using the new later-level progression. This release does not silently rewrite actors or
retroactively choose their missing benefits. Newly imported class/subclass copies use the complete
progression. Do not replace a character's class by dragging another copy without reviewing the
replacement warning and backing up the actor.

## Verification

The checked-in `source-index.json` was derived from the independent pre-expansion source audit.
Tests check every indexed heading, all advancement references, original identities, exclusions,
later choice counts, conditional prerequisites, new Scout spending, elemental grants and actual
capstone grant/removal behavior. A repeated import changed zero source files. No source level
inference remained unresolved. The tests do not replace an interactive Foundry smoke test.
