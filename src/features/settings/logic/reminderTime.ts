import type { ReminderTime } from '@/types';
import { pad2 } from '@/utils/format';

/** Minute step used by the reminder time picker. */
export const MINUTE_STEP = 5;

/** Quick choices shown under the picker. */
export const REMINDER_PRESETS: ReminderTime[] = [
  { hour: 8, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 18, minute: 0 },
  { hour: 21, minute: 0 },
];

/** "09:00" */
export function formatReminderTime(t: ReminderTime): string {
  return `${pad2(t.hour)}:${pad2(t.minute)}`;
}

/** Hour +/- delta, wrapping around midnight. */
export function stepHour(hour: number, delta: number): number {
  return (((Math.round(hour) + delta) % 24) + 24) % 24;
}

/**
 * Minute +/- one `step`, snapping to the step grid first (07 +5 → 10, 07 -5 → 05)
 * and wrapping within the hour.
 */
export function stepMinute(minute: number, delta: 1 | -1, step: number = MINUTE_STEP): number {
  const m = Math.round(minute);
  const onGrid = m % step === 0;
  let next: number;
  if (delta > 0) next = onGrid ? m + step : Math.ceil(m / step) * step;
  else next = onGrid ? m - step : Math.floor(m / step) * step;
  return ((next % 60) + 60) % 60;
}

export function sameTime(a: ReminderTime, b: ReminderTime): boolean {
  return a.hour === b.hour && a.minute === b.minute;
}

/** Friendly part of day for the picker caption. */
export function partOfDay(hour: number): string {
  if (hour < 5) return 'Night';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
}
