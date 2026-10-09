import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { withAlpha } from '@/theme';

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  /** Color at the start of the arc (12 o'clock), blending into `color`. Defaults to white. */
  startColor?: string;
  trackColor?: string;
  children?: ReactNode;
}

/** Circular progress (SVG). Starts at 12 o'clock and fills clockwise. */
export function ProgressRing({ progress, size = 240, strokeWidth = 14, color, startColor = '#FFFFFF', trackColor, children }: ProgressRingProps) {
  const p = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  // Unique per instance: on web every stacked screen shares one DOM.
  const gradId = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Coordinates are pre-rotation: after the -90° turn the white end sits at the top. */}
          <LinearGradient id={gradId} x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={startColor} stopOpacity={0.95} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? withAlpha(color, 0.14)} strokeWidth={strokeWidth} fill="none" />
        {p > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
