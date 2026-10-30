import { decideSetColor } from '@/domain/checkin';
import { bestStreak, currentStreak, streaksIfRed } from '@/domain/streak';
import { COLOR_NAMES, RED, type ColorLevel, type DayLog, type LocalDate } from '@/domain/types';

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

/**
 * The day screen's "Clear this day?" message: what clearing removes and, for a Red day, the
 * counter and best streak it leaves. Only Red days anchor them, so no other color moves them.
 */
export function clearDayText(
  days: DayLog[],
  installDate: LocalDate | null,
  date: LocalDate,
  today: LocalDate,
  partnerName: string,
): string {
  const day = days.find((d) => d.date === date);
  const parts: string[] = [];
  if (day !== undefined && day.color !== null) parts.push(`its color (${COLOR_NAMES[day.color]})`);
  if (day?.checkedIn) parts.push(`your check-in with ${partnerName}`);
  if (parts.length === 0) return 'Nothing is saved for this day.';
  const removed = `This removes ${parts.join(' and ')}. The day goes back to not logged.`;
  if (day?.color !== RED) return removed;

  const others = days.filter((d) => d.date !== date);
  // No counter yet shows as Day 0, and no best streak yet as 0 (as in the Red note).
  const now = currentStreak(days, installDate, today) ?? 0;
  const after = currentStreak(others, installDate, today) ?? 0;
  const best = bestStreak(days, installDate, today) ?? 0;
  const afterBest = bestStreak(others, installDate, today) ?? 0;
  const counter =
    after === now ? `Your counter stays at ${daysText(after)}.` : `Your counter becomes ${daysText(after)}.`;
  const bestLine =
    afterBest === best
      ? `Your best streak stays at ${daysText(best)}.`
      : `Your best streak becomes ${daysText(afterBest)}.`;
  return `${removed} ${counter} ${bestLine}`;
}
