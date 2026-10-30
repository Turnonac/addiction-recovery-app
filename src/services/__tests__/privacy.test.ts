/**
 * Uses the real expo-screen-capture JS (with its key dedupe) over jest-expo's
 * mocked native module, so these tests see which calls actually reach native.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import ExpoScreenCapture from 'expo-screen-capture/build/ExpoScreenCapture';
import { Platform } from 'react-native';

import { enablePrivacyCover } from '@/services/privacy';

const native = ExpoScreenCapture as unknown as {
  preventScreenCapture: jest.Mock<() => Promise<void>>;
  allowScreenCapture: jest.Mock<() => Promise<void>>;
  enableAppSwitcherProtection: jest.Mock<(intensity: number) => Promise<void>>;
  disableAppSwitcherProtection: jest.Mock<() => Promise<void>>;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// First in the file on purpose: the iOS cover state lives in the module and is still
// off here, so a call that got through would reach native (and the iOS test below
// would then see the cover already on).
describe('enablePrivacyCover in screenshot mode (EXPO_PUBLIC_SCREENSHOT_MODE=1)', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SCREENSHOT_MODE = '1';
  });
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SCREENSHOT_MODE;
  });

  it('does not set FLAG_SECURE on Android, so store screenshots are not black', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await enablePrivacyCover();
    await enablePrivacyCover();
    expect(native.preventScreenCapture).not.toHaveBeenCalled();
    expect(native.allowScreenCapture).not.toHaveBeenCalled();
  });

  it('does not enable the iOS blur', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await enablePrivacyCover();
    expect(native.enableAppSwitcherProtection).not.toHaveBeenCalled();
  });

  it('only skips for the exact value "1"', async () => {
    process.env.EXPO_PUBLIC_SCREENSHOT_MODE = '0';
    jest.replaceProperty(Platform, 'OS', 'android');
    await enablePrivacyCover();
    expect(native.preventScreenCapture).toHaveBeenCalledTimes(1);
  });
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

  it('never turns the blur off (it stays on behind system alerts too)', async () => {
    await enablePrivacyCover();
    expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
  });
});
