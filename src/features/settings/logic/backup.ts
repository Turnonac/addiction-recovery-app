import { HABIT_PRESETS } from '@/domain/catalog/habits';
import { MOODS } from '@/domain/catalog/moods';
import { TRIGGERS } from '@/domain/catalog/triggers';
import { EXERCISES } from '@/domain/catalog/exercises';
import { DEFAULT_SETTINGS, STATE_VERSION } from '@/store';
import type {
  ExerciseId,
  Habit,
  HabitKind,
  JournalEntry,
  MoodId,
  PersistedState,
  Relapse,
  ReminderTime,
  Settings,
  SosSession,
  TriggerId,
  Unlocks,
} from '@/types';
import { pad2, plural } from '@/utils/format';

/**
 * Backup files are the persisted state plus an `exportedAt` ISO timestamp.
 * Everything here is pure so it can be unit-tested without React Native.
 */
export interface BackupFile extends PersistedState {
  exportedAt: string;
  app: 'quit';
}

export type ParseResult = { ok: true; data: PersistedState; exportedAt: number | null } | { ok: false; error: string };

/** Hard cap so a wrong file can't freeze the app while parsing. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

/** "quit-backup-2026-10-09.json" (local date). */
export function backupFileName(now: number): string {
  const d = new Date(now);
  return `quit-backup-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.json`;
}

/** Pretty-printed backup JSON for a snapshot of the store. */
export function serializeBackup(state: PersistedState, now: number): string {
  const file: BackupFile = {
    app: 'quit',
    exportedAt: new Date(now).toISOString(),
    version: state.version,
    habits: state.habits,
    relapses: state.relapses,
    journal: state.journal,
    sosSessions: state.sosSessions,
    settings: state.settings,
    unlocks: state.unlocks,
  };
  return JSON.stringify(file, null, 2);
}

/** "4 habits · 6 journal entries · 5 relapses" */
export function backupSummary(data: Pick<PersistedState, 'habits' | 'journal' | 'relapses' | 'sosSessions'>): string {
  const parts = [plural(data.habits.length, 'habit')];
  if (data.journal.length) parts.push(plural(data.journal.length, 'journal entry', 'journal entries'));
  if (data.relapses.length) parts.push(plural(data.relapses.length, 'relapse'));
  if (data.sosSessions.length) parts.push(plural(data.sosSessions.length, 'SOS session'));
  return parts.join(' · ');
}

/**
 * Settings that belong to this device, not to the data: a backup must not turn
 * the app lock off (that needs Face ID / passcode) or on (needs a capable
 * device), nor change how this phone gives haptic feedback.
 */
export const DEVICE_SETTING_KEYS = ['appLockEnabled', 'hapticsEnabled'] as const;

/** Settings to apply after an import: the backup's, with this device's own keys kept. */
export function mergeImportedSettings(imported: Settings, current: Settings): Settings {
  const merged: Settings = { ...imported };
  for (const key of DEVICE_SETTING_KEYS) merged[key] = current[key];
  return merged;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const HABIT_KINDS = new Set<string>(HABIT_PRESETS.map((p) => p.kind));
const TRIGGER_IDS = new Set<string>(TRIGGERS.map((t) => t.id));
const MOOD_IDS = new Set<string>(MOODS.map((m) => m.id));
const EXERCISE_IDS = new Set<string>(EXERCISES.map((e) => e.id));
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CURRENCY_CODE = /^[A-Z]{3}$/;

class BackupError extends Error {}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(where: string, problem: string): never {
  throw new BackupError(`${where} ${problem}.`);
}

function str(o: Obj, key: string, where: string, opts: { nonEmpty?: boolean } = {}): string {
  const v = o[key];
  if (v === undefined) fail(where, `is missing “${key}”`);
  if (typeof v !== 'string') fail(where, `has an invalid “${key}” (expected text)`);
  if (opts.nonEmpty && !v.trim()) fail(where, `has an empty “${key}”`);
  return v;
}

function num(o: Obj, key: string, where: string, opts: { min?: number; max?: number; int?: boolean } = {}): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(where, `has an invalid “${key}” (expected a number)`);
  if (opts.int && !Number.isInteger(v)) fail(where, `has an invalid “${key}” (expected a whole number)`);
  if (opts.min != null && v < opts.min) fail(where, `has an out-of-range “${key}”`);
  if (opts.max != null && v > opts.max) fail(where, `has an out-of-range “${key}”`);
  return v;
}

