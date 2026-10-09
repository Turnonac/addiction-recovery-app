export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
/** Average month length used for display ("1mo 28d"). */
export const MONTH = 30 * DAY;
export const YEAR = 365 * DAY;

export interface Breakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Split a non-negative duration into whole days / hours / minutes / seconds. */
export function breakdown(ms: number): Breakdown {
  const safe = Math.max(0, Math.floor(ms));
  const days = Math.floor(safe / DAY);
  const hours = Math.floor((safe % DAY) / HOUR);
  const minutes = Math.floor((safe % HOUR) / MINUTE);
  const seconds = Math.floor((safe % MINUTE) / SECOND);
  return { days, hours, minutes, seconds };
}

/** Whole days contained in a duration (floored, never negative). */
export function wholeDays(ms: number): number {
  return Math.max(0, Math.floor(ms / DAY));
}

/** Fractional days in a duration (never negative). */
export function fractionalDays(ms: number): number {
  return Math.max(0, ms / DAY);
}

/** Local-midnight timestamp for the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local-midnight timestamp of the first day of the week containing `ts`. */
export function startOfWeek(ts: number, weekStartsOn: 0 | 1 = 1): number {
  const d = new Date(startOfDay(ts));
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

/** Add whole calendar days in local time (DST-safe). */
export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** True if two timestamps fall on the same local calendar day. */
export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}
