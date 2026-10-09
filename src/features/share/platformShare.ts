import type { RefObject } from 'react';
import { Share, type View } from 'react-native';

import { notify } from '@/utils/confirm';

/**
 * Web implementation (also the default for TypeScript). Browsers can't share a
 * rendered view as an image without extra libraries, so web shares text via the
 * Web Share API and falls back to the clipboard. Native lives in
 * `platformShare.native.ts`.
 */
export const supportsImageShare = false;

export async function shareImage(_target: RefObject<View | null>, _title: string): Promise<boolean> {
  return false;
}

function isAbort(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'name' in e && (e as { name?: string }).name === 'AbortError';
}

export async function shareText(message: string, title: string): Promise<void> {
  try {
    await Share.share({ message, title });
    return;
  } catch (e) {
    // The user closed the browser's share sheet: nothing else to do.
    if (isAbort(e)) return;
  }
  let copied = false;
  try {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (clipboard?.writeText) {
      await clipboard.writeText(message);
      copied = true;
    }
  } catch {
    copied = false;
  }
  notify(copied ? 'Copied to clipboard' : title, copied ? `Paste it anywhere to share:\n\n${message}` : message);
}
