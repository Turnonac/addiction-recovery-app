import { z } from 'zod';

import { isValidLocalDate } from './dates';
import type { AppSnapshot, BackupFileV1, Behavior, DayLog, LocalDate, Settings } from './types';

export const BACKUP_FORMAT = 'walkinlight-backup';
export const BACKUP_SCHEMA_VERSION = 1;

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
  counterStartDate: LocalDateSchema.nullable(),
  installDate: LocalDateSchema.nullable(),
  onboardingDone: z.boolean(),
  lastExportAt: IsoInstantSchema.nullable(),
});

/**
 * Backup file, version 1. Strict about types (no coercion), validates dates,
 * color range, reminder time, and that day dates and behavior ids are unique.
 * Unknown keys are dropped.
 */
export const BackupSchemaV1 = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    exportedAt: IsoInstantSchema,
    days: z.array(DayLogSchema),
    behaviors: z.array(BehaviorSchema),
    settings: SettingsSchema,
  })
  .superRefine((file, ctx) => {
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
  });

// Compile-time check: the schema's output must fit the shared BackupFileV1 type.
const schemaMatchesType: (file: z.output<typeof BackupSchemaV1>) => BackupFileV1 = (file) => file;
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
    counterStartDate: s.counterStartDate,
    installDate: s.installDate,
    onboardingDone: s.onboardingDone,
    lastExportAt: s.lastExportAt,
  };
}

/** The file written on export. Days are sorted by date; the snapshot is copied as-is. */
export function buildBackup(snapshot: AppSnapshot, exportedAt: string): BackupFileV1 {
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
 * Validate an imported (already JSON-parsed) value.
 * - not an object, or `format` is not ours → 'not-a-backup'
 * - our format with a schemaVersion above 1 → 'newer-version'
 * - anything else that fails the schema → 'invalid'
 * Day rows with no color and no check-in are dropped (they are never stored).
 * The file is itself a backup made at `exportedAt` (its settings were saved just
 * before that export was recorded), so the restored `lastExportAt` is the later
 * of the two.
 */
export function parseBackup(input: unknown): ParseBackupResult {
  if (!isRecord(input) || input.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'not-a-backup' };
  }
  const version = input.schemaVersion;
  if (typeof version === 'number' && version > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: 'newer-version' };
  }

  const result = BackupSchemaV1.safeParse(input);
  if (!result.success) return { ok: false, error: 'invalid' };

  const file = result.data;
  const days = copyDays(file.days).filter((d) => d.color !== null || d.checkedIn);
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
