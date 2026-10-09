import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { snapshot, type HabitSnapshot } from '@/domain/habitStats';
import type { Habit } from '@/types';
import { useStore } from './index';

/** Active (non-archived) habits sorted by home-screen order. */
export function useActiveHabits(): Habit[] {
  const habits = useStore((s) => s.habits);
  return useMemo(() => habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order), [habits]);
}

/** Archived habits, most recently created first. */
export function useArchivedHabits(): Habit[] {
  const habits = useStore((s) => s.habits);
  return useMemo(() => habits.filter((h) => h.archived).sort((a, b) => b.createdAt - a.createdAt), [habits]);
}

export function useHabit(id: string | undefined): Habit | undefined {
  return useStore((s) => (id ? s.habits.find((h) => h.id === id) : undefined));
}

/** Snapshot of one habit at `now` (pass a ticking `now` from useNow for live values). */
export function useHabitSnapshot(id: string | undefined, now: number): HabitSnapshot | undefined {
  const habit = useHabit(id);
  const relapses = useStore((s) => s.relapses);
  return useMemo(() => (habit ? snapshot(habit, relapses, now) : undefined), [habit, relapses, now]);
}

/** Snapshots of all active habits at `now`. */
export function useActiveSnapshots(now: number): HabitSnapshot[] {
  const habits = useActiveHabits();
  const relapses = useStore((s) => s.relapses);
  return useMemo(() => habits.map((h) => snapshot(h, relapses, now)), [habits, relapses, now]);
}

export function useSettings() {
  return useStore(useShallow((s) => s.settings));
}
