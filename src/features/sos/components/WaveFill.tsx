import { useEffect, useEffectEvent } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { withAlpha } from '@/theme';

/** Closed SVG path of a sine wave spanning three wavelengths of `w`, filled to the bottom. */
function wavePath(w: number, h: number, level: number, amp: number): string {
  const y0 = h * (1 - level);
  const steps = 72;
  let d = `M0 ${y0.toFixed(1)}`;
  for (let i = 1; i <= steps; i += 1) {
    const x = (i / steps) * w * 3;
    const y = y0 + Math.sin((x / w) * Math.PI * 2) * amp;
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${w * 3} ${h} L0 ${h} Z`;
}

function useDrift(width: number, durationMs: number, paused: boolean, reverse = false) {
  const x = useSharedValue(0);
  const start = useEffectEvent(() => {
    if (paused) {
      cancelAnimation(x);
      return;
    }
    // x stays within [-2w, 0]; the path spans 3w and is periodic over w, so
    // resuming from anywhere in the cycle is seamless.
    const from = ((x.get() % width) + width) % width;
    x.set(
      withSequence(
        withTiming(from - width, { duration: 0 }),
        withRepeat(withTiming(from - width * 2, { duration: durationMs, easing: Easing.linear }), -1, false),
      ),
    );
  });
  useEffect(() => {
    start();
  }, [paused]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: reverse ? -2 * width - x.get() : x.get() }] }));
}

export interface WaveFillProps {
  size: number;
  color: string;
  /** 0..1 water level. */
  level: number;
  paused: boolean;
}

/** Two drifting sine waves clipped to a circle — the gentle "craving wave" in Wait It Out. */
export function WaveFill({ size, color, level, paused }: WaveFillProps) {
  const back = useDrift(size, 7000, paused, true);
  const front = useDrift(size, 4800, paused);
  return (
    <View style={[styles.clip, { width: size, height: size, borderRadius: size / 2 }]} pointerEvents="none">
      <Animated.View style={[styles.layer, { width: size * 3 }, back]}>
        <Svg width={size * 3} height={size}>
          <Path d={wavePath(size, size, level + 0.04, size * 0.035)} fill={withAlpha(color, 0.18)} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.layer, { width: size * 3 }, front]}>
        <Svg width={size * 3} height={size}>
          <Path d={wavePath(size, size, level, size * 0.045)} fill={withAlpha(color, 0.3)} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', position: 'absolute' },
  layer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
