import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { TextField } from '@/components';
import { PresetGrid } from '@/features/habit-form/PresetGrid';
import { NAME_MAX } from '@/features/habit-form/formModel';
import { useHaptics } from '@/hooks/useHaptics';
import { spacing } from '@/theme';
import type { HabitKind } from '@/types';
import { StepLayout } from '../OnboardingChrome';
import { toggleKind } from '../onboardingModel';

export interface HabitsStepProps {
  selected: HabitKind[];
  onSelectedChange: (kinds: HabitKind[]) => void;
  customName: string;
  onCustomNameChange: (name: string) => void;
  /** Shown after a Continue attempt with an unnamed custom habit. */
  customError?: string;
  onNext: () => void;
}

export function HabitsStep({ selected, onSelectedChange, customName, onCustomNameChange, customError, onNext }: HabitsStepProps) {
  const haptic = useHaptics();
  const scrollRef = useRef<ScrollView>(null);
  const count = selected.length;
  // The custom name input appears under the last tile; bring it into view.
  const revealCustom = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  return (
    <StepLayout
      scrollRef={scrollRef}
      title="What do you want to quit?"
      subtitle="Pick one or more. You can add or remove habits any time."
      footer={{
        label: count ? `Continue · ${count} selected` : 'Choose at least one',
        onPress: () => {
          onNext();
          if (selected.includes('custom') && !customName.trim()) revealCustom();
        },
        disabled: count === 0,
        iconRight: count ? 'arrow-right' : undefined,
        testID: 'onboarding-habits-next',
      }}
    >
      <PresetGrid
        selection="multi"
        selected={selected}
        onPress={(p) => {
          haptic('selection');
          const next = toggleKind(selected, p.kind);
          onSelectedChange(next);
          if (p.kind === 'custom' && next.includes('custom')) revealCustom();
        }}
      />
      {selected.includes('custom') ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.custom}>
          <TextField
            label="Name your custom habit"
            value={customName}
            onChangeText={onCustomNameChange}
            placeholder="e.g. Nail biting"
            maxLength={NAME_MAX}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="done"
            error={customError}
            accessibilityLabel="Custom habit name"
            testID="onboarding-custom-name"
          />
        </Animated.View>
      ) : (
        <View style={styles.spacer} />
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  custom: { marginTop: spacing.lg },
  spacer: { height: spacing.sm },
});
