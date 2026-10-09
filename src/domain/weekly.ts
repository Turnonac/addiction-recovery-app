import { moodFor } from '@/domain/catalog/moods';
import type { Habit, JournalEntry, Relapse, SosSession } from '@/types';
import { currencySymbol, formatMinutes, formatMoney, plural } from '@/utils/format';
import { relapsesFor } from './habitStats';
import { milestoneLabel, milestonesReachedList } from './milestones';
import { DAY, addDays, startOfWeek, wholeDays } from './time';

export type DayStatus = 'clean' | 'relapse' | 'not_started' | 'future';

export interface WeeklyInput {
  habits: Habit[];
  relapses: Relapse[];
  journal: JournalEntry[];
  sosSessions: SosSession[];
}

export interface WeeklyHabitRow {
  habit: Habit;
  /** 7 entries, one per day of the week (in week order). */
  days: DayStatus[];
  cleanDays: number;
  /** Days of this week the habit was being tracked (clean or relapse). */
  trackedDays: number;
  relapses: number;
  /** Money saved during the week, in the habit's currency. */
  moneySaved: number;
  minutesSaved: number;
  /** Streak length (whole days) at the end of the week, or now for the current week. */
  streakDaysAtEnd: number;
}

export interface WeeklyMilestone {
  habit: Habit;
  days: number;
  at: number;
}

export interface WeeklySummary {
  weekStart: number;
  /** Exclusive: local midnight starting the next week. */
  weekEnd: number;
  /** Local-midnight start of each of the 7 days. */
  dayStarts: number[];
  isCurrentWeek: boolean;
  /** The week is fully in the past. */
  isComplete: boolean;
  /** Days of the week that have started (1..7 for current/past weeks, 0 for future). */
  elapsedDays: number;
  habits: WeeklyHabitRow[];
  cleanDays: number;
  trackedDays: number;
  relapses: number;
  moneyByCurrency: Record<string, number>;
  minutesSaved: number;
  sos: { count: number; completed: number };
  journal: { count: number; avgMood: number | null };
  bestStreakDays: number;
  bestStreakHabit: Habit | null;
  milestones: WeeklyMilestone[];
  highlights: string[];
  closingLine: string;
}

type Interval = [number, number];

/**
 * Clean intervals of a habit: every ended attempt (reconstructed from its relapse)
 * plus the current streak up to `now`.
 */
export function cleanIntervals(habit: Habit, habitRelapses: Relapse[], now: number): Interval[] {
  const out: Interval[] = habitRelapses.map((r) => [r.at - Math.max(0, r.streakMs), r.at]);
  if (now > habit.startedAt) out.push([habit.startedAt, now]);
  return out;
}

/** Total overlap (ms) between intervals and [from, to). */
export function overlapMs(intervals: Interval[], from: number, to: number): number {
  let total = 0;
  for (const [a, b] of intervals) total += Math.max(0, Math.min(b, to) - Math.max(a, from));
  return total;
}

/** When tracking of a habit began (the earliest known clean time). */
export function trackingStart(habit: Habit, habitRelapses: Relapse[]): number {
  let start = Math.min(habit.firstStartedAt, habit.startedAt);
  for (const r of habitRelapses) start = Math.min(start, r.at - Math.max(0, r.streakMs));
  return start;
}

function dayStatus(dayStart: number, dayEnd: number, tracking: number, habitRelapses: Relapse[], now: number): DayStatus {
  if (dayStart > now) return 'future';
  if (dayEnd <= tracking) return 'not_started';
  if (habitRelapses.some((r) => r.at >= dayStart && r.at < dayEnd)) return 'relapse';
  return 'clean';
}

/** Whole-day length of the clean interval containing `t` (0 if none). */
function streakAt(intervals: Interval[], t: number): number {
  let best = 0;
  for (const [a, b] of intervals) if (a <= t && t <= b) best = Math.max(best, wholeDays(t - a));
  return best;
}

function roundedMoney(amount: number, currency: string): string {
  if (amount >= 1000) return formatMoney(amount, currency, { compact: true });
  return `${currencySymbol(currency)}${Math.round(amount)}`;
}

/**
 * Everything the weekly summary screen shows for the week starting at local
 * midnight `weekStart`. Only active habits that were tracked during the week are
 * included. Values for the current week are measured up to `now`.
 */
