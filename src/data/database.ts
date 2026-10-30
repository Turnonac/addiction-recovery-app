import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

/** File name of the app database (default expo-sqlite directory). */
export const DATABASE_NAME = 'app.db';

/**
 * Schema migrations. Entry `i` upgrades the database from `PRAGMA user_version`
 * `i` to `i + 1`. Never edit a shipped entry; append a new one instead.
 * The schema itself is documented in docs/ARCHITECTURE.md (data/repository.ts).
 */
const MIGRATIONS: readonly string[] = [
  // 0 -> 1: initial schema.
  `
  CREATE TABLE IF NOT EXISTS day_log (
    date TEXT PRIMARY KEY NOT NULL,
    color INTEGER NULL CHECK (color BETWEEN 0 AND 3),
    checked_in INTEGER NOT NULL DEFAULT 0 CHECK (checked_in IN (0, 1))
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS behavior (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color INTEGER NOT NULL CHECK (color BETWEEN 0 AND 3),
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  ) WITHOUT ROWID;
  `,
  // 1 -> 2: the day log is the one source for Red days. Onboarding's "My last Red day
  // was…" lived in the counterStartDate setting; a start before installDate becomes
  // that day's Red (unless the day already has a color). A start on installDate was
  // "Start counting today", which installDate already says. Then the setting goes.
  `
  INSERT INTO day_log (date, color, checked_in)
  SELECT start_date, 3, 0
  FROM (
    SELECT
      (SELECT CASE WHEN json_valid(value) THEN CASE WHEN json_type(value) = 'text'
        THEN json_extract(value, '$') END END FROM settings WHERE key = 'counterStartDate') AS start_date,
      (SELECT CASE WHEN json_valid(value) THEN CASE WHEN json_type(value) = 'text'
        THEN json_extract(value, '$') END END FROM settings WHERE key = 'installDate') AS install_date
  )
  WHERE start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND start_date < install_date
  ON CONFLICT(date) DO UPDATE SET color = 3 WHERE day_log.color IS NULL;

  DELETE FROM settings WHERE key IN ('counterStartDate', 'pendingShares');
  `,
];

/** Schema version this build of the app expects. */
export const DATABASE_VERSION = MIGRATIONS.length;

/**
 * Bring `db` up to DATABASE_VERSION. Each step runs in its own transaction
 * together with its `PRAGMA user_version` bump, so a crash mid-migration
 * leaves the database at the previous version. A database newer than this
 * build (app downgrade) is left untouched.
 */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  // WAL must be set outside a transaction. It is persistent, so repeating it is cheap.
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < DATABASE_VERSION; version++) {
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      // PRAGMA cannot take bound parameters; `next` is a trusted integer.
      await db.execAsync(`PRAGMA user_version = ${next};`);
    });
  }
}

/** Open `app.db` and run any pending migrations. Call once at app start. */
export async function openAppDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrateDatabase(db);
  return db;
}
