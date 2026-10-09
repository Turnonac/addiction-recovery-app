import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Header, Icon, Screen, SectionHeader, Text } from '@/components';
import { MINUTE } from '@/domain/time';
import { streakAdjective, undoTargetId } from '@/features/relapse/relapseLogic';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { useHabit } from '@/store/selectors';
import { colors, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatInt } from '@/utils/format';
import { DetailStats } from '../components/DetailStats';
import { HabitNotFound } from '../components/HabitNotFound';
import { buildStreakHistory, streakLabel } from '../logic';
import { closeOr } from '../navigation';
import { StreakCard } from './StreakCard';
import { StreakChart } from './StreakChart';

/** Taps right after an undo dialog closes belong to the same gesture (double tap). */
const UNDO_COOLDOWN_MS = 800;

export interface HistoryScreenProps {
  habitId: string | undefined;
}

/** Streak history: summary, a bar per attempt, and every streak with what ended it. */
export function HistoryScreen({ habitId }: HistoryScreenProps) {
  const habit = useHabit(habitId);
  const relapses = useStore((s) => s.relapses);
  const undoLastRelapse = useStore((s) => s.undoLastRelapse);
  const haptic = useHaptics();
  const now = useNow(30_000);
  const { width } = useWindowDimensions();
  // One undo at a time: a double tap must not open two confirms and remove two relapses.
  const undoBusy = useRef(false);
  // When the last undo dialog closed. Web's confirm() blocks, so the second click of a
  // double click only arrives after the first undo is done and would target the next relapse.
  const undoClosedAt = useRef(0);
  // The shared Header keeps equal side slots, leaving ~112pt for the title on a 320pt phone.
  const title = width < 360 ? 'History' : 'Streak history';

  if (!habit) {
    return (
      <Screen header={<Header title={title} />}>
        <HabitNotFound />
      </Screen>
    );
  }

  const history = buildStreakHistory(habit, relapses, now);
  const newestFirst = [...history.items].reverse();
  // Describe exactly the relapse the store will remove.
  const targetId = undoTargetId(relapses, habit.id);
  const lastEnded = history.items.find((it) => it.relapse != null && it.relapse.id === targetId);

  const undo = async () => {
    const target = lastEnded?.relapse;
    if (undoBusy.current || Date.now() - undoClosedAt.current < UNDO_COOLDOWN_MS || !lastEnded || !target) return;
    // A tap that lands before the re-render after an undo still sees the old target.
    const isTarget = () => undoTargetId(useStore.getState().relapses, habit.id) === target.id;
    if (!isTarget()) return;
    undoBusy.current = true;
    try {
      const length = lastEnded.ms >= MINUTE ? `${streakAdjective(lastEnded.ms)} ` : '';
      const ok = await confirm({
        title: 'Undo last relapse?',
        message: `Your ${length}streak from attempt ${lastEnded.attempt} will continue as if the relapse never happened. Its triggers and note will be removed.`,
        confirmLabel: 'Undo relapse',
        destructive: true,
      });
      // Only remove the relapse the dialog described (the store may have changed meanwhile).
      if (!ok || !isTarget()) return;
      undoLastRelapse(habit.id);
      haptic('success');
    } finally {
      undoBusy.current = false;
      undoClosedAt.current = Date.now();
    }
  };

  return (
    <Screen glowColor={habit.color} glowIntensity={0.35} header={<Header title={title} subtitle={habit.name} onLeftPress={() => closeOr(`/habit/${habit.id}`)} />} testID="streak-history">
      <View style={styles.summary}>
        <DetailStats
          items={[
            { icon: 'flag', color: colors.fire, value: formatInt(history.attempts), label: history.attempts === 1 ? 'Attempt' : 'Attempts' },
            { icon: 'trophy', color: colors.gold, value: streakLabel(history.recordMs), label: 'Record' },
            { icon: 'chart-timeline-variant', color: colors.info, value: streakLabel(history.averageMs), label: 'Average streak' },
          ]}
        />
      </View>

      <View style={styles.chart}>
        <StreakChart items={history.items} color={habit.color} />
      </View>

      <SectionHeader icon="format-list-bulleted" title="ALL ATTEMPTS" />
      <View style={styles.list}>
        {newestFirst.map((it) => (
          <StreakCard key={it.attempt} item={it} color={habit.color} now={now} />
        ))}
      </View>

      {history.relapseCount === 0 ? (
        <Text variant="caption" tone="tertiary" center style={styles.footnote}>
          No relapses yet — your current streak is your record.
        </Text>
      ) : (
        <Pressable
          onPress={() => void undo()}
          accessibilityRole="button"
          accessibilityLabel="Undo last relapse"
          style={({ pressed }) => [styles.undo, pressed && styles.pressed]}
          testID="history-undo"
        >
          <Icon name="undo-variant" size={16} color={colors.textSecondary} />
          <Text variant="captionStrong" tone="secondary">
            Undo last relapse
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push(`/stats?habitId=${encodeURIComponent(habit.id)}`)}
        accessibilityRole="link"
        accessibilityLabel="Open statistics"
        style={({ pressed }) => [styles.statsLink, pressed && styles.pressed]}
      >
        <Text variant="captionStrong" color={habit.color}>
          Triggers, moods & more in Statistics
        </Text>
        <Icon name="chevron-right" size={16} color={habit.color} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: spacing.sm },
  chart: { marginTop: spacing.md },
  list: { gap: spacing.sm },
  footnote: { marginTop: spacing.lg },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    height: 40,
  },
  statsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, alignSelf: 'center', marginTop: spacing.sm, height: 36 },
  pressed: { opacity: 0.6 },
});