export function weeklySummary(state: WeeklyInput, weekStart: number, now: number): WeeklySummary {
  const weekEnd = addDays(weekStart, 7);
  const dayStarts = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const windowEnd = Math.min(weekEnd, now);
  const isComplete = weekEnd <= now;
  const isCurrentWeek = weekStart <= now && now < weekEnd;
  const elapsedDays = dayStarts.filter((d) => d <= now).length;

  const rows: WeeklyHabitRow[] = [];
  const milestones: WeeklyMilestone[] = [];
  const moneyByCurrency: Record<string, number> = {};
  let minutesSaved = 0;
  let bestStreakDays = 0;
  let bestStreakHabit: Habit | null = null;

  const active = state.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
  for (const habit of active) {
    const rs = relapsesFor(habit.id, state.relapses);
    const tracking = trackingStart(habit, rs);
    if (tracking >= windowEnd) continue;

    const intervals = cleanIntervals(habit, rs, now);
    const days = dayStarts.map((d, i) => dayStatus(d, i < 6 ? dayStarts[i + 1] : weekEnd, tracking, rs, now));
    const cleanMs = overlapMs(intervals, weekStart, windowEnd);
    const moneySaved = habit.dailyCost > 0 ? (habit.dailyCost * cleanMs) / DAY : 0;
    const habitMinutes = habit.dailyMinutes > 0 ? (habit.dailyMinutes * cleanMs) / DAY : 0;
    const streakDaysAtEnd = streakAt(intervals, windowEnd);

    rows.push({
      habit,
      days,
      cleanDays: days.filter((s) => s === 'clean').length,
      trackedDays: days.filter((s) => s === 'clean' || s === 'relapse').length,
      relapses: rs.filter((r) => r.at >= weekStart && r.at < weekEnd).length,
      moneySaved,
      minutesSaved: habitMinutes,
      streakDaysAtEnd,
    });

    if (moneySaved > 0) moneyByCurrency[habit.currency] = (moneyByCurrency[habit.currency] ?? 0) + moneySaved;
    minutesSaved += habitMinutes;
    if (streakDaysAtEnd > bestStreakDays) {
      bestStreakDays = streakDaysAtEnd;
      bestStreakHabit = habit;
    }

    for (const [a, b] of intervals) {
      for (const m of milestonesReachedList(wholeDays(b - a))) {
        const at = a + m * DAY;
        if (at >= weekStart && at < windowEnd) milestones.push({ habit, days: m, at });
      }
    }
  }
  milestones.sort((x, y) => y.days - x.days || y.at - x.at);

  const inWeek = (t: number) => t >= weekStart && t < weekEnd;
  const weekSos = state.sosSessions.filter((s) => inWeek(s.at));
  const weekJournal = state.journal.filter((j) => inWeek(j.createdAt));
  const avgMood = weekJournal.length ? weekJournal.reduce((acc, j) => acc + moodFor(j.mood).score, 0) / weekJournal.length : null;

  const summary: WeeklySummary = {
    weekStart,
    weekEnd,
    dayStarts,
    isCurrentWeek,
    isComplete,
    elapsedDays,
    habits: rows,
    cleanDays: rows.reduce((acc, r) => acc + r.cleanDays, 0),
    trackedDays: rows.reduce((acc, r) => acc + r.trackedDays, 0),
    relapses: rows.reduce((acc, r) => acc + r.relapses, 0),
    moneyByCurrency,
    minutesSaved,
    sos: { count: weekSos.length, completed: weekSos.filter((s) => s.completed).length },
    journal: { count: weekJournal.length, avgMood },
    bestStreakDays,
    bestStreakHabit,
    milestones,
    highlights: [],
    closingLine: '',
  };
  summary.highlights = buildHighlights(summary);
  summary.closingLine = closingLine(summary);
  return summary;
}

