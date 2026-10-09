import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components';
import { colors, withAlpha } from '@/theme';

export interface MilestoneBadgeProps {
  days: number;
  color: string;
  size?: number;
}

/** Big glowing circle in the habit color with the day count, popping in with a spring (static with reduced motion). */
export function MilestoneBadge({ days, color, size = 148 }: MilestoneBadgeProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.4);
  useEffect(() => {
    if (reduceMotion) return;
    scale.set(withDelay(120, withSpring(1, { damping: 9, stiffness: 140, mass: 0.8 })));
  }, [scale, reduceMotion]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const inner = size * 0.74;
  const digits = String(days).length;
  const fontSize = inner * (digits >= 4 ? 0.3 : digits === 3 ? 0.36 : 0.44);
  const c = size / 2;

  return (
    <Animated.View style={[{ width: size, height: size }, styles.center, pop]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={c - 2} stroke={withAlpha(color, 0.45)} strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
        <Circle cx={c} cy={c} r={c - 12} stroke={withAlpha(color, 0.22)} strokeWidth={1} fill="none" />
      </Svg>
      <View
        style={[
          styles.disk,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: color,
            boxShadow: `0 0 ${Math.round(size * 0.35)}px ${withAlpha(color, 0.6)}`,
          },
        ]}
      >
        <LinearGradient
          colors={[withAlpha(colors.text, 0.45), withAlpha(colors.text, 0.04), withAlpha(colors.textInverse, 0.18)]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: inner / 2 }]}
        />
        <View style={[styles.innerRing, { borderRadius: inner / 2 - 6 }]} />
        <Text style={[styles.days, { fontSize, lineHeight: fontSize * 1.05 }]} tabular>
          {days}
        </Text>
        <Text variant="overline" color={withAlpha(colors.text, 0.9)} style={styles.unit}>
          {days === 1 ? 'day' : 'days'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  disk: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  innerRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 6,
    borderWidth: 1.5,
    borderColor: withAlpha(colors.text, 0.35),
  },
  days: { fontWeight: '900', color: colors.text, letterSpacing: -1.5 },
  unit: { fontSize: 10, letterSpacing: 2.5, marginTop: -2 },
});
