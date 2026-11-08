# Automation framework (0.9.3-alpha.1)

This extends the existing cast options and Active Effect keys. It does not replace them or automatically convert every feature's prose into rules. No rules from another game system are imported.

## Contextual rules

Store an array on an item or Active Effect at `flags.n5e.rules`. Each element has `key`, `selector`, `value`, an optional `label`, and an optional `predicate`. Use `game.n5e.api.setRuleElements(source, rules, toggle)` to author it on an owned source. Example:

```js
await game.n5e.api.setRuleElements(feature, [
  { key: "modifier", selector: "attack", value: 1,
    label: "Marked target", predicate: "target:tracker:mark" },
  { key: "modifier", selector: "damage", value: 2,
    label: "Furious", predicate: "self:state:furious" }
], { label: "Situational training", enabled: true });
```

The optional toggle appears on the Features tab. Changing it only enables/disables the contextual rules on that source. It does not disable the source's other Active Effect changes. Item rules apply while owned; use `item:equipped` when equipment must be worn. Stance item rules apply only in the active stance. Disabled/suppressed effects never contribute. Transferred effects pass through the actor's normal applicable-effect iterator once.

Selectors: `all`, a roll kind (`attack`, `save`, `check`, `initiative`, `damage`), a roll type (`weaponAttack`, `jutsuAttack`, `skill`, `tool`, etc.), a type and key (`save:wis`, `skill:ath`), or a kind and scope (`attack:tai`, `damage:weapon`). A selector array matches any entry. Unsupported selectors do nothing. Values are finite numbers, not executable formulas. Modifiers add together, following N5e stacking; the framework adds no PF2e bonus-type restrictions.

Options include `kind:attack`, `type:weaponAttack`, `key:<key>`, `scope:<scope>`, `self:status:<status>`, `target:status:<status>`, `self:state:<flag>`, `target:state:<flag>`, `self:tracker:<kind>`, `target:tracker:<kind>`, `item:equipped`, `item:type:<type>`, and `self:state:furious` when Fury is above zero. Tracker `mark` tests any active Mark: source-specific Mark bonuses need a more specific implementation, not this generic predicate.

A string tests a single option. An array requires all options. Objects combine `all`, `any` and `not` arrays recursively:

```json
{"all": ["self:state:furious"], "any": ["scope:weapon", "scope:unarmed"], "not": ["target:status:dead"]}
```

The workflow supplies target facts only when there is exactly one targeted token. It never applies the first target's bonus to an entire group. Save buttons use the caster as the opposing actor. With several targets, roll separately for target-dependent modifiers. Damage bonuses add to the first damage part once; they use that part's damage type and remain flat bonuses on critical hits.

`game.n5e.rules.elements` exposes the pure predicate, option and modifier helpers for extensions. They never evaluate JavaScript supplied by content.

## Roll breakdowns and save outcomes

D20 cards show an expandable breakdown, including contextual modifiers, and retain it in `flags.n5e.roll.breakdown`. Existing actor statistics are copied, never mutated by a contextual roll.

The `degreeShift` key with selector `save` shifts the degree by its integer value. Existing `n5e.saveTier.shift` effects also participate. Degrees remain bounded from critical failure through critical success, with N5e's natural-20 save protection. There is no PF2e natural-1 rule.

Authored `system.activities[].save.tiers` fields (`critFailure`, `failure`, `success`, `critSuccess`) are carried onto save buttons. The save card selects exactly one result, including after a Will of Fire reroll. Tier text is escaped as text. When explicit tier text exists, the old combined failure-condition buttons are suppressed: they can mix conditions from different tiers. The chosen text is guidance for applying its result, not a license to infer conditional effects from prose. Feature-specific tier damage buttons remain available on the source card.

## Temporary weapon coatings

```js
await game.n5e.api.coatWeapon(weapon, {
  id: "training-fire", label: "Training fire", duration: 60, uses: 1,
  parts: [{ formula: "1d6", type: "fire" }]
});
await game.n5e.api.removeCoating(weapon, "training-fire");
```

Coatings live at `weapon.flags.n5e.coatings`; they never edit base damage/properties. The same id replaces its prior coating. Duration is in game-world seconds, default 60. Omit `uses` for unlimited uses until expiry. They add typed damage to attacks and feature strikes made with that weapon. Uses are spent **on the damage roll**, not the attack roll or hit confirmation. If damage is rolled on a miss, that still spends a use. Critical hits double coating dice but never repeat the base weapon's ability modifier in the coating part. Damage application and Undo continue to use the existing damage pipeline. Re-importing the item replaces its runtime coating flags as normal; these are temporary world data, not book content.

This is a reusable API for authored weapon damage riders. It does not infer poison save DCs, on-hit conditions, or every Weapon Focus property.

## Summon and clone templates

Author an activity with `type: "summon"` and `summon: {uuid: "Actor.WORLD_ACTOR_ID", count: 1}`. Its card gets a **Summon (GM)** button. Import any compendium actor into the world first. Use an authored N5e actor stat block for a summon or clone: this framework does not guess its scaling, shared reactions, commands or special casting limits.

The GM clicks the card while the caster token is on the current scene. Unlinked copies appear beside it, and the GM can move them into their final legal positions. Placement does not validate range, walls or occupancy. The template actor is never modified or deleted. Ownership follows the template actor, so set template ownership deliberately before play. A GM is required; this adds no player-to-GM socket privilege.

Macros can use `game.n5e.api.summonTokens(caster, item, {uuid, count, x, y, seconds, concentration})`; coordinates are scene pixels. Count is limited to 1–20. `dismissSummons(caster, itemId)` removes only that caster's flagged summon tokens, across scenes. Omitting itemId dismisses all of that caster's flagged summons. `n5e.summoned(caster, item, tokens)` fires after successful placement for extensions.

Token flags `flags.n5e.summon` record caster/item UUIDs, concentration and expiry. The active GM cleans up on elapsed world time, concentration changes and world ready. Cleanup never removes unflagged tokens. The activity uses the item's duration; an unspecified duration falls back to 60 seconds. It does not create or manage combatants. Summon activities do not spend an activity resource cost; the normal jutsu casting workflow pays chakra before its card is posted.

## Verification before live play

Run `npm test`, `npm run lint`, and `npm run check`. The tests cover predicate failures, source gating, stacking, source breakdowns, save outcome selection, coating expiry/use counts, summon placement/cleanup and ownership checks. They use Foundry stand-ins, not a running Foundry server.

In a disposable v13 world, check: toggle one contextual feature; attack with one marked target and then several targets; roll a four-tier save and reroll it with Will of Fire; roll normal/critical coated weapon damage; summon two unlinked copies and end their concentration; advance world time past a coating/summon expiry; reload the world as GM. Confirm a player cannot summon or alter sources they do not own. Copy a world before updating it.
