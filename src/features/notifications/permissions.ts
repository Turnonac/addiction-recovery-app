/**
 * Web build: local notifications aren't supported, so permission is never
 * available. The native implementation lives in permissions.native.ts.
 */
export interface NotificationPermission {
  supported: boolean;
  granted: boolean;
  /** False once the user denied the system prompt (only Settings can change it). */
  canAskAgain: boolean;
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  return { supported: false, granted: false, canAskAgain: false };
}

/** Ask for permission if needed. Resolves true when notifications may be shown. */
export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}
