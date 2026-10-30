import { lowestOf } from './checkin';
import { addDays, datesBetween } from './dates';
import type { CallWindow, DayLog, LocalDate, Settings } from './types';

/** Before the first ever call, the window covers at most this many days (today included). */
export const FIRST_CALL_MAX_DAYS = 14;

/**
 * Partner-call window (docs/ARCHITECTURE.md, "Partner call"):
 * - window = every day after the last checked-in day, through today;
 * - empty when today is already checked in;
 * - before the first ever call it starts at counterStartDate (or installDate,
 *   or today), capped to the last 14 days.
 */
export function callWindow(
  days: DayLog[],
  settings: Pick<Settings, 'counterStartDate' | 'installDate'>,
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

  let start: LocalDate;
  if (lastCallDate !== null) {
    start = addDays(lastCallDate, 1);
  } else {
    start = settings.counterStartDate ?? settings.installDate ?? today;
    const cap = addDays(today, -(FIRST_CALL_MAX_DAYS - 1));
    if (start < cap) start = cap;
    if (start > today) start = today;
  }

  const windowDays: CallWindow['days'] = datesBetween(start, today).map((date) => ({
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
