import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { z } from 'zod';

import { isValidLocalDate } from '@/domain/dates';
import {
  DEFAULT_SETTINGS,
  type AppSnapshot,
  type Behavior,
  type ColorLevel,
  type DayLog,
  type LocalDate,
  type Settings,
} from '@/domain/types';

/** Persistence boundary used by the store. See docs/ARCHITECTURE.md (data/repository.ts). */
export interface Repository {
  loadAll(): Promise<AppSnapshot>;
  /** Insert or update a day. A day with color null and checkedIn false is deleted instead. */
  upsertDay(day: DayLog): Promise<void>;
  deleteDay(date: LocalDate): Promise<void>;
  /** Appends `text` (stored as given) at the end of `color`'s list. */
  addBehavior(color: ColorLevel, text: string): Promise<Behavior>;
  updateBehavior(id: number, text: string): Promise<void>;
  deleteBehavior(id: number): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  /** Replace every table with `snapshot`, in one transaction. */
  replaceAll(snapshot: AppSnapshot): Promise<void>;
}

// ---------------------------------------------------------------------------
// Shared helpers (also used by the in-memory repository and the store)
// ---------------------------------------------------------------------------

/** A day with no color and no check-in carries no data and is never stored. */
export function isEmptyDay(day: Pick<DayLog, 'color' | 'checkedIn'>): boolean {
  return day.color === null && !day.checkedIn;
}

/** Behaviors in display order: by color, then sortOrder, then id. Returns a new array. */
export function sortBehaviors(behaviors: readonly Behavior[]): Behavior[] {
  return [...behaviors].sort((a, b) => a.color - b.color || a.sortOrder - b.sortOrder || a.id - b.id);
}

/** A fresh copy of the default settings (no shared nested objects). */
export function defaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS, reminder: { ...DEFAULT_SETTINGS.reminder }, pendingShares: [] };
}

export function toColorLevel(value: unknown): ColorLevel | null {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : null;
}

// ---------------------------------------------------------------------------
// Settings: one row per Settings key, value is JSON
// ---------------------------------------------------------------------------

const LocalDateSchema = z.string().refine(isValidLocalDate);

