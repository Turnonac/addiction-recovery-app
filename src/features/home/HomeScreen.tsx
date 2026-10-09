import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components';
import { nextAvailableCertificate } from '@/domain/certificates';
import type { HabitSnapshot } from '@/domain/habitStats';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { useActiveHabits, useActiveSnapshots } from '@/store/selectors';
import { spacing } from '@/theme';
import { CertificateBanner } from './CertificateBanner';
import { HabitActionSheet } from './HabitActionSheet';
import { HabitCard } from './HabitCard';
import { HOME_BOTTOM_INSET, HomeFloatingBar } from './HomeFloatingBar';
import { HomeEmptyState } from './HomeEmptyState';
import { HomeHeader } from './HomeHeader';
import { SummaryCard } from './SummaryCard';
import { WeeklySummaryRow } from './WeeklySummaryRow';

/** Live tick for the dashboard. Day counters only need coarse updates; 10s keeps "12 min" streaks fresh. */
const TICK_MS = 10_000;

/** Home dashboard: summary, certificate banner, habit cards, weekly row, SOS/Journal bar. */
export function HomeScreen() {
  const now = useNow(TICK_MS);
  const habits = useActiveHabits();
  const snapshots = useActiveSnapshots(now);
  const unlocks = useStore((s) => s.unlocks);
  const hasArchived = useStore((s) => s.habits.some((h) => h.archived));
  const [menuFor, setMenuFor] = useState<HabitSnapshot | null>(null);

  const certificate = nextAvailableCertificate(habits, unlocks, now);
  const glowColor = snapshots[0]?.habit.color;

  return (
    <Screen
      header={<HomeHeader />}
      footer={<HomeFloatingBar />}
      bottomInset={HOME_BOTTOM_INSET}
      glowColor={glowColor}
      glowIntensity={glowColor ? 0.28 : 0.35}
      testID="home-screen"
    >
      {snapshots.length === 0 ? (
        <HomeEmptyState hasArchived={hasArchived} />
      ) : (
        <View style={styles.stack}>
          <SummaryCard snapshots={snapshots} />
          {certificate ? <CertificateBanner certificate={certificate} /> : null}
          {snapshots.map((s) => (
            <HabitCard key={s.habit.id} snapshot={s} onLongPress={setMenuFor} />
          ))}
          <WeeklySummaryRow />
        </View>
      )}
      <HabitActionSheet snapshot={menuFor} onClose={() => setMenuFor(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
});
