import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { colors, withAlpha } from '@/theme';
import { arcPath, arcSegments, polar } from '../logic';

export interface ArcRingProps {
  /** 0..1 */
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  /** Color at the start of the arc (12 o'clock). */
  startColor?: string;
  trackColor?: string;
  children?: ReactNode;
}

/**
 * Progress ring whose arc blends from white at 12 o'clock into the habit color
 * (a conic gradient drawn as short segments), with round caps and a soft glow.
 */
export function ArcRing({ progress, size, strokeWidth, color, startColor = colors.text, trackColor, children }: ArcRingProps) {
  // Quantize so the arc only re-renders when it visibly moves.
  const p = Math.round(Math.max(0, Math.min(1, progress)) * 1000) / 1000;
  const canvas = size + PAD * 2;
  const mid = canvas / 2;
  const r = (size - strokeWidth) / 2;
  const segments = arcSegments(mid, mid, r, p, startColor, color);
  const start = polar(mid, mid, r, 0);
  const end = polar(mid, mid, r, Math.min(p * 360, 359.99));
  const glow = arcPath(mid, mid, r, p * 360);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={canvas} height={canvas} style={styles.svg}>
        <Circle cx={mid} cy={mid} r={r} stroke={trackColor ?? withAlpha(colors.text, 0.08)} strokeWidth={strokeWidth} fill="none" />
        {segments.length ? (
          <G>
            <Path d={glow} stroke={withAlpha(color, 0.1)} strokeWidth={strokeWidth + 8} strokeLinecap="round" fill="none" />
            {segments.map((s, i) => (
              <Path key={i} d={s.d} stroke={s.color} strokeWidth={strokeWidth} fill="none" />
            ))}
            <Circle cx={start.x} cy={start.y} r={strokeWidth / 2} fill={segments[0].color} />
            <Circle cx={end.x} cy={end.y} r={strokeWidth / 2} fill={segments[segments.length - 1].color} />
          </G>
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/** Room around the ring so the glow isn't clipped. */
const PAD = 10;

const styles = StyleSheet.create({
  svg: { position: 'absolute', left: -PAD, top: -PAD },
  center: { alignItems: 'center', justifyContent: 'center' },
});
