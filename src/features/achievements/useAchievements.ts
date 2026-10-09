import { useMemo } from 'react';

import { evaluateAll, isUnlocked, type AchievementResult } from '@/domain/achievements';
import { useStore } from '@/store';

export interface AchievementView extends AchievementResult {
  /** Unlocked now or recorded earlier (achievements never re-lock). */
  isUnlocked: boolean;
  /** When it was recorded as unlocked, if known. */
  unlockedAt: number | null;
}

/** Live evaluation of every achievement merged with the recorded unlocks. */
export function useAchievements(now: number): AchievementView[] {
  const habits = useStore((s) => s.habits);
  const relapses = useStore((s) => s.relapses);
  const journal = useStore((s) => s.journal);
  const sosSessions = useStore((s) => s.sosSessions);
  const unlocked = useStore((s) => s.unlocks.achievements);
  return useMemo(
    () =>
      evaluateAll({ habits, relapses, journal, sosSessions, now }).map((r) => ({
        ...r,
        isUnlocked: isUnlocked(r, unlocked),
        unlockedAt: unlocked[r.def.id] ?? null,
      })),
    [habits, relapses, journal, sosSessions, now, unlocked],
  );
}
