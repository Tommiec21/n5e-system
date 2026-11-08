/**
 * Reusable schema fields. Each mechanic that repeats across the books is modelled once here and
 * reused by actors, items, and effects (Phase 1 plan, "Shared fields").
 *
 * Every helper returns a fresh field so it can be used in any defineSchema(). Fields are built lazily
 * (inside functions) because `foundry` only exists at runtime.
 *
 * Changing a schema safely:
 *   - Adding a field is always safe: existing documents get its `initial` value when loaded.
 *   - Renaming or moving a field loses the old data unless a migration copies it
 *     (module/migration/runner.mjs; see docs/DEVELOPER.md "Adding a migration").
 *   - Node tests build these fields through tests/helpers/foundry-stub.mjs, so a field type the stub
 *     doesn't know needs adding there as well.
 */
import { rankOrder } from "../../config/core.mjs";
import { activityKinds } from "../../config/activities.mjs";

const F = () => foundry.data.fields;

/* -------------------------------------------- */
/*  Primitive helpers                           */
/* -------------------------------------------- */

// Shorthands used by every model: str (text, blank allowed), int (whole number), num (number or
// null), bool, html (rich text), set (unique strings), arr (list), obj (nested object), choice
// (one of a fixed list).

export const str = (options = {}) => new (F().StringField)({ required: true, blank: true, initial: "", ...options });
export const int = (initial = 0, options = {}) => new (F().NumberField)({
  required: true, nullable: false, integer: true, initial, ...options
});
export const num = (initial = null, options = {}) => new (F().NumberField)({
  required: true, nullable: true, initial, ...options
});
export const bool = (initial = false) => new (F().BooleanField)({ initial });
export const html = () => new (F().HTMLField)({ required: true, blank: true, initial: "" });
export const set = (element = str({ blank: false })) => new (F().SetField)(element);
export const arr = (element, options = {}) => new (F().ArrayField)(element, options);
export const obj = (fields, options = {}) => new (F().SchemaField)(fields, options);
export const choice = (choices, initial, options = {}) => new (F().StringField)({
  required: true, blank: false, choices, initial, ...options
});

/** Formula string: tokens like @prof, @level, @mod.<disc>, @abilities.con.mod, @weapon, @unarmed, @rank. */
export const formula = (initial = "", options = {}) => new (F().StringField)({
  required: true, blank: true, initial, ...options
});

/* -------------------------------------------- */
/*  Rank                                        */
/* -------------------------------------------- */

/** "E".."S". Helpers for value/stepping live in rules/progression.mjs. */
export const rank = (initial = "D", options = {}) => new (F().StringField)({
  required: true, blank: false, choices: rankOrder, initial, ...options
});

/* -------------------------------------------- */
/*  ResourcePool                                */
/* -------------------------------------------- */

/**
 * One implementation for every class/clan resource, dice pool, ammo die, toolkit charges, Jutsu Slots,
 * Will of Fire, ration pool (KB 12 table).
 *  - max: formula (e.g. "1 + @prof")
 *  - die: optional die size for dice pools ("d6")
 *  - steps: die-step mode (ammo die: [8,6,4,1,0]); `step` is the current index
 *  - recovery: [{on, amount, formula, requires}]
 *      on: sr | lr | fr | rest (any rest) | rest10m (10 minutes of rest) | day | event | never
 *      amount: all | half (regain half the max) | setHalf (a Short Rest raises it to half)
 *      requires: a feature identifier the owner must have (Focus on a Short Rest: tenketsu-refinement)
 *      (rest handling: rules/rest.mjs)
 *  - castsJutsu: can pay jutsu costs instead of chakra (clan resources)
 *  - countsAsChakraSpend: spending it ends Suppress Chakra
 */
export function resourcePoolFields({ label = "", max = "", recoveryOn = "lr" } = {}) {
  return {
    label: str({ initial: label }),
    value: int(0, { min: 0 }),
    max: formula(max),
    die: str(),
    steps: arr(int(0)),
    step: int(0, { min: 0 }),
    recovery: arr(obj({
      on: str({ initial: recoveryOn }),
      amount: str({ initial: "all" }),
      formula: formula(),
      requires: str()                     // feature identifier needed for this recovery
    })),
    castsJutsu: bool(),
    countsAsChakraSpend: bool(),
    sort: int(0)
  };
}
export const resourcePool = (options) => obj(resourcePoolFields(options));

/* -------------------------------------------- */
/*  Activation / Range / Duration / Uses        */
/* -------------------------------------------- */

