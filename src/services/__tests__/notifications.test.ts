/**
 * requestPermission with the real privacy cover over jest-expo's mocked
 * expo-screen-capture native module, so the order of native calls is visible.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PermissionStatus } from 'expo';
import * as Notifications from 'expo-notifications';
import ExpoScreenCapture from 'expo-screen-capture/build/ExpoScreenCapture';
import { Platform } from 'react-native';

import { requestPermission } from '@/services/notifications';
import { enablePrivacyCover } from '@/services/privacy';

// Only the enums and calls requestPermission uses (the full module warns about Expo Go on load).
jest.mock('expo-notifications', () => ({
  ...jest.requireActual<object>('expo-notifications/build/NotificationPermissions.types'),
  ...jest.requireActual<object>('expo-notifications/build/NotificationChannelManager.types'),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
}));

const native = ExpoScreenCapture as unknown as {
  enableAppSwitcherProtection: jest.Mock<(intensity: number) => Promise<void>>;
  disableAppSwitcherProtection: jest.Mock<() => Promise<void>>;
};
const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const setChannel = jest.mocked(Notifications.setNotificationChannelAsync);

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

  it('lifts the app-switcher blur while the permission alert is up', async () => {
    const order: string[] = [];
    native.disableAppSwitcherProtection.mockImplementationOnce(async () => {
      order.push('blur off');
    });
    native.enableAppSwitcherProtection.mockImplementationOnce(async () => {
      order.push('blur on');
    });
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.UNDETERMINED));
    requestPermissions.mockImplementationOnce(async () => {
      order.push('alert');
      return permissions(PermissionStatus.GRANTED);
    });

    await expect(requestPermission()).resolves.toBe(true);
    expect(order).toEqual(['blur off', 'alert', 'blur on']);
  });

  it('puts the blur back when the request fails', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.UNDETERMINED));
    requestPermissions.mockRejectedValueOnce(new Error('Unavailable'));

    await expect(requestPermission()).resolves.toBe(false);
    expect(native.disableAppSwitcherProtection).toHaveBeenCalledTimes(1);
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledTimes(1);
  });

  it('leaves the blur alone when permission is already granted', async () => {
    getPermissions.mockResolvedValueOnce(permissions(PermissionStatus.GRANTED));

    await expect(requestPermission()).resolves.toBe(true);
    expect(requestPermissions).not.toHaveBeenCalled();
    expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
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
