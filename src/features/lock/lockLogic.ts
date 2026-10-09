import type { IconName } from '@/types';

/** Re-lock when the app comes back after being in the background this long. */
export const RELOCK_AFTER_MS = 30_000;

export type LockMethod = 'face' | 'fingerprint' | 'iris' | 'passcode';

/** Numeric values of expo-local-authentication's `AuthenticationType` enum. */
export const AUTH_TYPE = { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 } as const;

/**
 * Which unlock method to advertise. Face wins over fingerprint (iPhones with
 * Face ID never report Touch ID), and without enrolled biometrics the device
 * passcode is what the system prompt will ask for.
 */
export function lockMethodFrom(supportedTypes: readonly number[], biometricsEnrolled: boolean): LockMethod {
  if (!biometricsEnrolled) return 'passcode';
  if (supportedTypes.includes(AUTH_TYPE.FACIAL_RECOGNITION)) return 'face';
  if (supportedTypes.includes(AUTH_TYPE.FINGERPRINT)) return 'fingerprint';
  if (supportedTypes.includes(AUTH_TYPE.IRIS)) return 'iris';
  return 'passcode';
}

/** Platform-appropriate name: "Face ID" / "Touch ID" on iOS, "Face Unlock" / "Fingerprint" on Android. */
export function lockMethodLabel(method: LockMethod, os: string): string {
  const ios = os === 'ios';
  switch (method) {
    case 'face':
      return ios ? 'Face ID' : 'Face Unlock';
    case 'fingerprint':
      return ios ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris';
    default:
      return 'Passcode';
  }
}

export function lockMethodIcon(method: LockMethod): IconName {
  switch (method) {
    case 'face':
      return 'face-recognition';
    case 'fingerprint':
      return 'fingerprint';
    case 'iris':
      return 'eye-outline';
    default:
      return 'lock-outline';
  }
}

/** True when the app was in the background long enough to require unlocking again. */
export function shouldRelock(backgroundAt: number | null, now: number, after: number = RELOCK_AFTER_MS): boolean {
  return backgroundAt != null && now - backgroundAt >= after;
}
