/**
 * Token document: senses from the actor become vision and detection modes every prepare (nothing
 * saved; the rule is module/rules/senses.mjs). Turn off with the syncSenses rule, or per token with
 * flags.n5e.manualVision = true (then the token's own vision settings are used as they are).
 */
import { visionFromSenses } from "../rules/senses.mjs";
import { rule } from "../rules-settings.mjs";

export default class N5eTokenDocument extends foundry.documents.TokenDocument {
  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    this._applySenses();
  }

  /** Overlay the actor's senses on this token's sight and detection modes. */
  _applySenses() {
    const senses = this.actor?.system?.traits?.senses;
    if ( !senses || !this.sight?.enabled || this.flags?.n5e?.manualVision ) return;
    try { if ( !rule("syncSenses") ) return; } catch { return; }
    const v = visionFromSenses(senses, this.sight, this.detectionModes ?? []);
    this.sight.range = v.sight.range;
    this.sight.visionMode = v.sight.visionMode;
    this.detectionModes = v.modes;
  }
}
