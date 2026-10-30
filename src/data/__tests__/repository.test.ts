import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '@/data/database';
import { createSqliteRepository } from '@/data/repository';
import { DEFAULT_SETTINGS, type Settings } from '@/domain/types';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

/** Node's built-in SQLite, typed here (the project has no Node type definitions). */
interface NodeStatement {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
}
const { DatabaseSync } = jest.requireActual<{ DatabaseSync: new (path: string) => NodeDatabase }>(
  'node:sqlite',
);

/**
 * A migrated database (Node's built-in SQLite) behind the expo-sqlite calls the
 * repository uses. `failOn` makes execAsync throw, after running, for SQL that contains it.
 */
async function appDatabase(failOn?: { txn?: string; db?: string }) {
  const raw = new DatabaseSync(':memory:');
  const exec = (sql: string, fail?: string) => {
    raw.exec(sql);
    if (fail !== undefined && sql.includes(fail)) throw new Error('disk I/O error');
  };
  const queries = {
    runAsync: async (sql: string, params: unknown[] = []) => {
      const result = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getFirstAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).all(...params),
  };
  const inTransaction = async (task: () => Promise<void>) => {
    raw.exec('BEGIN');
    try {
      await task();
      raw.exec('COMMIT');
    } catch (error) {
      raw.exec('ROLLBACK');
      throw error;
    }
  };
  const txn = { ...queries, execAsync: async (sql: string) => exec(sql, failOn?.txn) };
  const db = {
    ...queries,
    execAsync: async (sql: string) => exec(sql, failOn?.db),
    withTransactionAsync: inTransaction,
    withExclusiveTransactionAsync: (task: (t: unknown) => Promise<void>) => inTransaction(() => task(txn)),
  } as unknown as SQLiteDatabase;
  await migrateDatabase(db);
  const count = (table: string) =>
    (raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  return { db, count };
}

const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  partner: { name: 'Sam', phone: '555 0100' },
  reminder: { enabled: true, hour: 20, minute: 30 },
  installDate: '2026-10-01',
  onboardingDone: true,
  lastExportAt: '2026-10-20T12:00:00.000Z',
};

/** Fills every table. */
async function fill(db: SQLiteDatabase) {
  const repo = createSqliteRepository(db);
  await repo.upsertDays([
    { date: '2026-10-20', color: 3, checkedIn: true },
    { date: '2026-10-21', color: 0, checkedIn: false },
  ]);
  await repo.addBehavior(0, 'Walk');
  await repo.addBehavior(2, 'Late scrolling');
  await repo.saveSettings(SETTINGS);
  return repo;
}

describe('deleteAll', () => {
  it('empties every table, and behavior ids start over', async () => {
    const { db, count } = await appDatabase();
    const repo = await fill(db);

    await repo.deleteAll();

    expect(await repo.loadAll()).toEqual({ days: [], behaviors: [], settings: DEFAULT_SETTINGS });
    expect([count('day_log'), count('behavior'), count('settings')]).toEqual([0, 0, 0]);
    expect((await repo.addBehavior(1, 'Run')).id).toBe(1);
  });

  it('deletes nothing when the transaction fails', async () => {
    const { db } = await appDatabase({ txn: 'DELETE FROM day_log' });
    const repo = await fill(db);
    const before = await repo.loadAll();

    await expect(repo.deleteAll()).rejects.toThrow('disk I/O error');
    expect(await repo.loadAll()).toEqual(before);
  });

  it('still succeeds when the file cannot be compacted afterwards', async () => {
    const { db, count } = await appDatabase({ db: 'VACUUM' });
    const repo = await fill(db);

    await expect(repo.deleteAll()).resolves.toBeUndefined();
    expect([count('day_log'), count('behavior'), count('settings')]).toEqual([0, 0, 0]);
  });
});
