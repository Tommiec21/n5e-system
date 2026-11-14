/**
 * N5e Combat (TURN1). Foundry v13 calls _onStartTurn / _onEndTurn / _onStartRound only when combat
 * moves forward, and only on the active GM's client; dnd5e's Combat5e hangs its turn automation and
 * use recovery on them. Rewinding a turn or round re-runs nothing.
 */
import { turnStartPipeline, turnEndPipeline, combatEndPipeline } from "../workflow/turn.mjs";
import { recoverForCombat } from "../workflow/recovery.mjs";

export default class N5eCombat extends foundry.documents.Combat {
  /** @override */
  async startCombat() {
    await recoverForCombat(this, ["encounter"]);
    return super.startCombat();
  }

  /** @override */
  async _onStartRound(context) {
    await super._onStartRound(context);
    await recoverForCombat(this, ["round"]);
  }

  /** @override */
  async _onStartTurn(combatant, context) {
    await super._onStartTurn(combatant, context);
    await turnStartPipeline(this, combatant);
  }

  /** @override */
  async _onEndTurn(combatant, context) {
    await super._onEndTurn(combatant, context);
    await turnEndPipeline(this, combatant);
  }

  /** @override */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    void combatEndPipeline(this).catch(error => console.warn("n5e | combat end", error));
  }
}
