import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button, EmptyState, Header, Screen } from '@/components';
import { exerciseFor } from '@/domain/catalog/exercises';
import { ExerciseRunner } from '@/features/sos/runner/ExerciseRunner';
import { isExerciseId, parseHabitId, parseIntensity, resolveContextHabit } from '@/features/sos/logic/session';
import { useStore } from '@/store';
import { colors } from '@/theme';

/** SOS exercise runner (full-screen modal, no swipe-dismiss). */
export default function ExerciseScreen() {
  const params = useLocalSearchParams<{ exercise: string; habitId?: string; before?: string }>();
  const habits = useStore((s) => s.habits);

  if (!isExerciseId(params.exercise)) {
    return (
      <Screen glowColor={colors.danger} glowIntensity={0.35} header={<Header title="Exercise" left="close" />}>
        <EmptyState
          icon="lifebuoy"
          title="Exercise not found"
          message="This exercise doesn't exist anymore. Pick another one — the craving will pass."
          color={colors.danger}
        />
        <Button label="Choose an exercise" fullWidth={false} onPress={() => router.replace('/sos')} style={styles.action} />
      </Screen>
    );
  }

  const exercise = exerciseFor(params.exercise);
  const habit = resolveContextHabit(habits, parseHabitId(params.habitId));
  return <ExerciseRunner key={exercise.id} exercise={exercise} habit={habit} before={parseIntensity(params.before)} />;
}

const styles = StyleSheet.create({
  action: { alignSelf: 'center' },
});
