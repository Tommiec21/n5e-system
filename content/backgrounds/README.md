# Background content

Authoritative transcription: `chapter-3.md`, copied from the user's N5e Rules KB Chapter 3.
The KB ruling is one General or Skill feat, no background ASI. Recommendations do not restrict choices.

Regenerate with `node tools/content/build-backgrounds.mjs`, then `npm run pack -- backgrounds`.
IDs derive deterministically from background names and document roles. Do not change that scheme
after release without providing a migration. The builder updates its own files without deleting
unrelated content.

Source hierarchy and Foundry hierarchy match:

```
packs/_source/backgrounds/
  _folder.json                  Backgrounds
  advisor/
    _folder.json                Advisor
    background.json             Advisor background item
    features/
      _folder.json              Features
      feature.json              Position of Power
      benefit.json              Networker (free-feat entitlement)
    equipment/
      _folder.json              Starting Equipment
      personal-equipment.json
  ...one directory for each of the 16 backgrounds
```

Drop a background on a character to choose two skills (with duplicate replacements), toolkit,
equipment pack, pack toolkit choices where relevant, and a General/Skill feat. Choosing a feat later
keeps the named benefit as a reminder; drag the chosen feat onto the character when ready.
The setup dialog shows level-appropriate feats but textual prerequisites still need review.
Cancel does not modify the actor. Replacing a background removes only items tagged with that
background's origin, after the new grants have been created. Existing manually granted items are
not retroactively tagged or removed. Background features have their own Features-tab group and
are excluded from ordinary feat-selection lists.

Narrative and conditional features retain complete source rules; contextual advantage, short-rest
duration changes, social auras, legal favors and once-per-arc judgments are not automatically applied.
They require GM adjudication rather than unconditional effects that would apply in the wrong scene.

Equipment is granted as personal-equipment and selected-pack **manifest** items, not a complete
equipment automation expansion. Contents and internal toolkit selections are explicit; individual
items, Bulk, prices, charges and storage must be resolved using Chapter 5. Zero-valued manifest
statistics do not represent the total Bulk or value of the contents. The Traveler's Pack is referenced
in Chapter 3 but absent from Chapter 5's pack list; its manifest flags this source gap.

Validation: all content IDs are unique, grants resolve, folder parents match the intended hierarchy,
fixed proficiencies prepare on an actor, no ASI is granted, duplicate/choice validation works,
background features are excluded from ordinary feat lists, and cancel performs no writes.
Full suite: 175 passed, 2 pre-existing skipped tests. Pack compilation succeeds. Live Foundry setup,
replacement and UI interaction still require an in-world smoke test.
