import { CERTIFICATE_DAYS, MILESTONE_DAYS, milestoneLabel } from '@/domain/milestones';
import { DAY, HOUR, MINUTE, breakdown } from '@/domain/time';
import type { Habit, Relapse } from '@/types';
import { formatDate, formatDateShort, formatInt, formatMinutes, formatMoney, formatRelativeDay, formatTime, pad2 } from '@/utils/format';

/* -------------------------------------------------------------------------- */
/* Hero ring                                                                  */
/* -------------------------------------------------------------------------- */

/** Big number inside the ring plus its unit label ("31" + "DAYS"). */
export interface HeroValue {
  value: string;
  unit: string;
}

/**
 * Whole days once the streak is a day old; before that hours, and minutes during
 * the very first hour so a fresh streak still shows movement.
 */
export function heroValue(streakMs: number): HeroValue {
  const ms = Math.max(0, streakMs);
  if (ms >= DAY) {
    const days = Math.floor(ms / DAY);
    return { value: formatInt(days), unit: days === 1 ? 'DAY' : 'DAYS' };
  }
  if (ms >= HOUR) {
    const hours = Math.floor(ms / HOUR);
    return { value: String(hours), unit: hours === 1 ? 'HOUR' : 'HOURS' };
  }
  const minutes = Math.floor(ms / MINUTE);
  return { value: String(minutes), unit: minutes === 1 ? 'MINUTE' : 'MINUTES' };
}

/**
 * Font size for the hero number: 72 → 64 as it grows (spec: 64–72), so "1,234"
 * still reads as a hero. Only decades-long streaks ("12,345") go below. With
 * `maxWidth` (the ring's inner diameter) it also shrinks to fit a smaller ring.
 */
export function heroFontSize(value: string, maxWidth?: number): number {
  let base: number;
  if (value.length <= 2) base = 72;
  else if (value.length === 3) base = 68;
  else if (value.length <= 5) base = 64;
  else if (value.length === 6) base = 56;
  else base = 44;
  return maxWidth != null ? fitFontSize(value, maxWidth, base, 36) : base;
}

/** Approximate advance of a glyph in em for the app's bold numerals and labels. */
function glyphEm(ch: string): number {
  if (ch === ',' || ch === '.' || ch === ' ' || ch === ':' || ch === "'") return 0.32;
  return 0.68;
}

/**
 * Largest font size (≤ `base`, ≥ `min`) at which `text` fits on one line in
 * `maxWidth` points. A deterministic stand-in for `adjustsFontSizeToFit`,
 * which react-native-web ignores.
 */
export function fitFontSize(text: string, maxWidth: number, base: number, min: number): number {
  let em = 0;
  for (const ch of text) em += glyphEm(ch);
  if (em <= 0 || !(maxWidth > 0)) return base;
  return Math.max(min, Math.min(base, Math.floor((maxWidth / em) * 2) / 2));
}

/** "Next goal: 60 days" body: "60 days", "1 day", "1,000 days", "1 year", "2 years". */
export function goalText(goalDays: number): string {
  if (goalDays >= 365 && goalDays % 365 === 0) return milestoneLabel(goalDays);
  return `${formatInt(goalDays)} ${goalDays === 1 ? 'day' : 'days'}`;
}

/* -------------------------------------------------------------------------- */
/* Live counter                                                               */
/* -------------------------------------------------------------------------- */

export interface CounterPart {
  key: 'days' | 'hours' | 'minutes' | 'seconds';
  value: string;
  label: string;
}

/** "31 : 00 : 19 : 28" boxes. Every part is at least two digits; days may grow. */
export function counterParts(ms: number): CounterPart[] {
  const b = breakdown(ms);
  return [
    { key: 'days', value: pad2(b.days), label: 'days' },
    { key: 'hours', value: pad2(b.hours), label: 'hrs' },
    { key: 'minutes', value: pad2(b.minutes), label: 'min' },
    { key: 'seconds', value: pad2(b.seconds), label: 'sec' },
  ];
}

/* -------------------------------------------------------------------------- */
/* Savings                                                                    */
/* -------------------------------------------------------------------------- */

/** "$4/day", "$4.50/day", "₴120/day". */
export function perDayMoney(dailyCost: number, currency: string): string {
  const full = formatMoney(Math.max(0, dailyCost), currency);
  return `${full.endsWith('.00') ? full.slice(0, -3) : full}/day`;
}

