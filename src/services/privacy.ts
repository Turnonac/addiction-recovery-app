import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

/** Own key prefix so an unrelated `allowScreenCaptureAsync()` call cannot lift the cover. */
const PRIVACY_KEY = 'light2life-privacy-cover';

// iOS: the blur observers live on the native module, so once per JS runtime is
// enough (enabling again would register them twice). Set before the native call so
// overlapping calls (launch and a return to the foreground) cannot both get through.
// The cover stays on for good, including behind system alerts such as the
// notification permission prompt (the blur shows behind the alert; accepted).
let iosCoverOn = false;

// Android: FLAG_SECURE belongs to one Activity's window, but expo-screen-capture
// skips the native call for a key it has already seen. A recreated Activity (font
// size, display size or language change) gets a new window while JS lives on, so
// each call uses a fresh key to reach native, then drops the previous key. The new
// key keeps capture blocked, so dropping the old one never lifts the flag.
let androidKeyCount = 0;
let androidActiveKey: string | null = null;

/**
 * Builds made only to take store-listing screenshots (eas.json profile "screenshots",
 * never submitted) set EXPO_PUBLIC_SCREENSHOT_MODE=1 so Android screenshots are not
 * black. Dot notation on purpose: Metro inlines it at bundle time, so every other
 * build keeps the cover.
 */
function isScreenshotMode(): boolean {
  return process.env.EXPO_PUBLIC_SCREENSHOT_MODE === '1';
}

/**
 * Hides app content in the app switcher.
 * iOS: blur overlay while inactive. Android: FLAG_SECURE (blank preview, also blocks screenshots).
 * Safe to call repeatedly (on every mount and return to the foreground). Never throws.
 * Does nothing in screenshot mode.
 */
export async function enablePrivacyCover(): Promise<void> {
  if (isScreenshotMode()) return;
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
