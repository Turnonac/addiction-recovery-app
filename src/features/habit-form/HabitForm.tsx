import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DateTimeField, Screen, Text, TextField } from '@/components';
import { presetFor } from '@/domain/catalog/habits';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { colors, spacing } from '@/theme';
import type { IconName } from '@/types';
import { confirm } from '@/utils/confirm';
import { AppearancePicker } from './AppearancePicker';
import { CostField, GoalPicker, MinutesField } from './fields';
import {
  applyPreset,
  changeCurrency,
  firstErrorField,
  isFormDirty,
  NAME_MAX,
  REASON_MAX,
  validateHabitForm,
  type HabitFormField,
  type HabitFormOutput,
  type HabitFormValues,
  type StreakHistory,
  type TouchableField,
  type TouchedFields,
} from './formModel';
import { FORM_KEYBOARD_DISMISS_MODE, FormSection, StickyFooter } from './FormSection';
import { HabitPreviewCard } from './HabitPreviewCard';
import { TypeStrip } from './TypeStrip';
import { useWebLeaveGuard } from './useWebLeaveGuard';

/** Lets the header and extra content leave the form without losing edits by accident. */
export interface HabitFormControls {
  /** The form has unsaved changes. */
  dirty: boolean;
  /** Run `leave` right away when nothing changed, otherwise after a "Discard changes?" confirmation. */
  guardLeave: (leave: () => void) => void;
  /**
   * Leave on purpose (archive, delete… each confirmed on its own): skip the
   * discard prompt and run `leave` once the form lets go (on web, after the
   * browser-Back guard steps aside — usually within a frame).
   */
  leaveNow: (leave: () => void) => void;
}

const HabitFormControlsContext = createContext<HabitFormControls>({
  dirty: false,
  guardLeave: (leave) => leave(),
  leaveNow: (leave) => leave(),
});

/** For components rendered inside <HabitForm> (its header and children). */
export function useHabitFormControls(): HabitFormControls {
  return use(HabitFormControlsContext);
}

export interface HabitFormProps {
  /** Screen header (<Header … />). The form renders its own Screen so the glow follows the chosen color. */
  header: ReactNode;
  initialValues: HabitFormValues;
  /** Fields treated as already edited (edit mode: everything, so nothing gets auto-refilled). */
  initialTouched?: TouchedFields;
  /** Show the Type picker (new habits only). */
  showType?: boolean;
  submitLabel: string;
  submitIcon?: IconName;
  onSubmit: (output: HabitFormOutput) => void;
  /** Earliest allowed quit date (edit: the last relapse). */
  minStartedAt?: number;
  /** Note under the quit date (edit: relapse warning). */
  dateHint?: string;
  /** Ended streaks of the habit (edit), so the preview matches its Home card. */
  history?: StreakHistory;
  /** Extra content after the fields (edit: danger zone). */
  children?: ReactNode;
}

/**
 * Shared add/edit habit form with live preview, validation and a sticky save
 * button. Leaving with unsaved changes (close, swipe-down, Android back, the
 * browser's Back or a reload on web) asks first.
 */
