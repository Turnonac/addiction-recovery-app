import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useStore } from '@/store';
import { useActiveHabits, useSettings } from '@/store/selectors';
import { colors } from '@/theme';
import { getNotificationPermission } from './permissions';
import { planNotifications, planSignature, type PlannedNotification } from './plan';

const CHANNEL_ID = 'reminders';
const DEBOUNCE_MS = 1000;

let configured = false;

/** Foreground presentation + Android channel. Safe to call repeatedly. */
async function configure(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders & milestones',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: colors.accent,
      vibrationPattern: [0, 200],
    });
  }
}

function toTrigger(p: PlannedNotification): Notifications.SchedulableNotificationTriggerInput {
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;
  if (p.trigger.type === 'weekly') {
    const { weekday, hour, minute } = p.trigger;
    return { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId };
  }
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.trigger.date, channelId };
}

let queue: Promise<void> = Promise.resolve();

/** Cancel everything and schedule the current plan. Calls are serialized. */
function sync(): Promise<void> {
  queue = queue
    .then(async () => {
      await configure();
      const perm = await getNotificationPermission();
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!perm.granted) return;
      const { habits, settings } = useStore.getState();
      const plan = planNotifications(
        habits.filter((h) => !h.archived),
        settings,
        Date.now(),
      );
      for (const p of plan) {
        await Notifications.scheduleNotificationAsync({
          identifier: p.id,
          content: { title: p.title, body: p.body, sound: false, data: { url: p.url } },
          trigger: toTrigger(p),
        });
      }
    })
    .catch((e) => {
      if (__DEV__) console.warn('[notifications] sync failed', e);
    });
  return queue;
}

/** Cancel everything, after any sync that is still running. */
function cancelAll(): Promise<void> {
  queue = queue.then(() => Notifications.cancelAllScheduledNotificationsAsync()).catch(() => undefined);
  return queue;
}

/** Responses already routed (survives remounts, e.g. after a data reset). */
const handled = new Set<string>();

/** Open the screen a tapped notification is about, once per tap. */
function openFromResponse(response: Notifications.NotificationResponse | null): void {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const { request, date } = response.notification;
  // Daily reminders repeat weekly under the same identifier, so the delivery date tells taps apart.
  const key = `${request.identifier}@${date}`;
  if (handled.has(key)) return;
  handled.add(key);
  const url = request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/') && url !== '/') router.push(url);
}

export function NotificationsSync() {
  const settings = useSettings();
  const habits = useActiveHabits();
  const signature = planSignature(habits, settings);
  // Bumped when the app returns to the foreground so dated milestones stay fresh.
  const [wake, setWake] = useState(0);

  useEffect(() => {
    void configure();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setWake((n) => n + 1);
    });
    // Tapping a notification opens the screen it is about — including the tap
    // that launched the app from a killed state, which no listener receives.
    openFromResponse(Notifications.getLastNotificationResponse());
    const tapSub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => {
      appSub.remove();
      tapSub.remove();
      // Unmounted when data is reset (back to onboarding): nothing should fire any more.
      void cancelAll();
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void sync(), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [signature, wake]);

  return null;
}
