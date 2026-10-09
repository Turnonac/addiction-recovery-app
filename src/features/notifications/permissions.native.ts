import * as Notifications from 'expo-notifications';

import { withSystemPrompt } from '@/features/lock/systemPrompt';
import type { NotificationPermission } from './permissions';

export type { NotificationPermission } from './permissions';

function isGranted(p: Notifications.NotificationPermissionsStatus): boolean {
  if (p.granted) return true;
  const ios = p.ios?.status;
  return ios === Notifications.IosAuthorizationStatus.PROVISIONAL || ios === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return { supported: true, granted: isGranted(p), canAskAgain: p.canAskAgain };
  } catch {
    return { supported: true, granted: false, canAskAgain: false };
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (isGranted(current)) return true;
    if (!current.canAskAgain) return false;
    // The system alert makes iOS report `inactive`; tell the app lock it isn't the app switcher.
    const next = await withSystemPrompt(() =>
      Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      }),
    );
    return isGranted(next);
  } catch {
    return false;
  }
}