export function HabitForm({
  header,
  initialValues,
  initialTouched,
  showType,
  submitLabel,
  submitIcon,
  onSubmit,
  minStartedAt,
  dateHint,
  history,
  children,
}: HabitFormProps) {
  const navigation = useNavigation();
  const [initial] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<TouchedFields>(initialTouched ?? {});
  const [showErrors, setShowErrors] = useState(false);
  const [footerHeight, setFooterHeight] = useState(110);
  const scrollRef = useRef<ScrollView>(null);
  // Section positions inside the scroll content, used to scroll to the first error.
  const [offsets, setOffsets] = useState<Partial<Record<HabitFormField, number>>>({});
  const now = useNow(15_000);
  const haptic = useHaptics();
  const preset = presetFor(values.kind);
  // Refs, not state: a second tap in the same frame must see the first one.
  const submittedRef = useRef(false);
  const leavingRef = useRef(false);
  // Web only: the save waits a beat (see `submit`); leaving meanwhile is ignored.
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(
    () => () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    },
    [],
  );
  const dirty = isFormDirty(initial, values);

  const confirmDiscard = () =>
    confirm({
      title: 'Discard changes?',
      message: "Your changes to this habit haven't been saved.",
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      destructive: true,
    });

  // Web: the browser's Back and reloads skip React Navigation's beforeRemove.
  const { release } = useWebLeaveGuard(dirty && !submitting, async () => {
    // Saving: the save navigates in a moment, don't leave without it.
    if (pendingRef.current) return false;
    if (!dirty || submittedRef.current || leavingRef.current) return true;
    const ok = await confirmDiscard();
    if (ok) leavingRef.current = true;
    return ok;
  });

  // Close button, swipe-down, Android back: ask before throwing edits away.
  usePreventRemove(dirty || submitting, ({ data }) => {
    if (pendingRef.current) return;
    if (submittedRef.current || leavingRef.current) {
      release(() => navigation.dispatch(data.action));
      return;
    }
    void confirmDiscard().then((ok) => {
      if (!ok) return;
      leavingRef.current = true;
      release(() => navigation.dispatch(data.action));
    });
  });

  const controls: HabitFormControls = {
    dirty,
    guardLeave: (leave) => {
      if (pendingRef.current) return;
      if (!dirty || submittedRef.current) return release(leave);
      void confirmDiscard().then((ok) => {
        if (!ok) return;
        leavingRef.current = true;
        release(leave);
      });
    },
    leaveNow: (leave) => {
      if (pendingRef.current) return;
      leavingRef.current = true;
      release(leave);
    },
  };

  const update = (patch: Partial<HabitFormValues>, touch?: TouchableField) => {
    setValues((v) => ({ ...v, ...patch }));
    if (touch) setTouched((t) => (t[touch] ? t : { ...t, [touch]: true }));
  };

  const errors = showErrors ? validateHabitForm(values, now, { minStartedAt }).errors : {};
  const errorCount = Object.keys(errors).length;

  const track = (field: HabitFormField) => (e: LayoutChangeEvent) => {
    const y = e.nativeEvent.layout.y;
    setOffsets((o) => (o[field] === y ? o : { ...o, [field]: y }));
  };

  const submit = () => {
    if (submittedRef.current) return;
    const result = validateHabitForm(values, Date.now(), { minStartedAt });
    if (!result.output) {
      setShowErrors(true);
      haptic('error');
      const first = firstErrorField(result.errors);
      const y = first ? offsets[first] : undefined;
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: true });
      return;
    }
    const output = result.output;
    submittedRef.current = true;
    setSubmitting(true);
    haptic('success');
    if (Platform.OS !== 'web') {
      onSubmit(output);
      return;
    }
    // On web the next screen appears instantly, so the second click of a
    // double-click would land on it (the detail's floating Relapse button sits
    // right under this one). Wait out a double-click before navigating; the
    // repeat click hits this (already submitted) button instead.
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      release(() => onSubmit(output));
    }, 300);
  };

  return (
    <HabitFormControlsContext value={controls}>
      <Screen
        header={header}
        glowColor={values.color}
        glowIntensity={0.42}
        scroll={false}
        keyboard
        // Presented as an iOS page sheet: the sheet already sits below the status bar.
        safeTop={Platform.OS !== 'ios'}
        contentStyle={styles.screenBody}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: footerHeight + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={FORM_KEYBOARD_DISMISS_MODE}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(250)} style={styles.preview}>
            <HabitPreviewCard values={values} now={now} history={history} />
          </Animated.View>

          {showType ? (
            <FormSection title="Type" icon="shape-outline">
              <TypeStrip
                value={values.kind}
                onChange={(p) => {
                  haptic('selection');
                  setValues((v) => applyPreset(v, touched, p));
                }}
              />
            </FormSection>
          ) : null}

          <FormSection title="Name" icon="pencil-outline" onLayout={track('name')}>
            <TextField
              value={values.name}
              onChangeText={(t) => update({ name: t }, 'name')}
              placeholder={values.kind === 'custom' ? 'e.g. Nail biting' : preset.name}
              maxLength={NAME_MAX}
              autoCapitalize="sentences"
              returnKeyType="done"
              suffix={values.name.length >= NAME_MAX - 10 ? `${values.name.length}/${NAME_MAX}` : undefined}
              error={errors.name}
              accessibilityLabel="Habit name"
              testID="name-input"
              style={styles.input}
            />
          </FormSection>

          <FormSection title="Appearance" icon="palette-outline">
            <AppearancePicker
              color={values.color}
              icon={values.icon}
              onColorChange={(c) => update({ color: c }, 'color')}
              onIconChange={(i) => update({ icon: i }, 'icon')}
            />
          </FormSection>

          <FormSection title="Quit date & time" icon="calendar-clock" onLayout={track('startedAt')}>
            <DateTimeField
              value={values.startedAt}
              onChange={(t) => update({ startedAt: t })}
              maximumDate={now}
              minimumDate={minStartedAt}
              hint={dateHint}
              testID="quit-date"
            />
            {errors.startedAt ? (
              <Text variant="caption" color={colors.danger} style={styles.error}>
                {errors.startedAt}
              </Text>
            ) : null}
          </FormSection>

          <FormSection title="Daily cost" icon="cash" aside="Optional" onLayout={track('cost')}>
            <CostField
              value={values.cost}
              currency={values.currency}
              onChange={(t) => update({ cost: t }, 'cost')}
              onCurrencyChange={(code) => {
                setValues((v) => changeCurrency(v, touched, code, presetFor(v.kind)));
                setTouched((t) => ({ ...t, currency: true }));
              }}
              emptyHint={preset.costHint}
              error={errors.cost}
            />
          </FormSection>

          <FormSection title="Daily time" icon="clock-outline" aside="Optional" onLayout={track('minutes')}>
            <MinutesField value={values.minutes} onChange={(t) => update({ minutes: t }, 'minutes')} error={errors.minutes} />
          </FormSection>

          <FormSection title="Goal" icon="flag-checkered" onLayout={track('goal')}>
            <GoalPicker value={values.goal} onChange={(t) => update({ goal: t })} error={errors.goal} />
          </FormSection>

          <FormSection title="Why you're quitting" icon="heart-outline" aside="Optional" onLayout={track('reason')}>
            <TextField
              value={values.reason}
              onChangeText={(t) => update({ reason: t })}
              placeholder="e.g. I want to breathe freely and keep up with my kids."
              multiline
              maxLength={REASON_MAX}
              error={errors.reason}
              hint="We'll remind you of this when cravings hit."
              accessibilityLabel="Why you want to quit"
              testID="reason-input"
            />
          </FormSection>

          {children ? <View>{children}</View> : null}
        </ScrollView>

        <StickyFooter
          label={submitLabel}
          icon={submitIcon}
          onPress={submit}
          loading={submitting}
          note={errorCount ? `Please fix ${errorCount === 1 ? 'the highlighted field' : `${errorCount} highlighted fields`}.` : undefined}
          noteTone="error"
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          testID="habit-form-submit"
        />
      </Screen>
    </HabitFormControlsContext>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenBody: { paddingHorizontal: 0, paddingBottom: 0 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  preview: { marginTop: spacing.sm },
  error: { marginTop: spacing.sm, paddingHorizontal: 2 },
  input: { minWidth: 0 },
});
