import { addDays, HOUR, MINUTE, startOfDay } from '@/domain/time';
import { formatDate, formatDurationShort, formatTime } from '@/utils/format';

/** One cell of a month grid. `ts` is local midnight of that calendar day. */
export interface CalendarCell {
  ts: number;
  day: number;
  /** False for the leading/trailing days that belong to the neighbouring months. */
  inMonth: boolean;
}

export const MONTH_NAMES = [
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
];

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * A fixed 6×7 grid for `month` (0-based) of `year`, starting on `weekStartsOn`
 * (0 = Sunday, 1 = Monday). Always six rows so the picker never changes height.
 */
export function buildMonthGrid(year: number, month: number, weekStartsOn: 0 | 1 = 1): CalendarCell[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const rows: CalendarCell[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: CalendarCell[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(first.getFullYear(), first.getMonth(), 1 - offset + r * 7 + c);
      row.push({
        ts: d.getTime(),
        day: d.getDate(),
        inMonth: d.getMonth() === first.getMonth() && d.getFullYear() === first.getFullYear(),
      });
    }
    rows.push(row);
  }
  return rows;
}

/** Single-letter weekday header in display order. */
export function weekdayLetters(weekStartsOn: 0 | 1 = 1): string[] {
  return rotate(WEEKDAY_LETTERS, weekStartsOn);
}

/** Full weekday names in display order (for accessibility labels). */
export function weekdayNames(weekStartsOn: 0 | 1 = 1): string[] {
  return rotate(WEEKDAY_NAMES, weekStartsOn);
}

function rotate<T>(list: T[], by: number): T[] {
  return [...list.slice(by), ...list.slice(0, by)];
}

/** "March 2026" */
export function monthTitle(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Move a (year, month) pair by `delta` months, normalising the year. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Clamp a timestamp to optional bounds. */
export function clampTs(ts: number, min?: number, max?: number): number {
  let v = ts;
  if (max != null && v > max) v = max;
  if (min != null && v < min) v = min;
  return v;
}

/** True when no moment of the calendar day containing `dayTs` lies within [min, max]. */
export function isDayDisabled(dayTs: number, min?: number, max?: number): boolean {
  const start = startOfDay(dayTs);
  const end = addDays(start, 1) - 1;
  return (max != null && start > max) || (min != null && end < min);
}

/** True when at least one moment of the month lies within [min, max]. */
export function isMonthSelectable(year: number, month: number, min?: number, max?: number): boolean {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime() - 1;
  return !((max != null && start > max) || (min != null && end < min));
}

/** Keep the time of `timeTs`, move it to the calendar day of `dayTs` (seconds dropped). */
export function combineDayAndTime(dayTs: number, timeTs: number): number {
  const t = new Date(timeTs);
  const d = new Date(dayTs);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.getTime();
}

/** Same calendar day, new hour/minute (seconds dropped). */
export function setTime(ts: number, hour: number, minute: number): number {
  const d = new Date(ts);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/** Drop seconds and milliseconds. */
function toMinute(ts: number): number {
  const d = new Date(ts);
  d.setSeconds(0, 0);
  return d.getTime();
}

/**
 * Step by `delta` hours of real time, crossing midnight into the neighbouring
 * day (00:10 −1 → 23:10 the day before), so "−" always moves earlier.
 */
export function stepHour(ts: number, delta: number): number {
  return toMinute(ts) + delta * HOUR;
}

/**
 * Step minutes to the next/previous multiple of `step`, carrying into the
 * neighbouring hour (14:43 +5 → 14:45, 14:43 −5 → 14:40, 14:55 +5 → 15:00,
 * 14:00 −5 → 13:55).
 */
export function stepMinute(ts: number, direction: 1 | -1, step = 5): number {
  const base = toMinute(ts);
  const m = new Date(base).getMinutes();
  const target = direction > 0 ? Math.floor(m / step) * step + step : Math.ceil(m / step) * step - step;
  return base + (target - m) * MINUTE;
}

/** Calendar-aware month arithmetic; clamps the day (31 Mar − 1 month → 28/29 Feb). */
export function addMonths(ts: number, delta: number): number {
  const d = new Date(ts);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTarget));
  return target.getTime();
}

export interface QuickOption {
  key: 'now' | 'yesterday' | 'week' | 'month';
  label: string;
  value: number;
}

/**
 * Quick-pick chips (Now, Yesterday, 1 week ago, 1 month ago) that fall within the
 * bounds. A small tolerance keeps "Now" available when `max` was captured a
 * moment before `now`; such values are clamped to `max`.
 */
export function quickOptions(now: number, min?: number, max?: number): QuickOption[] {
  const all: QuickOption[] = [
    { key: 'now', label: 'Now', value: now },
    { key: 'yesterday', label: 'Yesterday', value: addDays(now, -1) },
    { key: 'week', label: '1 week ago', value: addDays(now, -7) },
    { key: 'month', label: '1 month ago', value: addMonths(now, -1) },
  ];
  return all
    .filter((o) => (min == null || o.value >= min) && (max == null || o.value <= max + MINUTE))
    .map((o) => ({ ...o, value: clampTs(o.value, min, max) }));
}

/** "Today" / "Yesterday" / "Tomorrow" / "29 Mar 2026" */
export function dayLabel(ts: number, now: number): string {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / (24 * 60 * MINUTE));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return formatDate(ts);
}

/** Field text: "Today, 14:43" / "Yesterday, 09:00" / "29 Mar 2026, 14:43" (date mode drops the time). */
export function formatFieldValue(ts: number, now: number, mode: 'datetime' | 'date' = 'datetime'): string {
  const day = dayLabel(ts, now);
  return mode === 'date' ? day : `${day}, ${formatTime(ts)}`;
}

/** "Just now" / "29d 3h ago" / "in 2h 5m" */
export function relativeToNow(ts: number, now: number): string {
  const diff = now - ts;
  if (Math.abs(diff) < MINUTE) return 'Just now';
  return diff > 0 ? `${formatDurationShort(diff)} ago` : `in ${formatDurationShort(-diff)}`;
}

/** Calendar-day distance: "today" / "3 days ago" / "in 1 day". */
export function relativeDays(ts: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / (24 * 60 * MINUTE));
  if (days === 0) return 'today';
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return `in ${-days} ${days === -1 ? 'day' : 'days'}`;
}

/** Parse a typed hour ("7", "07", "23"); null when invalid. */
export function parseHour(text: string): number | null {
  return parseBounded(text, 23);
}

/** Parse a typed minute ("5", "05", "59"); null when invalid. */
export function parseMinute(text: string): number | null {
  return parseBounded(text, 59);
}

function parseBounded(text: string, max: number): number | null {
  const t = text.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= max ? n : null;
}
