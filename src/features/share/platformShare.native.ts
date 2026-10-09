import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from './shareSize';

/**
 * Native implementation: captures the off-screen ShareCard as a 1080×1350 PNG
 * and opens the system share sheet with it. Web lives in `platformShare.ts`.
 *
 * The card must be laid out at SHARE_CAPTURE_WIDTH (see `shareSize.ts`) so a
 * capture at device scale is exactly 1080 px wide.
 */
export const supportsImageShare = true;

/** Returns false when image sharing isn't possible so the caller can fall back to text. */
export async function shareImage(target: RefObject<View | null>, title: string): Promise<boolean> {
  if (!target.current) return false;
  if (!(await Sharing.isAvailableAsync())) return false;
  const uri = await captureRef(target, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    ...(Platform.OS === 'ios'
      ? // No width/height on iOS: view-shot reads them as points and renderInContext
        // doesn't scale, so the card would fill only part of the image. The view
        // is captured at its own size × device scale instead. renderInContext
        // draws the card even though it is off-screen.
        { useRenderInContext: true }
      : // Android takes pixels and rescales the bitmap, which only corrects
        // layout rounding here.
        { width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT }),
  });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
  return true;
}

export async function shareText(message: string, title: string): Promise<void> {
  await Share.share({ message, title }, { dialogTitle: title, subject: title });
}
