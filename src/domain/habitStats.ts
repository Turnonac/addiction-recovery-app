import type { Habit, Relapse } from '@/types';
import { currentGoalDays, goalProgress } from './milestones';
import { DAY, fractionalDays, wholeDays } from './time';

/** Relapses for one habit, oldest first. */
export function relapsesFor(habitId: string, relapses: Relapse[]): Relapse[] {
  return relapses.filter((r) => r.habitId === habitId).sort((a, b) => a.at - b.at);
}

/** Current clean streak in ms. */
export function currentStreakMs(habit: Habit, now: number): number {
  const ms = now - habit.startedAt;
  return Number.isFinite(ms) ? Math.max(0, ms) : 0;
}

/** Attempt number: 1 for the first try, +1 for every relapse. */
export function attemptNumber(habitRelapses: Relapse[]): number {
  return habitRelapses.length + 1;
}

/** Longest streak ever (ms), including the current one. */
export function recordStreakMs(habit: Habit, habitRelapses: Relapse[], now: number): number {
  let best = currentStreakMs(habit, now);
  for (const r of habitRelapses) if (Number.isFinite(r.streakMs)) best = Math.max(best, r.streakMs);
  return best;
}

/** Sum of every clean streak (ms): all ended streaks plus the current one. */
export function totalCleanMs(habit: Habit, habitRelapses: Relapse[], now: number): number {
  let total = currentStreakMs(habit, now);
  for (const r of habitRelapses) if (Number.isFinite(r.streakMs)) total += Math.max(0, r.streakMs);
  return total;
}

/** Money saved over all clean time, in the habit's currency. */
export function moneySaved(habit: Habit, cleanMs: number): number {
  return habit.dailyCost * fractionalDays(cleanMs);
}

/** Minutes saved over all clean time. */
export function minutesSaved(habit: Habit, cleanMs: number): number {
  return habit.dailyMinutes * fractionalDays(cleanMs);
}

export interface HabitSnapshot {
  habit: Habit;
  streakMs: number;
  streakDays: number;
  attempt: number;
  recordMs: number;
  recordDays: number;
  totalCleanMs: number;
  totalCleanDays: number;
  goalDays: number;
  /** 0..1 */
  progress: number;
  moneySaved: number;
  minutesSaved: number;
  /** True if the current streak is the longest one ever (and longer than 0). */
  isRecord: boolean;
  relapses: Relapse[];
}

/** Everything a card or detail screen needs about one habit at time `now`. */
export function snapshot(habit: Habit, allRelapses: Relapse[], now: number): HabitSnapshot {
  const rs = relapsesFor(habit.id, allRelapses);
  const streakMs = currentStreakMs(habit, now);
  const streakDays = wholeDays(streakMs);
  const recordMs = recordStreakMs(habit, rs, now);
  const total = totalCleanMs(habit, rs, now);
  const goalDays = currentGoalDays(streakDays, habit.goalDays);
  return {
    habit,
    streakMs,
    streakDays,
    attempt: attemptNumber(rs),
    recordMs,
    recordDays: wholeDays(recordMs),
    totalCleanMs: total,
    totalCleanDays: wholeDays(total),
    goalDays,
    progress: goalProgress(streakMs, goalDays),
    moneySaved: moneySaved(habit, total),
    minutesSaved: minutesSaved(habit, total),
    isRecord: streakMs > 0 && streakMs >= recordMs,
    relapses: rs,
  };
}

/** Money saved grouped by currency across habits. */
export function savingsByCurrency(snapshots: HabitSnapshot[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of snapshots) {
    if (!(s.habit.dailyCost > 0) || !Number.isFinite(s.moneySaved)) continue;
    out[s.habit.currency] = (out[s.habit.currency] ?? 0) + s.moneySaved;
  }
  return out;
}

/** Sum of whole clean days across habits (the home summary "CLEAN DAYS"). */
export function totalCleanDaysAll(snapshots: HabitSnapshot[]): number {
  return snapshots.reduce((acc, s) => acc + (Number.isFinite(s.totalCleanDays) ? s.totalCleanDays : 0), 0);
}

/** Money saved in the last `days` days (for "+358€" deltas on the home summary). */
export function recentSavings(habit: Habit, now: number, days: number): number {
  const windowStart = now - days * DAY;
  const cleanInWindow = now - Math.max(habit.startedAt, windowStart);
  return Number.isFinite(cleanInWindow) ? moneySaved(habit, Math.max(0, cleanInWindow)) : 0;
}
