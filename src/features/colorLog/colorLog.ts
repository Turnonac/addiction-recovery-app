import { decideSetColor } from '@/domain/checkin';
import { bestStreak, currentStreak, streaksIfRed } from '@/domain/streak';
import type { ColorLevel, DayLog, LocalDate } from '@/domain/types';

/** The days as they would be after saving `color` for `date` without a confirmation. */
export function daysAfterColor(
  days: Record<LocalDate, DayLog>,
  date: LocalDate,
  color: ColorLevel,
  today: LocalDate,
): DayLog[] {
  const outcome = decideSetColor(days[date], date, color, {}, today);
  return Object.values(outcome.kind === 'saved' ? { ...days, [date]: outcome.day } : days);
}

function daysText(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/**
 * The color screen's Red note: the counter and best streak a Red on `date` would really
 * leave. Today: the counter restarts at 0, and best loses today if the current run was the
 * best one. A past day: a later Red keeps the counter; a split run can lower best; a Red
 * before installDate, with none on or before it yet, moves the counter's start back, so
 * both can go up. Saving changes only that day's color, so the other days stay.
 */
export function redNoteText(
  days: DayLog[],
  installDate: LocalDate | null,
  date: LocalDate,
  today: LocalDate,
): string {
  const after = streaksIfRed(days, installDate, date, today);
  // No counter yet shows as Day 0, and no best streak yet as 0.
  const now = currentStreak(days, installDate, today) ?? 0;
  const best = bestStreak(days, installDate, today) ?? 0;
  const counter =
    date === today
      ? 'Your counter restarts at 0.'
      : after.current === now
        ? `Your counter stays at ${daysText(after.current)}.`
        : after.current > now
          ? `Your counter now counts from that day: ${daysText(after.current)}.`
          : `Your counter goes back to ${daysText(after.current)}.`;
  const others = date === today ? 'Your history' : 'Your other days';
  return after.best === best
    ? `${counter} ${others} and best streak stay.`
    : `${counter} Your best streak becomes ${daysText(after.best)}. ${others} stay${date === today ? 's' : ''}.`;
}
