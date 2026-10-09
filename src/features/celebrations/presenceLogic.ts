/**
 * With app lock on, the lock screen and the Face ID / passcode prompt show first
 * whenever the app comes to the foreground. Interruptions (achievement banner,
 * milestone celebration) wait this long after the app became active, so they
 * never open on top of — or hidden behind — the lock screen.
 */
export const LOCK_SETTLE_MS = 1500;

export interface InterruptInput {
  /** `AppState.currentState` ('active' | 'background' | 'inactive' | 'unknown' …). */
  appState: string | null | undefined;
  /** `settings.appLockEnabled`. */
  lockEnabled: boolean;
  /** The lock settle window since the app last came to the foreground has passed. */
  settled: boolean;
}

/** Whether the app is visible to the user (not backgrounded, not behind the app switcher or a system prompt). */
export function isForeground(appState: string | null | undefined): boolean {
  return appState !== 'background' && appState !== 'inactive';
}

/**
 * Whether a banner or celebration may show right now. While it may not, callers
 * hold it (never drop it) and show it once this turns true again.
 */
export function canInterrupt({ appState, lockEnabled, settled }: InterruptInput): boolean {
  return isForeground(appState) && (!lockEnabled || settled);
}
