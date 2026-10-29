import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, Linking, Text, View } from 'react-native';

import { buildBackup, backupFileName, parseBackup, type BackupSummary } from '@/domain/backup';
import { todayLocal, toLocalDate } from '@/domain/dates';
import {
  formatDateWithYear,
  formatTime,
  PickerSheet,
  presentPicker,
  timeToDate,
  type PickerRequest,
} from '@/features/onboarding/pickers';
import { isBackupReadError, pickBackupFile, shareBackupFile } from '@/services/backupFiles';
import {
  cancelDailyReminder,
  getPermission,
  reconcileReminder,
  requestPermission,
  scheduleDailyReminder,
  type NotificationPermission,
} from '@/services/notifications';
import { useAppStore } from '@/state/store';
import {
  Avatar,
  Button,
  ColorDots,
  NotificationPreview,
  Screen,
  ScreenHeader,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
  ToggleRow,
} from '@/ui/components';
import { Users } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

type Busy = 'reminder' | 'export' | 'import' | null;

const DATA_NOTE =
  "Your data lives on this phone. WalkInLight never sends it anywhere. If iCloud or Google backup is on in your phone's settings, it's included there. You can also export a backup file.";

const RESTORED_MESSAGE = 'The data from your backup file is now on this phone.';
const DENIED_NOTE =
  "Reminders are turned off in your phone's settings. Turn on notifications for WalkInLight there to get your daily reminder.";
