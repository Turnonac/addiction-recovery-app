import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useLockCover } from '@/features/lock/lockState';
import { useStore } from '@/store';
import { LOCK_SETTLE_MS, canInterrupt } from './presenceLogic';

/**
 * True while the app is in the foreground and — with app lock on — past the
 * settle window after coming back, so the lock screen has taken over first.
 * Achievement banners and milestone celebrations wait while this is false.
 *
 * `useLockCover` reports when AppLockGate's lock or privacy cover is up; the
 * settle window (see `LOCK_SETTLE_MS`) also covers the moment between returning
 * to the foreground and the gate deciding to re-lock. The banner is drawn below
 * the lock window when lock is on, so it can never show over it.
 */
export function useCanInterrupt(): boolean {
  const lockEnabled = useStore((s) => s.settings.appLockEnabled);
  const covered = useLockCover((s) => s.covered);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  // Bumped each time the app returns to the foreground; restarts the settle window.
  const [activations, setActivations] = useState(0);
  const [settledFor, setSettledFor] = useState(-1);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'active') setActivations((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setSettledFor(activations), LOCK_SETTLE_MS);
    return () => clearTimeout(id);
  }, [activations]);

  return !covered && canInterrupt({ appState, lockEnabled, settled: settledFor === activations });
}
