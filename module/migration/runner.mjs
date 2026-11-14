/**
 * World migration runner. Migrations are numbered entries that each transform one document shape.
 * The last migration run is stored in a world setting; the rest run on GM login after a backup prompt.
 * Each migration is idempotent and logs what it changed.
 *
 * Documents are ALSO migrated in memory on every load (Document.migrateData -> v31.mjs), so a world
 * opens cleanly even before this runner saves the results to the database.
 *
 * Adding a migration (when a stored field is renamed, moved or reshaped):
 *   1. write a function that updates world actors/items (and compendiums if needed), idempotent:
 *      running it twice must change nothing the second time;
 *   2. append { id: <next number>, label, run } to MIGRATIONS (never renumber or remove entries);
 *   3. if old data must also load before the GM runs it, add the in-memory conversion to the
 *      document's static migrateData (documents/actor.mjs / item.mjs);
 *   4. add a test in tests/migration.test.mjs.
 */
import { isV31Actor, isV31Item, migrateV31Actor, migrateV31Item } from "./v31.mjs";
import { migrateItemData1, migrateItemData1b } from "./data1.mjs";

export const SETTING = "migrationVersion";

/** Ordered list. Add new entries at the end; never renumber. */
export const MIGRATIONS = [
  { id: 1, label: "V3.1 world actors and items -> 4.0", run: migrateWorldV31 },
  { id: 2, label: "Retry legacy documents and restore dropped automation fields", run: repairAutomation },
  { id: 3, label: "Data model 2026-11-13: jutsu disciplines, keywords, feature kinds and the Feats group", run: migrateDataModel },
  { id: 4, label: "Weapons: base weapon keywords and category + group proficiency", run: migrateWeapons }
];

/** Migration 4 (DATA1b): base weapon keywords; class weapon proficiencies as category + group pairs. */
async function migrateWeapons(log) {
  const failures = [];
  const unlinked = game.scenes.contents.flatMap(sc => sc.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor));
  const items = [...game.items, ...[...game.actors, ...unlinked].flatMap(a => [...a.items])];
  for ( const item of items ) {
    const next = migrateItemData1b(item.toObject());
    if ( !next ) continue;
    const update = {};
    if ( item.type === "weapon" ) update["system.keywords"] = next.system.keywords;
    if ( item.type === "class" ) update["system.weaponProficiencies"] = next.system.weaponProficiencies;
    try { await item.update(update, { n5eMigration: true }); log.push(`Weapons: ${item.uuid}`); }
    catch (error) { failures.push({ uuid: item.uuid, error: error.message }); }
  }
  if ( failures.length ) { const error = new Error("Some weapons or classes could not be updated."); error.failures = failures; throw error; }
}

/**
 * Migration 3 (DATA1, King 2026-11-13). World items, actor items and unlinked token items:
 * Bukijutsu → Taijutsu + keyword, the disciplines list, canonical keywords (Combination removed),
 * feature kinds (background features → Clan Feature) and the Feats group.
 */
async function migrateDataModel(log) {
  const failures = [];
  const unlinked = game.scenes.contents.flatMap(sc => sc.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor));
  const items = [...game.items, ...[...game.actors, ...unlinked].flatMap(a => [...a.items])];
  for ( const item of items ) {
    const next = migrateItemData1(item.toObject());
    if ( !next ) continue;
    const update = {};
    for ( const key of ["discipline", "disciplines", "keywords", "category"] ) {
      if ( key in next.system ) update[`system.${key}`] = next.system[key];
    }
    try { await item.update(update, { n5eMigration: true }); log.push(`Data model: ${item.uuid}`); }
    catch (error) { failures.push({ uuid: item.uuid, error: error.message }); }
  }
  if ( failures.length ) { const error = new Error("Some items could not be updated to the new data model."); error.failures = failures; throw error; }
}
export const LATEST = MIGRATIONS.at(-1).id;

/** Restore only newly supported booleans from a linked compendium source; preserve all item ids,
 * formulas, choices and other homebrew edits. Items without a source are left untouched.
 */
