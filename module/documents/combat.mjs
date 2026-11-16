/**
 * N5e Combat (TURN1). Foundry v13 calls _onStartTurn / _onEndTurn / _onStartRound only when combat
 * moves forward, and only on the active GM's client; dnd5e's Combat5e hangs its turn automation and
 * use recovery on them. Rewinding a turn or round re-runs nothing.
 */
import { turnStartPipeline, turnEndPipeline, combatEndPipeline } from "../workflow/turn.mjs";
import { recoverForCombat } from "../workflow/recovery.mjs";

export default class N5eCombat extends foundry.documents.Combat {
  /**
   * @override
   * Initiative from the tracker, the sheet or "Roll All" goes through the roll dialog (ROLL1 A9):
   * one dialog for one creature, one for several (King Q-R2). A caller that passes a formula skips it.
   */
  async rollInitiative(ids, options = {}) {
    if ( options.formula ) return super.rollInitiative(ids, options);
    const list = (typeof ids === "string" ? [ids] : [...ids]).map(id => this.combatants.get(id)).filter(Boolean);
    const mine = list.filter(c => c.actor && c.isOwner);
    const { initiativeFormulas } = await import("../dice/roll.mjs");
    const formulas = await initiativeFormulas(mine, options.n5eSkill ?? null);
    if ( formulas === null ) return this;
    const rest = { ...options };
    delete rest.n5eSkill;
    for ( const [i, c] of list.entries() ) {
      const last = i === list.length - 1;
      await super.rollInitiative([c.id], { ...rest, ...(formulas[c.id] ? { formula: formulas[c.id] } : {}), updateTurn: last ? rest.updateTurn ?? true : false });
    }
    return this;
  }

  /** @override */
  async startCombat() {
    await recoverForCombat(this, ["encounter"]);
    return super.startCombat();
  }

  /** @override */
  async _onStartRound(context) {
    await super._onStartRound(context);
    // CCOND1: initiative changes from conditions (Flow Broken −4) take effect now; the new first
    // creature in the order takes the round's first turn.
    if ( game.users.activeGM?.isSelf ) {
      const { pendingInitiative } = await import("../rules/condition-cards.mjs");
      const updates = pendingInitiative(this.combatants.contents);
      if ( updates.length ) {
        await this.updateEmbeddedDocuments("Combatant", updates, { turnEvents: false });
        if ( this.turn !== 0 ) await this.update({ turn: 0 }, { turnEvents: false });
      }
    }
    await recoverForCombat(this, ["round"]);
    // Surprised ends at the end of round 1 (POS1).
    if ( game.users.activeGM?.isSelf ) await import("../workflow/positioning.mjs").then(m => m.endSurprise(this));
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
