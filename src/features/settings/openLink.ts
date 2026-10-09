import { Linking } from 'react-native';

import { withSystemPrompt } from '@/features/lock/systemPrompt';
import { notify } from '@/utils/confirm';

/**
 * Open a tel:/sms:/https: URL; if the device can't handle it (simulators,
 * tablets without a phone app), explain what to do manually.
 *
 * `canOpenURL` is not used as a gate for tel:/sms: — it returns false for
 * schemes the app didn't declare as queryable (iOS LSApplicationQueriesSchemes,
 * Android 11+ <queries>), even when the phone could place the call. `openURL`
 * itself rejects when nothing can handle the URL, which is the real signal.
 */
export async function openLink(url: string, fallbackMessage: string): Promise<void> {
  try {
    if (/^https?:/i.test(url) && !(await Linking.canOpenURL(url))) throw new Error('No browser available');
    if (/^(tel|sms):/i.test(url)) {
      // iOS shows a call/SMS confirmation (app goes `inactive`); Android may open
      // the dialer as a separate activity. Don't let the app lock cover or re-lock.
      await withSystemPrompt(() => Linking.openURL(url));
    } else {
      await Linking.openURL(url);
    }
  } catch {
    notify('Can’t open this here', fallbackMessage);
  }
}

/** Jump to this app's page in the system Settings (native only). */
export async function openSystemSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    notify('Open Settings', 'Open your device Settings, find Quit and turn on notifications.');
  }
}
