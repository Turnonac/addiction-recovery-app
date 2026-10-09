import { wholeDays } from '@/domain/time';
import type { Habit } from '@/types';
import { pluralDays } from '@/utils/format';

/**
 * "Archived · was 29 days clean" when the archive date is known (frozen at that
 * moment). Without it, the streak is shown as it stands now — archived habits
 * keep their streak, so "29 days clean" stays true while it sits here.
 */
export function archivedSubtitle(habit: Pick<Habit, 'startedAt'> & { archivedAt?: number | null }, now: number): string {
  if (habit.archivedAt != null) {
    return `Archived · was ${pluralDays(wholeDays(habit.archivedAt - habit.startedAt))} clean`;
  }
  return `Archived · ${pluralDays(wholeDays(now - habit.startedAt))} clean`;
}

/** Message for the delete confirmation dialog. */
export function deleteHabitMessage(name: string, relapseCount: number): string {
  const history = relapseCount > 0 ? ` and its ${relapseCount === 1 ? '1 relapse' : `${relapseCount} relapses`}` : '';
  return `“${name}”${history} will be permanently deleted. Journal entries stay but are unlinked. This can’t be undone.`;
}
