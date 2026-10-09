import { milestonesReachedList } from '@/domain/milestones';
import { DAY, wholeDays } from '@/domain/time';
import type { Habit } from '@/types';

export interface PendingCelebration {
  key: string;
  habitId: string;
  days: number;
  crossedAt: number;
}

export interface CelebrationPlan {
  /** Every reached-but-uncelebrated milestone key (including the one to celebrate). */
  toMark: string[];
  /** The single milestone worth a celebration screen, if any. */
  celebrate: PendingCelebration | null;
}

export interface PlanInput {
  habits: Habit[];
  celebrated: Record<string, true>;
  now: number;
  /** Only milestones crossed after this time are celebrated; older ones are marked silently. */
  windowStart: number;
  keyFor: (habitId: string, startedAt: number, days: number) => string;
}

/**
 * Decide which milestones to mark as celebrated and which one (the highest, most
 * recent) deserves the celebration screen. Pure; the watcher supplies the window:
 * the last 24h on the first evaluation after launch, otherwise "since the last check".
 */
export function planCelebrations({ habits, celebrated, now, windowStart, keyFor }: PlanInput): CelebrationPlan {
  const toMark: string[] = [];
  let best: PendingCelebration | null = null;
  for (const h of habits) {
    if (h.archived) continue;
    const streakDays = wholeDays(now - h.startedAt);
    for (const days of milestonesReachedList(streakDays)) {
      const key = keyFor(h.id, h.startedAt, days);
      if (celebrated[key]) continue;
      toMark.push(key);
      const crossedAt = h.startedAt + days * DAY;
      if (crossedAt <= windowStart || crossedAt > now) continue;
      if (!best || days > best.days || (days === best.days && crossedAt > best.crossedAt)) {
        best = { key, habitId: h.id, days, crossedAt };
      }
    }
  }
  return { toMark, celebrate: best };
}

const BLOCKED_PREFIXES = ['/sos', '/onboarding', '/milestone', '/certificate', '/habit/new', '/journal/new'];
const BLOCKED_SUFFIXES = ['/relapse', '/edit'];

/**
 * Routes where a celebration must not interrupt: SOS exercises, onboarding,
 * another celebration, and forms (relapse, edit, new habit/journal).
 */
export function isCelebrationBlocked(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  const p = pathname.replace(/\/+$/, '') || '/';
  return BLOCKED_PREFIXES.some((b) => p === b || p.startsWith(`${b}/`)) || BLOCKED_SUFFIXES.some((s) => p.endsWith(s));
}

/**
 * Whether `days` is a milestone the habit's current streak has actually reached,
 * so /milestone never celebrates a deep link to a milestone that wasn't earned.
 */
export function isMilestoneReached(habit: Habit | null | undefined, days: number, now: number): boolean {
  if (!habit || habit.archived || !Number.isInteger(days) || days <= 0) return false;
  return milestonesReachedList(wholeDays(now - habit.startedAt)).includes(days);
}

/** The milestone celebration is on screen (other banners wait until it closes). */
export function isCelebrationRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.replace(/\/+$/, '');
  return p === '/milestone' || p.startsWith('/milestone/');
}

/** Route to the celebration screen. */
export function milestoneHref(habitId: string, days: number): string {
  return `/milestone?habitId=${encodeURIComponent(habitId)}&days=${days}`;
}
