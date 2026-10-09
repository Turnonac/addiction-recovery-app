import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { createHistoryGuard, type GuardEnv, type HistoryGuard } from './historyGuard';

function browserEnv(): GuardEnv {
  return {
    history: window.history,
    location: window.location,
    listen: (listener) => {
      // Capture phase: runs before the router's own popstate listeners on window.
      window.addEventListener('popstate', listener, true);
      return () => window.removeEventListener('popstate', listener, true);
    },
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
  };
}

const isBrowser = () => Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.history?.pushState === 'function';

/**
 * Web only: while `active`, the browser's Back asks `onBack` (resolve `true` to
 * leave) and reloading or closing the tab asks the browser's "Leave site?"
 * prompt. Navigate on purpose through `release` so the guard steps aside first.
 * A no-op on iOS and Android, where `usePreventRemove` covers every way out.
 */
export function useWebLeaveGuard(active: boolean, onBack: () => Promise<boolean>): { release: (then: () => void) => void } {
  const onBackRef = useRef(onBack);
  const guardRef = useRef<HistoryGuard | null>(null);

  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!isBrowser()) return;
    const guard = createHistoryGuard(browserEnv(), () => onBackRef.current());
    guardRef.current = guard;
    return () => {
      guard.dispose();
      guardRef.current = null;
    };
  }, []);

  useEffect(() => {
    guardRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    if (!active || !isBrowser()) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older Safari/Chrome only show the prompt when `returnValue` is set.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  return {
    release: (then) => {
      const guard = guardRef.current;
      if (guard) guard.release(then);
      else then();
    },
  };
}
