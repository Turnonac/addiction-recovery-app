import { lowestOf } from './checkin';
import { addDays, datesBetween } from './dates';
import type { CallWindow, DayLog, LocalDate, PendingShare, SetColorOutcome, Settings } from './types';

/** Most recent checked-in day on or before today; null if never. */
function lastCall(days: DayLog[], today: LocalDate): LocalDate | null {
  let last: LocalDate | null = null;
  for (const day of days) {
    if (day.checkedIn && day.date <= today && (last === null || day.date > last)) last = day.date;
  }
  return last;
}

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
  for (const day of days) byDate.set(day.date, day);
  const lastCallDate = lastCall(days, today);

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

/** True when the next call covers `date` (it is one of callWindow's days). */
export function inCallWindow(
  days: DayLog[],
  settings: Pick<Settings, 'counterStartDate' | 'installDate'>,
  today: LocalDate,
  date: LocalDate,
): boolean {
  return callWindow(days, settings, today).days.some((d) => d.date === date);
}

/** No call has happened since `share` was logged (a call on a day after `since` shared it). */
function stillPending(share: PendingShare, lastCallDate: LocalDate | null): boolean {
  return lastCallDate === null || (share.since !== null && lastCallDate <= share.since);
}

/**
 * A just-saved color the next call won't cover on its own, so it waits for that
 * call: the day got worse after its call, or became Red with no call that day,
 * and is outside the window (`days` already include the saved day).
 */
export function needsLaterShare(
  outcome: SetColorOutcome,
  days: DayLog[],
  settings: Pick<Settings, 'counterStartDate' | 'installDate'>,
  today: LocalDate,
  date: LocalDate,
): boolean {
  if (outcome.kind !== 'saved') return false;
  const late = outcome.worseAfterCall || (outcome.becameRed && !outcome.day.checkedIn);
  return late && !inCallWindow(days, settings, today, date);
}

/** `pending` plus `date` (logged now), minus shares a call has covered since. Sorted by date. */
export function addPendingShare(
  pending: PendingShare[],
  days: DayLog[],
  today: LocalDate,
  date: LocalDate,
): PendingShare[] {
  const since = lastCall(days, today);
  return [...pending.filter((s) => s.date !== date && stillPending(s, since)), { date, since }].sort(
    (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0),
  );
}

/** Days the next call shares on top of its window, oldest first (none already in the window). */
export function sharesForNextCall(
  days: DayLog[],
  settings: Pick<Settings, 'counterStartDate' | 'installDate' | 'pendingShares'>,
  today: LocalDate,
): LocalDate[] {
  const window = callWindow(days, settings, today);
  const inWindow = new Set(window.days.map((d) => d.date));
  return settings.pendingShares
    .filter((s) => s.date <= today && !inWindow.has(s.date) && stillPending(s, window.lastCallDate))
    .map((s) => s.date);
}
