import { diffDays } from './dates';
import { RED, type DayLog, type LocalDate } from './types';

/**
 * Clean-day counter rules (docs/ARCHITECTURE.md, "Counter" and "Best streak"):
 * - Counter = calendar days since the last Red (the Red day shows 0, the next day 1).
 * - Anchors = counterStartDate + every Red date ≤ today. The counter counts from
 *   the latest anchor, so before any Red it counts from counterStartDate.
 * - Unlogged days never reset anything; Reds dated after today are ignored.
 * - Best = max over every completed run (nextAnchor - anchor - 1) and the current streak.
 *   A run is completed only when a Red ends it: counterStartDate is not a Red, so the
 *   untracked gap from an earlier Red up to it is not a clean run.
 */

/** Red dates on or before today, ascending, unique. */
export function redDates(days: DayLog[], today: LocalDate): LocalDate[] {
  const set = new Set<LocalDate>();
  for (const day of days) {
    if (day.color === RED && day.date <= today) set.add(day.date);
  }
  return [...set].sort();
}

/**
 * Sorted unique anchors. A counterStartDate after today (e.g. the phone moved
 * to an earlier time zone) is clamped to today so the counter shows 0.
 */
function anchors(reds: LocalDate[], counterStartDate: LocalDate | null, today: LocalDate): LocalDate[] {
  const set = new Set(reds);
  if (counterStartDate !== null) set.add(counterStartDate <= today ? counterStartDate : today);
  return [...set].sort();
}

/** Days since the latest anchor; null when there is no anchor at all. */
export function currentStreak(
  days: DayLog[],
  counterStartDate: LocalDate | null,
  today: LocalDate,
): number | null {
  const all = anchors(redDates(days, today), counterStartDate, today);
  const last = all.at(-1);
  return last === undefined ? null : diffDays(last, today);
}

/** Longest clean run, including the current one; null when there is no anchor at all. */
export function bestStreak(
  days: DayLog[],
  counterStartDate: LocalDate | null,
  today: LocalDate,
): number | null {
  const reds = redDates(days, today);
  const isRed = new Set(reds);
  const all = anchors(reds, counterStartDate, today);
  const last = all.at(-1);
  if (last === undefined) return null;
  let best = diffDays(last, today);
  for (let i = 0; i + 1 < all.length; i++) {
    if (isRed.has(all[i + 1])) best = Math.max(best, diffDays(all[i], all[i + 1]) - 1);
  }
  return best;
}

/** Current and best streak as they would be with `date` logged Red (the check-in's Red note). */
export function streaksIfRed(
  days: DayLog[],
  counterStartDate: LocalDate | null,
  date: LocalDate,
  today: LocalDate,
): { current: number; best: number } {
  const withRed = [...days.filter((d) => d.date !== date), { date, color: RED, checkedIn: false }];
  return {
    current: currentStreak(withRed, counterStartDate, today) ?? 0,
    best: bestStreak(withRed, counterStartDate, today) ?? 0,
  };
}