/** Epoch ms between 1990 and 2200 — catches seconds-vs-ms mixups and garbage. */
function timestamp(o: Obj, key: string, where: string): number {
  return num(o, key, where, { min: 631_152_000_000, max: 7_258_118_400_000 });
}

function bool(o: Obj, key: string, where: string): boolean {
  const v = o[key];
  if (typeof v !== 'boolean') fail(where, `has an invalid “${key}” (expected true/false)`);
  return v;
}

function nullableStr(o: Obj, key: string, where: string): string | null {
  const v = o[key];
  if (v == null) return null;
  if (typeof v !== 'string') fail(where, `has an invalid “${key}”`);
  return v;
}

function array(root: Obj, key: string): unknown[] {
  const v = root[key];
  if (!Array.isArray(v)) fail('The backup', `is missing the “${key}” list`);
  return v;
}

function item(v: unknown, where: string): Obj {
  if (!isObj(v)) fail(where, 'is not an object');
  return v;
}

function uniqueIds<T extends { id: string }>(list: T[], label: string): void {
  const seen = new Set<string>();
  for (const x of list) {
    if (seen.has(x.id)) fail(`${label} “${x.id}”`, 'appears twice');
    seen.add(x.id);
  }
}

function parseHabit(raw: unknown, i: number): Habit {
  const where = `Habit #${i + 1}`;
  const o = item(raw, where);
  const kind = str(o, 'kind', where);
  if (!HABIT_KINDS.has(kind)) fail(where, `has an unknown kind “${kind}”`);
  const color = str(o, 'color', where);
  if (!HEX_COLOR.test(color)) fail(where, 'has an invalid color');
  const currency = str(o, 'currency', where);
  if (!CURRENCY_CODE.test(currency)) fail(where, 'has an invalid currency code');
  const goal = o.goalDays;
  if (goal != null && (typeof goal !== 'number' || !Number.isInteger(goal) || goal < 1)) fail(where, 'has an invalid “goalDays”');
  const startedAt = timestamp(o, 'startedAt', where);
  const firstStartedAt = timestamp(o, 'firstStartedAt', where);
  const archived = bool(o, 'archived', where);
  // When the habit was archived (pending shared `Habit.archivedAt` field). Optional,
  // validated when present on an archived habit, and kept so the frozen
  // "Archived · was N days clean" survives an export/import round trip.
  const archivedAt = archived && o.archivedAt != null ? timestamp(o, 'archivedAt', where) : null;
  return {
    id: str(o, 'id', where, { nonEmpty: true }),
    kind: kind as HabitKind,
    name: str(o, 'name', where, { nonEmpty: true }).trim(),
    color,
    icon: str(o, 'icon', where, { nonEmpty: true }) as Habit['icon'],
    startedAt,
    firstStartedAt,
    createdAt: timestamp(o, 'createdAt', where),
    dailyCost: num(o, 'dailyCost', where, { min: 0 }),
    currency,
    dailyMinutes: num(o, 'dailyMinutes', where, { min: 0, max: 24 * 60 }),
    goalDays: (goal as number | null | undefined) ?? null,
    reason: typeof o.reason === 'string' ? o.reason : '',
    archived,
    order: num(o, 'order', where),
    ...(archivedAt != null ? { archivedAt } : {}),
  };
}

