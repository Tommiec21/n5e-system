/**
 * World migration runner. Migrations are numbered entries that each transform one document shape.
 * The last migration run is stored in a world setting; the rest run on GM login after a backup prompt.
 * Each migration is idempotent and logs what it changed.
 *
 * Documents are ALSO migrated in memory on every load (Document.migrateData -> v31.mjs), so a world
 * opens cleanly even before this runner saves the results to the database.
 */
import { isV31Actor, isV31Item, migrateV31Actor, migrateV31Item } from "./v31.mjs";

export const SETTING = "migrationVersion";

/** Ordered list. Add new entries at the end; never renumber. */
export const MIGRATIONS = [
  { id: 1, label: "V3.1 world actors and items -> 4.0", run: migrateWorldV31 }
];
export const LATEST = MIGRATIONS.at(-1).id;

export function registerMigrationSetting() {
  game.settings.register("n5e", SETTING, {
    name: "Last data migration", scope: "world", config: false, type: Number, default: 0
  });
}

/** Called on ready. */
export async function checkMigrations() {
  if ( !game.user.isGM ) return;
  const done = game.settings.get("n5e", SETTING);
  const pending = MIGRATIONS.filter(m => m.id > done);
  if ( !pending.length ) return;
  // Fresh worlds have nothing to migrate: mark current without prompting.
  if ( !game.actors.size && !game.items.size ) return game.settings.set("n5e", SETTING, LATEST);

  const proceed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "N5e data migration" },
    content: `<p>This world has data from an older N5e version. The system will update ${pending.length}
      migration step(s) now.</p><p><strong>Back up your world folder first</strong> (Foundry setup screen,
      or copy the world's folder). Continue?</p>`,
    rejectClose: false
  });
  if ( !proceed ) {
    ui.notifications.warn("N5e migration postponed. Documents are converted in memory each load until you migrate.");
    return;
  }
  const log = [];
  for ( const m of pending ) {
    ui.notifications.info(`N5e migration ${m.id}: ${m.label}...`);
    await m.run(log);
    await game.settings.set("n5e", SETTING, m.id);
  }
  console.groupCollapsed(`N5e | migration complete (${log.length} notes)`);
  for ( const line of log ) console.log(line);
  console.groupEnd();
  ui.notifications.info(`N5e migration complete. ${log.length} notes in the browser console (F12).`);
}

/**
 * Persist a migrated source with a forced system replacement; if the update is refused, fall back to
 * delete + recreate with the same id (type changes only).
 */
async function persist(doc, migrated, { parent } = {}) {
  const cls = doc.constructor;
  const typeChanged = migrated.type !== doc._source.type || (doc._source.data && !doc._source.system);
  try {
    // v13: a type change must travel with a forced replacement of system ("==system").
    await doc.update({ type: migrated.type, "==system": migrated.system, flags: migrated.flags },
      { diff: false, n5eMigration: true });
  } catch (err) {
    if ( !typeChanged ) throw err;
    const data = foundry.utils.deepClone(migrated);
    await doc.delete({ n5eMigration: true });
    await cls.create(data, { parent, keepId: true, n5eMigration: true });
  }
}

/** Migration 1: V3.1 -> 4.0 for world actors (with embedded items/effects) and world items. */
async function migrateWorldV31(log) {
  const conditionKeys = new Set(Object.keys(CONFIG.N5E.conditions));
  // Raw stored data (pre-migrateData) lives in collection._source.
  const rawActors = new Map((game.actors._source ?? []).map(s => [s._id, s]));
  const rawItems = new Map((game.items._source ?? []).map(s => [s._id, s]));

  for ( const item of game.items ) {
    const raw = foundry.utils.deepClone(rawItems.get(item.id));
    if ( !raw || !isV31Item(raw) ) continue;
    const r = migrateV31Item(raw);
    log.push(...r.log);
    try { await persist(item, raw); } catch (err) { log.push(`Item ${item.name}: ${err.message}`); }
  }

  for ( const actor of game.actors ) {
    const raw = foundry.utils.deepClone(rawActors.get(actor.id));
    if ( !raw ) continue;
    const actorWasOld = isV31Actor(raw);
    if ( actorWasOld ) log.push(...migrateV31Actor(raw, { conditionKeys }).log);
    else for ( const rawItem of raw.items ?? [] ) log.push(...migrateV31Item(rawItem).log);
    try {
      if ( actorWasOld ) {
        await actor.update({ type: raw.type, "==system": raw.system, flags: raw.flags },
          { diff: false, n5eMigration: true });
      }
      // Embedded items.
      for ( const rawItem of raw.items ?? [] ) {
        const item = actor.items.get(rawItem._id);
        if ( item && rawItem.flags?.n5e?.migratedFrom ) await persist(item, rawItem, { parent: actor });
      }
      // Effects removed by the migration (retired conditions).
      const keep = new Set((raw.effects ?? []).map(e => e._id));
      const drop = actor.effects.filter(e => !keep.has(e.id)).map(e => e.id);
      if ( drop.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", drop, { n5eMigration: true });
    } catch (err) {
      log.push(`Actor ${actor.name}: ${err.message}`);
    }
  }
}
