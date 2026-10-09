import { create } from 'zustand';

/**
 * Whether the app-lock screen or the app-switcher privacy cover is currently up.
 * Written by AppLockGate; read by anything that shouldn't interrupt the user
 * while the app is covered (achievement banners, milestone celebrations).
 */
export const useLockCover = create<{ covered: boolean }>(() => ({ covered: false }));

export function setLockCovered(covered: boolean): void {
  if (useLockCover.getState().covered !== covered) useLockCover.setState({ covered });
}
