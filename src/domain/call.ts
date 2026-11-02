import { lowestOf } from './checkin';
import { addDays, datesBetween } from './dates';
import { counterStart } from './streak';
import type { CallWindow, DayLog, LocalDate, Settings } from './types';

/** Before the first ever call, the window covers at most this many days (ending yesterday). */
export const FIRST_CALL_MAX_DAYS = 14;

/**
 * Partner-call window (docs/ARCHITECTURE.md, "Partner call"). The daily log records finished
 * days, so the window ends YESTERDAY; the user tells their partner about today so far out loud.
 * - after a call: from the last checked-in day (inclusive: that call only covered the day up
 *   to the call, and its finished color is logged later) through yesterday;
 * - empty when today is already checked in;
 * - before the first ever call it starts where the counter started at install
 *   (domain/streak.ts counterStart, else today), capped to the 14 days ending yesterday;
 * - empty when the start is after yesterday (e.g. the first call on install day).
 * Unlogged days are listed too (color null).
 */
export function callWindow(
  days: DayLog[],
  settings: Pick<Settings, 'installDate'>,
  today: LocalDate,
): CallWindow {
  const byDate = new Map<LocalDate, DayLog>();
  let lastCallDate: LocalDate | null = null;
  for (const day of days) {
    byDate.set(day.date, day);
    if (day.checkedIn && day.date <= today && (lastCallDate === null || day.date > lastCallDate)) {
      lastCallDate = day.date;
    }
  }

  const checkedInToday = lastCallDate === today;
  if (checkedInToday) {
    return { lastCallDate, checkedInToday, days: [], lowest: null, unloggedDates: [] };
  }

  const yesterday = addDays(today, -1);
  let start: LocalDate;
  if (lastCallDate !== null) {
    start = lastCallDate;
  } else {
    start = counterStart(days, settings.installDate, today) ?? today;
    const cap = addDays(yesterday, -(FIRST_CALL_MAX_DAYS - 1));
    if (start < cap) start = cap;
  }

  // datesBetween is empty when start > yesterday.
  const windowDays: CallWindow['days'] = datesBetween(start, yesterday).map((date) => ({
    date,
    color: byDate.get(date)?.color ?? null,
  }));

  return {
    lastCallDate,
    checkedInToday,
    days: windowDays,
    lowest: lowestOf(windowDays.map((d) => d.color)),
    unloggedDates: windowDays.filter((d) => d.color === null).map((d) => d.date),
  };
}

/**
 * True when the next call covers `date` (it is one of callWindow's days). Never true for
 * today; true for the last call day when that is before today.
 */
export function inCallWindow(
  days: DayLog[],
  settings: Pick<Settings, 'installDate'>,
  today: LocalDate,
  date: LocalDate,
): boolean {
  return callWindow(days, settings, today).days.some((d) => d.date === date);
}
