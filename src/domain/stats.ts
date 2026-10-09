import type { Habit, JournalEntry, MoodId, Relapse, TriggerId } from '@/types';
import { MOODS } from './catalog/moods';
import { TRIGGERS } from './catalog/triggers';
import { relapsesFor, type HabitSnapshot } from './habitStats';
import { DAY, addDays, fractionalDays, startOfDay, startOfWeek } from './time';

/* -------------------------------------------------------------------------- */
/* Streaks                                                                    */
/* -------------------------------------------------------------------------- */

export interface StreakEntry {
  habitId: string;
  /** 1-based attempt number within the habit. */
  attempt: number;
  startAt: number;
  endAt: number;
  ms: number;
  /** The ongoing streak (not ended by a relapse). */
  current: boolean;
  /** Longest streak of the list (ties go to the most recent one). */
  isRecord: boolean;
}

/** Marks the longest entry (latest on ties) as the record. Mutates and returns `entries`. */
function markRecord(entries: StreakEntry[]): StreakEntry[] {
  let best = -1;
  for (let i = 0; i < entries.length; i++) {
    entries[i].isRecord = false;
    if (entries[i].ms > 0 && (best < 0 || entries[i].ms >= entries[best].ms)) best = i;
  }
  if (best >= 0) entries[best].isRecord = true;
  return entries;
}

/**
 * Every streak of a habit in chronological order: one per relapse (the streak that
 * relapse ended) followed by the current, ongoing streak.
 */
export function streakHistory(habit: Habit, relapses: Relapse[], now: number): StreakEntry[] {
  const rs = relapsesFor(habit.id, relapses);
  const entries: StreakEntry[] = rs.map((r, i) => {
    const ms = Math.max(0, r.streakMs);
    return { habitId: habit.id, attempt: i + 1, startAt: r.at - ms, endAt: r.at, ms, current: false, isRecord: false };
  });
  const ms = Math.max(0, now - habit.startedAt);
  entries.push({
    habitId: habit.id,
    attempt: rs.length + 1,
    startAt: habit.startedAt,
    endAt: habit.startedAt + ms,
    ms,
    current: true,
    isRecord: false,
  });
  return markRecord(entries);
}

/**
 * The most recent `limit` entries of a chronological list, always keeping the record:
 * when it is older than the window it takes the first slot (still in time order).
 */
export function recentWithRecord(entries: StreakEntry[], limit: number): StreakEntry[] {
  const n = Math.max(1, Math.floor(limit));
  if (entries.length <= n) return entries;
  const recordAt = entries.findIndex((e) => e.isRecord);
  if (recordAt < 0 || recordAt >= entries.length - n) return entries.slice(entries.length - n);
  return [entries[recordAt], ...entries.slice(entries.length - n + 1)];
}

/**
 * Streaks of several habits merged chronologically by when they ended (ongoing streaks
 * last), with a single overall record. With `limit`, keeps the most recent entries plus
 * the all-time record (see recentWithRecord).
 */
export function combinedStreakHistory(habits: Habit[], relapses: Relapse[], now: number, limit?: number): StreakEntry[] {
  const all = markRecord(
    habits
      .flatMap((h) => streakHistory(h, relapses, now))
      .sort((a, b) => Number(a.current) - Number(b.current) || a.endAt - b.endAt || a.startAt - b.startAt),
  );
  return limit != null ? recentWithRecord(all, limit) : all;
}

/** Mean streak length (ms) over the given streaks, 0 when empty. */
export function averageStreakMs(entries: StreakEntry[]): number {
  if (!entries.length) return 0;
  return entries.reduce((acc, e) => acc + e.ms, 0) / entries.length;
}

/** When tracking of a habit began: the earliest of its quit date, current start and any streak start. */
export function habitStartAt(habit: Habit, relapses: Relapse[]): number {
  let start = Math.min(habit.firstStartedAt, habit.startedAt);
  for (const r of relapses) {
    if (r.habitId !== habit.id) continue;
    start = Math.min(start, r.at - Math.max(0, r.streakMs));
  }
  return start;
}

