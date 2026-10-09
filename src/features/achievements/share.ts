import type { RefObject } from 'react';
import { Share, type View } from 'react-native';

import { notify } from '@/utils/confirm';

/**
 * Web implementation (react-native-web): no view capture — share the text with
 * the Web Share API when available, otherwise copy it to the clipboard. Only if
 * both fail is the text shown in a dialog. Native lives in `share.native.ts`.
 */
export async function shareCapture(_target: RefObject<View | null>, message: string, title: string): Promise<void> {
  await shareText(message, title);
}

export async function shareText(message: string, title: string): Promise<void> {
  try {
    await Share.share({ message, title });
    return;
  } catch (e) {
    // The user closed the browser's share sheet — nothing else to do.
    if ((e as { name?: string } | null)?.name === 'AbortError') return;
  }
  if (await copyToClipboard(message)) {
    notify('Copied to clipboard', 'Paste it anywhere to share your progress.');
    return;
  }
  notify(title, message);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
