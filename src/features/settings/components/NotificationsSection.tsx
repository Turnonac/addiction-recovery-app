import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { Chip, ListGroup, ListRow, SectionHeader } from '@/components';
import { getNotificationPermission, requestNotificationPermission, type NotificationPermission } from '@/features/notifications/permissions';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { useSettings } from '@/store/selectors';
import { colors } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatReminderTime } from '../logic/reminderTime';
import { openSystemSettings } from '../openLink';
import { ReminderTimeSheet } from './ReminderTimeSheet';
import { SectionNote } from './SectionNote';
import { SettingSwitch } from './SettingSwitch';

type ToggleKey = 'dailyReminderEnabled' | 'milestoneNotificationsEnabled';

const IS_WEB = Platform.OS === 'web';

/** Current OS permission, refreshed on focus and when returning from system Settings. */
function useNotificationPermission() {
  const [perm, setPerm] = useState<NotificationPermission | null>(null);
  const refresh = useCallback(() => {
    void getNotificationPermission().then(setPerm);
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    if (IS_WEB) return;
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  return [perm, refresh] as const;
}

async function explainDenied() {
  const open = await confirm({
    title: 'Notifications are off',
    message: 'Quit isn’t allowed to send notifications. Turn them on in Settings → Quit → Notifications.',
    confirmLabel: 'Open Settings',
    cancelLabel: 'Not now',
  });
  if (open) await openSystemSettings();
}

export function NotificationsSection() {
  const settings = useSettings();
  const updateSettings = useStore((s) => s.updateSettings);
  const haptic = useHaptics();
  const [perm, refreshPerm] = useNotificationPermission();
  // Optimistic switch values while the permission prompt is open.
  const [pending, setPending] = useState<Partial<Record<ToggleKey, boolean>>>({});
  const [pickingTime, setPickingTime] = useState(false);

  const toggle = async (key: ToggleKey, value: boolean) => {
    if (!value) {
      updateSettings({ [key]: false });
      return;
    }
    setPending((p) => ({ ...p, [key]: true }));
    const granted = await requestNotificationPermission();
    setPending((p) => ({ ...p, [key]: undefined }));
    refreshPerm();
    if (granted) {
      haptic('success');
      updateSettings({ [key]: true });
    } else {
      haptic('warning');
      await explainDenied();
    }
  };

  // Web can't schedule notifications: show everything off (and disabled).
  const daily = !IS_WEB && (pending.dailyReminderEnabled ?? settings.dailyReminderEnabled);
  const milestones = !IS_WEB && (pending.milestoneNotificationsEnabled ?? settings.milestoneNotificationsEnabled);
  // Something is switched on but the OS permission is missing: never asked yet
  // (canAskAgain) or denied (only system Settings can change it).
  const needsPermission =
    !IS_WEB && perm != null && !perm.granted && (settings.dailyReminderEnabled || settings.milestoneNotificationsEnabled);
  const canAsk = !!perm?.canAskAgain;

  const allow = async () => {
    if (!canAsk) {
      await openSystemSettings();
      return;
    }
    // Declining the system prompt just leaves this row in place — no bounce to Settings.
    const granted = await requestNotificationPermission();
    refreshPerm();
    if (granted) haptic('success');
  };

  return (
    <>
      <SectionHeader title="Notifications" icon="bell-outline" />
      <ListGroup>
        {needsPermission ? (
          <ListRow
            title={canAsk ? 'Turn on notifications' : 'Notifications are blocked'}
            subtitle={canAsk ? 'Allow Quit to send reminders' : 'Allow them in Settings so Quit can remind you'}
            icon={canAsk ? 'bell-badge-outline' : 'bell-off-outline'}
            iconColor={canAsk ? colors.accent : colors.danger}
            onPress={() => void allow()}
            noChevron
            right={<Chip label={canAsk ? 'Allow' : 'Settings'} color={colors.accent} selected />}
            testID="settings-notif-blocked"
          />
        ) : null}
        <ListRow
          title="Daily check-in"
          subtitle="A gentle reminder once a day"
          icon="bell-ring-outline"
          iconColor={colors.fire}
          right={
            <SettingSwitch
              value={daily}
              onChange={(v) => void toggle('dailyReminderEnabled', v)}
              disabled={IS_WEB}
              accessibilityLabel="Daily check-in reminder"
              testID="settings-daily"
            />
          }
        />
        {daily ? (
          <ListRow
            title="Reminder time"
            icon="clock-outline"
            iconColor={colors.info}
            value={formatReminderTime(settings.dailyReminderTime)}
            onPress={() => setPickingTime(true)}
            testID="settings-reminder-time"
          />
        ) : null}
        <ListRow
          title="Milestone alerts"
          subtitle="When you reach a new milestone"
          icon="trophy-outline"
          iconColor={colors.gold}
          right={
            <SettingSwitch
              value={milestones}
              onChange={(v) => void toggle('milestoneNotificationsEnabled', v)}
              disabled={IS_WEB}
              accessibilityLabel="Milestone alerts"
              testID="settings-milestones"
            />
          }
        />
      </ListGroup>
      {IS_WEB ? <SectionNote text="Notifications are available in the iOS and Android app." /> : null}
      {pickingTime ? (
        <ReminderTimeSheet
          value={settings.dailyReminderTime}
          onClose={() => setPickingTime(false)}
          onSave={(time) => {
            setPickingTime(false);
            haptic('success');
            updateSettings({ dailyReminderTime: time });
          }}
        />
      ) : null}
    </>
  );
}