async function repairAutomation(log) {
  await migrateWorldV31(log);
  const failures = [];
  const items = [...game.items, ...[...game.actors].flatMap(a => [...a.items])];
  for ( const item of items ) {
    const sourceUuid = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
    if ( !sourceUuid?.startsWith("Compendium.") || !item.system.activities?.length ) continue;
    try {
      const source = await fromUuid(sourceUuid);
      if ( !source ) continue;
      // Raw pack data retains fields that older schemas could not initialize.
      const raw = source._source;
      const originals = raw?.system?.activities ?? [];
      const activities = item.system.activities.map(a => a.toObject?.() ?? foundry.utils.deepClone(a));
      let changed = false;
      for ( const activity of activities ) {
        const original = originals.find(a => a.id && a.id === activity.id);
        if ( !original ) continue;
        for ( const [group, key] of [["cost", "gain"], ["cost", "choose"], ["save", "resave"]] ) {
          if ( original[group]?.[key] === true && !activity[group]?.[key] ) {
            activity[group] ??= {}; activity[group][key] = true; changed = true;
          }
        }
      }
      if ( changed ) { await item.update({ "system.activities": activities }); log.push(`Restored automation fields: ${item.uuid}`); }
    } catch (error) { failures.push({ uuid: item.uuid, error: error.message }); }
  }
  if ( failures.length ) { const error = new Error("Some automation fields could not be repaired."); error.failures = failures; throw error; }
}

/** The world setting that remembers the last migration run (hidden; set by checkMigrations). */
export function registerMigrationSetting() {
  game.settings.register("n5e", "migrationFailures", {
    name: "Incomplete migration documents", scope: "world", config: false, type: Object, default: {}
  });
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
    try { await m.run(log); }
    catch (error) {
      await game.settings.set("n5e", "migrationFailures", { migration: m.id, errors: error.failures ?? [error.message] });
      ui.notifications.error("N5e migration is incomplete. Failed documents are recorded for retry; the migration version was not advanced.");
      throw error;
    }
    await game.settings.set("n5e", SETTING, m.id);
    await game.settings.set("n5e", "migrationFailures", {});
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
    const original = doc.toObject();
    // Validate before deleting anything. If replacement fails, restore the original id and source.
    const candidate = new cls(data, { parent, strict: true });
    candidate.validate({ strict: true });
    await doc.delete({ n5eMigration: true });
    try { await cls.create(data, { parent, keepId: true, n5eMigration: true }); }
    catch (replacementError) {
      try { await cls.create(original, { parent, keepId: true, n5eMigration: true }); }
      catch (restoreError) { throw new Error(`Replacement and restoration failed for ${doc.uuid}: ${replacementError.message}; ${restoreError.message}. Restore from your world backup.`); }
      throw new Error(`Replacement failed for ${doc.uuid}; original restored: ${replacementError.message}`);
    }
  }
}

/** Migration 1: V3.1 -> 4.0 for world actors (with embedded items/effects) and world items. */
async function migrateWorldV31(log) {
  const failures = [];
  const conditionKeys = new Set(Object.keys(CONFIG.N5E.conditions));
  // Raw stored data (pre-migrateData) lives in collection._source.
  const rawActors = new Map((game.actors._source ?? []).map(s => [s._id, s]));
  const rawItems = new Map((game.items._source ?? []).map(s => [s._id, s]));

  for ( const item of game.items ) {
    const raw = foundry.utils.deepClone(rawItems.get(item.id));
    if ( !raw || !isV31Item(raw) ) continue;
    const r = migrateV31Item(raw);
    log.push(...r.log);
    try { await persist(item, raw); } catch (err) { failures.push({ uuid: item.uuid, error: err.message }); log.push(`Item ${item.name}: ${err.message}`); }
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
      failures.push({ uuid: actor.uuid, error: err.message });
      log.push(`Actor ${actor.name}: ${err.message}`);
    }
  }
  if ( failures.length ) {
    const error = new Error(`${failures.length} documents could not be migrated.`);
    error.failures = failures;
    throw error;
  }
}
