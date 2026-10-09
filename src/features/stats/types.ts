import type { HabitSnapshot } from '@/domain/habitStats';
import type { Habit, JournalEntry, Relapse } from '@/types';
import type { StatsScope } from './scope';

/** Everything a statistics tab needs, already filtered to the current scope. */
export interface StatsData {
  scope: StatsScope;
  /** Habits in scope: the selected habit, or every active habit. */
  habits: Habit[];
  /** The habit picked in "This habit" mode. */
  selected: Habit | undefined;
  /** Relapses of the habits in scope. */
  relapses: Relapse[];
  /** Journal entries in scope (linked to the habit in "This habit" mode). */
  journal: JournalEntry[];
  snapshots: HabitSnapshot[];
  now: number;
  weekStartsOn: 0 | 1;
}
