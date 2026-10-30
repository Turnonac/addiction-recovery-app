import { useState } from 'react';
import { Alert } from 'react-native';

import type { StepNavProps } from '@/features/onboarding/IntroSteps';
import {
  formatTime,
  PickerSheet,
  presentPicker,
  timeToDate,
  type PickerRequest,
} from '@/features/onboarding/pickers';
import { StepScreen, TextLink } from '@/features/onboarding/StepLayout';
import { cancelDailyReminder, requestPermission, scheduleDailyReminder } from '@/services/notifications';
import { useAppStore } from '@/state/store';
import { Button, NotificationPreview, SettingsGroup, SettingsRow } from '@/ui/components';

/**
 * Removes a reminder scheduled earlier in onboarding (the user can come back to
 * this step from Done). The root layout does not reconcile until onboarding is
 * finished and the app next returns to the foreground. Best effort.
 */
async function cancelQuietly(): Promise<void> {
  try {
    await cancelDailyReminder();
  } catch {
    // reconcileReminder cancels it on the next launch / foreground.
  }
}

/**
 * Step 6: daily reminder. This page is the pre-prompt: the system permission
 * dialog only appears after "Remind me at …".
 */
export function ReminderStep({ onNext, onBack }: StepNavProps) {
  const saved = useAppStore((s) => s.settings.reminder);
  const setReminder = useAppStore((s) => s.setReminder);
  const [hour, setHour] = useState(saved.hour);
  const [minute, setMinute] = useState(saved.minute);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const time = formatTime(hour, minute);

  function pickTime() {
    presentPicker(
      {
        mode: 'time',
        title: 'Reminder time',
        value: timeToDate(hour, minute),
        onPick: (date) => {
          setHour(date.getHours());
          setMinute(date.getMinutes());
        },
      },
      setPicker,
    );
  }

  async function enable() {
    if (busy) return;
    setBusy(true);
    try {
      const granted = await requestPermission();
      if (!granted) {
        await setReminder({ enabled: false, hour, minute });
        await cancelQuietly();
        setBusy(false);
        Alert.alert(
          'Reminders are off',
          'Notifications are turned off for Light2Life. You can turn the reminder on later in Settings.',
          [{ text: 'OK', onPress: onNext }],
        );
        return;
      }
      try {
        await scheduleDailyReminder(hour, minute);
        await setReminder({ enabled: true, hour, minute });
      } catch {
        await setReminder({ enabled: false, hour, minute });
        await cancelQuietly();
        setBusy(false);
        Alert.alert(
          "Couldn't set the reminder",
          'You can try again later in Settings.',
          [{ text: 'OK', onPress: onNext }],
        );
        return;
      }
      onNext();
    } catch {
      setBusy(false);
      Alert.alert("Couldn't save", 'Please try again.');
    }
  }

  async function skip() {
    if (busy) return;
    setBusy(true);
    try {
      await setReminder({ enabled: false, hour, minute });
      await cancelQuietly();
      onNext();
    } catch {
      setBusy(false);
      Alert.alert("Couldn't save", 'Please try again.');
    }
  }

  return (
    <StepScreen
      step={6}
      onBack={onBack}
      title="A daily reminder"
      subtitle="One quiet reminder each day to log your color. You can change it or turn it off any time in Settings."
      footer={
        <>
          <Button title={`Remind me at ${time}`} size="lg" onPress={() => void enable()} disabled={busy} />
          <TextLink title="No reminders for now" onPress={() => void skip()} disabled={busy} />
        </>
      }
    >
      <SettingsGroup>
        <SettingsRow
          title="Time"
          value={time}
          onPress={pickTime}
          showChevron
          accessibilityLabel={`Reminder time, ${time}`}
          accessibilityHint="Changes the reminder time"
        />
      </SettingsGroup>
      <NotificationPreview time={time} />
      <PickerSheet request={picker} onClose={() => setPicker(null)} />
    </StepScreen>
  );
}
