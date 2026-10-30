import { diffDays } from './dates';
import { RED, type DayLog, type LocalDate } from './types';

/**
 * Clean-day counter rules (docs/ARCHITECTURE.md, "Counter" and "Best streak").
 * Everything comes from the day log plus installDate:
 * - Anchors = every Red date ≤ today, plus installDate when no Red is on or before it.
 *   Onboarding's "My last Red day was…" is a Red day like any other.
 * - Counter = calendar days since the latest anchor (a Red day shows 0, the next day 1).
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

/** The latest Red day in the log at any date (during onboarding: the last Red day it saved). */
export function latestRed(days: DayLog[]): LocalDate | null {
  let latest: LocalDate | null = null;
  for (const day of days) {
    if (day.color === RED && (latest === null || day.date > latest)) latest = day.date;
  }
  return latest;
}

/**
 * Where the counter started at install: the latest Red on or before installDate,
 * else installDate itself; null when neither exists. An installDate after today
 * (e.g. the phone moved to an earlier time zone) is treated as today.
 */
export function counterStart(days: DayLog[], installDate: LocalDate | null, today: LocalDate): LocalDate | null {
  if (installDate === null) return null;
  const install = installDate <= today ? installDate : today;
  const before = redDates(days, install);
  return before.at(-1) ?? install;
}

/** Sorted unique anchors. */
function anchors(days: DayLog[], installDate: LocalDate | null, today: LocalDate): LocalDate[] {
  const set = new Set(redDates(days, today));
  const start = counterStart(days, installDate, today);
  if (start !== null) set.add(start);
  return [...set].sort();
}

/** Days since the latest anchor; null when there is no anchor at all. */
export function currentStreak(days: DayLog[], installDate: LocalDate | null, today: LocalDate): number | null {
  const last = anchors(days, installDate, today).at(-1);
  return last === undefined ? null : diffDays(last, today);
}

/** Longest clean run, including the current one; null when there is no anchor at all. */
export function bestStreak(days: DayLog[], installDate: LocalDate | null, today: LocalDate): number | null {
  const all = anchors(days, installDate, today);
  const last = all.at(-1);
  if (last === undefined) return null;
  let best = diffDays(last, today);
  for (let i = 0; i + 1 < all.length; i++) {
    best = Math.max(best, diffDays(all[i], all[i + 1]) - 1);
  }
  return best;
}

/** Current and best streak as they would be with `date` logged Red (the color log's Red note). */
export function streaksIfRed(
  days: DayLog[],
  installDate: LocalDate | null,
  date: LocalDate,
  today: LocalDate,
): { current: number; best: number } {
  const withRed = [...days.filter((d) => d.date !== date), { date, color: RED, checkedIn: false }];
  return {
    current: currentStreak(withRed, installDate, today) ?? 0,
    best: bestStreak(withRed, installDate, today) ?? 0,
  };
}
