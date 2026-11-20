/**
 * Amp cards (AMP1a; docs/AMP1_SPEC.md): a buff packaged once, applied by name. Rules:
 * rules/amp-cards.mjs; Foundry side: workflow/amp-cards.mjs.
 *
 *   ampType     battle | reflex | fortitude | will | clan | "" (no type: King Q-A4, "Amp: no type")
 *   namedType   the type the book's box names when the limits use another (a clan Amp is Clan, Q-A1)
 *   owner       who it belongs to: {kind: class | subclass | clan | feat | any, id, subclass}
 *   activation  action | bonus | reaction | initiative | trigger | "" (text on the card)
 *   giveable    can be given to other creatures (Battle Medic, Ascension); otherwise giving one asks
 *   startOnInitiative  "" | "ask" | "auto": start it when its owner rolls initiative
 *   duration    {seconds, until: "" | turnStart | turnEnd | nextTurnEnd | combatEnd | rest | dismissed, concentration}
 *   uses        {max (number or formula: "@prof", "lvl(1:1,11:2)"), per: sr | lr | fr | day}
 *   cooldown    seconds before it can start again once it ends ("10 minutes before re-entry": 600)
 *   exclusive   group: starting one ends the others (Crash / Flow)
 *   endsOn      staggered, blinded, unconscious, noChakra, stanceLeave (King Q-A5: the GM's setting
 *               decides whether these end it automatically or at the table)
 *   changes, tempHp, state, aura, and rule elements in flags.n5e.rules: the buff itself
 */
import * as S from "../fields/shared.mjs";
import { baseFields } from "./templates.mjs";

const TDM = () => foundry.abstract.TypeDataModel;
const object = () => new (foundry.data.fields.ObjectField)();

export class AmpCardData extends TDM() {
  static defineSchema() {
    return {
      ...baseFields(),
      ampType: S.str(),
      namedType: S.str(),
      owner: S.obj({ kind: S.str({ initial: "any" }), id: S.str(), subclass: S.str() }),
      summary: S.str(),
      activation: S.str(),
      giveable: S.bool(),
      startOnInitiative: S.str(),
      duration: S.obj({ seconds: S.int(60, { min: 0 }), until: S.str(), concentration: S.bool() }),
      uses: S.obj({ max: S.str(), per: S.str() }),
      cooldown: S.int(0, { min: 0 }),
      exclusive: S.str(),
      state: S.str(),
      tempHp: S.str(),
      endsOn: S.set(),
      changes: S.arr(S.obj({ key: S.str(), value: S.str(), mode: S.int(2) })),
      aura: object()
    };
  }
}
