/** GM-only receipt inspection and deliberate archive; never automatically repairs partial writes. */
import { requestHistory, archiveRequestHistory } from "../../automation/history.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class AutomationRecovery extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-automation-recovery", classes: ["n5e", "n5e-v2"],
    window: { title: "N5e Automation Recovery", resizable: true }, position: { width: 760, height: 620 },
    actions: { refresh: AutomationRecovery.refresh, inspect: AutomationRecovery.inspect, archive: AutomationRecovery.archive }
  };
  static PARTS = { body: { template: "systems/n5e/templates/apps/automation-recovery.hbs" } };
  async _prepareContext() {
    if ( !game.user.isGM ) return { entries: [], allowed: false };
    const ledger = requestHistory();
    return { allowed: !!game.users.activeGM?.isSelf, epoch: ledger?.epoch ?? 1,
      entries: [...(ledger?.entries ?? [])].reverse().map(e => ({ ...e, unfinished: !["committed", "declined", "rejected"].includes(e.state) })) };
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
}
