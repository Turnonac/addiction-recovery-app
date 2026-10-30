/**
 * requestPermission with the real privacy cover over jest-expo's mocked
 * expo-screen-capture native module, so any native cover call is visible.
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
