import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Modal, Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { useStore } from '@/store';
import { authenticate, getLockCapability, type LockCapability } from './biometrics';
import { LockOverlay } from './LockOverlay';
import { shouldRelock } from './lockLogic';
import { isSystemPromptActive } from './systemPrompt';

/**
 * Wraps the whole app. When app lock is on (native only), the app starts
 * locked and asks for Face ID / Touch ID / passcode; it re-locks after being
 * in the background for 30s and hides its content in the app switcher.
 * If the device can't authenticate any more, it fails open (setting is kept).
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') return <>{children}</>;
  return <NativeAppLockGate>{children}</NativeAppLockGate>;
}

function NativeAppLockGate({ children }: { children: ReactNode }) {
  const enabled = useStore((s) => s.settings.appLockEnabled);
  // Start locked so nothing flashes before the first prompt.
  const [locked, setLocked] = useState(enabled);
  const [privacy, setPrivacy] = useState(false);
  const [capability, setCapability] = useState<LockCapability | null>(null);
  const backgroundAt = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  const lockedRef = useRef(locked);

  useEffect(() => {
    enabledRef.current = enabled;
    lockedRef.current = locked;
  }, [enabled, locked]);

  const unlock = useCallback(async () => {
    const cap = await getLockCapability();
    setCapability(cap);
    // Update the ref right away: an AppState event can arrive before React commits.
    if (!cap.available || (await authenticate('Unlock Quit'))) {
      lockedRef.current = false; // (unavailable → fail open)
      setLocked(false);
    }
  }, []);

  // Prompt once on launch.
  const prompted = useRef(false);
  useEffect(() => {
    if (prompted.current || !enabledRef.current) return;
    prompted.current = true;
    void unlock();
  }, [unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!enabledRef.current) return;
      if (next === 'background') {
        backgroundAt.current ??= Date.now();
        setPrivacy(true);
      } else if (next === 'inactive') {
        // iOS reports `inactive` for the app switcher, but also while a system
        // prompt (Face ID, notification permission alert) is up.
        if (!isSystemPromptActive()) setPrivacy(true);
      } else if (next === 'active') {
        const since = backgroundAt.current;
        backgroundAt.current = null;
        setPrivacy(false);
        // Android's device-credential screen sends the app through background →
        // active; the prompt's own result decides whether we stay locked.
        if (isSystemPromptActive()) return;
        // Coming back from the background: lock again after the grace period, and
        // re-prompt if the previous prompt was interrupted by leaving the app.
        if (since != null && (lockedRef.current || shouldRelock(since, Date.now()))) {
          lockedRef.current = true;
          setLocked(true);
          void unlock();
        }
      }
    });
    return () => sub.remove();
  }, [unlock]);

  const show = enabled && (locked || privacy);
  const overlay = show ? <LockOverlay mode={locked ? 'locked' : 'privacy'} capability={capability} onUnlock={() => void unlock()} /> : null;

  return (
    <>
      {children}
      {overlay ? (
        Platform.OS === 'ios' ? (
          // A separate window above native modals and sheets.
          <FullWindowOverlay>{overlay}</FullWindowOverlay>
        ) : (
          <Modal visible transparent={false} animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => undefined}>
            {overlay}
          </Modal>
        )
      ) : null}
    </>
  );
}
