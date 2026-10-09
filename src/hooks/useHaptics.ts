import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useStore } from '@/store';

type Kind = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/** Haptic feedback that respects the user's setting and no-ops on web. */
export function useHaptics() {
  const enabled = useStore((s) => s.settings.hapticsEnabled);
  return useCallback(
    (kind: Kind = 'light') => {
      if (!enabled || Platform.OS === 'web') return;
      switch (kind) {
        case 'selection':
          void Haptics.selectionAsync();
          return;
        case 'success':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        case 'warning':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        case 'error':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        case 'medium':
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          return;
        case 'heavy':
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          return;
        default:
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [enabled],
  );
}
