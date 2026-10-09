import { router } from 'expo-router';
import { Platform } from 'react-native';

import { buildDemoState } from '@/domain/demo';
import { useStore } from '@/store';

/**
 * Dev-only (web): exposes the store on `window.__quit` so automated screenshot
 * scripts can seed sample data and navigate. Never runs in production builds.
 */
export function exposeDevTools(): void {
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return;
  (window as unknown as { __quit: unknown }).__quit = {
    useStore,
    router,
    seedDemo: () => useStore.getState().replaceAll(buildDemoState(Date.now())),
    reset: () => useStore.getState().resetAll(),
  };
}
