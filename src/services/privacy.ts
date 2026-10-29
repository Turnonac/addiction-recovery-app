import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

/** Own key so an unrelated `allowScreenCaptureAsync()` call cannot lift the cover. */
const PRIVACY_KEY = 'walkinlight-privacy-cover';

/**
 * Hides app content in the app switcher.
 * iOS: blur overlay while inactive. Android: FLAG_SECURE (blank preview, also blocks screenshots).
 * Never throws.
 */
export async function enablePrivacyCover(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await ScreenCapture.enableAppSwitcherProtectionAsync(0.9);
    } else if (Platform.OS === 'android') {
      await ScreenCapture.preventScreenCaptureAsync(PRIVACY_KEY);
    }
  } catch {
    // Unsupported (e.g. web or a missing native module): the app still works without the cover.
  }
}