/** Clean time (ms) accumulated by the given streaks up to time `t`. */
export function cleanMsUntil(entries: StreakEntry[], t: number): number {
  let total = 0;
  for (const e of entries) {
    if (t <= e.startAt) continue;
    total += Math.min(t, e.endAt) - e.startAt;
  }
  return total;
}

/* -------------------------------------------------------------------------- */
/* Savings                                                                    */
/* -------------------------------------------------------------------------- */

export interface SavingsPoint {
  t: number;
  /** Cumulative money saved per currency code. */
  money: Record<string, number>;
  /** Cumulative minutes saved (all habits). */
  minutes: number;
}

/**
 * Cumulative money (per currency) and time saved, sampled at `points` evenly spaced
 * instants from the first tracked start to `now`. Savings accrue only during clean
 * streaks (time before a habit's first start counts as nothing), so the series never
 * decreases and its last point equals the habits' snapshot totals.
 */
export function cumulativeSavingsSeries(habits: Habit[], relapses: Relapse[], now: number, points: number = 30): SavingsPoint[] {
  const tracked = habits.filter((h) => h.dailyCost > 0 || h.dailyMinutes > 0);
  if (!tracked.length) return [];
  const histories = tracked.map((h) => ({ habit: h, entries: streakHistory(h, relapses, now) }));
  const start = Math.min(now, ...tracked.map((h) => habitStartAt(h, relapses)));
  const n = Math.max(2, Math.floor(points));
  const span = now - start;
  const currencies = [...new Set(tracked.filter((h) => h.dailyCost > 0).map((h) => h.currency))];

  const out: SavingsPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i === n - 1 ? now : start + (span * i) / (n - 1);
    const money: Record<string, number> = {};
    for (const c of currencies) money[c] = 0;
    let minutes = 0;
    for (const { habit, entries } of histories) {
      const days = fractionalDays(cleanMsUntil(entries, t));
      if (habit.dailyCost > 0) money[habit.currency] += habit.dailyCost * days;
      minutes += habit.dailyMinutes * days;
    }
    out.push({ t, money, minutes });
  }
  return out;
}

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

/** Currency totals sorted by amount, largest first (ties by code). */
export function sortCurrencyTotals(byCurrency: Record<string, number>): CurrencyTotal[] {
  return Object.entries(byCurrency)
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount || a.currency.localeCompare(b.currency));
}

export interface SavingsRate {
  /** Money saved per clean day, per currency. */
  money: Record<string, number>;
  /** Minutes saved per clean day. */
  minutes: number;
}

