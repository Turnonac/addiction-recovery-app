import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Card, Icon, IconButton, Screen, Text } from '@/components';
import { snapshot } from '@/domain/habitStats';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { useActiveHabits } from '@/store/selectors';
import { colors, spacing } from '@/theme';
import { HabitPicker } from './components/HabitPicker';
import { StatsEmpty } from './components/StatsEmpty';
import { StatsTabs } from './components/StatsTabs';
import { StatsTopBar } from './components/StatsTopBar';
import { initialScope, pickableHabits, selectHabit, type StatsScope, type StatsTab } from './scope';
import { CompareTab } from './tabs/CompareTab';
import { MoodTab } from './tabs/MoodTab';
import { SavingsTab } from './tabs/SavingsTab';
import { StreaksTab } from './tabs/StreaksTab';
import { TriggersTab } from './tabs/TriggersTab';
import type { StatsData } from './types';

export interface StatsScreenProps {
  initialHabitId?: string;
  initialTab: StatsTab;
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Statistics modal: scope switch, habit picker, tabs and the selected tab's content. */
export function StatsScreen({ initialHabitId, initialTab }: StatsScreenProps) {
  const allHabits = useStore((s) => s.habits);
  const allRelapses = useStore((s) => s.relapses);
  const allJournal = useStore((s) => s.journal);
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn);
  const active = useActiveHabits();
  const now = useNow(60_000);
  const haptic = useHaptics();

  // A link to a deleted habit falls back to "All habits" with a short note instead of
  // quietly showing another habit.
  const [missingHabit, setMissingHabit] = useState(() => initialHabitId != null && !allHabits.some((h) => h.id === initialHabitId));
  const [scope, setScope] = useState<StatsScope>(() => initialScope(initialHabitId, !missingHabit));
  const [habitId, setHabitId] = useState<string | undefined>(initialHabitId);
  const [tab, setTab] = useState<StatsTab>(initialTab);

  const pickable = pickableHabits(active, allHabits, initialHabitId);
  const selected = selectHabit(pickable, habitId);
  const habits = scope === 'habit' ? (selected ? [selected] : []) : active;
  const ids = new Set(habits.map((h) => h.id));
  const relapses = allRelapses.filter((r) => ids.has(r.habitId));
  const journal = scope === 'habit' ? allJournal.filter((j) => j.habitId != null && ids.has(j.habitId)) : allJournal;
  const data: StatsData = {
    scope,
    habits,
    selected,
    relapses,
    journal,
    snapshots: habits.map((h) => snapshot(h, relapses, now)),
    now,
    weekStartsOn,
  };

  const header = (
    <View style={styles.header}>
      <StatsTopBar
        scope={scope}
        onScopeChange={(s) => {
          haptic('selection');
          setScope(s);
          setMissingHabit(false);
        }}
        onDone={close}
      />
      {scope === 'habit' && pickable.length > 0 ? (
        <HabitPicker
          habits={pickable}
          selectedId={selected?.id}
          onSelect={(id) => {
            haptic('selection');
            setHabitId(id);
          }}
        />
      ) : null}
      {habits.length > 0 ? (
        <StatsTabs
          value={tab}
          onChange={(t) => {
            haptic('selection');
            setTab(t);
          }}
        />
      ) : null}
    </View>
  );

  return (
    <Screen
      header={header}
      glowColor={selected && scope === 'habit' ? selected.color : colors.accent}
      glowIntensity={0.28}
      safeTop={Platform.OS !== 'ios'}
    >
      {habits.length === 0 ? (
        <StatsEmpty
          icon="chart-box-outline"
          title="Nothing to analyze yet"
          message="Add a habit you want to quit and your streaks, savings and triggers will show up here."
          actionLabel="Add a habit"
          onAction={() => router.replace('/habit/new')}
        />
      ) : (
        <View>
          {missingHabit && scope === 'all' ? <MissingHabitNote onDismiss={() => setMissingHabit(false)} /> : null}
          {tab === 'streaks' && <StreaksTab data={data} />}
          {tab === 'compare' && <CompareTab data={data} />}
          {tab === 'savings' && <SavingsTab data={data} />}
          {tab === 'triggers' && <TriggersTab data={data} />}
          {tab === 'mood' && <MoodTab data={data} />}
        </View>
      )}
    </Screen>
  );
}

function MissingHabitNote({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card padding={spacing.md} style={styles.note}>
      <View style={styles.noteRow}>
        <Icon name="information-outline" size={18} color={colors.textSecondary} />
        <Text variant="caption" tone="secondary" style={styles.noteText}>
          That habit no longer exists — showing all habits.
        </Text>
        <IconButton icon="close" size={28} onPress={onDismiss} accessibilityLabel="Dismiss note" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.md, paddingBottom: spacing.xs, gap: spacing.md },
  note: { marginTop: spacing.lg },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noteText: { flex: 1, minWidth: 0 },
});
