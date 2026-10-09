import { useEffect, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

import { spacing } from '@/theme';
import { revealOffset } from '../charts/geometry';

interface Metrics {
  items: Record<string, { x: number; width: number }>;
  viewport: number;
  offset: number;
}

/**
 * Keeps the selected item of a horizontal ScrollView visible: scrolls on first layout
 * (e.g. a deep link to the last tab) and whenever the selection changes.
 */
export function useScrollReveal(selected: string | undefined) {
  const ref = useRef<ScrollView>(null);
  const m = useRef<Metrics>({ items: {}, viewport: 0, offset: 0 });

  const reveal = (key: string | undefined, animated: boolean) => {
    const l = key ? m.current.items[key] : undefined;
    if (!l || !m.current.viewport || !ref.current) return;
    const target = revealOffset(l.x, l.width, m.current.offset, m.current.viewport, spacing.lg);
    if (target == null) return;
    m.current.offset = target;
    ref.current.scrollTo({ x: target, animated });
  };

  useEffect(() => {
    reveal(selected, true);
    // Only selection changes should scroll; layout callbacks handle the first pass.
  }, [selected]);

  return {
    ref,
    scrollProps: {
      scrollEventThrottle: 32,
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        m.current.offset = e.nativeEvent.contentOffset.x;
      },
      onLayout: (e: LayoutChangeEvent) => {
        m.current.viewport = e.nativeEvent.layout.width;
        reveal(selected, false);
      },
    },
    /** onLayout for the item with `key` (must be a direct child of the content container). */
    itemLayout: (key: string) => (e: LayoutChangeEvent) => {
      m.current.items[key] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
      if (key === selected) reveal(key, false);
    },
  };
}
