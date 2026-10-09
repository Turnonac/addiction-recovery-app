import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Header, Screen, Text } from '@/components';
import { stepEntering } from '@/features/habit-form/animations';
import { HabitForm, useHabitFormControls } from '@/features/habit-form/HabitForm';
import { valuesFromPreset, type HabitFormOutput, type HabitFormValues } from '@/features/habit-form/formModel';
import { PresetGrid } from '@/features/habit-form/PresetGrid';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';

/** New habit modal: pick a preset, then fine-tune it in the shared form. */
export default function NewHabitScreen() {
  const defaultCurrency = useStore((s) => s.settings.defaultCurrency);
  const addHabit = useStore((s) => s.addHabit);
  const haptic = useHaptics();
  // Form values are created when a preset is picked (that's the moment "now" means).
  const [initial, setInitial] = useState<HabitFormValues | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  // Guards against a double tap creating the habit twice (HabitForm guards too).
  const createdRef = useRef(false);

  const create = (out: HabitFormOutput) => {
    if (createdRef.current) return;
    createdRef.current = true;
    const id = addHabit(out);
    router.replace(`/habit/${id}`);
  };

  if (!initial) {
    return (
      <Animated.View key="pick" style={styles.flex} entering={direction === 'back' ? stepEntering('back') : undefined}>
        <Screen
          header={<Header title="New habit" left="close" />}
          glowColor={colors.accent}
          glowIntensity={0.3}
          // Presented as an iOS page sheet: the sheet already sits below the status bar.
          safeTop={Platform.OS !== 'ios'}
        >
          <View style={styles.intro}>
            <Text variant="title">What do you want to quit?</Text>
            <Text variant="body" tone="secondary">
              Pick a type to start with sensible defaults. You can change everything on the next step.
            </Text>
          </View>
          <PresetGrid
            selected={[]}
            onPress={(p) => {
              haptic('selection');
              setDirection('forward');
              setInitial(valuesFromPreset(p, defaultCurrency, Date.now()));
            }}
          />
        </Screen>
      </Animated.View>
    );
  }

  return (
    <Animated.View key="form" style={styles.flex} entering={stepEntering('forward')}>
      <HabitForm
        header={
          <FormHeader
            onBack={() => {
              setDirection('back');
              setInitial(null);
            }}
          />
        }
        initialValues={initial}
        showType
        submitLabel="Start tracking"
        submitIcon="check"
        onSubmit={create}
      />
    </Animated.View>
  );
}

/** Step 2 header: back to the preset grid, asking first if the form was edited. */
function FormHeader({ onBack }: { onBack: () => void }) {
  const { guardLeave } = useHabitFormControls();
  return <Header title="New habit" left="back" onLeftPress={() => guardLeave(onBack)} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xl },
});
