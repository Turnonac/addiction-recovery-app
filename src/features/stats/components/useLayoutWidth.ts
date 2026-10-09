import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Width of a view, measured with onLayout (0 until the first layout pass). */
export function useLayoutWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  };
  return [width, onLayout];
}
