import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, withAlpha } from '@/theme';

export interface StreakBarRowProps {
  /** 0..1 */
  value: number;
  color: string;
  /** 0..1 position of a record tick, or undefined for none. */
  marker?: number;
  height?: number;
  children?: ReactNode;
}

/** Horizontal glowing bar with an optional record tick (Compare tab). */
export function StreakBarRow({ value, color, marker, height = 8 }: StreakBarRowProps) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${v * 100}%`,
            minWidth: v > 0 ? height : 0,
            backgroundColor: color,
            borderRadius: height / 2,
            shadowColor: color,
          },
        ]}
      />
      {marker != null && marker > 0 ? (
        <View
          style={[
            styles.marker,
            { left: `${Math.min(1, marker) * 100}%`, top: -4, height: height + 8, backgroundColor: withAlpha(colors.text, 0.85) },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center' },
  fill: { height: '100%', shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  marker: { position: 'absolute', width: 2, marginLeft: -1, borderRadius: radius.sm },
});
