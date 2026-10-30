import { z } from 'zod';

import { isValidLocalDate } from './dates';
import { RED, type AppSnapshot, type BackupFileV2, type Behavior, type DayLog, type LocalDate, type Settings } from './types';

/** Format id written by every new export. */
export const BACKUP_FORMAT = 'light2life-backup';
/** Format id of files exported under the old working name (schemaVersion 1 only); still imported. */
export const LEGACY_BACKUP_FORMAT = 'walkinlight-backup';
/** Written by every export. Version 1 files (with settings.counterStartDate) still import. */
export const BACKUP_SCHEMA_VERSION = 2;

const LocalDateSchema = z.string().refine(isValidLocalDate, { message: 'Invalid date' });
const IsoInstantSchema = z.iso.datetime({ offset: true });
const ColorLevelSchema = z.literal([0, 1, 2, 3]);

const DayLogSchema = z.object({
  date: LocalDateSchema,
  color: ColorLevelSchema.nullable(),
  checkedIn: z.boolean(),
});

const BehaviorSchema = z.object({
  id: z.number().int().nonnegative(),
  color: ColorLevelSchema,
  text: z.string().trim().min(1),
  sortOrder: z.number().int(),
});

const SettingsSchema = z.object({
  partner: z.object({ name: z.string(), phone: z.string() }).nullable(),
  reminder: z.object({
    enabled: z.boolean(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  installDate: LocalDateSchema.nullable(),
  onboardingDone: z.boolean(),
  lastExportAt: IsoInstantSchema.nullable(),
});

/** Day dates and behavior ids must be unique. */
function checkUnique(file: { days: DayLog[]; behaviors: Behavior[] }, ctx: z.RefinementCtx): void {
    const dates = new Set<string>();
    file.days.forEach((day, i) => {
      if (dates.has(day.date)) {
        ctx.addIssue({ code: 'custom', message: 'Duplicate day', path: ['days', i, 'date'] });
      }
      dates.add(day.date);
    });
    const ids = new Set<number>();
    file.behaviors.forEach((behavior, i) => {
      if (ids.has(behavior.id)) {
        ctx.addIssue({ code: 'custom', message: 'Duplicate behavior id', path: ['behaviors', i, 'id'] });
      }
      ids.add(behavior.id);
    });
}

/**
 * Backup file, version 2. Strict about types (no coercion), validates dates,
 * color range, reminder time, and that day dates and behavior ids are unique.
 * Unknown keys are dropped.
 */
export const BackupSchemaV2 = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    exportedAt: IsoInstantSchema,
    days: z.array(DayLogSchema),
    behaviors: z.array(BehaviorSchema),
    settings: SettingsSchema,
  })
  .superRefine(checkUnique);

/** Version 1: the same rules, either format id, plus settings.counterStartDate. */
export const BackupSchemaV1 = z
  .object({
    format: z.literal([BACKUP_FORMAT, LEGACY_BACKUP_FORMAT]),
    schemaVersion: z.literal(1),
    exportedAt: IsoInstantSchema,
    days: z.array(DayLogSchema),
    behaviors: z.array(BehaviorSchema),
    settings: SettingsSchema.extend({ counterStartDate: LocalDateSchema.nullable() }),
  })
  .superRefine(checkUnique);

// Compile-time check: the schema's output must fit the shared BackupFileV2 type.
const schemaMatchesType: (file: z.output<typeof BackupSchemaV2>) => BackupFileV2 = (file) => file;
void schemaMatchesType;

export interface BackupSummary {
  dayCount: number;
  firstDate: LocalDate | null;
  lastDate: LocalDate | null;
  partnerName: string | null;
}

export type ParseBackupResult =
  | { ok: true; snapshot: AppSnapshot; summary: BackupSummary }
  | { ok: false; error: 'not-a-backup' | 'newer-version' | 'invalid' };

function copyDays(days: DayLog[]): DayLog[] {
  return days
    .map(({ date, color, checkedIn }) => ({ date, color, checkedIn }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function copyBehaviors(behaviors: Behavior[]): Behavior[] {
  return behaviors.map(({ id, color, text, sortOrder }) => ({ id, color, text, sortOrder }));
}

function copySettings(s: Settings): Settings {
  return {
    partner: s.partner === null ? null : { name: s.partner.name, phone: s.partner.phone },
    reminder: { enabled: s.reminder.enabled, hour: s.reminder.hour, minute: s.reminder.minute },
    installDate: s.installDate,
    onboardingDone: s.onboardingDone,
    lastExportAt: s.lastExportAt,
  };
}

/** The file written on export. Days are sorted by date; the snapshot is copied as-is. */
export function buildBackup(snapshot: AppSnapshot, exportedAt: string): BackupFileV2 {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    days: copyDays(snapshot.days),
    behaviors: copyBehaviors(snapshot.behaviors),
    settings: copySettings(snapshot.settings),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The later of two ISO instants (compared as instants, so offsets are handled). */
function laterInstant(a: string, b: string | null): string {
  return b !== null && Date.parse(b) > Date.parse(a) ? b : a;
}

/**
 * Version 1 kept onboarding's counter start in settings.counterStartDate. A start before
 * installDate was "My last Red day was…": that day becomes Red, unless it already has a
 * color. A start on installDate was "Start counting today", which installDate already says.
 */
function daysFromV1(days: DayLog[], counterStartDate: LocalDate | null, installDate: LocalDate | null): DayLog[] {
  if (counterStartDate === null || installDate === null || counterStartDate >= installDate) return days;
  const existing = days.find((d) => d.date === counterStartDate);
  if (existing !== undefined && existing.color !== null) return days;
  return [
    ...days.filter((d) => d.date !== counterStartDate),
    { date: counterStartDate, color: RED, checkedIn: existing?.checkedIn ?? false },
  ];
}

/**
 * Validate an imported (already JSON-parsed) value.
 * - not an object, or `format` is neither ours nor the legacy id → 'not-a-backup'
 * - our format with a schemaVersion above 2 → 'newer-version'
 * - anything else that fails its version's schema → 'invalid' (including a legacy-id
 *   file that is not schemaVersion 1: the legacy id was never written with another version)
 * Day rows with no color and no check-in are dropped (they are never stored).
 * A version 1 file's "My last Red day was…" start becomes that day's Red (see daysFromV1).
 * The file is itself a backup made at `exportedAt` (its settings were saved just
 * before that export was recorded), so the restored `lastExportAt` is the later
 * of the two.
 */
export function parseBackup(input: unknown): ParseBackupResult {
  if (!isRecord(input) || (input.format !== BACKUP_FORMAT && input.format !== LEGACY_BACKUP_FORMAT)) {
    return { ok: false, error: 'not-a-backup' };
  }
  const version = input.schemaVersion;
  if (input.format === BACKUP_FORMAT && typeof version === 'number' && version > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: 'newer-version' };
  }

  let file: z.output<typeof BackupSchemaV2> | z.output<typeof BackupSchemaV1>;
  let fileDays: DayLog[];
  if (version === 1) {
    const result = BackupSchemaV1.safeParse(input);
    if (!result.success) return { ok: false, error: 'invalid' };
    file = result.data;
    fileDays = daysFromV1(file.days, file.settings.counterStartDate, file.settings.installDate);
  } else {
    const result = BackupSchemaV2.safeParse(input);
    if (!result.success) return { ok: false, error: 'invalid' };
    file = result.data;
    fileDays = file.days;
  }

  const days = copyDays(fileDays).filter((d) => d.color !== null || d.checkedIn);
  const settings = copySettings(file.settings);
  settings.lastExportAt = laterInstant(file.exportedAt, settings.lastExportAt);
  const snapshot: AppSnapshot = {
    days,
    behaviors: copyBehaviors(file.behaviors),
    settings,
  };
  return {
    ok: true,
    snapshot,
    summary: {
      dayCount: days.length,
      firstDate: days[0]?.date ?? null,
      lastDate: days.at(-1)?.date ?? null,
      partnerName: snapshot.settings.partner?.name ?? null,
    },
  };
}

/** Discreet export file name, e.g. 'daily-backup-2026-10-29.json'. */
export function backupFileName(today: LocalDate): string {
  return `daily-backup-${today}.json`;
}
