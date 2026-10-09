import { StyleSheet, View } from 'react-native';

import { DateTimeField, IconTile, Text, TextField } from '@/components';
import { presetFor } from '@/domain/catalog/habits';
import { FormSection } from '@/features/habit-form/FormSection';
import { CostField, GoalPicker, MinutesField } from '@/features/habit-form/fields';
import { REASON_MAX, type HabitFormErrors, type HabitFormValues, type TouchableField } from '@/features/habit-form/formModel';
import { useNow } from '@/hooks/useNow';
import { colors, spacing } from '@/theme';
import { StepLayout } from '../OnboardingChrome';

export interface HabitConfigStepProps {
  values: HabitFormValues;
  index: number;
  total: number;
  errors: HabitFormErrors;
  onChange: (patch: Partial<HabitFormValues>, touch?: TouchableField) => void;
  onCurrencyChange: (code: string) => void;
  onNext: () => void;
  /** Opened from the summary: the CTA goes straight back to it. */
  returnToSummary?: boolean;
}

/** Per-habit setup page: "Smoking (1/2)". */
export function HabitConfigStep({ values, index, total, errors, onChange, onCurrencyChange, onNext, returnToSummary }: HabitConfigStepProps) {
  const now = useNow(15_000);
  const preset = presetFor(values.kind);
  const isLast = index === total - 1;
  const errorCount = Object.keys(errors).length;
  return (
    <StepLayout
      eyebrow={
        <View style={styles.head}>
          <IconTile icon={values.icon} color={values.color} size={52} />
        </View>
      }
      title={`${values.name || preset.name} (${index + 1}/${total})`}
      subtitle="When did you quit, and what did it cost you? Rough numbers are fine."
      footer={{
        label: returnToSummary ? 'Back to summary' : isLast ? 'Continue' : 'Next habit',
        onPress: onNext,
        icon: returnToSummary ? 'format-list-checks' : undefined,
        iconRight: returnToSummary ? undefined : 'arrow-right',
        note: errorCount ? 'Please fix the highlighted fields.' : undefined,
        noteTone: 'error',
        testID: 'onboarding-config-next',
      }}
    >
      <FormSection title="Quit date" icon="calendar-clock">
        <DateTimeField value={values.startedAt} onChange={(t) => onChange({ startedAt: t })} maximumDate={now} testID="onboarding-quit-date" />
        {errors.startedAt ? (
          <Text variant="caption" color={colors.danger} style={styles.error}>
            {errors.startedAt}
          </Text>
        ) : null}
      </FormSection>

      <FormSection title="Daily spend" icon="cash" aside="Optional">
        <CostField
          value={values.cost}
          currency={values.currency}
          onChange={(t) => onChange({ cost: t }, 'cost')}
          onCurrencyChange={onCurrencyChange}
          emptyHint={preset.costHint}
          error={errors.cost}
        />
      </FormSection>

      <FormSection title="Daily time" icon="clock-outline" aside="Optional">
        <MinutesField value={values.minutes} onChange={(t) => onChange({ minutes: t }, 'minutes')} error={errors.minutes} />
      </FormSection>

      <FormSection title="Goal" icon="flag-checkered" aside="Optional">
        <GoalPicker value={values.goal} onChange={(t) => onChange({ goal: t })} allowCustom={false} error={errors.goal} />
      </FormSection>

      <FormSection title="Why do you want to quit?" icon="heart-outline" aside="Optional">
        <TextField
          value={values.reason}
          onChangeText={(t) => onChange({ reason: t })}
          placeholder="e.g. More energy, more money, more time with family."
          multiline
          maxLength={REASON_MAX}
          error={errors.reason}
          hint="We'll show this when cravings hit."
          accessibilityLabel="Why do you want to quit?"
        />
      </FormSection>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  error: { marginTop: spacing.sm, paddingHorizontal: 2 },
});
