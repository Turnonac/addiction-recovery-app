/**
 * Keeps scheduled local notifications in sync with settings and habits.
 * Mounted once in the root layout. Local notifications don't exist on web, so
 * this web build renders nothing; the native implementation lives in
 * NotificationsSync.native.tsx.
 */
export function NotificationsSync() {
  return null;
}
