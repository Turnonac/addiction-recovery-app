import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Chip, Text, TextField } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { spacing } from '@/theme';
import { currencySymbol, formatInt, formatMinutes, formatMoney } from '@/utils/format';
import { CurrencyButton } from './CurrencyPicker';
import { GOAL_PRESETS, MINUTE_PRESETS, sanitizeDecimalInput, sanitizeIntegerInput, yearlyAmount, yearlyHours } from './formModel';

/** Hint under a field; hidden while the field shows its own error. */
function FieldNote({ error, hint }: { error?: string; hint?: string }) {
  if (error) return null;
  return hint ? (
    <Text variant="caption" tone="tertiary" style={styles.note}>
      {hint}
    </Text>
  ) : null;
}

export interface CostFieldProps {
  value: string;
  currency: string;
  onChange: (text: string) => void;
  onCurrencyChange: (code: string) => void;
  /** Shown when nothing is entered (e.g. the preset's cost hint). */
  emptyHint?: string;
  error?: string;
}

/** Daily spend with the currency symbol inside the field and a currency picker beside it. */
export function CostField({ value, currency, onChange, onCurrencyChange, emptyHint, error }: CostFieldProps) {
  const yearly = yearlyAmount(value);
  const hint = yearly != null ? `≈ ${formatMoney(yearly, currency, { compact: yearly >= 1000 })} a year you'll keep` : emptyHint;
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            value={value}
            onChangeText={(t) => onChange(sanitizeDecimalInput(t))}
            prefix={currencySymbol(currency)}
            suffix="per day"
            placeholder="0"
            keyboardType="decimal-pad"
            inputMode="decimal"
            returnKeyType="done"
            accessibilityLabel={`Daily spend in ${currency}`}
            testID="cost-input"
            error={error}
            style={styles.input}
          />
        </View>
        <CurrencyButton value={currency} onChange={onCurrencyChange} />
      </View>
      <FieldNote error={error} hint={hint} />
    </View>
  );
}

export interface MinutesFieldProps {
  value: string;
  onChange: (text: string) => void;
  error?: string;
}

/** Minutes per day with 15/30/60/120 quick chips. */
export function MinutesField({ value, onChange, error }: MinutesFieldProps) {
  const haptic = useHaptics();
  const hours = yearlyHours(value);
  return (
    <View>
      <TextField
        value={value}
        onChangeText={(t) => onChange(sanitizeIntegerInput(t, 4))}
        suffix="min per day"
        placeholder="0"
        keyboardType="number-pad"
        inputMode="numeric"
        returnKeyType="done"
        accessibilityLabel="Minutes per day"
        testID="minutes-input"
        error={error}
        style={styles.input}
      />
      <View style={styles.chips}>
        {MINUTE_PRESETS.map((m) => (
          <Chip
            key={m}
            label={formatMinutes(m)}
            size="md"
            selected={value === String(m)}
            onPress={() => {
              haptic('selection');
              onChange(String(m));
            }}
            accessibilityLabel={`${m} minutes`}
          />
        ))}
      </View>
      <FieldNote error={error} hint={hours != null ? `≈ ${formatInt(hours)} hours a year back in your life` : 'Time spent on the habit each day — optional.'} />
    </View>
  );
}

export interface GoalPickerProps {
  /** '' = Auto */
  value: string;
  onChange: (text: string) => void;
  /** Offer a free number input after the preset chips. */
  allowCustom?: boolean;
  error?: string;
}

export function goalChipLabel(days: number): string {
  return days === 365 ? '1 year' : `${days} days`;
}

/** Auto + preset day chips (+ optional custom number). */
export function GoalPicker({ value, onChange, allowCustom = true, error }: GoalPickerProps) {
  const haptic = useHaptics();
  const isPreset = (GOAL_PRESETS as readonly number[]).map(String).includes(value);
  const [customOpen, setCustomOpen] = useState(value !== '' && !isPreset);
  // Focus the input only when the user opens it — never when a saved custom goal is shown on mount.
  const [focusCustom, setFocusCustom] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const showCustom = allowCustom && (customOpen || (value !== '' && !isPreset));
  const pick = (v: string, custom = false) => {
    haptic('selection');
    setCustomOpen(custom);
    setFocusCustom(custom);
    onChange(v);
  };
  const days = Number(value);
  const hint =
    value === ''
      ? showCustom
        ? 'Type a number of days — left empty, the goal stays on Auto.'
        : 'Auto aims for the next milestone: 1, 3, 7, 14, 30 days and beyond.'
      : Number.isFinite(days) && days > 0
        ? `You'll aim for ${days} clean ${days === 1 ? 'day' : 'days'}, then the next milestone.`
        : undefined;
  return (
    <View>
      <View style={styles.chips}>
        <Chip label="Auto" icon="auto-fix" size="md" selected={value === '' && !customOpen} onPress={() => pick('')} />
        {GOAL_PRESETS.map((d) => (
          <Chip key={d} label={goalChipLabel(d)} size="md" selected={!showCustom && value === String(d)} onPress={() => pick(String(d))} />
        ))}
        {allowCustom ? (
          <Chip
            label="Custom"
            icon="pencil-outline"
            size="md"
            selected={showCustom}
            onPress={() => {
              // Already visible (e.g. a saved custom goal): autoFocus won't fire again.
              if (showCustom) inputRef.current?.focus();
              pick(isPreset ? '' : value, true);
            }}
          />
        ) : null}
      </View>
      {showCustom ? (
        <View style={styles.custom}>
          <TextField
            ref={inputRef}
            value={value}
            onChangeText={(t) => onChange(sanitizeIntegerInput(t, 4))}
            suffix="days"
            placeholder="e.g. 45"
            keyboardType="number-pad"
            inputMode="numeric"
            autoFocus={focusCustom}
            // Left empty, the goal is Auto: show it that way instead of an empty "Custom".
            onBlur={() => {
              if (value === '') {
                setCustomOpen(false);
                setFocusCustom(false);
              }
            }}
            accessibilityLabel="Custom goal in days"
            testID="goal-input"
            error={error}
            style={styles.input}
          />
        </View>
      ) : null}
      <FieldNote error={error} hint={hint} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  // Lets the input shrink so a suffix ("per day") keeps its natural width (web inputs have an intrinsic min width).
  input: { minWidth: 0 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  custom: { marginTop: spacing.sm },
  note: { marginTop: spacing.sm, paddingHorizontal: 2 },
});
