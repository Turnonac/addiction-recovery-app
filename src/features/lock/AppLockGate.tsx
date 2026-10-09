import type { ReactNode } from 'react';

// STUB — blocks the UI behind Face ID / passcode when app lock is enabled.
export function AppLockGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
