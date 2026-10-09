import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export interface PulseHaloProps {
  /** Diameter of the halo at rest (it is centered in its parent). */
  size: number;
  color: string;
  /** Scale reached at the end of each pulse. */
  maxScale?: number;
  /** Opacity at the start of each pulse. */
  peakOpacity?: number;
  duration?: number;
  delay?: number;
  /** Stops (and hides) the pulse when false. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A soft colored ring that repeatedly expands and fades — used for the current
 * milestone node and the brain markers. Respects the OS "reduce motion" setting.
 */
export function PulseHalo({ size, color, maxScale = 2.2, peakOpacity = 0.55, duration = 1800, delay = 0, active = true, style }: PulseHaloProps) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const running = active && !reduceMotion;

  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    progress.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false)));
    return () => cancelAnimation(progress);
  }, [running, delay, duration, progress]);

  const animated = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: (1 - p) * peakOpacity,
      transform: [{ scale: 1 + (maxScale - 1) * p }],
    };
  });

  if (!running) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.halo,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2, backgroundColor: color },
        animated,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', left: '50%', top: '50%' },
});
