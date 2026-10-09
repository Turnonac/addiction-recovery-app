import { useEffect, useRef } from 'react';

import { useHaptics } from '@/hooks/useHaptics';

type HapticKind = Parameters<ReturnType<typeof useHaptics>>[0];

/** Fires a haptic whenever `key` changes (phase / step transitions), never on mount. */
export function usePhaseHaptic(key: string | number, kind: HapticKind = 'medium') {
  const haptic = useHaptics();
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    haptic(kind);
  }, [key, kind, haptic]);
}
