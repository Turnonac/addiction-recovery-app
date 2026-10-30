/**
 * Shared types for Light2Life. Every module (domain, data, state, services, UI)
 * builds against these. Change them only with a matching update to
 * docs/ARCHITECTURE.md.
 */

/** Calendar day in the device's local time zone, formatted 'YYYY-MM-DD'. */
export type LocalDate = string;

/**
 * Severity of a day's lowest moment. Higher is worse, so the day's
 * "lowest color" is the MAX level logged that day.
 *   0 Green  = recovery-oriented actions
 *   1 Blue   = careless about avoiding Red
 *   2 Yellow = actions that move toward Red
 *   3 Red    = viewed anything explicit (resets the counter)
 */
export type ColorLevel = 0 | 1 | 2 | 3;

export const GREEN: ColorLevel = 0;
export const BLUE: ColorLevel = 1;
export const YELLOW: ColorLevel = 2;
export const RED: ColorLevel = 3;

export const COLOR_LEVELS: readonly ColorLevel[] = [GREEN, BLUE, YELLOW, RED];

export const COLOR_NAMES: Record<ColorLevel, string> = {
  0: 'Green',
  1: 'Blue',
  2: 'Yellow',
  3: 'Red',
};

/** Fixed meaning of each color. Not editable by the user. */
export const COLOR_MEANINGS: Record<ColorLevel, string> = {
  0: 'Recovery-oriented actions',
  1: 'Careless about avoiding Red',
  2: 'Actions that move toward Red',
  3: 'Viewed anything explicit',
};

/** Red's first behavior line. Always shown, never stored, never editable. */
export const LOCKED_RED_LINE = 'Viewing anything explicit';

/**
 * One row per local day the user has touched. A missing day = unlogged.
 * These two fields are the only per-day data the owner wants stored.
 */
export interface DayLog {
  date: LocalDate;
  /** Lowest color of the day, or null if a call was marked but no color logged yet. */
  color: ColorLevel | null;
  /** Whether the user checked in (talked) with their partner that day. */
  checkedIn: boolean;
}

/** A user-written behavior under one color (Red's locked line is NOT stored here). */
export interface Behavior {
  id: number;
  color: ColorLevel;
  text: string;
  sortOrder: number;
}

export interface Partner {
  name: string;
  /** Saved and dialed exactly as typed or picked. */
  phone: string;
}

export interface Reminder {
  enabled: boolean;
  /** 0-23 local time */
  hour: number;
  /** 0-59 */
  minute: number;
}

export interface Settings {
  partner: Partner | null;
  reminder: Reminder;
  /**
   * Anchor for the clean-day counter before any Red is logged
   * ("My last Red day was…" / "Start counting today"). Set in onboarding.
   */
  counterStartDate: LocalDate | null;
  /** Day onboarding finished; History treats earlier days as before-install. */
  installDate: LocalDate | null;
  onboardingDone: boolean;
  /** ISO-8601 instant of the last successful export, for the 30-day reminder card. */
  lastExportAt: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  partner: null,
  reminder: { enabled: false, hour: 21, minute: 0 },
  counterStartDate: null,
  installDate: null,
  onboardingDone: false,
  lastExportAt: null,
};

/** Everything the app stores. Used for load, export/import and tests. */
export interface AppSnapshot {
  days: DayLog[];
  behaviors: Behavior[];
  settings: Settings;
}

/** Result of computing the partner-call window (see domain/call.ts). */
export interface CallWindow {
  /** Most recent day with checkedIn = true, on or before today; null if never. */
  lastCallDate: LocalDate | null;
  /** True when today is already checked in (window is then empty). */
  checkedInToday: boolean;
  /** Days in the window, oldest first, each with its color (null = unlogged). */
  days: { date: LocalDate; color: ColorLevel | null }[];
  /** Lowest (max severity) color among logged days in the window; null if none logged. */
  lowest: ColorLevel | null;
  /** Window days that have no color yet, oldest first. */
  unloggedDates: LocalDate[];
}

/** Outcome of asking to set a day's color (see domain/checkin.ts). */
export type SetColorOutcome =
  | {
      kind: 'saved';
      day: DayLog;
      /** The day was checked in with a color, then got a worse one: the partner hasn't heard it. */
      worseAfterCall: boolean;
      /** worseAfterCall on today: today's check-in was cleared so the next call covers it again. */
      clearedCheckIn: boolean;
      /** The day just became Red (it was not Red before). */
      becameRed: boolean;
    }
  | {
      /** Requested color is better than the stored one: confirm it was a mistake first. */
      kind: 'needsConfirmBetter';
      current: ColorLevel;
      requested: ColorLevel;
    }
  | { kind: 'rejectedFuture' };

/**
 * Backup format id. New files use 'light2life-backup'. Files exported under the
 * old working name carry 'walkinlight-backup' (same version 1 shape) and still import.
 */
export type BackupFormat = 'light2life-backup' | 'walkinlight-backup';

/** Backup file format, version 1. Validated with zod in domain/backup.ts. */
export interface BackupFileV1 {
  format: BackupFormat;
  schemaVersion: 1;
  exportedAt: string;
  days: DayLog[];
  behaviors: Behavior[];
  settings: Settings;
}
