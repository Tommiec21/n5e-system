/**
 * Condition cards (CCOND1; docs/CCOND1_SPEC.md): conditions unique to a class or a clan. A card holds
 * the same rules a core condition entry has (config/conditions.mjs), so once registered
 * (workflow/condition-cards.mjs) it runs on the same engine: ranks, penalties, rule elements
 * (flags.n5e.rules on the card), durations, decay, "Try to end", turn damage and the token icon.
 *
 *   owner      who it belongs to: {kind: "class" | "clan", id: class or clan identifier, subclass}
 *   tags       Physical, Mental, Sensory, Elemental, Fatigue (King Q-CC1: it counts as these for everything)
 *   maxRanks   empty: no ranks (applying again replaces it and the new duration wins, King Q-CC3);
 *              a number: ranks stack up to it; 0: no limit
 *   changes    Active Effect changes the condition carries (Manic: system.bonuses.speed +10)
 *   immunityFrom  "damage:acid" or "condition:envenomed": that immunity also makes the creature immune to
 *              this; "all:damage:fire,damage:earth" needs every one
 *   seconds    its duration in seconds when not the default 1 minute (0: default)
 *   endsAt     "" (1 minute unless persists) | "turnEnd" (the end of its turn) | "nextTurnEnd"
 *   resave     an end-of-turn save that ends it: ability, and the DC (a fixed dc, or the applier's DC for the
 *              source discipline: tai, nin, gen, buki)
 *   initiativeShift  each time it is applied in combat, the creature's initiative changes by this; the
 *              turn order is re-sorted at the start of the next round (Flow Broken: −4)
 *   summary    one line for tooltips and the card face
 */
import * as S from "../fields/shared.mjs";
import { baseFields } from "./templates.mjs";

const TDM = () => foundry.abstract.TypeDataModel;
const object = () => new (foundry.data.fields.ObjectField)();

export class ConditionCardData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      owner: S.obj({ kind: S.str({ initial: "class" }), id: S.str(), subclass: S.str() }),
      summary: S.str(),
      tags: S.set(),
      maxRanks: S.num(null, { integer: true, min: 0, nullable: true }),
      endsAt: S.str(),
      persists: S.bool(),
      initiativeShift: S.int(0),
      decay: S.obj({ when: S.str(), amount: S.int(1, { min: 0 }) }),
      removal: S.arr(S.obj({ action: S.str({ initial: "action" }), check: S.arr(S.str()), dc: S.num(null, { nullable: true }), ranks: S.str({ initial: "all" }),
        dcIncrease: S.int(0), text: S.str() })),
      seconds: S.int(0, { min: 0 }),
      immunityFrom: S.arr(S.str()),
      changes: S.arr(S.obj({ key: S.str(), value: S.str(), mode: S.int(2) })),
      resave: S.obj({ ability: S.str(), source: S.str(), dc: S.num(null, { nullable: true }) }),
      turnStartDamage: S.obj({ die: S.str(), type: S.str(), perRank: S.bool() }),
      perRank: object(),
      flat: object(),
      flags: object(),
      cast: object(),
      // AMP1e: the bearer picks one change when it gets the condition (Diplomatic Coordinated's skill).
      choose: S.obj({ prompt: S.str(), options: S.arr(S.obj({ label: S.str(), key: S.str(), value: S.str(), mode: S.int(2) })) })
    };
  }
}