/** What the given habits save per clean day. */
export function dailySavingsRate(habits: Habit[]): SavingsRate {
  const money: Record<string, number> = {};
  let minutes = 0;
  for (const h of habits) {
    if (h.dailyCost > 0) money[h.currency] = (money[h.currency] ?? 0) + h.dailyCost;
    minutes += Math.max(0, h.dailyMinutes);
  }
  return { money, minutes };
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                   */
/* -------------------------------------------------------------------------- */

export type DayStatus = 'future' | 'untracked' | 'clean' | 'relapse';

export interface DayCell {
  /** Local midnight of the day. */
  date: number;
  status: DayStatus;
  /** Habits already being tracked on that day. */
  tracked: number;
  /** Habits tracked that day without a relapse. */
  clean: number;
  /** Relapses logged that day. */
  relapses: number;
  isToday: boolean;
}

/**
 * Calendar grid of the last `weeks` weeks (oldest week first, 7 days each, starting on
 * `weekStartsOn`). The last row is the current week; days after today are 'future'.
 */
export function dailyStatusGrid(habits: Habit[], relapses: Relapse[], now: number, weeks: number = 12, weekStartsOn: 0 | 1 = 1): DayCell[][] {
  const today = startOfDay(now);
  const first = addDays(startOfWeek(now, weekStartsOn), -(Math.max(1, weeks) - 1) * 7);
  const ids = new Set(habits.map((h) => h.id));
  // A habit is tracked on a day only while one of its streaks covers part of it, so a
  // start date edited forward leaves the days between the last relapse and it untracked.
  const streaks = habits.map((h) => streakHistory(h, relapses, now));
  const scoped = relapses.filter((r) => ids.has(r.habitId));

  const grid: DayCell[][] = [];
  let day = first;
  for (let w = 0; w < Math.max(1, weeks); w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const next = addDays(day, 1);
      const cell: DayCell = { date: day, status: 'untracked', tracked: 0, clean: 0, relapses: 0, isToday: day === today };
      if (day > now) {
        cell.status = 'future';
      } else {
        habits.forEach((h, i) => {
          if (!streaks[i].some((e) => e.startAt < next && e.endAt >= day)) return;
          cell.tracked++;
          const count = scoped.filter((r) => r.habitId === h.id && r.at >= day && r.at < next).length;
          if (count > 0) cell.relapses += count;
          else cell.clean++;
        });
        cell.status = cell.relapses > 0 ? 'relapse' : cell.tracked > 0 ? 'clean' : 'untracked';
      }
      row.push(cell);
      day = next;
    }
    grid.push(row);
  }
  return grid;
}

/* -------------------------------------------------------------------------- */
/* Triggers                                                                   */
/* -------------------------------------------------------------------------- */

export interface TriggerStat {
  trigger: TriggerId;
  count: number;
  /** count / number of relapses considered (a relapse can have several triggers). */
  share: number;
  /** count / the most frequent trigger's count (radar radius). */
  relative: number;
  /** Names of the habits whose relapses mention this trigger, in habit order. */
  habitNames: string[];
}

export interface TriggerBreakdown {
  /** Relapses of the given habits (with or without triggers). */
  relapseCount: number;
  /** Relapses that have no trigger noted. */
  untagged: number;
  /** One item per trigger, in TRIGGERS (radar axis) order. */
  items: TriggerStat[];
}

/** How often each trigger appears in the relapses of the given habits. */
export function triggerBreakdown(relapses: Relapse[], habits: Habit[]): TriggerBreakdown {
  const order = new Map(habits.map((h, i) => [h.id, i]));
  const scoped = relapses.filter((r) => order.has(r.habitId));
  const counts = new Map<TriggerId, number>();
  const habitsBy = new Map<TriggerId, Set<string>>();
  let untagged = 0;
  for (const r of scoped) {
    const unique = [...new Set(r.triggers)];
    if (!unique.length) untagged++;
    for (const t of unique) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
      if (!habitsBy.has(t)) habitsBy.set(t, new Set());
      habitsBy.get(t)!.add(r.habitId);
    }
  }
  const max = Math.max(0, ...counts.values());
  const items = TRIGGERS.map((def) => {
    const count = counts.get(def.id) ?? 0;
    const hs = [...(habitsBy.get(def.id) ?? [])].sort((a, b) => order.get(a)! - order.get(b)!);
    return {
      trigger: def.id,
      count,
      share: scoped.length ? count / scoped.length : 0,
      relative: max ? count / max : 0,
      habitNames: hs.map((id) => habits[order.get(id)!].name),
    };
  });
  return { relapseCount: scoped.length, untagged, items };
}

/** Triggers that occurred at least once, most frequent first (ties keep radar order). */
export function rankedTriggers(items: TriggerStat[]): TriggerStat[] {
  const idx = new Map(TRIGGERS.map((t, i) => [t.id, i]));
  return items.filter((i) => i.count > 0).sort((a, b) => b.count - a.count || idx.get(a.trigger)! - idx.get(b.trigger)!);
}

/* -------------------------------------------------------------------------- */
/* Mood                                                                       */
/* -------------------------------------------------------------------------- */

