import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, migrateDatabase } from '@/data/database';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

/** Node's built-in SQLite, typed here (the project has no Node type definitions). */
interface NodeStatement {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}
const { DatabaseSync } = jest.requireActual<{
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): NodeStatement };
}>('node:sqlite');

/** The version 1 schema as shipped (migration 0 -> 1). */
const V1_SCHEMA = `
  CREATE TABLE day_log (
    date TEXT PRIMARY KEY NOT NULL,
    color INTEGER NULL CHECK (color BETWEEN 0 AND 3),
    checked_in INTEGER NOT NULL DEFAULT 0 CHECK (checked_in IN (0, 1))
  ) WITHOUT ROWID;
  CREATE TABLE behavior (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color INTEGER NOT NULL CHECK (color BETWEEN 0 AND 3),
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) WITHOUT ROWID;
  PRAGMA user_version = 1;
`;

/** A version 1 database (Node's built-in SQLite) behind the expo-sqlite calls migrateDatabase uses. */
function v1Database(settings: Record<string, string>, days: [string, number | null, number][] = []) {
  const raw = new DatabaseSync(':memory:');
  raw.exec(V1_SCHEMA);
  for (const [key, value] of Object.entries(settings)) {
    raw.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
  for (const [date, color, checkedIn] of days) {
    raw.prepare('INSERT INTO day_log (date, color, checked_in) VALUES (?, ?, ?)').run(date, color, checkedIn);
  }
  const db = {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    getFirstAsync: async (sql: string) => raw.prepare(sql).get() ?? null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  const read = () => ({
    version: (raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    days: raw.prepare('SELECT date, color, checked_in FROM day_log ORDER BY date').all(),
    keys: raw.prepare('SELECT key FROM settings ORDER BY key').all().map((row) => (row as { key: string }).key),
  });
  return { db, read };
}

const json = (value: unknown) => JSON.stringify(value);

describe('migration 1 -> 2: counterStartDate becomes a Red day', () => {
  it('a start before installDate ("My last Red day was…") becomes that day\'s Red', async () => {
    const { db, read } = v1Database({
      counterStartDate: json('2026-10-10'),
      installDate: json('2026-10-30'),
      onboardingDone: json(true),
    });
    await migrateDatabase(db);
    expect(read()).toEqual({
      version: DATABASE_VERSION,
      days: [{ date: '2026-10-10', color: 3, checked_in: 0 }],
      keys: ['installDate', 'onboardingDone'],
    });
  });

  it.each<[string, Record<string, string>]>([
    ['"Start counting today" (start = installDate)', { counterStartDate: json('2026-10-30'), installDate: json('2026-10-30') }],
    ['a start after installDate', { counterStartDate: json('2026-10-31'), installDate: json('2026-10-30') }],
    ['mid-onboarding (no installDate yet)', { counterStartDate: json('2026-10-01'), installDate: json(null) }],
    ['no start', { counterStartDate: json(null), installDate: json('2026-10-30') }],
    ['an unreadable start', { counterStartDate: 'not json', installDate: json('2026-10-30') }],
    ['a start that is not a date', { counterStartDate: json('soon'), installDate: json('2026-10-30') }],
  ])('%s adds no day and drops the setting', async (_name, settings) => {
    const { db, read } = v1Database(settings);
    await migrateDatabase(db);
    expect(read().days).toEqual([]);
    expect(read().keys).not.toContain('counterStartDate');
  });

  it('keeps a check-in on that day, and a color already logged there', async () => {
    const settings = { counterStartDate: json('2026-10-10'), installDate: json('2026-10-30') };
    const marked = v1Database(settings, [['2026-10-10', null, 1]]);
    await migrateDatabase(marked.db);
    expect(marked.read().days).toEqual([{ date: '2026-10-10', color: 3, checked_in: 1 }]);

    const logged = v1Database(settings, [['2026-10-10', 1, 0]]);
    await migrateDatabase(logged.db);
    expect(logged.read().days).toEqual([{ date: '2026-10-10', color: 1, checked_in: 0 }]);
  });

  it('runs once: a second call changes nothing', async () => {
    const { db, read } = v1Database({ counterStartDate: json('2026-10-10'), installDate: json('2026-10-30') });
    await migrateDatabase(db);
    const first = read();
    await migrateDatabase(db);
    expect(read()).toEqual(first);
  });
});
