import { router, useNavigationContainerRef, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { DAY } from '@/domain/time';
import { useNow } from '@/hooks/useNow';
import { isSystemPromptActive } from '@/features/lock/systemPrompt';
import { celebrationKey, useStore } from '@/store';
import { isCelebrationBlocked, milestoneHref, planCelebrations, type PendingCelebration } from './milestoneLogic';
import { useCanInterrupt } from './presence';

/**
 * Opens the /milestone celebration when a streak crosses a milestone. Mounted
 * once in the root layout; renders nothing.
 *
 * - First evaluation after launch: everything already reached is marked silently,
 *   except the highest milestone crossed within the last 24h, which is celebrated.
 * - Later evaluations (every 30s and whenever habits change): milestones crossed
 *   since the previous check are celebrated — only the highest one.
 * - Keys are marked before navigating so a celebration can never loop; if the
 *   current route must not be interrupted (SOS, forms…), or the app is in the
 *   background / behind the app-lock screen, it waits and retries.
 */
export function MilestoneWatcher() {
  const tick = useNow(30_000);
  const habits = useStore((s) => s.habits);
  const celebrated = useStore((s) => s.unlocks.celebrated);
  const markCelebrated = useStore((s) => s.markCelebrated);
  const pathname = usePathname();
  const navRef = useNavigationContainerRef();
  const canInterrupt = useCanInterrupt();
  const lastCheck = useRef<number | null>(null);
  const pending = useRef<PendingCelebration | null>(null);

  useEffect(() => {
    const now = Date.now();
    const windowStart = lastCheck.current ?? now - DAY;
    lastCheck.current = now;

    const plan = planCelebrations({
      habits,
      // Live map (not the render snapshot) so re-runs never double-celebrate.
      celebrated: useStore.getState().unlocks.celebrated,
      now,
      windowStart,
      keyFor: celebrationKey,
    });
    for (const key of plan.toMark) markCelebrated(key);
    if (plan.celebrate && (!pending.current || plan.celebrate.days >= pending.current.days)) pending.current = plan.celebrate;

    const next = pending.current;
    if (!next) return;
    const habit = habits.find((h) => h.id === next.habitId);
    if (!habit || habit.archived || celebrationKey(habit.id, habit.startedAt, next.days) !== next.key) {
      // Relapsed, archived or deleted meanwhile — nothing to celebrate anymore.
      pending.current = null;
      return;
    }
    if (!canInterrupt || isSystemPromptActive() || isCelebrationBlocked(pathname) || !navRef.isReady()) return;
    pending.current = null;
    router.push(milestoneHref(next.habitId, next.days));
  }, [tick, habits, celebrated, pathname, canInterrupt, markCelebrated, navRef]);

  return null;
}
