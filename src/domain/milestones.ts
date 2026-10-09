import { DAY } from './time';

/**
 * Standard streak milestones in days. After one year, every additional year is a
 * milestone too (see `milestoneAfter`).
 */
export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

/** Milestones that award a printable/shareable certificate. */
export const CERTIFICATE_DAYS = [7, 30, 90, 180, 365] as const;

/** Smallest standard milestone strictly greater than `days`. */
export function milestoneAfter(days: number): number {
  for (const m of MILESTONE_DAYS) {
    if (m > days) return m;
  }
  const years = Math.floor(days / 365) + 1;
  return years * 365;
}

/** Largest standard milestone less than or equal to `days`, or 0 if none reached. */
export function milestoneReached(days: number): number {
  if (days >= 365) return Math.floor(days / 365) * 365;
  let reached = 0;
  for (const m of MILESTONE_DAYS) {
    if (m <= days) reached = m;
  }
  return reached;
}

/** All standard milestones (including yearly ones) reached for a given whole-day count. */
export function milestonesReachedList(days: number): number[] {
  const list: number[] = MILESTONE_DAYS.filter((m) => m <= days);
  for (let y = 2; y * 365 <= days; y++) list.push(y * 365);
  return list;
}

/**
 * Goal for the current streak. A user-defined goal wins while it is still ahead;
 * once reached (or if none was set) we fall back to the next standard milestone.
 */
export function currentGoalDays(cleanDays: number, userGoalDays: number | null): number {
  if (userGoalDays != null && userGoalDays > cleanDays) return userGoalDays;
  return milestoneAfter(cleanDays);
}

/**
 * Progress toward the goal as a 0..1 fraction, computed from elapsed ms so the bar
 * moves smoothly. Matches the original app: progress = clean time / goal time
 * (e.g. 29 days toward a 30-day goal = 96%).
 */
export function goalProgress(cleanMs: number, goalDays: number): number {
  if (goalDays <= 0) return 1;
  return Math.max(0, Math.min(1, cleanMs / (goalDays * DAY)));
}

/** Human label for a milestone: "1 day", "1 week", "1 month", "3 months", "1 year", "45 days". */
export function milestoneLabel(days: number): string {
  if (days === 1) return '1 day';
  if (days === 7) return '1 week';
  if (days === 14) return '2 weeks';
  if (days === 30) return '1 month';
  if (days === 60) return '2 months';
  if (days === 90) return '3 months';
  if (days === 180) return '6 months';
  if (days % 365 === 0) {
    const y = days / 365;
    return y === 1 ? '1 year' : `${y} years`;
  }
  return `${days} days`;
}