/** Per-key validation for stored settings. Invalid or unparsable rows fall back to the default. */
const SETTING_SCHEMAS: { [K in keyof Settings]: z.ZodType<Settings[K]> } = {
  partner: z.object({ name: z.string(), phone: z.string() }).nullable(),
  reminder: z.object({
    enabled: z.boolean(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  counterStartDate: LocalDateSchema.nullable(),
  installDate: LocalDateSchema.nullable(),
  onboardingDone: z.boolean(),
  // Same rule as BackupSchemaV1, so a loaded value can always be exported again.
  lastExportAt: z.iso.datetime({ offset: true }).nullable(),
  pendingShares: z.array(z.object({ date: LocalDateSchema, since: LocalDateSchema.nullable() })),
};

const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as (keyof Settings)[];

function isSettingKey(key: string): key is keyof Settings {
  return Object.prototype.hasOwnProperty.call(SETTING_SCHEMAS, key);
}

function applyStoredSetting<K extends keyof Settings>(target: Settings, key: K, raw: string): void {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return;
  }
  const result = SETTING_SCHEMAS[key].safeParse(json);
  if (result.success) target[key] = result.data;
}

/** Merge stored key/value rows over DEFAULT_SETTINGS. Unknown keys are ignored. */
export function settingsFromRows(rows: readonly { key: string; value: string }[]): Settings {
  const settings = defaultSettings();
  for (const row of rows) {
    if (isSettingKey(row.key)) applyStoredSetting(settings, row.key, row.value);
  }
  return settings;
}

// ---------------------------------------------------------------------------
// SQLite implementation
// ---------------------------------------------------------------------------

interface DayRow {
  date: string;
  color: number | null;
  checked_in: number;
}

interface BehaviorRow {
  id: number;
  color: number;
  text: string;
  sort_order: number;
}

interface SettingRow {
  key: string;
  value: string;
}

const UPSERT_DAY_SQL =
  'INSERT INTO day_log (date, color, checked_in) VALUES (?, ?, ?) ' +
  'ON CONFLICT(date) DO UPDATE SET color = excluded.color, checked_in = excluded.checked_in';

function dayParams(day: DayLog): [string, number | null, number] {
  return [day.date, day.color, day.checkedIn ? 1 : 0];
}

/** Writes every Settings key in one statement (a single statement is atomic). */
async function writeSettings(db: SQLiteDatabase, settings: Settings): Promise<void> {
  const placeholders = SETTING_KEYS.map(() => '(?, ?)').join(', ');
  const params = SETTING_KEYS.flatMap((key) => [key, JSON.stringify(settings[key] ?? null)]);
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ${placeholders} ` +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    params,
  );
}

/**
 * Run `task` in a transaction no other query can interleave with.
 * withExclusiveTransactionAsync (its own connection; queries must use `txn`)
 * is not available on web, so web falls back to withTransactionAsync.
 */
async function inExclusiveTransaction(
  db: SQLiteDatabase,
  task: (txn: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  if (Platform.OS === 'web') {
    await db.withTransactionAsync(() => task(db));
    return;
  }
  await db.withExclusiveTransactionAsync((txn) => task(txn));
}

export function createSqliteRepository(db: SQLiteDatabase): Repository {
  return {
    async loadAll() {
      const dayRows = await db.getAllAsync<DayRow>(
        'SELECT date, color, checked_in FROM day_log ORDER BY date',
      );
      const behaviorRows = await db.getAllAsync<BehaviorRow>(
        'SELECT id, color, text, sort_order FROM behavior ORDER BY color, sort_order, id',
      );
      const settingRows = await db.getAllAsync<SettingRow>('SELECT key, value FROM settings');

      const days: DayLog[] = [];
      for (const row of dayRows) {
        const day: DayLog = {
          date: row.date,
          color: toColorLevel(row.color),
          checkedIn: row.checked_in === 1,
        };
        if (isValidLocalDate(day.date) && !isEmptyDay(day)) days.push(day);
      }

      const behaviors: Behavior[] = [];
      for (const row of behaviorRows) {
        const color = toColorLevel(row.color);
        if (color !== null) {
          behaviors.push({ id: row.id, color, text: row.text, sortOrder: row.sort_order });
        }
      }

      return { days, behaviors, settings: settingsFromRows(settingRows) };
    },

    async upsertDay(day) {
      if (isEmptyDay(day)) {
        await db.runAsync('DELETE FROM day_log WHERE date = ?', [day.date]);
        return;
      }
      await db.runAsync(UPSERT_DAY_SQL, dayParams(day));
    },

    async deleteDay(date) {
      await db.runAsync('DELETE FROM day_log WHERE date = ?', [date]);
    },

    async addBehavior(color, text) {
      const row = await db.getFirstAsync<{ next: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM behavior WHERE color = ?',
        [color],
      );
      const sortOrder = row?.next ?? 0;
      const result = await db.runAsync(
        'INSERT INTO behavior (color, text, sort_order) VALUES (?, ?, ?)',
        [color, text, sortOrder],
      );
      return { id: result.lastInsertRowId, color, text, sortOrder };
    },

    async updateBehavior(id, text) {
      await db.runAsync('UPDATE behavior SET text = ? WHERE id = ?', [text, id]);
    },

    async deleteBehavior(id) {
      await db.runAsync('DELETE FROM behavior WHERE id = ?', [id]);
    },

    async saveSettings(settings) {
      await writeSettings(db, settings);
    },

    async replaceAll(snapshot) {
      await inExclusiveTransaction(db, async (txn) => {
        await txn.execAsync('DELETE FROM day_log; DELETE FROM behavior; DELETE FROM settings;');

        // Duplicate dates: the last one wins (parseBackup already rejects duplicates).
        const dayStatement = await txn.prepareAsync(UPSERT_DAY_SQL);
        try {
          for (const day of snapshot.days) {
            if (!isEmptyDay(day)) await dayStatement.executeAsync(dayParams(day));
          }
        } finally {
          await dayStatement.finalizeAsync();
        }

        // Ids are kept so the store's state matches the database after a reload.
        // A duplicate id fails the primary key and rolls the whole import back.
        const behaviorStatement = await txn.prepareAsync(
          'INSERT INTO behavior (id, color, text, sort_order) VALUES (?, ?, ?, ?)',
        );
        try {
          for (const b of snapshot.behaviors) {
            await behaviorStatement.executeAsync([b.id, b.color, b.text, b.sortOrder]);
          }
        } finally {
          await behaviorStatement.finalizeAsync();
        }

        await writeSettings(txn, snapshot.settings);
      });
    },
  };
}
