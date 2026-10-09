import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';
import type { BodyRegionId } from '../content';

const VB_W = 120;
const VB_H = 290;

type Shape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

/** Highlight shapes per region (viewBox coordinates). */
const REGION_SHAPES: Record<BodyRegionId, Shape[]> = {
  forehead: [{ kind: 'ellipse', cx: 60, cy: 18, rx: 13, ry: 7 }],
  jaw: [{ kind: 'ellipse', cx: 60, cy: 40, rx: 11, ry: 6 }],
  shoulders: [
    { kind: 'ellipse', cx: 38, cy: 66, rx: 12, ry: 7 },
    { kind: 'ellipse', cx: 82, cy: 66, rx: 12, ry: 7 },
  ],
  chest: [{ kind: 'ellipse', cx: 60, cy: 86, rx: 21, ry: 14 }],
  hands: [
    { kind: 'circle', cx: 18, cy: 152, r: 9 },
    { kind: 'circle', cx: 102, cy: 152, r: 9 },
  ],
  belly: [{ kind: 'ellipse', cx: 60, cy: 118, rx: 18, ry: 13 }],
  hips: [{ kind: 'ellipse', cx: 60, cy: 148, rx: 25, ry: 10 }],
  legs: [
    { kind: 'ellipse', cx: 48, cy: 208, rx: 9, ry: 36 },
    { kind: 'ellipse', cx: 72, cy: 208, rx: 9, ry: 36 },
  ],
  feet: [
    { kind: 'ellipse', cx: 45, cy: 276, rx: 12, ry: 6 },
    { kind: 'ellipse', cx: 75, cy: 276, rx: 12, ry: 6 },
  ],
};

function ShapeEl({ s, fill, grow = 0 }: { s: Shape; fill: string; grow?: number }) {
  return s.kind === 'circle' ? (
    <Circle cx={s.cx} cy={s.cy} r={s.r + grow} fill={fill} />
  ) : (
    <Ellipse cx={s.cx} cy={s.cy} rx={s.rx + grow} ry={s.ry + grow} fill={fill} />
  );
}

export interface BodySilhouetteProps {
  height: number;
  color: string;
  region: BodyRegionId;
  paused: boolean;
}

/** Simple front-facing body with the current scan region glowing and gently pulsing. */
export function BodySilhouette({ height, color, region, paused }: BodySilhouetteProps) {
  const width = (height * VB_W) / VB_H;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (paused) {
      cancelAnimation(pulse);
      return;
    }
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [paused, pulse]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  const shapes = REGION_SHAPES[region];

  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel={`Body outline, focus on ${region}`}>
      <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} style={StyleSheet.absoluteFill}>
        {/* Opaque shapes inside a translucent group so overlaps don't double up. */}
        <G opacity={0.13}>
          <Circle cx={60} cy={26} r={18} fill={colors.text} />
          <Rect x={53} y={40} width={14} height={16} rx={5} fill={colors.text} />
          <Rect x={35} y={56} width={50} height={100} rx={20} fill={colors.text} />
          <Path d="M38 64 Q25 68 23 92 L18 146" stroke={colors.text} strokeWidth={12} strokeLinecap="round" fill="none" />
          <Path d="M82 64 Q95 68 97 92 L102 146" stroke={colors.text} strokeWidth={12} strokeLinecap="round" fill="none" />
          <Circle cx={18} cy={152} r={8} fill={colors.text} />
          <Circle cx={102} cy={152} r={8} fill={colors.text} />
          <Path d="M48 146 L47 210 L45 268" stroke={colors.text} strokeWidth={17} strokeLinecap="round" fill="none" />
          <Path d="M72 146 L73 210 L75 268" stroke={colors.text} strokeWidth={17} strokeLinecap="round" fill="none" />
          <Ellipse cx={43} cy={276} rx={11} ry={6} fill={colors.text} />
          <Ellipse cx={77} cy={276} rx={11} ry={6} fill={colors.text} />
        </G>
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <G opacity={0.35}>
            {shapes.map((s, i) => (
              <ShapeEl key={`g${i}`} s={s} fill={color} grow={6} />
            ))}
          </G>
          {shapes.map((s, i) => (
            <ShapeEl key={`s${i}`} s={s} fill={color} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
