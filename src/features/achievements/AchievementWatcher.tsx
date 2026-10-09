import { useEffect, useRef } from 'react';

import { evaluateAll, mostImpressive, newlyUnlockedIds } from '@/domain/achievements';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { AchievementToast } from './AchievementToast';
import { useAchievementToast } from './toastStore';

/**
 * Whether onboarding happened during this app session (the persisted state was
 * hydrated without a completed onboarding at some point). Unlocks earned while
 * onboarding — "First step", or streak badges for a habit quit weeks ago — are
 * then celebrated instead of being recorded silently like on a normal launch.
 */
let onboardedThisSession = false;

function trackOnboarding(state: ReturnType<typeof useStore.getState>): void {
  if (state.hasHydrated && !state.settings.onboardingCompleted) onboardedThisSession = true;
}

trackOnboarding(useStore.getState());
useStore.subscribe(trackOnboarding);

/**
 * Unlocks achievements as the user progresses. Mounted once in the root layout.
 * The first pass after launch records everything already earned silently (unless
 * the user just finished onboarding); later unlocks show a slide-down banner,
 * which waits while the app is backgrounded or locked and while a milestone
 * celebration is open. Renders nothing while idle.
 */
export function AchievementWatcher() {
  const tick = useNow(60_000);
  const habits = useStore((s) => s.habits);
  const relapses = useStore((s) => s.relapses);
  const journal = useStore((s) => s.journal);
  const sosSessions = useStore((s) => s.sosSessions);
  const unlocked = useStore((s) => s.unlocks.achievements);
  const unlockAchievements = useStore((s) => s.unlockAchievements);
  const showToast = useAchievementToast((s) => s.show);
  const firstPass = useRef(true);

  useEffect(() => {
    const now = Date.now();
    // Read the live map (not the render snapshot) so a re-run never re-announces.
    const recorded = useStore.getState().unlocks.achievements;
    const fresh = newlyUnlockedIds(evaluateAll({ habits, relapses, journal, sosSessions, now }), recorded);
    const silent = firstPass.current && !onboardedThisSession;
    firstPass.current = false;
    if (!fresh.length) return;
    unlockAchievements(fresh, now);
    if (silent) return;
    // A banner may still be waiting (app in the background, celebration open):
    // fold it into this one rather than losing it.
    const waiting = useAchievementToast.getState().toast;
    const ids = waiting ? [waiting.achievementId, ...fresh] : fresh;
    const best = mostImpressive(ids);
    if (best) showToast({ key: now, achievementId: best.id, extra: ids.length - 1 + (waiting?.extra ?? 0) });
  }, [tick, habits, relapses, journal, sosSessions, unlocked, unlockAchievements, showToast]);

  return <AchievementToast />;
}
