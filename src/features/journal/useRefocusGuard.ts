import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

/** How long after a screen appears (or reappears) a press on it is ignored. */
export const SETTLE_MS = 400;

/**
 * Returns `ready()`: false for a moment after this screen opens, and after it gets focus
 * back from a screen pushed on top of it.
 *
 * On web the next screen mounts (and a closing modal leaves) at once, so the second click
 * of a double-click, or a quick second tap, lands on whatever is now under the pointer:
 * an entry card, the "+" button, the trash icon. Presses guarded with `ready()` ignore
 * that stray click.
 */
export function useRefocusGuard(ms: number = SETTLE_MS): () => boolean {
  const navigation = useNavigation();
  const settleFrom = useRef(0);

  useEffect(() => {
    // React flushes this before it handles the next click, so a stray second press sees it.
    settleFrom.current = Date.now();
    let blurred = false;
    const offBlur = navigation.addListener('blur', () => {
      blurred = true;
    });
    const offFocus = navigation.addListener('focus', () => {
      if (blurred) settleFrom.current = Date.now();
      blurred = false;
    });
    return () => {
      offBlur();
      offFocus();
    };
  }, [navigation]);

  return () => Date.now() - settleFrom.current >= ms;
}

/**
 * False for `ms` after the component mounts, then true.
 *
 * For screens whose controls can't all be wrapped in `ready()` (forms built from shared
 * fields): render a press shield while it's false so the second press of the double-tap
 * that opened the screen hits nothing.
 */
export function useMountGuard(ms: number = SETTLE_MS): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return armed;
}
