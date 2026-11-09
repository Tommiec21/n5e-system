/** GM-only receipt inspection and deliberate archive; never automatically repairs partial writes. */
import { requestHistory, archiveRequestHistory } from "../../automation/history.mjs";
import { coordinateDamage } from "../../workflow/coordinated-damage.mjs";
import { applyToSelected } from "../../workflow/apply-damage.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class AutomationRecovery extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-automation-recovery", classes: ["n5e", "n5e-v2"],
    window: { title: "N5e Automation Recovery", resizable: true }, position: { width: 760, height: 620 },
    actions: { refresh: AutomationRecovery.refresh, inspect: AutomationRecovery.inspect, archive: AutomationRecovery.archive, resume: AutomationRecovery.resume }
  };
  static PARTS = { body: { template: "systems/n5e/templates/apps/automation-recovery.hbs" } };
  async _prepareContext() {
    if ( !game.user.isGM ) return { entries: [], allowed: false };
    const ledger = requestHistory();
    return { allowed: !!game.users.activeGM?.isSelf, epoch: ledger?.epoch ?? 1,
      entries: [...(ledger?.entries ?? [])].reverse().map(e => ({ ...e, resumable: e.type === "damage" && e.state === "reviewing" && !!e.mode,
        unfinished: !["committed", "declined", "rejected"].includes(e.state) })) };
  }
  static refresh() { this.render(); }
  static async inspect(event, target) {
    if ( !game.user.isGM ) return;
    const doc = await fromUuid(target.dataset.uuid);
    if ( doc?.sheet ) doc.sheet.render(true); else ui.notifications.info("The referenced document is unavailable; inspect the campaign history manually.");
  }
  static async archive() {
    try { if ( await archiveRequestHistory({ reconciled: true }) ) this.render(); }
    catch (error) { ui.notifications.warn(error.message); }
  }
  static async resume(event, target) {
    try {
      if ( !game.users.activeGM?.isSelf ) throw new Error("Only the active GM can resume review.");
      const receipt = requestHistory().entries.find(e => e.id === target.dataset.id);
      if ( receipt?.state !== "reviewing" || receipt.type !== "damage" || !receipt.mode ) throw new Error("Only a damage request interrupted before application can resume review.");
      const message = await fromUuid(receipt.sourceUuid), actor = await fromUuid(receipt.actorUuid);
      const data = message?.getFlag("n5e", "damage");
      if ( !data || !actor ) throw new Error("Original source or actor is unavailable; reconcile manually.");
      if ( !await foundry.applications.api.DialogV2.confirm({ window: { title: "Resume interrupted damage review" },
        content: "<p>This request has not entered application. Recheck the original damage and open fresh reaction decisions? Changed source content will be refused. Applying or uncertain requests cannot be resumed.</p>", rejectClose: false }) ) return;
      await coordinateDamage(message, data, receipt.mode, [actor], applyToSelected, { resumeReview: true });
      this.render();
    } catch (error) { ui.notifications.warn(error.message); }
  }
}