/** "15 min/day", "1h/day", "2h 30m/day". */
export function perDayMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min/day`;
  return `${formatMinutes(m)}/day`;
}

/* -------------------------------------------------------------------------- */
/* Milestones strip                                                           */
/* -------------------------------------------------------------------------- */

export type MilestoneState = 'reached' | 'next' | 'future';

export interface MilestoneBadge {
  days: number;
  /** "1d", "1w", "1m", "1y" … */
  short: string;
  /** "1 week" */
  label: string;
  state: MilestoneState;
  /** 0..1 progress toward this milestone (1 when reached). */
  progress: number;
  /** When it was (or will be) reached in the current streak. */
  at: number;
  /** Awards a certificate. */
  certificate: boolean;
}

/** Compact milestone label for the round badges. */
export function milestoneShort(days: number): string {
  if (days >= 365 && days % 365 === 0) return `${days / 365}y`;
  if (days >= 30 && days % 30 === 0) return `${days / 30}m`;
  if (days >= 7 && days % 7 === 0) return `${days / 7}w`;
  return `${days}d`;
}

const CERTS = new Set<number>(CERTIFICATE_DAYS);

/**
 * Badges for every standard milestone, plus yearly ones once past a year (up to
 * and including the next one ahead). The first milestone not reached yet is "next".
 */
export function milestoneBadges(startedAt: number, streakMs: number): MilestoneBadge[] {
  const ms = Math.max(0, streakMs);
  const list: number[] = [...MILESTONE_DAYS];
  for (let y = 2; (y - 1) * 365 * DAY <= ms; y++) list.push(y * 365);
  let nextFound = false;
  return list.map((days) => {
    const goalMs = days * DAY;
    let state: MilestoneState;
    if (ms >= goalMs) state = 'reached';
    else if (!nextFound) {
      state = 'next';
      nextFound = true;
    } else state = 'future';
    return {
      days,
      short: milestoneShort(days),
      label: milestoneLabel(days),
      state,
      progress: Math.min(1, ms / goalMs),
      at: startedAt + goalMs,
      certificate: CERTS.has(days),
    };
  });
}

/** Index of the badge to scroll into view: the next one, else the last. */
export function focusIndex(badges: MilestoneBadge[]): number {
  const i = badges.findIndex((b) => b.state === 'next');
  return i >= 0 ? i : Math.max(0, badges.length - 1);
}

/**
 * Horizontal offset that centers item `index` of a strip with fixed-width items
 * (content padded by `padStart`), never negative so early items scroll back to 0.
 */
export function stripScrollX(index: number, viewportWidth: number, itemWidth: number, gap: number, padStart: number): number {
  const x = padStart + index * (itemWidth + gap) + itemWidth / 2 - viewportWidth / 2;
  return Math.max(0, Math.round(x));
}

/* -------------------------------------------------------------------------- */
/* Streak history                                                             */
/* -------------------------------------------------------------------------- */

export interface StreakItem {
  /** 1-based attempt number. */
  attempt: number;
  startAt: number;
  /** Relapse time, or `now` for the current streak. */
  endAt: number;
  ms: number;
  /** The ongoing streak. */
  current: boolean;
  /** Longest streak (ties go to the most recent one; never a zero-length streak). */
  isRecord: boolean;
  /** The relapse that ended this streak (null for the current one). */
  relapse: Relapse | null;
}

export interface StreakHistory {
  /** Chronological: attempt 1 first, the current streak last. */
  items: StreakItem[];
  attempts: number;
  recordMs: number;
  /** Mean over all streaks, the current one included. */
  averageMs: number;
  totalMs: number;
  relapseCount: number;
}

/**
 * Every streak of a habit: one per relapse (the streak that relapse ended)
 * followed by the ongoing one.
 */
export function buildStreakHistory(habit: Habit, relapses: Relapse[], now: number): StreakHistory {
  const own = relapses.filter((r) => r.habitId === habit.id).sort((a, b) => a.at - b.at);
  const items: StreakItem[] = own.map((r, i) => {
    const ms = Math.max(0, r.streakMs);
    return { attempt: i + 1, startAt: r.at - ms, endAt: r.at, ms, current: false, isRecord: false, relapse: r };
  });
  const currentMs = Math.max(0, now - habit.startedAt);
  items.push({
    attempt: own.length + 1,
    startAt: habit.startedAt,
    endAt: Math.max(now, habit.startedAt),
    ms: currentMs,
    current: true,
    isRecord: false,
    relapse: null,
  });

  let best = -1;
  items.forEach((it, i) => {
    if (it.ms > 0 && (best < 0 || it.ms >= items[best].ms)) best = i;
  });
  if (best >= 0) items[best].isRecord = true;

  const totalMs = items.reduce((acc, it) => acc + it.ms, 0);
  return {
    items,
    attempts: items.length,
    recordMs: best >= 0 ? items[best].ms : 0,
    averageMs: totalMs / items.length,
    totalMs,
    relapseCount: own.length,
  };
}

/** Ended streaks (i.e. relapses), newest first, at most `count`. */
export function recentEnded(history: StreakHistory, count: number): StreakItem[] {
  return history.items
    .filter((it) => !it.current)
    .reverse()
    .slice(0, Math.max(0, count));
}

/** Bar heights for the history chart: 0..1 relative to the longest streak (min sliver for 0). */
export function barFractions(items: StreakItem[], minFraction = 0.04): number[] {
  const max = items.reduce((m, it) => Math.max(m, it.ms), 0);
  if (max <= 0) return items.map(() => minFraction);
  return items.map((it) => Math.max(minFraction, it.ms / max));
}

/**
 * The one streak-length format of the history screen (chart bars, summary and
 * list alike), day-based like the detail screen: "1,234d", "33d", "5h",
 * "12 min", "0 min". Minutes are spelled out so they never read as the "1m"
 * (one month) of the milestone badges.
 */
export function streakLabel(ms: number): string {
  const v = Math.max(0, ms);
  if (v >= DAY) return `${formatInt(Math.floor(v / DAY))}d`;
  if (v >= HOUR) return `${Math.floor(v / HOUR)}h`;
  return `${Math.floor(v / MINUTE)} min`;
}

/**
 * Date range of a streak: "12 Jul → 14 Aug" within the current year,
 * "28 Dec 2025 → 3 Jan 2026" across years, "12 Sep → now" for the ongoing one.
 */
export function rangeLabel(startAt: number, endAt: number, current: boolean, now: number): string {
  const year = new Date(now).getFullYear();
  const fmt = (ts: number) => (new Date(ts).getFullYear() === year ? formatDateShort(ts) : formatDate(ts));
  return `${fmt(startAt)} → ${current ? 'now' : fmt(endAt)}`;
}

/* -------------------------------------------------------------------------- */
/* Arc ring geometry                                                          */
/* -------------------------------------------------------------------------- */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear mix of two "#RRGGBB" colors (t = 0 → a, 1 → b) as "#rrggbb". */
export function mixHex(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const ca = parseHex(a);
  const cb = parseHex(b);
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

/** Point on a circle for an angle in degrees measured clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

export interface ArcSegment {
  /** SVG path ("M … A …") */
  d: string;
  color: string;
}

/**
 * Splits a progress arc into segments whose colors blend from `from` to `to`
 * (a conic gradient, which SVG lacks). The blend happens over the first
 * `blendFraction` of the arc (at most `maxBlendDeg`) in fine steps; the rest is a
 * single solid segment. Segments overlap slightly to hide seams.
 */
export function arcSegments(
  cx: number,
  cy: number,
  r: number,
  progress: number,
  from: string,
  to: string,
  stepDeg = 1.5,
  blendFraction = 0.6,
  maxBlendDeg = 110,
): ArcSegment[] {
  const sweep = Math.min(359.99, Math.max(0, Math.min(1, progress)) * 360);
  if (sweep <= 0) return [];
  const blend = Math.min(sweep, Math.max(stepDeg, Math.min(sweep * blendFraction, maxBlendDeg)));
  const n = Math.max(1, Math.ceil(blend / stepDeg));
  const step = blend / n;
  const f = (v: number) => v.toFixed(2);
  const seg = (a0: number, a1: number) => {
    const p0 = polar(cx, cy, r, a0);
    const p1 = polar(cx, cy, r, a1);
    return `M ${f(p0.x)} ${f(p0.y)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(p1.x)} ${f(p1.y)}`;
  };
  const out: ArcSegment[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = i * step;
    const a1 = Math.min(sweep, (i + 1) * step + 0.5);
    out.push({ d: seg(a0, a1), color: mixHex(from, to, (i + 0.5) / n) });
  }
  if (sweep > blend) out.push({ d: seg(blend, sweep), color: mixHex(from, to, 1) });
  return out;
}

/** One continuous SVG arc path from 12 o'clock, clockwise over `sweepDeg` (split in two halves past 180°). */
export function arcPath(cx: number, cy: number, r: number, sweepDeg: number): string {
  const sweep = Math.max(0, Math.min(359.99, sweepDeg));
  if (sweep <= 0) return '';
  const p0 = polar(cx, cy, r, 0);
  const f = (n: number) => n.toFixed(2);
  if (sweep <= 180) {
    const p1 = polar(cx, cy, r, sweep);
    return `M ${f(p0.x)} ${f(p0.y)} A ${r} ${r} 0 0 1 ${f(p1.x)} ${f(p1.y)}`;
  }
  const pm = polar(cx, cy, r, 180);
  const p1 = polar(cx, cy, r, sweep);
  return `M ${f(p0.x)} ${f(p0.y)} A ${r} ${r} 0 0 1 ${f(pm.x)} ${f(pm.y)} A ${r} ${r} 0 0 1 ${f(p1.x)} ${f(p1.y)}`;
}

/** "10 Sep, 16:49" within the current year, "28 Dec 2025, 09:00" otherwise. */
export function dateTimeLabel(ts: number, now: number): string {
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return `${sameYear ? formatDateShort(ts) : formatDate(ts)}, ${formatTime(ts)}`;
}

/** "Today, 21:09" / "Yesterday, 08:15", else like `dateTimeLabel` ("10 Sep, 16:49"). */
export function relativeDateTimeLabel(ts: number, now: number): string {
  const day = formatRelativeDay(ts, now);
  if (day === 'Today' || day === 'Yesterday') return `${day}, ${formatTime(ts)}`;
  return dateTimeLabel(ts, now);
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Caption under a milestone badge: "23 May" this year, "May 2024" in other years. */
export function badgeDate(ts: number, now: number): string {
  const d = new Date(ts);
  if (d.getFullYear() === new Date(now).getFullYear()) return formatDateShort(ts);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
