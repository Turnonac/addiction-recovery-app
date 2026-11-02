/**
 * requestPermission with the real privacy cover over jest-expo's mocked
 * expo-screen-capture native module, so any native cover call is visible.
 * Also how getPermission / requestPermission read a blocked Android reminder channel,
 * what the daily reminder says, how reconcileReminder refreshes an outdated one, and
 * which taps the reminder tap listener reports.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PermissionStatus } from 'expo';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import ExpoScreenCapture from 'expo-screen-capture/build/ExpoScreenCapture';
import { Platform } from 'react-native';

import {
  addReminderTapListener,
  CHANNEL_ID,
  getPermission,
  reconcileReminder,
  REMINDER_BODY,
  REMINDER_ID,
  REMINDER_TITLE,
  requestPermission,
  scheduleDailyReminder,
} from '@/services/notifications';
import { enablePrivacyCover } from '@/services/privacy';

// Only the enums and calls these tests use (the full module warns about Expo Go on load).
jest.mock('expo-notifications', () => ({
  ...jest.requireActual<object>('expo-notifications/build/NotificationPermissions.types'),
  ...jest.requireActual<object>('expo-notifications/build/NotificationChannelManager.types'),
  ...jest.requireActual<object>('expo-notifications/build/Notifications.types'),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getNotificationChannelAsync: jest.fn(async () => null),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'daily-checkin'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
}));

const native = ExpoScreenCapture as unknown as {
  enableAppSwitcherProtection: jest.Mock<(intensity: number) => Promise<void>>;
  disableAppSwitcherProtection: jest.Mock<() => Promise<void>>;
};
const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const setChannel = jest.mocked(Notifications.setNotificationChannelAsync);
const getChannel = jest.mocked(Notifications.getNotificationChannelAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancelScheduled = jest.mocked(Notifications.cancelScheduledNotificationAsync);
const getScheduled = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const addResponseListener = jest.mocked(Notifications.addNotificationResponseReceivedListener);

function permissions(status: PermissionStatus): Notifications.NotificationPermissionsStatus {
  return {
    status,
    granted: status === PermissionStatus.GRANTED,
    canAskAgain: status === PermissionStatus.UNDETERMINED,
    expires: 'never',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requestPermission on iOS', () => {
  beforeEach(async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await enablePrivacyCover();
    jest.clearAllMocks();
  });

  it('keeps the app-switcher blur on while the permission alert is up', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.UNDETERMINED));
    requestPermissions.mockImplementationOnce(async () => {
      // The cover is not lifted for the system alert (the blur shows behind it; accepted).
      expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
      return permissions(PermissionStatus.GRANTED);
    });

    await expect(requestPermission()).resolves.toBe(true);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(requestPermissions).toHaveBeenCalledWith({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
    // Still on afterwards: no re-enable (which would register the blur observers twice).
    expect(native.enableAppSwitcherProtection).not.toHaveBeenCalled();
  });

  it('keeps the blur on when the request fails', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.UNDETERMINED));
    requestPermissions.mockRejectedValueOnce(new Error('Unavailable'));

    await expect(requestPermission()).resolves.toBe(false);
    expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
    expect(native.enableAppSwitcherProtection).not.toHaveBeenCalled();
  });

  it('leaves the blur alone when permission is already granted', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));

    await expect(requestPermission()).resolves.toBe(true);
    expect(requestPermissions).not.toHaveBeenCalled();
    expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
  });

  it('never reads an Android channel', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    await expect(getPermission()).resolves.toBe('granted');
    expect(getChannel).not.toHaveBeenCalled();
  });
});

describe('requestPermission on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('creates the channel, then asks, without touching the iOS blur', async () => {
    const order: string[] = [];
    setChannel.mockImplementationOnce(async () => {
      order.push('channel');
      return null;
    });
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.UNDETERMINED));
    requestPermissions.mockImplementationOnce(async () => {
      order.push('ask');
      return permissions(PermissionStatus.DENIED);
    });

    await expect(requestPermission()).resolves.toBe(false);
    expect(order).toEqual(['channel', 'ask']);
    expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
    expect(native.enableAppSwitcherProtection).not.toHaveBeenCalled();
  });
});

describe('the daily-reminder channel on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  function channel(importance: AndroidImportance): Notifications.NotificationChannel {
    return { id: CHANNEL_ID, importance } as Notifications.NotificationChannel;
  }

  it('counts a channel the user turned off as denied, even with permission', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getChannel.mockResolvedValueOnce(channel(AndroidImportance.NONE));
    await expect(getPermission()).resolves.toBe('denied');
    expect(getChannel).toHaveBeenCalledWith(CHANNEL_ID);
  });

  it('does not report success for a turned-off channel, without asking again', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getChannel.mockResolvedValueOnce(channel(AndroidImportance.NONE));
    await expect(requestPermission()).resolves.toBe(false);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('does not report success when permission is newly allowed but the channel is off', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.UNDETERMINED));
    requestPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getChannel.mockResolvedValueOnce(channel(AndroidImportance.NONE));
    await expect(requestPermission()).resolves.toBe(false);
  });

  it.each([
    ['no channel yet', null],
    ['default importance', channel(AndroidImportance.DEFAULT)],
    ['low importance', channel(AndroidImportance.LOW)],
  ])('counts %s as granted', async (_what, value) => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getChannel.mockResolvedValueOnce(value);
    await expect(getPermission()).resolves.toBe('granted');

    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getChannel.mockResolvedValueOnce(value);
    await expect(requestPermission()).resolves.toBe(true);
  });

  it('counts a failed channel read as not blocked', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getChannel.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(getPermission()).resolves.toBe('granted');
  });

  it('leaves a permission that is not granted as it is, without reading the channel', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.DENIED));
    await expect(getPermission()).resolves.toBe('denied');
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.UNDETERMINED));
    await expect(getPermission()).resolves.toBe('undetermined');
    expect(getChannel).not.toHaveBeenCalled();
  });
});

describe('the daily reminder', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  /** A reminder the OS already holds, as getAllScheduledNotificationsAsync returns it. */
  function scheduled(body: string, url: string, hour = 21, minute = 0): Notifications.NotificationRequest {
    return {
      identifier: REMINDER_ID,
      content: { title: 'Daily reminder', body, data: { url } },
      trigger: { type: 'daily', hour, minute },
    } as unknown as Notifications.NotificationRequest;
  }

  it('is about the call, and never names the topic', async () => {
    expect(REMINDER_TITLE).toBe('Daily reminder');
    expect(REMINDER_BODY).toBe('Time for your daily call.');

    await scheduleDailyReminder(21, 0);

    expect(cancelScheduled).toHaveBeenCalledWith(REMINDER_ID);
    expect(schedule).toHaveBeenCalledWith({
      identifier: REMINDER_ID,
      content: {
        title: 'Daily reminder',
        body: 'Time for your daily call.',
        data: { url: '/call' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  });

  it('reschedules a reminder saved with the old color-log text', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getScheduled.mockResolvedValueOnce([scheduled('Time to log today’s color.', '/check-in')]);

    await reconcileReminder({ enabled: true, hour: 21, minute: 0 });

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0]?.[0].content).toMatchObject({ body: 'Time for your daily call.', data: { url: '/call' } });
  });

  it('leaves an up-to-date reminder alone', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getScheduled.mockResolvedValueOnce([scheduled('Time for your daily call.', '/call')]);

    await reconcileReminder({ enabled: true, hour: 21, minute: 0 });

    expect(schedule).not.toHaveBeenCalled();
  });

  it('reschedules a reminder at another time', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));
    getScheduled.mockResolvedValueOnce([scheduled('Time for your daily call.', '/call', 20, 30)]);

    await reconcileReminder({ enabled: true, hour: 21, minute: 0 });

    expect(schedule).toHaveBeenCalledTimes(1);
  });
});

describe('addReminderTapListener', () => {
  function response(identifier: string, url: string | undefined, date = 1): Notifications.NotificationResponse {
    return {
      actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
      notification: { date, request: { identifier, content: { data: url === undefined ? {} : { url } } } },
    } as unknown as Notifications.NotificationResponse;
  }

  /** Registers a listener and returns its onTap mock and the OS response handler. */
  function listen() {
    const onTap = jest.fn();
    addReminderTapListener(onTap);
    const handler = addResponseListener.mock.calls.at(-1)?.[0];
    if (!handler) throw new Error('No response listener');
    return { onTap, handler };
  }

  it('reports a tap on the reminder once', () => {
    const { onTap, handler } = listen();
    handler(response(REMINDER_ID, '/call'));
    handler(response(REMINDER_ID, '/call'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('reports a tap on a reminder scheduled before it was about the call', () => {
    const { onTap, handler } = listen();
    handler(response('older-id', '/check-in'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('ignores other notifications', () => {
    const { onTap, handler } = listen();
    handler(response('something-else', undefined));
    handler(response('something-else', '/settings', 2));
    expect(onTap).not.toHaveBeenCalled();
  });
});
