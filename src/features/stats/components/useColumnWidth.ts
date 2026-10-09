import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Shared width for a table column whose cells don't wrap: starts at `min` and grows to
 * the widest cell reported through `onLayout`, so header and rows stay aligned however
 * long an amount gets. Give each cell `{ minWidth: width, flexShrink: 0 }`. Only grows;
 * remount (change the table's `key`) to start over when the data changes.
 */
export function useColumnWidth(min: number): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(min);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (w > prev ? w : prev));
  };
  return [Math.max(width, min), onLayout];
}
