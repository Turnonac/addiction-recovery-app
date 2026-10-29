/**
 * Uses the real expo-screen-capture JS (with its key dedupe) over jest-expo's
 * mocked native module, so these tests see which calls actually reach native.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ExpoScreenCapture from 'expo-screen-capture/build/ExpoScreenCapture';
import { Platform } from 'react-native';

import { enablePrivacyCover } from '@/services/privacy';

const native = ExpoScreenCapture as unknown as {
  preventScreenCapture: jest.Mock<() => Promise<void>>;
  allowScreenCapture: jest.Mock<() => Promise<void>>;
  enableAppSwitcherProtection: jest.Mock<(intensity: number) => Promise<void>>;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('enablePrivacyCover on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('sets FLAG_SECURE again on every call (a recreated Activity has a new window)', async () => {
    await enablePrivacyCover();
    await enablePrivacyCover();
    await enablePrivacyCover();
    expect(native.preventScreenCapture).toHaveBeenCalledTimes(3);
    // Dropping the previous key never re-allows capture.
    expect(native.allowScreenCapture).not.toHaveBeenCalled();
  });

  it('keeps capture blocked when calls overlap', async () => {
    await Promise.all([enablePrivacyCover(), enablePrivacyCover()]);
    expect(native.preventScreenCapture).toHaveBeenCalledTimes(2);
    expect(native.allowScreenCapture).not.toHaveBeenCalled();
  });

  it('never throws when the native call fails', async () => {
    native.preventScreenCapture.mockRejectedValueOnce(new Error('No current activity'));
    await expect(enablePrivacyCover()).resolves.toBeUndefined();
    await enablePrivacyCover();
    expect(native.allowScreenCapture).not.toHaveBeenCalled();
  });
});

describe('enablePrivacyCover on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('enables the blur once (repeat calls would register the observers twice)', async () => {
    await enablePrivacyCover();
    await enablePrivacyCover();
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledTimes(1);
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledWith(0.9);
    expect(native.preventScreenCapture).not.toHaveBeenCalled();
  });
});