const UNDETERMINED_NOTE =
  'Your daily reminder needs permission to send notifications before it can arrive.';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const partner = useAppStore((s) => s.settings.partner);
  const reminder = useAppStore((s) => s.settings.reminder);
  const lastExportAt = useAppStore((s) => s.settings.lastExportAt);
  const behaviorCount = useAppStore((s) => s.behaviors.length);
  const setReminder = useAppStore((s) => s.setReminder);
  const markExported = useAppStore((s) => s.markExported);
  const replaceAll = useAppStore((s) => s.replaceAll);

  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [triedToEnable, setTriedToEnable] = useState(false);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  // Permission can change in the phone's settings while we are away.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const check = () => {
        void getPermission().then((p) => {
          if (alive) setPermission(p);
        });
      };
      check();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') check();
      });
      return () => {
        alive = false;
        sub.remove();
      };
    }, []),
  );

  const timeLabel = formatTime(reminder.hour, reminder.minute);
  const showDenied = permission === 'denied' && (reminder.enabled || triedToEnable);
  // On but never allowed (e.g. restored from a phone backup): nothing can be scheduled yet.
  const showUndetermined = permission === 'undetermined' && reminder.enabled;

  async function toggleReminder(on: boolean) {
    if (busy !== null) return;
    setBusy('reminder');
    const current = useAppStore.getState().settings.reminder;
    try {
      if (on) {
        setTriedToEnable(true);
        const granted = await requestPermission();
        setPermission(await getPermission());
        if (!granted) {
          AccessibilityInfo.announceForAccessibility(
            "Reminders are turned off in your phone's settings.",
          );
          return;
        }
        await scheduleDailyReminder(current.hour, current.minute);
        await setReminder({ ...current, enabled: true });
      } else {
        await setReminder({ ...current, enabled: false });
        try {
          await cancelDailyReminder();
        } catch {
          // reconcileReminder cancels it on the next launch / foreground.
        }
      }
    } catch {
      Alert.alert("Couldn't change the reminder", 'Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function applyTime(hour: number, minute: number) {
    const current = useAppStore.getState().settings.reminder;
    try {
      if (current.enabled) await scheduleDailyReminder(hour, minute);
      await setReminder({ enabled: current.enabled, hour, minute });
    } catch {
      Alert.alert("Couldn't change the time", 'Please try again.');
    }
  }

  function pickTime() {
    presentPicker(
      {
        mode: 'time',
        value: timeToDate(reminder.hour, reminder.minute),
        title: 'Reminder time',
        onPick: (date) => void applyTime(date.getHours(), date.getMinutes()),
      },
      setPicker,
    );
  }

  async function exportBackup() {
    if (busy !== null) return;
    setBusy('export');
    try {
      const s = useAppStore.getState();
      const exportedAt = new Date().toISOString();
      const file = buildBackup(
        { days: Object.values(s.days), behaviors: s.behaviors, settings: s.settings },
        exportedAt,
      );
      const shared = await shareBackupFile(file, backupFileName(todayLocal()));
      if (!shared) {
        Alert.alert("Couldn't export", "Sharing isn't available right now. Please try again.");
        return;
      }
      // The share sheet closes the same way whether the file was saved or not,
      // so only a confirmed save counts as a backup (and quiets Today's reminder).
      Alert.alert(
        'Did you save the backup file?',
        'Choose Yes only if you saved or sent it somewhere safe, like Files, a cloud drive or your email.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, I saved it',
            onPress: () => {
              markExported(exportedAt).catch(() => Alert.alert("Couldn't save", 'Please try again.'));
            },
          },
        ],
      );
    } catch {
      Alert.alert("Couldn't export", 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function importBackup() {
    if (busy !== null) return;
    setBusy('import');
    try {
      let raw: unknown;
      try {
        raw = await pickBackupFile();
      } catch (error) {
        const message =
          isBackupReadError(error) && error.code === 'invalid-json'
            ? "This file isn't a WalkInLight backup."
            : "That file couldn't be opened. Please try again.";
        Alert.alert("Couldn't import", message);
        return;
      }
      if (raw === null) return;

      const parsed = parseBackup(raw);
      if (!parsed.ok) {
        const message =
          parsed.error === 'newer-version'
            ? 'This backup was made by a newer version of WalkInLight. Update the app, then try again.'
            : parsed.error === 'not-a-backup'
              ? "This file isn't a WalkInLight backup."
              : "This backup file is damaged and can't be used.";
        Alert.alert("Couldn't import", message);
        return;
      }

      Alert.alert('Replace your data?', importMessage(parsed.summary), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => void restore(parsed.snapshot),
        },
      ]);
    } finally {
      setBusy(null);
    }
  }

  /**
   * A restored reminder must not show as on while nothing can be scheduled. Asks
   * for notification permission if needed (the user just chose to restore it);
   * if it is still not allowed, saves the reminder as off. Never throws.
   * @returns true if a restored reminder had to be turned off.
   */
  async function restoreReminder(): Promise<boolean> {
    const restored = useAppStore.getState().settings.reminder;
    if (!restored.enabled || (await requestPermission())) {
      await reconcileReminder(restored);
      return false;
    }
    const off = { ...restored, enabled: false };
    try {
      await setReminder(off);
    } catch {
      // Settings still shows the permission note for the reminder.
    }
    await reconcileReminder(off);
    return true;
  }

  async function restore(snapshot: Parameters<typeof replaceAll>[0]) {
    setBusy('import');
    try {
      try {
        await replaceAll(snapshot);
      } catch {
        Alert.alert("Couldn't import", 'Nothing was changed. Please try again.');
        return;
      }
      const reminderTurnedOff = await restoreReminder();
      setPermission(await getPermission());
      Alert.alert(
        'Backup restored',
        reminderTurnedOff
          ? `${RESTORED_MESSAGE}\n\nNotifications aren't allowed for WalkInLight, so the daily reminder is off. You can turn it on here in Settings.`
          : RESTORED_MESSAGE,
      );
    } finally {
      setBusy(null);
    }
  }

  const colorsSubtitle =
    behaviorCount === 0
      ? 'Write what each color looks like for you'
      : `${behaviorCount + 1} behaviors across 4 colors`;

  const lastBackup =
    lastExportAt !== null && !Number.isNaN(new Date(lastExportAt).getTime())
      ? `Last backup: ${formatDateWithYear(toLocalDate(new Date(lastExportAt)))}`
      : 'No backup file exported yet.';

  return (
    <Screen gap={18}>
      <ScreenHeader title="Settings" />

      <SettingsGroup title="Recovery">
        {partner !== null ? (
          <SettingsRow
            title={partner.name}
            subtitle={partner.phone || 'No phone number yet'}
            left={<Avatar name={partner.name} />}
            actionLabel="Edit"
            onPress={() => router.push('/settings/partner')}
            accessibilityLabel={`Partner: ${partner.name}, ${partner.phone || 'no phone number yet'}. Edit`}
          />
        ) : (
          <SettingsRow
            title="Add your partner"
            subtitle="The one person you call each day"
            left={<IconCircle />}
            onPress={() => router.push('/settings/partner')}
          />
        )}
        <SettingsRow
          title="My colors"
          subtitle={colorsSubtitle}
          left={<ColorDots />}
          onPress={() => router.push('/settings/colors')}
        />
      </SettingsGroup>

      <View style={{ gap: 8 }}>
        <SettingsGroup title="Daily reminder">
          <ToggleRow
            label="Remind me to check in"
            value={reminder.enabled}
            onValueChange={(on) => void toggleReminder(on)}
            disabled={busy === 'reminder'}
          />
          <SettingsRow
            title="Time"
            value={timeLabel}
            onPress={pickTime}
            showChevron
            disabled={!reminder.enabled}
            accessibilityLabel={`Reminder time, ${timeLabel}`}
            accessibilityHint={reminder.enabled ? 'Changes the reminder time' : 'Turn on the reminder first'}
          />
        </SettingsGroup>
        {showDenied || showUndetermined ? (
          <View
            style={{
              gap: 4,
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.line,
              borderRadius: theme.cardRadius,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
              {showDenied ? DENIED_NOTE : UNDETERMINED_NOTE}
            </Text>
            {showDenied ? (
              <Button
                title="Open phone settings"
                variant="ghost"
                onPress={() => void Linking.openSettings().catch(() => undefined)}
                style={{ alignSelf: 'flex-start', marginLeft: -12 }}
              />
            ) : (
              <Button
                title="Allow notifications"
                variant="ghost"
                onPress={() => void toggleReminder(true)}
                disabled={busy === 'reminder'}
                style={{ alignSelf: 'flex-start', marginLeft: -12 }}
              />
            )}
          </View>
        ) : null}
        {reminder.enabled ? (
          <View style={{ marginTop: 4 }}>
            <NotificationPreview time={timeLabel} />
          </View>
        ) : null}
      </View>

      <SettingsGroup title="Your data" footnote={lastBackup}>
        <SettingsNote>{DATA_NOTE}</SettingsNote>
        <SettingsRow
          title="Export backup file"
          tone="accent"
          onPress={() => void exportBackup()}
          disabled={busy !== null}
        />
        <SettingsRow
          title="Import backup file"
          tone="accent"
          onPress={() => void importBackup()}
          disabled={busy !== null}
          accessibilityHint="Replaces the data on this phone with a backup file"
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title="About WalkInLight"
          subtitle="Privacy, disclaimer and version"
          onPress={() => router.push('/settings/about')}
        />
      </SettingsGroup>

      <PickerSheet request={picker} onClose={() => setPicker(null)} />
    </Screen>
  );
}

function importMessage(summary: BackupSummary): string {
  const { dayCount, firstDate, lastDate, partnerName } = summary;
  let days: string;
  if (dayCount === 0 || firstDate === null || lastDate === null) {
    days = 'This backup has no logged days.';
  } else if (dayCount === 1) {
    days = `This backup has 1 day (${formatDateWithYear(firstDate)}).`;
  } else {
    days = `This backup has ${dayCount} days (${formatDateWithYear(firstDate)} – ${formatDateWithYear(lastDate)}).`;
  }
  const partner = partnerName ? ` Partner: ${partnerName}.` : '';
  return `${days}${partner}\n\nReplace the data on this phone? What's on this phone now will be removed.`;
}

function IconCircle() {
  const theme = useAppTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.accentSoft,
      }}
    >
      <Users size={20} color={theme.accentText} />
    </View>
  );
}
