/**
 * Uses the real expo-screen-capture JS (with its key dedupe) over jest-expo's
 * mocked native module, so these tests see which calls actually reach native.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ExpoScreenCapture from 'expo-screen-capture/build/ExpoScreenCapture';
import { Platform } from 'react-native';

import { enablePrivacyCover, withPrivacyCoverSuspended } from '@/services/privacy';

const native = ExpoScreenCapture as unknown as {
  preventScreenCapture: jest.Mock<() => Promise<void>>;
  allowScreenCapture: jest.Mock<() => Promise<void>>;
  enableAppSwitcherProtection: jest.Mock<(intensity: number) => Promise<void>>;
  disableAppSwitcherProtection: jest.Mock<() => Promise<void>>;
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

// The cover's state lives in the module, so each test starts from "on" (a no-op if it
// already is) and every test leaves it on.
describe('withPrivacyCoverSuspended on iOS', () => {
  beforeEach(async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await enablePrivacyCover();
    jest.clearAllMocks();
  });

  it('lifts the blur for the prompt and puts it back after', async () => {
    const order: string[] = [];
    native.disableAppSwitcherProtection.mockImplementationOnce(async () => {
      order.push('blur off');
    });
    native.enableAppSwitcherProtection.mockImplementationOnce(async () => {
      order.push('blur on');
    });
    const result = withPrivacyCoverSuspended(async () => {
      order.push('prompt');
      return 'granted';
    });
    await expect(result).resolves.toBe('granted');
    expect(order).toEqual(['blur off', 'prompt', 'blur on']);
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledWith(0.9);
  });

  it('puts the blur back when the prompt fails', async () => {
    const error = new Error('No key window');
    await expect(withPrivacyCoverSuspended(() => Promise.reject(error))).rejects.toBe(error);
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledTimes(1);
  });

  it('registers the observers once when the app returns to the foreground as the prompt ends', async () => {
    native.enableAppSwitcherProtection.mockImplementationOnce(async () => {
      // The foreground handler's call, while the re-enable is still in flight.
      await enablePrivacyCover();
    });
    await withPrivacyCoverSuspended(async () => 'granted');
    await enablePrivacyCover();
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledTimes(1);
  });

  it('leaves the cover alone when it is already lifted', async () => {
    await withPrivacyCoverSuspended(async () => {
      await withPrivacyCoverSuspended(async () => 'granted');
      expect(native.disableAppSwitcherProtection).toHaveBeenCalledTimes(1);
      expect(native.enableAppSwitcherProtection).not.toHaveBeenCalled();
    });
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledTimes(1);
  });

  it('keeps the cover on (and does not re-register) when lifting it fails', async () => {
    native.disableAppSwitcherProtection.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(withPrivacyCoverSuspended(async () => 'granted')).resolves.toBe('granted');
    await enablePrivacyCover();
    expect(native.enableAppSwitcherProtection).not.toHaveBeenCalled();
  });

  it('retries on the next call when putting the cover back fails', async () => {
    native.enableAppSwitcherProtection.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(withPrivacyCoverSuspended(async () => 'granted')).resolves.toBe('granted');
    await enablePrivacyCover();
    expect(native.enableAppSwitcherProtection).toHaveBeenCalledTimes(2);
  });
});

describe('withPrivacyCoverSuspended on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('just runs the prompt (FLAG_SECURE stays set)', async () => {
    await enablePrivacyCover();
    jest.clearAllMocks();
    await expect(withPrivacyCoverSuspended(async () => 'granted')).resolves.toBe('granted');
    expect(native.allowScreenCapture).not.toHaveBeenCalled();
    expect(native.preventScreenCapture).not.toHaveBeenCalled();
    expect(native.disableAppSwitcherProtection).not.toHaveBeenCalled();
    expect(native.enableAppSwitcherProtection).not.toHaveBeenCalled();
  });
});
