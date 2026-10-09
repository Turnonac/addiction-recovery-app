import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Native implementation: captures `target` as a PNG and opens the system share
 * sheet; falls back to sharing `message` as text if capture isn't possible.
 */
export async function shareCapture(target: RefObject<View | null>, message: string, title: string): Promise<void> {
  if (target.current && (await Sharing.isAvailableAsync())) {
    try {
      const uri = await captureRef(target, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
      return;
    } catch {
      // fall through to text sharing
    }
  }
  await shareText(message, title);
}

export async function shareText(message: string, title: string): Promise<void> {
  try {
    await Share.share(Platform.OS === 'ios' ? { message } : { message, title }, { dialogTitle: title, subject: title });
  } catch {
    // user dismissed or sharing unavailable — nothing else to do
  }
}
