import type { LocalDate } from './types';

/**
 * Local-date helpers. A LocalDate is a 'YYYY-MM-DD' calendar day in the
 * device's time zone. All day arithmetic goes through `dayNumber` (days since
 * 1970-01-01 computed in UTC), so DST changes can never add or drop a day.
 */

const DAY_MS = 86_400_000;
const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

interface DateParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in a month (month is 1..12). */
export function daysInMonth(year: number, month1to12: number): number {
  if (month1to12 === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month1to12) ? 30 : 31;
}

function parseParts(s: string): DateParts | null {
  if (typeof s !== 'string') return null;
  const m = LOCAL_DATE_RE.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function partsOrThrow(s: LocalDate): DateParts {
  const parts = parseParts(s);
  if (!parts) throw new RangeError(`Invalid local date: ${String(s)}`);
  return parts;
}

function formatParts({ year, month, day }: DateParts): LocalDate {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function fromDayNumber(n: number): LocalDate {
  const d = new Date(n * DAY_MS);
  return formatParts({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

/** Calendar day of `d` in the device's local time zone. */
export function toLocalDate(d: Date): LocalDate {
  return formatParts({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
}

/** Today in the device's local time zone. */
export function todayLocal(): LocalDate {
  return toLocalDate(new Date());
}

/** True for a real calendar day written exactly as 'YYYY-MM-DD'. */
export function isValidLocalDate(s: string): boolean {
  return parseParts(s) !== null;
}

/**
 * Whole days since 1970-01-01, equal to Date.UTC(y, m - 1, d) / 86400000.
 * Throws RangeError for a string that is not a valid LocalDate.
 */
export function dayNumber(s: LocalDate): number {
  const { year, month, day } = partsOrThrow(s);
  // setUTCFullYear avoids Date.UTC's 0..99 → 1900..1999 year mapping.
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return Math.round(d.getTime() / DAY_MS);
}

/** `s` shifted by `n` calendar days (n may be negative). */
export function addDays(s: LocalDate, n: number): LocalDate {
  if (!Number.isInteger(n)) throw new RangeError(`addDays expects a whole number, got ${n}`);
  return fromDayNumber(dayNumber(s) + n);
}

/** `to - from` in calendar days. */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return dayNumber(to) - dayNumber(from);
}

/** Sort comparator. Plain string comparison is correct for 'YYYY-MM-DD'. */
export function compareDates(a: LocalDate, b: LocalDate): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Every day from `start` through `end`, inclusive, oldest first; [] if start > end. */
export function datesBetween(start: LocalDate, end: LocalDate): LocalDate[] {
  const first = dayNumber(start);
  const last = dayNumber(end);
  const out: LocalDate[] = [];
  for (let n = first; n <= last; n++) out.push(fromDayNumber(n));
  return out;
}

/** Day of the week, 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(s: LocalDate): number {
  // 1970-01-01 (day 0) was a Thursday (4).
  return (((dayNumber(s) + 4) % 7) + 7) % 7;
}

/** 'Thursday, October 29' */
export function formatLong(s: LocalDate): string {
  const { month, day } = partsOrThrow(s);
  return `${WEEKDAY_NAMES[dayOfWeek(s)]}, ${MONTH_NAMES[month - 1]} ${day}`;
}

/** 'Wed, Oct 28' */
export function formatShort(s: LocalDate): string {
  const { month, day } = partsOrThrow(s);
  return `${WEEKDAY_NAMES[dayOfWeek(s)].slice(0, 3)}, ${MONTH_NAMES[month - 1].slice(0, 3)} ${day}`;
}

/** 'W' */
export function formatWeekdayLetter(s: LocalDate): string {
  return WEEKDAY_NAMES[dayOfWeek(s)].charAt(0);
}

/** 'October 2026' */
export function formatMonthYear(year: number, month1to12: number): string {
  const name = MONTH_NAMES[month1to12 - 1];
  if (name === undefined) throw new RangeError(`Invalid month: ${month1to12}`);
  return `${name} ${year}`;
}