export interface MoodStat {
  mood: MoodId;
  /** journal + relapses */
  count: number;
  journal: number;
  relapses: number;
  share: number;
}

/** How often each mood was recorded, in MOODS order (worst → best). */
export function moodDistribution(journal: JournalEntry[], relapses: Relapse[]): MoodStat[] {
  const j = new Map<MoodId, number>();
  const r = new Map<MoodId, number>();
  for (const e of journal) j.set(e.mood, (j.get(e.mood) ?? 0) + 1);
  for (const x of relapses) if (x.mood) r.set(x.mood, (r.get(x.mood) ?? 0) + 1);
  const total = journal.length + relapses.filter((x) => x.mood).length;
  return MOODS.map((m) => {
    const journalCount = j.get(m.id) ?? 0;
    const relapseCount = r.get(m.id) ?? 0;
    const count = journalCount + relapseCount;
    return { mood: m.id, count, journal: journalCount, relapses: relapseCount, share: total ? count / total : 0 };
  });
}

const SCORE = new Map(MOODS.map((m) => [m.id, m.score]));

/** Mood score 1 (worst) .. 5 (best). */
export function moodScore(mood: MoodId): number {
  return SCORE.get(mood) ?? 3;
}

export interface MoodDay {
  /** Local midnight. */
  date: number;
  /** Average journal mood score that day (1..5), null without entries. */
  average: number | null;
  count: number;
}

/** Daily average journal mood for the last `days` days (oldest first, last = today). */
export function moodTimeline(journal: JournalEntry[], now: number, days: number = 30): MoodDay[] {
  const today = startOfDay(now);
  const n = Math.max(1, days);
  const out: MoodDay[] = [];
  const first = addDays(today, -(n - 1));
  const buckets = new Map<number, number[]>();
  for (const e of journal) {
    const d = startOfDay(e.createdAt);
    if (d < first || d > today) continue;
    if (!buckets.has(d)) buckets.set(d, []);
    buckets.get(d)!.push(moodScore(e.mood));
  }
  for (let i = 0; i < n; i++) {
    const date = addDays(first, i);
    const scores = buckets.get(date) ?? [];
    out.push({ date, count: scores.length, average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null });
  }
  return out;
}

export interface MoodContrast {
  /** Average journal mood on days with a relapse (null if no such entries). */
  relapseDays: number | null;
  /** Average journal mood on days without a relapse. */
  cleanDays: number | null;
  relapseEntries: number;
  cleanEntries: number;
}

/** Compares journal mood on relapse days vs other days. */
export function moodContrast(journal: JournalEntry[], relapses: Relapse[]): MoodContrast {
  const relapseDays = new Set(relapses.map((r) => startOfDay(r.at)));
  const onRelapse: number[] = [];
  const onClean: number[] = [];
  for (const e of journal) (relapseDays.has(startOfDay(e.createdAt)) ? onRelapse : onClean).push(moodScore(e.mood));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { relapseDays: avg(onRelapse), cleanDays: avg(onClean), relapseEntries: onRelapse.length, cleanEntries: onClean.length };
}

export interface Insight {
  icon: 'trending-up' | 'trending-down' | 'equal' | 'notebook-outline' | 'emoticon-happy-outline';
  text: string;
}

/** Journal entries needed on both relapse days and clean days before comparing them. */
export const MOOD_MIN_SAMPLE = 2;

