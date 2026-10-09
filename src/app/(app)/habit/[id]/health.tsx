import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, Screen, SectionHeader } from '@/components';
import { getHealthTimeline, healthProgress } from '@/domain/catalog/health';
import { wholeDays } from '@/domain/time';
import { HealthSummary } from '@/features/recovery/health/HealthSummary';
import { TimelineRow } from '@/features/recovery/health/TimelineRow';
import { timelineState } from '@/features/recovery/logic';
import { MissingHabit } from '@/features/recovery/shared/MissingHabit';
import { RecoveryDisclaimer } from '@/features/recovery/shared/RecoveryDisclaimer';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useHabit } from '@/store/selectors';
import { spacing } from '@/theme';

/** Full health recovery timeline for one habit. */
export default function HealthRecoveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabit(id);
  const now = useNow(15_000);
  const insets = useSafeAreaInsets();
  const haptic = useHaptics();
  const scrollRef = useRef<ScrollView>(null);
  const timelineY = useRef(0);
  const currentRowY = useRef<number | null>(null);

  if (!habit) return <MissingHabit title="Health recovery" />;

  const timeline = getHealthTimeline(habit.kind);
  const cleanMs = Math.max(0, now - habit.startedAt);
  const progress = healthProgress(timeline, cleanMs);

  const jumpToCurrent = () => {
    if (currentRowY.current == null) return;
    haptic('selection');
    scrollRef.current?.scrollTo({ y: Math.max(0, timelineY.current + currentRowY.current - spacing.xxxl * 3), animated: true });
  };

  return (
    <Screen
      glowColor={habit.color}
      scroll={false}
      contentStyle={styles.shell}
      header={<Header title="Health recovery" subtitle={habit.name} left="back" />}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        testID="health-timeline-scroll"
      >
        <HealthSummary
          progress={progress}
          color={habit.color}
          streakDays={wholeDays(cleanMs)}
          onPressNext={progress.current && progress.achieved > 0 ? jumpToCurrent : undefined}
        />

        <SectionHeader icon="timeline-clock-outline" title="TIMELINE" />
        <View onLayout={(e) => (timelineY.current = e.nativeEvent.layout.y)}>
          {timeline.map((m, i) => {
            const state = timelineState(i, progress.achieved);
            return (
              <View key={m.id} onLayout={state === 'current' ? (e) => (currentRowY.current = e.nativeEvent.layout.y) : undefined}>
                <TimelineRow
                  milestone={m}
                  state={state}
                  color={habit.color}
                  isFirst={i === 0}
                  isLast={i === timeline.length - 1}
                  reachedAt={habit.startedAt + m.afterMs}
                  now={now}
                  fraction={state === 'current' && progress.current ? progress.current.fraction : state === 'achieved' ? 1 : 0}
                  msRemaining={Math.max(0, m.afterMs - cleanMs)}
                />
              </View>
            );
          })}
        </View>

        <RecoveryDisclaimer />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shell: { paddingHorizontal: 0, paddingBottom: 0 },
  content: { paddingHorizontal: spacing.lg },
});
