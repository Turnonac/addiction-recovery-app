import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { currentStreak } from '@/domain/streak';
import type { StepNavProps } from '@/features/onboarding/IntroSteps';
import { formatTime } from '@/features/onboarding/pickers';
import { StepScreen } from '@/features/onboarding/StepLayout';
import { useAppStore } from '@/state/store';
import { Button } from '@/ui/components';
import { Check } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

export interface DoneStepProps extends StepNavProps {
  /** Called after completeOnboarding() succeeds; the screen navigates to the tabs. */
  onFinish: () => void;
}

/** Final page: summary, the "export before changing phones" note, then completeOnboarding(). */
export function DoneStep({ onBack, onFinish }: DoneStepProps) {
  const theme = useAppTheme();
  const today = useAppStore((s) => s.today);
  const days = useAppStore((s) => s.days);
  const counterStartDate = useAppStore((s) => s.settings.counterStartDate);
  const partner = useAppStore((s) => s.settings.partner);
  const reminder = useAppStore((s) => s.settings.reminder);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [busy, setBusy] = useState(false);

  const counter = currentStreak(Object.values(days), counterStartDate ?? today, today) ?? 0;

  const lines = [
    `Your counter: ${counter} ${counter === 1 ? 'day' : 'days'}`,
    partner !== null
      ? `You'll call ${partner.name} each day`
      : 'No partner yet. Today will remind you to add one.',
    reminder.enabled
      ? `Daily reminder at ${formatTime(reminder.hour, reminder.minute)}`
      : 'No daily reminder. You can turn it on in Settings.',
  ];

  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      await completeOnboarding();
      onFinish();
    } catch {
      setBusy(false);
      Alert.alert("Couldn't finish", 'Please try again.');
    }
  }

  return (
    <StepScreen
      onBack={onBack}
      title="You're all set"
      subtitle="Everything stays on this phone. Before you change phones, export a backup file from Settings › Your data."
      footer={<Button title="Start" size="lg" onPress={() => void finish()} disabled={busy} />}
    >
      <View
        style={{
          gap: 12,
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: theme.radius,
        }}
      >
        {lines.map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 1 }}>
              <Check size={18} color={theme.accentText} strokeWidth={2.6} />
            </View>
            <Text style={{ flex: 1, color: theme.text, fontSize: 15, lineHeight: 21 }}>{line}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
        Check in each day, then call. Small honest steps, one day at a time.
      </Text>
    </StepScreen>
  );
}
