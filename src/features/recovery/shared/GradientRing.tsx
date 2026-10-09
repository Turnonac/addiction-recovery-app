import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors, withAlpha } from '@/theme';

/**
 * Progress below this draws no arc: a round-capped arc of ~0 length renders as a
 * stray dot next to a "0%" label.
 */
export const MIN_VISIBLE_PROGRESS = 0.01;

export interface GradientRingProps {
  /** 0..1 */
  progress: number;
  size: number;
  strokeWidth: number;
  /** Arc color at the end (bottom-right). */
  color: string;
  /** Arc color at the start (top-left); defaults to white. */
  colorStart?: string;
  trackColor?: string;
  children?: ReactNode;
}

/**
 * Circular progress like the shared ProgressRing, but with a per-instance
 * gradient id so several rings with the same color and different gradients
 * can coexist (web renders stacked screens into one DOM).
 */
export function GradientRing({ progress, size, strokeWidth, color, colorStart = colors.text, trackColor, children }: GradientRingProps) {
  const gradId = `rring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colorStart} stopOpacity={0.95} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Circle cx={mid} cy={mid} r={r} stroke={trackColor ?? withAlpha(color, 0.14)} strokeWidth={strokeWidth} fill="none" />
        {p >= MIN_VISIBLE_PROGRESS && (
          <Circle
            cx={mid}
            cy={mid}
            r={r}
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
            transform={`rotate(-90 ${mid} ${mid})`}
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
