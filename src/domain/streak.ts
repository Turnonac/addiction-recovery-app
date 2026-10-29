import { diffDays } from './dates';
import { RED, type DayLog, type LocalDate } from './types';

/**
 * Clean-day counter rules (docs/ARCHITECTURE.md, "Counter" and "Best streak"):
 * - Counter = calendar days since the last Red (the Red day shows 0, the next day 1).
 * - Anchors = counterStartDate + every Red date ≤ today. The counter counts from
 *   the latest anchor, so before any Red it counts from counterStartDate.
 * - Unlogged days never reset anything; Reds dated after today are ignored.
 * - Best = max over every completed run (nextAnchor - anchor - 1) and the current streak.
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
function anchors(days: DayLog[], counterStartDate: LocalDate | null, today: LocalDate): LocalDate[] {
  const set = new Set(redDates(days, today));
  if (counterStartDate !== null) set.add(counterStartDate <= today ? counterStartDate : today);
  return [...set].sort();
}

/** Days since the latest anchor; null when there is no anchor at all. */
export function currentStreak(
  days: DayLog[],
  counterStartDate: LocalDate | null,
  today: LocalDate,
): number | null {
  const all = anchors(days, counterStartDate, today);
  const last = all.at(-1);
  return last === undefined ? null : diffDays(last, today);
}

/** Longest clean run, including the current one; null when there is no anchor at all. */
export function bestStreak(
  days: DayLog[],
  counterStartDate: LocalDate | null,
  today: LocalDate,
): number | null {
  const all = anchors(days, counterStartDate, today);
  const last = all.at(-1);
  if (last === undefined) return null;
  let best = diffDays(last, today);
  for (let i = 0; i + 1 < all.length; i++) {
    best = Math.max(best, diffDays(all[i], all[i + 1]) - 1);
  }
  return best;
}