function parseRelapse(raw: unknown, i: number, habitIds: Set<string>): Relapse {
  const where = `Relapse #${i + 1}`;
  const o = item(raw, where);
  const habitId = str(o, 'habitId', where, { nonEmpty: true });
  if (!habitIds.has(habitId)) fail(where, 'belongs to a habit that is not in the backup');
  const triggers = o.triggers;
  if (!Array.isArray(triggers) || triggers.some((t) => typeof t !== 'string' || !TRIGGER_IDS.has(t))) fail(where, 'has invalid triggers');
  const mood = o.mood;
  if (mood != null && (typeof mood !== 'string' || !MOOD_IDS.has(mood))) fail(where, 'has an invalid mood');
  return {
    id: str(o, 'id', where, { nonEmpty: true }),
    habitId,
    at: timestamp(o, 'at', where),
    streakMs: num(o, 'streakMs', where, { min: 0 }),
    triggers: [...new Set(triggers as TriggerId[])],
    mood: (mood as MoodId | null | undefined) ?? null,
    note: typeof o.note === 'string' ? o.note : '',
  };
}

function parseJournal(raw: unknown, i: number, habitIds: Set<string>): JournalEntry {
  const where = `Journal entry #${i + 1}`;
  const o = item(raw, where);
  const mood = str(o, 'mood', where);
  if (!MOOD_IDS.has(mood)) fail(where, 'has an invalid mood');
  const habitId = nullableStr(o, 'habitId', where);
  return {
    id: str(o, 'id', where, { nonEmpty: true }),
    createdAt: timestamp(o, 'createdAt', where),
    updatedAt: timestamp(o, 'updatedAt', where),
    title: str(o, 'title', where),
    body: str(o, 'body', where),
    mood: mood as MoodId,
    // Links to habits that aren't in the backup are dropped, like deleteHabit does.
    habitId: habitId && habitIds.has(habitId) ? habitId : null,
  };
}

function intensity(o: Obj, key: string, where: string): number | null {
  if (o[key] == null) return null;
  return num(o, key, where, { min: 0, max: 10 });
}

function parseSos(raw: unknown, i: number, habitIds: Set<string>): SosSession {
  const where = `SOS session #${i + 1}`;
  const o = item(raw, where);
  const exerciseId = str(o, 'exerciseId', where);
  if (!EXERCISE_IDS.has(exerciseId)) fail(where, `has an unknown exercise “${exerciseId}”`);
  const habitId = nullableStr(o, 'habitId', where);
  return {
    id: str(o, 'id', where, { nonEmpty: true }),
    at: timestamp(o, 'at', where),
    exerciseId: exerciseId as ExerciseId,
    durationSec: num(o, 'durationSec', where, { min: 0 }),
    completed: bool(o, 'completed', where),
    habitId: habitId && habitIds.has(habitId) ? habitId : null,
    intensityBefore: intensity(o, 'intensityBefore', where),
    intensityAfter: intensity(o, 'intensityAfter', where),
  };
}

function parseSettings(raw: unknown): Settings {
  const where = 'Settings';
  const o = item(raw, where);
  const s: Settings = { ...DEFAULT_SETTINGS };
  if ('userName' in o) s.userName = str(o, 'userName', where).slice(0, 40);
  if ('defaultCurrency' in o) {
    const c = str(o, 'defaultCurrency', where);
    if (!CURRENCY_CODE.test(c)) fail(where, 'have an invalid default currency');
    s.defaultCurrency = c;
  }
  if ('appLockEnabled' in o) s.appLockEnabled = bool(o, 'appLockEnabled', where);
  if ('dailyReminderEnabled' in o) s.dailyReminderEnabled = bool(o, 'dailyReminderEnabled', where);
  if ('milestoneNotificationsEnabled' in o) s.milestoneNotificationsEnabled = bool(o, 'milestoneNotificationsEnabled', where);
  if ('hapticsEnabled' in o) s.hapticsEnabled = bool(o, 'hapticsEnabled', where);
  if ('weekStartsOn' in o) {
    if (o.weekStartsOn !== 0 && o.weekStartsOn !== 1) fail(where, 'have an invalid week start');
    s.weekStartsOn = o.weekStartsOn;
  }
  if ('dailyReminderTime' in o) {
    const t = item(o.dailyReminderTime, 'Reminder time');
    const time: ReminderTime = {
      hour: num(t, 'hour', 'Reminder time', { min: 0, max: 23, int: true }),
      minute: num(t, 'minute', 'Reminder time', { min: 0, max: 59, int: true }),
    };
    s.dailyReminderTime = time;
  }
  // An import always happens from inside the app, so never send the user back to onboarding.
  s.onboardingCompleted = true;
  return s;
}

