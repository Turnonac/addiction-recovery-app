import { router } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components';
import { stepEntering } from '@/features/habit-form/animations';
import { guessDefaultCurrency } from '@/features/habit-form/currency';
import { validateHabitForm, type HabitFormValues, type TouchableField } from '@/features/habit-form/formModel';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { colors } from '@/theme';
import type { HabitKind } from '@/types';
import { notify } from '@/utils/confirm';
import { OnboardingTopBar } from './OnboardingChrome';
import {
  buildSteps,
  customNameError,
  finalizeDrafts,
  firstName,
  propagateCurrency,
  stageIndex,
  stepKey,
  syncDrafts,
  type HabitDraft,
} from './onboardingModel';
import { FinishStep } from './steps/FinishStep';
import { HabitConfigStep } from './steps/HabitConfigStep';
import { HabitsStep } from './steps/HabitsStep';
import { NameStep } from './steps/NameStep';
import { RemindersStep } from './steps/RemindersStep';
import { WelcomeStep } from './steps/WelcomeStep';

const CONFIG_START = 3;

/** Wall-clock read for event handlers (kept out of render on purpose). */
function readClock(): number {
  return Date.now();
}

/** First-run flow: welcome → name → habits → per-habit setup → reminders → finish. */
export function OnboardingFlow() {
  const addHabit = useStore((s) => s.addHabit);
  const updateSettings = useStore((s) => s.updateSettings);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const reminderTime = useStore((s) => s.settings.dailyReminderTime);
  const haptic = useHaptics();
  const now = useNow(15_000);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<HabitKind[]>([]);
  const [customName, setCustomName] = useState('');
  const [customTried, setCustomTried] = useState(false);
  const [drafts, setDrafts] = useState<HabitDraft[]>([]);
  const [currency, setCurrency] = useState(guessDefaultCurrency);
  const [reminder, setReminder] = useState(false);
  const [configTried, setConfigTried] = useState<Record<number, true>>({});
  // `saving` drives the spinner; the ref blocks a second tap in the same frame.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  // Editing a habit from the summary: its page returns straight to the summary.
  const [returnToFinish, setReturnToFinish] = useState(false);

  const steps = buildSteps(selected.length);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const finishIndex = steps.length - 1;

  const go = (index: number, dir: 'forward' | 'back') => {
    const target = Math.max(0, index);
    setDirection(dir);
    setStepIndex(target);
    if (steps[Math.min(target, finishIndex)]?.kind !== 'config') setReturnToFinish(false);
  };
  const next = () => go(stepIndex + 1, 'forward');
  const back = () => go(stepIndex - 1, 'back');

  // Android hardware back walks the wizard instead of leaving the app, exactly
  // like the top bar's Back (which also ends the "edit from summary" detour).
  const onHardwareBack = useEffectEvent(() => {
    if (stepIndex === 0) return false;
    back();
    return true;
  });
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => sub.remove();
  }, []);

  const continueFromHabits = () => {
    if (customNameError(selected, customName)) {
      setCustomTried(true);
      haptic('error');
      return;
    }
    setDrafts((d) => syncDrafts(selected, d, { currency, now: readClock(), customName }));
    next();
  };

  const updateDraft = (index: number, patch: Partial<HabitFormValues>, touch?: TouchableField) => {
    setDrafts((ds) =>
      ds.map((d, i) => (i === index ? { values: { ...d.values, ...patch }, touched: touch ? { ...d.touched, [touch]: true } : d.touched } : d)),
    );
  };

  const continueFromConfig = (index: number) => {
    const draft = drafts[index];
    if (draft && Object.keys(validateHabitForm(draft.values, readClock()).errors).length) {
      setConfigTried((t) => ({ ...t, [index]: true }));
      haptic('error');
      return;
    }
    if (returnToFinish) go(finishIndex, 'forward');
    else next();
  };

  const toggleReminder = async (on: boolean) => {
    haptic('selection');
    setReminder(on);
    if (!on || Platform.OS === 'web') return;
    try {
      const Notifications = await import('expo-notifications');
      const res = await Notifications.requestPermissionsAsync();
      if (!res.granted) {
        setReminder(false);
        notify('Notifications are off', 'Allow notifications for Quit in your device settings to get a daily reminder.');
      }
    } catch {
      // Keep the preference; reminders are scheduled later if permission allows.
    }
  };

  const start = () => {
    if (savingRef.current) return;
    const { outputs, invalidIndex } = finalizeDrafts(drafts, readClock());
    if (invalidIndex != null) {
      setConfigTried((t) => ({ ...t, [invalidIndex]: true }));
      go(CONFIG_START + invalidIndex, 'back');
      setReturnToFinish(true);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    for (const out of outputs) addHabit(out);
    updateSettings({ userName: name.trim(), defaultCurrency: currency, dailyReminderEnabled: reminder });
    haptic('success');
    completeOnboarding();
    // The root Stack.Protected guard flips to the app; replace makes sure we land on Home.
    setTimeout(() => router.replace('/'), 0);
  };

  const renderStep = () => {
    switch (step.kind) {
      case 'welcome':
        return <WelcomeStep onNext={next} />;
      case 'name':
        return <NameStep name={name} onChange={setName} onNext={next} />;
      case 'habits':
        return (
          <HabitsStep
            selected={selected}
            onSelectedChange={setSelected}
            customName={customName}
            onCustomNameChange={setCustomName}
            customError={customTried ? customNameError(selected, customName) : undefined}
            onNext={continueFromHabits}
          />
        );
      case 'config': {
        const draft = drafts[step.index];
        if (!draft) return null;
        return (
          <HabitConfigStep
            values={draft.values}
            index={step.index}
            total={drafts.length}
            errors={configTried[step.index] ? validateHabitForm(draft.values, now).errors : {}}
            onChange={(patch, touch) => updateDraft(step.index, patch, touch)}
            onCurrencyChange={(code) => {
              setDrafts((ds) => propagateCurrency(ds, step.index, code));
              setCurrency(code);
            }}
            onNext={() => continueFromConfig(step.index)}
            returnToSummary={returnToFinish}
          />
        );
      }
      case 'reminders':
        return <RemindersStep reminder={reminder} reminderTime={reminderTime} onReminderChange={toggleReminder} onNext={next} />;
      case 'finish':
        return (
          <FinishStep
            name={firstName(name)}
            habits={drafts.map((d) => d.values)}
            reminder={reminder}
            saving={saving}
            onEditHabit={(i) => {
              go(CONFIG_START + i, 'back');
              setReturnToFinish(true);
            }}
            onStart={start}
          />
        );
    }
  };

  const glow = step.kind === 'config' && drafts[step.index] ? drafts[step.index].values.color : step.kind === 'finish' ? colors.success : colors.accent;

  return (
    <Screen
      header={
        step.kind === 'welcome' ? undefined : (
          // The name page's own CTA reads "Skip for now", so the bar shows no second Skip.
          <OnboardingTopBar stage={stageIndex(step)} onBack={back} />
        )
      }
      glowColor={glow}
      glowIntensity={step.kind === 'welcome' ? 0.5 : 0.35}
      scroll={false}
      keyboard
      contentStyle={styles.body}
      testID="onboarding"
    >
      <Animated.View key={stepKey(step)} entering={stepEntering(direction)} style={styles.flex}>
        {renderStep()}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: 0, paddingBottom: 0 },
});