/** How something is used: action | bonus | reaction | special | free | fullTurn | long | none (+ trigger text). */
export function activation() {
  return obj({
    type: str({ initial: "action" }),
    value: num(1),
    unit: str(),
    trigger: obj({ event: str(), text: str() })
  });
}

/** Range and area. area.shape (sphere, cube, cone, cylinder, line) + size, used for area halving and templates. */
export function rangeArea() {
  return obj({
    range: obj({ type: str({ initial: "feet" }), value: num(null, { min: 0 }), long: num(null, { min: 0 }),
      text: str() }),
    area: obj({ shape: str(), size: num(null, { min: 0 }), width: num(null, { min: 0 }),
      height: num(null, { min: 0 }) })
  });
}

/** Duration: value + unit (instant, round, minute, hour...), and whether it needs concentration. */
export function duration() {
  return obj({
    value: num(null, { min: 0 }),
    unit: str({ initial: "instant" }),
    concentration: bool(),
    text: str()
  });
}

/**
 * Limited uses: per turn/round/encounter/sr/lr/rest/fr/day; staminaEligible for the Stamina option.
 * max is a formula ("1 + @prof"); the owner resolves it into uses.maxValue each prepare. Only `spent`
 * changes in play. Rests reset `spent` for matching `per` values (rules/rest.mjs).
 */
export function uses() {
  return obj({
    max: formula(),
    spent: int(0, { min: 0 }),
    per: str(),
    /** "Recharge X-Y" (e.g. "5-6"): rolled at the start of the owner's turn while spent (KB 03). */
    recharge: str(),
    staminaEligible: bool()
  });
}

/* -------------------------------------------- */
/*  Components                                  */
/* -------------------------------------------- */

/**
 * Jutsu components: hs (hand seals), cm (chakra molding), cs (chakra source), m (mobility), plus a
 * weapon requirement (W) and a tool requirement. Conditions like Confused and Slowed read these.
 */
export function components() {
  return obj({
    hs: bool(), cm: bool(), cs: bool(), m: bool(),
    weapon: obj({
      required: bool(),
      groups: set(),
      any: bool(),
      range: str(),          // "", "melee", "ranged"
      count: int(1, { min: 1 }),
      dualWield: bool(),
      text: str()
    }),
    tool: obj({
      required: bool(),
      item: str(),           // toolkit key or item name
      charges: int(0, { min: 0 }),
      text: str()
    })
  });
}

/* -------------------------------------------- */
/*  Rider and Activities                        */
/* -------------------------------------------- */

/** A conditional line: Chain N, Finisher, Overcharge, Off-Guard, Swirl, water source, rank thresholds. */
export function riderFields() {
  return {
    when: obj({
      type: str({ initial: "custom" }),  // CONFIG.N5E.riderTriggers key
      value: str()                        // "2" (chain rank), "offGuard" (condition), "B" (rank)...
    }),
    text: str(),
    damage: arr(obj({ formula: formula(), type: str() })),
    condition: obj({ key: str(), ranks: int(0, { min: 0 }) })
  };
}

/**
 * Activity: one resolvable step on an item. Phase 1 stores; Phase 3 executes.
 * One superset schema keeps storage simple; `type` says which sub-object is meaningful.
 *
 * Each activity becomes a button on the item's chat card (workflow/activity-buttons.mjs builds the
 * buttons and handles the clicks). By type:
 *   attack   roll a discipline attack (attack.*), with damage buttons (damage.parts)
 *            + strike.kind set: an Unarmed or weapon strike instead (stance strikes; workflow/attack.mjs)
 *   save     targets roll a save vs the DC (save.dc.source: nin|tai|gen for features); inflicts are
 *            offered as Apply buttons on a failure
 *   damage   damage buttons only
 *   heal     heal / CP / temporary HP to the selected tokens (or the user)
 *   effect   apply an Active Effect to self or targets (effect.*; workflow/trackers.mjs applyActivityEffect)
 *   roll     roll a formula and post it (roll.*), e.g. Drunken Fist's damage reduction
 * Shared extras: minLevel hides it until that level; cost spends from a pool first (rolled pool die
 * available as @poolRoll, a chosen amount as @amount); formulas may use lvl(level:value,...).
 * Unknown fields are dropped when the item is saved, so every field an activity needs must be here.
 */