/** One-sentence takeaway about mood, or null when there is nothing to say. */
export function moodInsight(journal: JournalEntry[], relapses: Relapse[]): Insight | null {
  if (!journal.length) return null;
  const c = moodContrast(journal, relapses);
  const avg = journal.reduce((acc, e) => acc + moodScore(e.mood), 0) / journal.length;
  const label = MOODS[Math.min(4, Math.max(0, Math.round(avg) - 1))].label.toLowerCase();
  if (c.relapseDays != null && c.cleanDays != null) {
    if (c.relapseEntries < MOOD_MIN_SAMPLE || c.cleanEntries < MOOD_MIN_SAMPLE) {
      return {
        icon: 'notebook-outline',
        text: `Your average mood so far is "${label}". Keep journaling: a few more entries will show whether relapse days feel different.`,
      };
    }
    const diff = c.cleanDays - c.relapseDays;
    if (diff >= 0.25) {
      return { icon: 'trending-up', text: `Your mood is ${diff.toFixed(1)} points higher on days without relapses. Every clean day pays off.` };
    }
    if (diff <= -0.25) {
      return {
        icon: 'trending-down',
        text: 'Your mood tends to be higher on relapse days — the urge may be tied to good moments. Watch celebrations and rewards.',
      };
    }
    return {
      icon: 'equal',
      text: 'Your mood is about the same on relapse days and clean days. Keep journaling to spot what really drives the urge.',
    };
  }
  if (c.relapseDays == null) {
    return { icon: 'emoticon-happy-outline', text: `Your average mood is "${label}", and none of your entries fall on a relapse day.` };
  }
  return {
    icon: 'notebook-outline',
    text: 'All your journal entries were written on relapse days. Writing on calm days too gives a fuller picture.',
  };
}

/** Relapses per hour of the day (local time), index 0..23. */
export function relapseHourHistogram(relapses: Relapse[]): number[] {
  const out = new Array<number>(24).fill(0);
  for (const r of relapses) out[new Date(r.at).getHours()]++;
  return out;
}

/** Index of the busiest hour, or -1 when there are no relapses. */
export function peakHour(histogram: number[]): number {
  let best = -1;
  for (let i = 0; i < histogram.length; i++) if (histogram[i] > 0 && (best < 0 || histogram[i] > histogram[best])) best = i;
  return best;
}

/* -------------------------------------------------------------------------- */
/* Compare                                                                    */
/* -------------------------------------------------------------------------- */

export interface CompareRow {
  habitId: string;
  name: string;
  color: string;
  icon: Habit['icon'];
  streakMs: number;
  recordMs: number;
  streakDays: number;
  recordDays: number;
  attempts: number;
  /** Calendar days since tracking began (inclusive of today). */
  trackedDays: number;
  /** Distinct calendar days with at least one relapse. */
  relapseDays: number;
  /** Share of tracked days without a relapse (0..1). */
  successRate: number;
  moneySaved: number;
  currency: string;
  /** False when the habit has no daily cost set. */
  tracksMoney: boolean;
  minutesSaved: number;
}

/**
 * One comparable row per habit snapshot, in the given order. Success rate is day based:
 * relapses are instantaneous (a new streak starts right away), so a time-based ratio
 * would always read 100%; instead each calendar day with a relapse counts as a miss.
 */
export function compareRows(snapshots: HabitSnapshot[], now: number): CompareRow[] {
  return snapshots.map((s) => {
    const start = habitStartAt(s.habit, s.relapses);
    const trackedDays = Math.max(1, Math.round((startOfDay(now) - startOfDay(start)) / DAY) + 1);
    const relapseDays = Math.min(trackedDays, new Set(s.relapses.filter((r) => r.at <= now).map((r) => startOfDay(r.at))).size);
    const successRate = (trackedDays - relapseDays) / trackedDays;
    return {
      habitId: s.habit.id,
      name: s.habit.name,
      color: s.habit.color,
      icon: s.habit.icon,
      streakMs: s.streakMs,
      recordMs: s.recordMs,
      streakDays: s.streakDays,
      recordDays: s.recordDays,
      attempts: s.attempt,
      trackedDays,
      relapseDays,
      successRate,
      moneySaved: s.moneySaved,
      currency: s.habit.currency,
      tracksMoney: s.habit.dailyCost > 0,
      minutesSaved: s.minutesSaved,
    };
  });
}