function numberRecord(raw: unknown, where: string): Record<string, number> {
  if (raw == null) return {};
  const o = item(raw, where);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(where, `has an invalid entry “${k}”`);
    out[k] = v;
  }
  return out;
}

function parseUnlocks(raw: unknown): Unlocks {
  if (raw == null) return { achievements: {}, certificates: {}, celebrated: {} };
  const o = item(raw, 'Unlocks');
  const celebrated: Record<string, true> = {};
  if (o.celebrated != null) {
    for (const [k, v] of Object.entries(item(o.celebrated, 'Celebrations'))) {
      if (v !== true) fail('Celebrations', `have an invalid entry “${k}”`);
      celebrated[k] = true;
    }
  }
  return {
    achievements: numberRecord(o.achievements, 'Achievements'),
    certificates: numberRecord(o.certificates, 'Certificates'),
    celebrated,
  };
}

/**
 * Strictly validate a backup (raw JSON text or an already-parsed value).
 * Returns sanitized data containing only known fields, ready for `replaceAll`.
 */
export function parseBackup(json: unknown): ParseResult {
  let value: unknown = json;
  if (typeof json === 'string') {
    if (json.length > MAX_BACKUP_BYTES) return { ok: false, error: 'This file is too large to be a Quit backup.' };
    if (!json.trim()) return { ok: false, error: 'This file is empty.' };
    try {
      value = JSON.parse(json);
    } catch {
      return { ok: false, error: 'This file isn’t valid JSON. Choose a backup exported from Quit.' };
    }
  }
  if (!isObj(value)) return { ok: false, error: 'This doesn’t look like a Quit backup.' };
  if (!('habits' in value) || !('settings' in value)) return { ok: false, error: 'This doesn’t look like a Quit backup — it has no habits or settings.' };

  const version = value.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'This backup has no valid version number.' };
  }
  if (version > STATE_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Quit. Update the app and try again.' };
  }

  try {
    const habits = array(value, 'habits').map(parseHabit);
    uniqueIds(habits, 'Habit');
    const habitIds = new Set(habits.map((h) => h.id));
    const relapses = array(value, 'relapses').map((r, i) => parseRelapse(r, i, habitIds));
    uniqueIds(relapses, 'Relapse');
    const journal = array(value, 'journal').map((j, i) => parseJournal(j, i, habitIds));
    uniqueIds(journal, 'Journal entry');
    const sosSessions = array(value, 'sosSessions').map((s, i) => parseSos(s, i, habitIds));
    uniqueIds(sosSessions, 'SOS session');
    const settings = parseSettings(value.settings);
    const unlocks = parseUnlocks(value.unlocks);

    const exported = typeof value.exportedAt === 'string' ? Date.parse(value.exportedAt) : NaN;
    return {
      ok: true,
      data: { version: STATE_VERSION, habits, relapses, journal, sosSessions, settings, unlocks },
      exportedAt: Number.isFinite(exported) ? exported : null,
    };
  } catch (e) {
    if (e instanceof BackupError) return { ok: false, error: `This backup is damaged: ${e.message}` };
    return { ok: false, error: 'This backup could not be read.' };
  }
}
