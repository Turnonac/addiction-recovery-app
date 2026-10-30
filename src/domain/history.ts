import { addDays, datesBetween, dayOfWeek, daysInMonth, diffDays, isValidLocalDate, toLocalDate } from './dates';
import type { ColorLevel, DayLog, LocalDate } from './types';

/** Days between exports (or since install) before Today shows the backup reminder. */
export const BACKUP_NUDGE_DAYS = 30;

export interface MonthSummary {
  /** Logged colors in the month, on or before today. */
  counts: Record<ColorLevel, number>;
  /** Checked-in days among the eligible days. */
  checkIns: number;
  /** Days from max(monthStart, installDate) through yesterday, plus today if checked in. */
  eligibleDays: number;
}

export interface WeekStripDay {
  date: LocalDate;
  color: ColorLevel | null;
  checkedIn: boolean;
  isToday: boolean;
  /** Before installDate: a missing call there is not a missed call. */
  beforeInstall: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function monthStart(year: number, month1to12: number): LocalDate {
  return `${String(year).padStart(4, '0')}-${pad2(month1to12)}-01`;
}

function monthEnd(year: number, month1to12: number): LocalDate {
  return `${String(year).padStart(4, '0')}-${pad2(month1to12)}-${pad2(daysInMonth(year, month1to12))}`;
}

function indexByDate(days: DayLog[]): Map<LocalDate, DayLog> {
  const map = new Map<LocalDate, DayLog>();
  for (const day of days) map.set(day.date, day);
  return map;
}

function maxDate(a: LocalDate, b: LocalDate | null): LocalDate {
  return b !== null && b > a ? b : a;
}

/** Month cells, Sunday first, padded with null to full weeks. */
export function monthGrid(year: number, month1to12: number): (LocalDate | null)[] {
  const first = monthStart(year, month1to12);
  const cells: (LocalDate | null)[] = Array.from({ length: dayOfWeek(first) }, () => null);
  cells.push(...datesBetween(first, monthEnd(year, month1to12)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Color totals and check-in stats for one month.
 * - counts: every logged color in the month dated on or before today
 *   (including backfilled days before installDate), so the totals match the calendar.
 * - eligibleDays: days from max(monthStart, installDate) through yesterday,
 *   plus today if today is checked in. checkIns is counted over the same days.
 */
export function monthSummary(
  days: DayLog[],
  year: number,
  month1to12: number,
  today: LocalDate,
  installDate: LocalDate | null,
): MonthSummary {
  const first = monthStart(year, month1to12);
  const last = monthEnd(year, month1to12);
  const byDate = indexByDate(days);

  const counts: Record<ColorLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const day of byDate.values()) {
    if (day.color !== null && day.date >= first && day.date <= last && day.date <= today) {
      counts[day.color] += 1;
    }
  }

  const start = maxDate(first, installDate);
  const yesterday = addDays(today, -1);
  const end = yesterday < last ? yesterday : last;
  const eligible = datesBetween(start, end);
  if (today >= start && today <= last && byDate.get(today)?.checkedIn === true) {
    eligible.push(today);
  }

  const checkIns = eligible.filter((date) => byDate.get(date)?.checkedIn === true).length;
  return { counts, checkIns, eligibleDays: eligible.length };
}

/**
 * Past days with no color, oldest first: yesterday back to
 * max(installDate, today - limit). Today is never included.
 */
export function recentUnloggedDates(
  days: DayLog[],
  installDate: LocalDate | null,
  today: LocalDate,
  limit = 7,
): LocalDate[] {
  if (limit < 1) return [];
  const byDate = indexByDate(days);
  const start = maxDate(addDays(today, -Math.floor(limit)), installDate);
  return datesBetween(start, addDays(today, -1)).filter(
    (date) => (byDate.get(date)?.color ?? null) === null,
  );
}

/** The last 7 days ending today, oldest first. */
export function weekStrip(
  days: DayLog[],
  today: LocalDate,
  installDate: LocalDate | null = null,
): WeekStripDay[] {
  const byDate = indexByDate(days);
  return datesBetween(addDays(today, -6), today).map((date) => {
    const day = byDate.get(date);
    return {
      date,
      color: day?.color ?? null,
      checkedIn: day?.checkedIn ?? false,
      isToday: date === today,
      beforeInstall: installDate !== null && date < installDate,
    };
  });
}

/**
 * True if never exported and installed ≥ 30 days ago, or the last export
 * (an ISO instant, read as a local calendar day) was ≥ 30 days ago.
 */
export function backupNudgeDue(
  lastExportAt: string | null,
  installDate: LocalDate | null,
  today: LocalDate,
): boolean {
  const exported = lastExportAt === null ? null : new Date(lastExportAt);
  if (exported !== null && !Number.isNaN(exported.getTime())) {
    return diffDays(toLocalDate(exported), today) >= BACKUP_NUDGE_DAYS;
  }
  if (installDate === null || !isValidLocalDate(installDate)) return false;
  return diffDays(installDate, today) >= BACKUP_NUDGE_DAYS;
}
