import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button, EmptyState, Header, Screen } from '@/components';
import { DangerZone } from '@/features/habit-form/DangerZone';
import { HabitForm } from '@/features/habit-form/HabitForm';
import { streakHistory, valuesFromHabit, type HabitFormOutput } from '@/features/habit-form/formModel';
import { useStore } from '@/store';
import { useHabit } from '@/store/selectors';
import type { Habit } from '@/types';
import { formatDate, plural } from '@/utils/format';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Edit habit modal: the shared form prefilled, plus restart/archive/delete. */
export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const live = useHabit(id);
  const relapses = useStore(useShallow((s) => s.relapses.filter((r) => r.habitId === id)));
  const updateHabit = useStore((s) => s.updateHabit);
  // While archiving/deleting we navigate away; keep rendering the last known habit
  // instead of flashing the "not found" state during the dismiss animation.
  const [initial] = useState(live);
  const [leaving, setLeaving] = useState(false);
  // A second tap on "Save changes" must not pop past the detail screen.
  const savedRef = useRef(false);
  const habit = live ?? (leaving ? initial : undefined);

  if (!habit) {
    return (
      <Screen header={<Header title="Edit habit" left="close" />} safeTop={Platform.OS !== 'ios'}>
        <EmptyState icon="help-circle-outline" title="Habit not found" message="It may have been deleted. Head back home to see your habits." />
        <Button label="Go home" icon="home-outline" fullWidth={false} onPress={() => router.replace('/')} style={styles.home} />
      </Screen>
    );
  }

  const relapseTimes = relapses.map((r) => r.at);
  const lastRelapse = relapseTimes.length ? Math.max(...relapseTimes) : undefined;
  const minStartedAt = lastRelapse != null ? Math.min(lastRelapse, habit.startedAt) : undefined;
  const dateHint =
    lastRelapse != null
      ? `You've logged ${plural(relapses.length, 'relapse')} (last on ${formatDate(lastRelapse)}). Changing this only moves the start of your current streak — earlier streaks stay in your history.`
      : undefined;

  const save = (out: HabitFormOutput) => {
    if (savedRef.current) return;
    savedRef.current = true;
    const patch: Partial<Omit<Habit, 'id' | 'createdAt'>> = {
      name: out.name,
      color: out.color,
      icon: out.icon,
      dailyCost: out.dailyCost,
      currency: out.currency,
      dailyMinutes: out.dailyMinutes,
      goalDays: out.goalDays,
      reason: out.reason,
    };
    if (out.startedAt !== habit.startedAt) patch.startedAt = out.startedAt;
    updateHabit(habit.id, patch);
    close();
  };

  return (
    <HabitForm
      header={<Header title="Edit habit" left="close" />}
      initialValues={valuesFromHabit(habit)}
      initialTouched={{ name: true, color: true, icon: true, cost: true, minutes: true, currency: true }}
      submitLabel="Save changes"
      submitIcon="check"
      onSubmit={save}
      minStartedAt={minStartedAt}
      dateHint={dateHint}
      history={streakHistory(relapses)}
    >
      <DangerZone habit={habit} onLeaving={() => setLeaving(true)} />
    </HabitForm>
  );
}

const styles = StyleSheet.create({
  home: { alignSelf: 'center' },
});