/** Short, positive sentences about the week (most notable first). */
export function buildHighlights(s: WeeklySummary): string[] {
  const out: string[] = [];
  for (const m of topMilestonePerHabit(s.milestones).slice(0, 2)) {
    out.push(`Reached ${milestoneLabel(m.days)} free from ${m.habit.name} 🏆`);
  }

  const perfect: string[] = [];
  const soFar: string[] = [];
  const sinceStart: string[] = [];
  for (const r of s.habits) {
    if (r.relapses > 0 || r.cleanDays === 0) continue;
    if (r.cleanDays === 7) perfect.push(r.habit.name);
    else if (r.days[0] === 'not_started') sinceStart.push(r.habit.name);
    else if (!s.isComplete) soFar.push(r.habit.name);
  }
  if (perfect.length) out.push(`Clean all 7 days from ${joinNames(perfect)} 🎉`);
  if (soFar.length) out.push(`Clean every day so far from ${joinNames(soFar)} 💪`);
  if (sinceStart.length) out.push(`No slips with ${joinNames(sinceStart)} since you started 🌱`);

  const resisted = s.sos.completed;
  if (resisted === 1) out.push('You resisted a craving with SOS');
  else if (resisted > 1) out.push(`You resisted ${resisted} cravings with SOS`);

  const money = Object.entries(s.moneyByCurrency)
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([cur, v]) => roundedMoney(v, cur));
  if (money.length) out.push(`You kept ${money.join(' + ')} in your pocket`);

  if (s.minutesSaved >= 60) out.push(`You won back ${formatMinutes(s.minutesSaved)} of your time`);

  if (s.journal.count > 0) out.push(`You wrote ${plural(s.journal.count, 'journal entry', 'journal entries')}`);
  if (s.journal.avgMood != null && s.journal.avgMood >= 4) out.push('Your mood was bright this week ☀️');

  return [...new Set(out)].slice(0, MAX_HIGHLIGHTS);
}

const MAX_HIGHLIGHTS = 7;

/**
 * The biggest milestone per habit (a habit that relapsed can cross the same or
 * a smaller milestone again in one week — only its best one is worth a line).
 * Keeps the input order, which is biggest-first.
 */
export function topMilestonePerHabit(milestones: WeeklyMilestone[]): WeeklyMilestone[] {
  const best = new Map<string, WeeklyMilestone>();
  for (const m of milestones) {
    const prev = best.get(m.habit.id);
    if (!prev || m.days > prev.days || (m.days === prev.days && m.at > prev.at)) best.set(m.habit.id, m);
  }
  return milestones.filter((m) => best.get(m.habit.id) === m);
}

/** "Smoking", "Smoking & Alcohol", "3 habits". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.length} habits`;
}

/** Encouraging line that closes the summary. */
export function closingLine(s: WeeklySummary): string {
  if (s.trackedDays === 0) return 'Every journey starts with a single day. This week can be yours.';
  if (s.relapses > 0) return "A slip doesn't erase your progress. Every new day is a fresh start.";
  if (s.isComplete) return 'A perfect week. Carry that momentum into the next one.';
  return 'So far, so good — keep stacking clean days.';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "6–12 Oct", "29 Sep – 5 Oct", "29 Dec 2025 – 4 Jan 2026". */
export function formatWeekRange(weekStart: number): string {
  const a = new Date(weekStart);
  const b = new Date(addDays(weekStart, 6));
  if (a.getFullYear() !== b.getFullYear()) {
    return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  }
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
  return `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]}`;
}

/** "This week", "Last week", "3 weeks ago", or "Next week" for future starts. */
export function weekRelativeLabel(weekStart: number, now: number, weekStartsOn: 0 | 1): string {
  const current = startOfWeek(now, weekStartsOn);
  const diff = Math.round((current - weekStart) / (7 * DAY));
  if (diff === 0) return 'This week';
  if (diff === 1) return 'Last week';
  if (diff < 0) return diff === -1 ? 'Next week' : `In ${-diff} weeks`;
  return `${diff} weeks ago`;
}

/** Single-letter weekday headers in week order. */
export function weekdayLetters(weekStartsOn: 0 | 1): string[] {
  const mondayFirst = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return weekStartsOn === 1 ? mondayFirst : ['S', ...mondayFirst.slice(0, 6)];
}

/** Earliest week that has any tracked data (for the "‹" switcher bound). */
export function earliestWeekStart(state: Pick<WeeklyInput, 'habits' | 'relapses'>, weekStartsOn: 0 | 1, now: number): number {
  let earliest = now;
  for (const h of state.habits) {
    if (h.archived) continue;
    earliest = Math.min(earliest, trackingStart(h, relapsesFor(h.id, state.relapses)));
  }
  return startOfWeek(earliest, weekStartsOn);
}

/** Shift a week start by whole weeks (DST-safe). */
export function shiftWeek(weekStart: number, weeks: number): number {
  return addDays(weekStart, weeks * 7);
}