export function activityFields() {
  const damageParts = () => arr(obj({ formula: formula(), type: str() }));
  return {
    id: str(),
    type: str({ initial: "utility", choices: Object.keys(activityKinds) }),
    label: str(),
    attack: obj({
      discipline: str(),                 // nin|tai|gen|buki or "" for weapon
      range: str({ initial: "melee" }),  // melee|ranged
      count: int(1, { min: 1 }),
      singleRoll: bool(),                // one roll vs many targets
      bonus: formula()
    }),
    save: obj({
      abilities: set(),                  // one, or a choice of two
      dc: obj({ source: str({ initial: "discipline" }), formula: formula() }),
      onSuccess: str({ initial: "half" }),   // half|none|custom
      fourTier: bool(),
      resave: bool(),
      tiers: obj({ critSuccess: str(), success: str(), failure: str(), critFailure: str() })
    }),
    damage: obj({ parts: damageParts(), pierce: int(0, { min: 0 }), ignoreDR: bool() }),
    heal: obj({ formula: formula(), pool: str({ initial: "hp" }) }),   // hp|cp|tempHp|tempCp
    condition: obj({ key: str(), ranks: int(1, { min: 0 }), duration: obj({ value: num(null), unit: str() }) }),
    summon: obj({ uuid: str(), count: int(1, { min: 1 }), template: str() }),
    movement: obj({ kind: str(), distance: int(0, { min: 0 }) }),     // push|pull|teleport|move
    check: obj({ skill: str(), tool: str(), dc: obj({ table: str(), difficulty: str(), value: num(null) }),
      outcomes: obj({ critSuccess: str(), success: str(), failure: str(), critFailure: str() }) }),
    text: str(),
    riders: arr(obj(riderFields())),
    /** Automation pass (0.7.1): level gate, pool cost, strikes, effects with turn-based expiry. */
    minLevel: int(0, { min: 0 }),
    // What a failed save offers to apply: {key, kind: condition|state, ranks, label}.
    inflicts: arr(obj({ key: str(), kind: str({ initial: "condition" }), ranks: int(1, { min: 0 }), label: str() })),
    roll: obj({ formula: formula(), note: str() }),
    oncePerTurn: bool(),
    activation: str(),                   // overrides the item's activation for this activity
    // Pool cost paid when the button is clicked (roll: roll the pool's die and post it).
    cost: obj({ pool: str(), amount: int(1, { min: 0 }), roll: bool(), gain: bool(), choose: bool() }),
    strike: obj({
      kind: str(),                       // unarmed|weapon ("" = not a strike)
      dieSteps: int(0),                  // step the damage die up (+) or down (-)
      extraDice: formula(),              // added damage ("2d6", "lvl(1:1d8,10:2d8)")
      pierce: int(0, { min: 0 }),
      maximize: bool(),
      attacks: formula()                 // number of attacks ("2", "lvl(1:2,10:3)")
    }),
    effect: obj({
      name: str(),
      target: str({ initial: "self" }),  // self|targets
      changes: arr(obj({ key: str(), value: str(), mode: int(2) })),
      expires: str(),                    // turnStart|turnEnd|nextTurnEnd ("" = duration only)
      seconds: int(0, { min: 0 }),
      tempHp: formula(),
      state: str(),                      // named state the effect represents (crash, flow, combatRival...)
      exclusive: str(),                  // group: applying one removes the others (surge: Crash / Flow)
      ampType: str()                     // makes it an Amp (battle|reflex|fortitude|will|clan)
    })
  };
}
export const activities = () => arr(obj(activityFields()));

/* -------------------------------------------- */
/*  Advancement (level-keyed grants)            */
/* -------------------------------------------- */

/**
 * Level-keyed grants on class, subclass, clan, background (dnd5e Advancement concept).
 * type: feature (uuids) | choice (pick count from uuids) | asi | mastery | pool | scale | proficiency
 *       | itemChoice (pick `count` items tagged `key`, e.g. nin-molding) | trait (key: affinity,
 *       skills, tools, saves; values in uuids or chosen)
 * Read by the level-up flow (module/advancement/steps.mjs builds a level's steps from these) and,
 * for mastery and trait entries, by the actor pipeline directly.
 */
export function advancementFields() {
  return {
    id: str(),
    level: int(1, { min: 0, max: 20 }),
    type: str({ initial: "feature" }),
    title: str(),
    uuids: arr(str()),
    count: int(1, { min: 0 }),
    key: str(),
    value: formula(),
    branch: str(),
    /** What the player picked (uuids or keys); filled during level-up. */
    chosen: arr(str())
  };
}
export const advancement = () => arr(obj(advancementFields()));

/* -------------------------------------------- */
/*  Mastery sources                             */
/* -------------------------------------------- */

/** {target: "skill.ste" | "tool.poison" | "save.con" | "initiative" | ..., source: "ASI 4" } */
export const masterySources = () => arr(obj({ target: str(), source: str() }));

/** Source citation (book + version). */
export const source = () => obj({ book: str(), page: str(), version: str(), custom: str() });
