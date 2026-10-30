/**
 * Daily reminder to log the day's color: one local notification, no push, no exact alarms.
 *
 * Text is deliberately generic ("Daily reminder") so nothing about the topic
 * shows on the lock screen. Verified against expo-notifications 58.1.x
 * (`SchedulableTriggerInputTypes.DAILY`, `shouldShowBanner` / `shouldShowList`,
 * `getLastNotificationResponse`).
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from '@/domain/types';

export const REMINDER_ID = 'daily-checkin';
export const CHANNEL_ID = 'daily-reminder';

const CHANNEL_NAME = 'Daily reminder';
const REMINDER_TITLE = 'Daily reminder';
const REMINDER_BODY = 'Time to log today’s color.';
const REMINDER_URL = '/check-in';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** No banner, list entry, sound or badge while the app is in the foreground. */
export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function toPermission(settings: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (settings.granted) return 'granted';
  const iosStatus = settings.ios?.status;
  if (
    iosStatus === IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  if (settings.status === 'denied') return 'denied';
  if (settings.status === 'granted') return 'granted';
  return 'undetermined';
}

/**
 * Android: true when the user turned off the "Daily reminder" channel in the phone's
 * settings. The app-level permission still reads granted, but the reminder never shows,
 * and the app cannot turn the channel back on. No channel, or a failed read, is not blocked.
 */
async function isDailyChannelBlocked(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const channel = await Notifications.getNotificationChannelAsync(CHANNEL_ID);
    return channel?.importance === AndroidImportance.NONE;
  } catch {
    return false;
  }
}

/** A blocked Android reminder channel counts as denied (Settings then offers "Open phone settings"). */
export async function getPermission(): Promise<NotificationPermission> {
  try {
    const permission = toPermission(await Notifications.getPermissionsAsync());
    if (permission === 'granted' && (await isDailyChannelBlocked())) return 'denied';
    return permission;
  } catch {
    return 'undetermined';
  }
}

/** Android 8+ needs the channel to exist; on Android 13+ it must exist before the permission prompt. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: CHANNEL_NAME,
    importance: AndroidImportance.DEFAULT,
  });
}

/**
 * Creates the Android channel first, then asks for permission if not already granted.
 * False if the user has blocked the Android reminder channel, even with permission.
 */
export async function requestPermission(): Promise<boolean> {
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (toPermission(current) === 'granted') return !(await isDailyChannelBlocked());
    // iOS: the app-switcher blur stays on, so it shows behind the system alert (accepted).
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return toPermission(result) === 'granted' && !(await isDailyChannelBlocked());
  } catch {
    return false;
  }
}

function assertTime(hour: number, minute: number): void {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`Invalid reminder hour: ${hour}`);
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError(`Invalid reminder minute: ${minute}`);
  }
}

/**
 * Replaces any existing reminder with a DAILY trigger at hour:minute (device local time).
 * Idempotent: the fixed identifier means there is never more than one.
 * Rejects if the OS refuses to schedule (callers may catch; `reconcileReminder` retries).
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  assertTime(hour, minute);
  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
      data: { url: REMINDER_URL },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Scheduled triggers come back in a platform shape:
 * Android `{ type: 'daily', hour, minute }`, iOS `{ type: 'calendar', repeats, dateComponents: { hour, minute } }`.
 */
export function triggerMatchesTime(trigger: unknown, hour: number, minute: number): boolean {
  if (!isRecord(trigger)) return false;
  if (trigger.type === 'daily') {
    return trigger.hour === hour && trigger.minute === minute;
  }
  if (trigger.type === 'calendar' && trigger.repeats === true && isRecord(trigger.dateComponents)) {
    const c = trigger.dateComponents;
    const hasOtherComponents = ['year', 'month', 'day', 'weekday', 'weekOfMonth', 'weekOfYear'].some(
      (key) => typeof c[key] === 'number',
    );
    return !hasOtherComponents && c.hour === hour && c.minute === minute;
  }
  return false;
}

/**
 * Makes the OS schedule match the saved setting. Call on launch and whenever the app
 * returns to the foreground. Never prompts for permission and never throws.
 */
export async function reconcileReminder(reminder: Reminder): Promise<void> {
  try {
    if (!reminder.enabled) {
      await cancelDailyReminder();
      return;
    }
    if ((await getPermission()) !== 'granted') return;
    await ensureAndroidChannel();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.find((request) => request.identifier === REMINDER_ID);
    const upToDate =
      existing !== undefined &&
      existing.content.title === REMINDER_TITLE &&
      existing.content.body === REMINDER_BODY &&
      triggerMatchesTime(existing.trigger, reminder.hour, reminder.minute);
    if (!upToDate) {
      await scheduleDailyReminder(reminder.hour, reminder.minute);
    }
  } catch {
    // Retried on the next launch / foreground.
  }
}

function isReminderResponse(response: Notifications.NotificationResponse): boolean {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return false;
  const request = response.notification.request;
  return request.identifier === REMINDER_ID || request.content.data?.url === REMINDER_URL;
}

/**
 * Calls `onTap` when the user taps the reminder, including the tap that cold-started
 * the app (that one may be delivered synchronously, before this returns).
 * Returns an unsubscribe function.
 */
export function addReminderTapListener(onTap: () => void): () => void {
  let active = true;
  const handled = new Set<string>();

  const handle = (response: Notifications.NotificationResponse | null): void => {
    if (!active || !response || !isReminderResponse(response)) return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.has(key)) return;
    handled.add(key);
    try {
      // So a later remount does not route to the color log again for the same tap.
      Notifications.clearLastNotificationResponse();
    } catch {
      // Not available on this platform; the dedupe set still protects this listener.
    }
    onTap();
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);

  try {
    handle(Notifications.getLastNotificationResponse());
  } catch {
    // Native module unavailable (e.g. web): nothing to replay.
  }

  return () => {
    active = false;
    subscription.remove();
  };
}
