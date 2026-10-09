import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, FLOATING_BAR_HEIGHT, FloatingBar, FloatingBarItem, Header, IconButton, Screen } from '@/components';
import type { HabitSnapshot } from '@/domain/habitStats';
import { BrainRecoveryCard } from '@/features/recovery/BrainRecoveryCard';
import { HealthRecoverySection } from '@/features/recovery/HealthRecoverySection';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { useHabitSnapshot } from '@/store/selectors';
import { colors, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatInt } from '@/utils/format';
import { DetailMenu, type DetailMenuAction } from './components/DetailMenu';
import { DetailStats } from './components/DetailStats';
import { HabitNotFound } from './components/HabitNotFound';
import { HeroRing } from './components/HeroRing';
import { LiveCounter } from './components/LiveCounter';
import { MilestonesStrip } from './components/MilestonesStrip';
import { ReasonCard } from './components/ReasonCard';
import { RecentRelapses } from './components/RecentRelapses';
import { SavingsRow } from './components/SavingsRow';
import { useShareProgress } from './components/useShareProgress';
import { goHome } from './navigation';
import { buildStreakHistory, heroValue, recentEnded, streakLabel } from './logic';

/** Recovery sections only need coarse time; re-render them every 15s, not every second. */
const SLOW_TICK = 15_000;

export interface DetailScreenProps {
  habitId: string | undefined;
}

/** Habit detail: streak ring, live counter, stats, savings, recovery, milestones and recent relapses. */
export function DetailScreen({ habitId }: DetailScreenProps) {
  const now = useNow(1000);
  const snap = useHabitSnapshot(habitId, now);
  const relapses = useStore((s) => s.relapses);
  const setHabitArchived = useStore((s) => s.setHabitArchived);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const haptic = useHaptics();
  const [menuOpen, setMenuOpen] = useState(false);
  // Last snapshot kept while leaving after a delete, so the screen never flashes "not found".
  const [frozen, setFrozen] = useState<HabitSnapshot | null>(null);
  const { share, capture } = useShareProgress();
  const view = snap ?? frozen;

  if (!view) {
    return (
      <Screen header={<Header title="Habit" />}>
        <HabitNotFound />
      </Screen>
    );
  }

  const { habit } = view;
  const slowNow = Math.floor(now / SLOW_TICK) * SLOW_TICK;
  const history = buildStreakHistory(habit, relapses, slowNow);
  const hero = heroValue(view.streakMs);

  // Runs once the menu Modal has fully closed (DetailMenu defers it), so native
  // modals, the share sheet and alerts never present over a dismissing Modal.
  const onAction = async (action: DetailMenuAction) => {
    const id = encodeURIComponent(habit.id);
    switch (action) {
      case 'edit':
        return router.push(`/habit/${habit.id}/edit`);
      case 'stats':
        return router.push(`/stats?habitId=${id}`);
      case 'journal':
        return router.push(`/journal/new?habitId=${id}`);
      case 'history':
        return router.push(`/habit/${habit.id}/history`);
      case 'share':
        return share(view);
      case 'archive': {
        const ok = await confirm({
          title: `Archive ${habit.name}?`,
          message: 'It will be hidden from Home. Your progress is kept and you can restore it from Settings → Archived habits.',
          confirmLabel: 'Archive',
        });
        if (!ok) return;
        haptic('success');
        setHabitArchived(habit.id, true);
        return goHome();
      }
      case 'restore':
        setHabitArchived(habit.id, false);
        haptic('success');
        return;
      case 'delete': {
        const ok = await confirm({
          title: `Delete ${habit.name}?`,
          message: 'This permanently removes the habit, its streak history and relapses. Journal entries are kept. This cannot be undone.',
          confirmLabel: 'Delete',
          destructive: true,
        });
        if (!ok) return;
        haptic('warning');
        setFrozen(view);
        goHome();
        setTimeout(() => deleteHabit(habit.id), 0);
        return;
      }
    }
  };

  const header = (
    <Header
      title={habit.name}
      uppercase
      right={<IconButton icon="dots-horizontal" onPress={() => setMenuOpen(true)} accessibilityLabel="More actions" testID="detail-more" />}
    />
  );

  const footer = (
    <FloatingBar>
      <FloatingBarItem label="SOS" icon="lifebuoy" color={colors.danger} onPress={() => router.push(`/sos?habitId=${encodeURIComponent(habit.id)}`)} testID="detail-sos" />
      <View style={styles.barDivider} />
      <FloatingBarItem label="Relapse" icon="restore" color={colors.fire} onPress={() => router.push(`/habit/${habit.id}/relapse`)} testID="detail-relapse" />
    </FloatingBar>
  );

  return (
    <Screen glowColor={habit.color} glowIntensity={0.55} header={header} footer={footer} bottomInset={FLOATING_BAR_HEIGHT + spacing.lg} testID="habit-detail">
      {habit.archived ? <Chip label="Archived · hidden from Home" icon="archive-outline" color={colors.warning} style={styles.archived} /> : null}
      <HeroRing color={habit.color} streakMs={view.streakMs} progress={view.progress} goalDays={view.goalDays} />
      <LiveCounter streakMs={view.streakMs} />

      <View style={styles.stats}>
        <DetailStats
          items={[
            { icon: 'flag', color: colors.fire, value: formatInt(view.attempt), label: 'Attempt' },
            { icon: 'trophy', color: colors.gold, value: view.recordDays >= 1 ? formatInt(view.recordDays) : streakLabel(view.recordMs), label: 'Record' },
            { icon: 'check-decagram', color: colors.success, value: formatInt(view.totalCleanDays), label: 'Total clean days' },
          ]}
        />
      </View>
      <SavingsRow habit={habit} moneySaved={view.moneySaved} minutesSaved={view.minutesSaved} />

      <ReasonCard reason={habit.reason} color={habit.color} />

      <HealthRecoverySection habit={habit} now={slowNow} />
      <BrainRecoveryCard habit={habit} now={slowNow} />

      <MilestonesStrip habitId={habit.id} color={habit.color} startedAt={habit.startedAt} now={slowNow} />

      <RecentRelapses habitId={habit.id} color={habit.color} items={recentEnded(history, 2)} total={history.relapseCount} now={slowNow} />

      <DetailMenu
        visible={menuOpen}
        habit={habit}
        subtitle={`${hero.value} ${hero.unit.toLowerCase()} clean · attempt ${view.attempt}`}
        onClose={() => setMenuOpen(false)}
        onAction={(a) => void onAction(a)}
      />
      {capture}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { marginTop: spacing.xl },
  archived: { alignSelf: 'center', marginTop: spacing.sm },
  barDivider: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: colors.borderStrong },
});
