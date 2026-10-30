import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

/** Own key prefix so an unrelated `allowScreenCaptureAsync()` call cannot lift the cover. */
const PRIVACY_KEY = 'walkinlight-privacy-cover';

// iOS: the blur observers live on the native module, so once per JS runtime is
// enough (enabling again would register them twice). Set before the native call so
// overlapping calls (a prompt ending as the app returns to the foreground) cannot
// both get through; false while `withPrivacyCoverSuspended` has the cover off.
let iosCoverOn = false;

// Android: FLAG_SECURE belongs to one Activity's window, but expo-screen-capture
// skips the native call for a key it has already seen. A recreated Activity (font
// size, display size or language change) gets a new window while JS lives on, so
// each call uses a fresh key to reach native, then drops the previous key. The new
// key keeps capture blocked, so dropping the old one never lifts the flag.
let androidKeyCount = 0;
let androidActiveKey: string | null = null;

/**
 * Hides app content in the app switcher.
 * iOS: blur overlay while inactive. Android: FLAG_SECURE (blank preview, also blocks screenshots).
 * Safe to call repeatedly (on every mount and return to the foreground). Never throws.
 */
export async function enablePrivacyCover(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      if (iosCoverOn) return;
      iosCoverOn = true;
      await ScreenCapture.enableAppSwitcherProtectionAsync(0.9);
    } else if (Platform.OS === 'android') {
      androidKeyCount += 1;
      const key = `${PRIVACY_KEY}-${androidKeyCount}`;
      await ScreenCapture.preventScreenCaptureAsync(key);
      const previous = androidActiveKey;
      androidActiveKey = key;
      if (previous !== null) await ScreenCapture.allowScreenCaptureAsync(previous);
    }
  } catch {
    // Unsupported (e.g. web or a missing native module): the app still works without the cover.
    if (Platform.OS === 'ios') iosCoverOn = false; // so a later call retries
  }
}

/**
 * Runs `prompt` (a system alert, e.g. the notification permission request) with the
 * iOS cover off: the alert makes the app inactive, which would blur the screen behind
 * it. Turns the cover back on afterwards if it was on. Android: just runs `prompt`.
 */
export async function withPrivacyCoverSuspended<T>(prompt: () => Promise<T>): Promise<T> {
  if (Platform.OS !== 'ios' || !iosCoverOn) return prompt();
  try {
    await ScreenCapture.disableAppSwitcherProtectionAsync();
  } catch {
    // Still on (the flag stays true): a blurred prompt beats no cover.
    return prompt();
  }
  iosCoverOn = false; // so the re-enable below reaches native
  try {
    return await prompt();
  } finally {
    await enablePrivacyCover();
  }
}
