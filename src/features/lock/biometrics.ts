import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import type { IconName } from '@/types';
import { lockMethodFrom, lockMethodIcon, lockMethodLabel, type LockMethod } from './lockLogic';
import { withSystemPrompt } from './systemPrompt';

export interface LockCapability {
  /** The device can authenticate the owner (biometrics or passcode). */
  available: boolean;
  method: LockMethod;
  /** "Face ID", "Touch ID", "Fingerprint", "Passcode"… */
  label: string;
  icon: IconName;
}

const UNAVAILABLE: LockCapability = { available: false, method: 'passcode', label: 'Passcode', icon: 'lock-outline' };

/** What the device supports right now. Never throws; web is always unavailable. */
export async function getLockCapability(): Promise<LockCapability> {
  if (Platform.OS === 'web') return UNAVAILABLE;
  try {
    const [hasHardware, enrolled, types, level] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);
    const biometrics = hasHardware && enrolled;
    const available = biometrics || level !== LocalAuthentication.SecurityLevel.NONE;
    const method = lockMethodFrom(types, biometrics);
    return { available, method, label: lockMethodLabel(method, Platform.OS), icon: lockMethodIcon(method) };
  } catch {
    return UNAVAILABLE;
  }
}

let authenticating = false;

/** Show the system prompt (biometrics with passcode fallback). Resolves true on success. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  // One prompt at a time; a second call while one is open just fails.
  if (Platform.OS === 'web' || authenticating) return false;
  authenticating = true;
  try {
    const result = await withSystemPrompt(() =>
      LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel', disableDeviceFallback: false }),
    );
    return result.success;
  } catch {
    return false;
  } finally {
    authenticating = false;
  }
}
