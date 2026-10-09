import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { habitColors } from '@/theme';
import { makeConfetti, type ConfettiParticle } from './confetti';

const PALETTE = Object.values(habitColors).filter((c) => c !== habitColors.slate && c !== habitColors.brown);

export interface ConfettiProps {
  seed: number;
  count?: number;
  /** Vertical position (0..1 of screen height) the burst starts from. */
  originY?: number;
}

/** Full-screen confetti burst. Skipped entirely when the OS asks for reduced motion. */
export function Confetti({ seed, count = 56, originY = 0.34 }: ConfettiProps) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [particles] = useState(() => makeConfetti({ count, seed, palette: PALETTE, width, height }));

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => alive && setReduceMotion(false));
    return () => {
      alive = false;
    };
  }, []);

  if (reduceMotion !== false) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {particles.map((p) => (
        <Particle key={p.id} p={p} originX={width / 2} originY={height * originY} />
      ))}
    </View>
  );
}

function Particle({ p, originX, originY }: { p: ConfettiParticle; originX: number; originY: number }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const total = p.riseMs + p.fallMs;
    opacity.set(withDelay(p.delay, withSequence(withTiming(1, { duration: 80 }), withDelay(total - 480, withTiming(0, { duration: 400 })))));
    x.set(withDelay(p.delay, withTiming(p.driftX, { duration: total, easing: Easing.out(Easing.quad) })));
    y.set(
      withDelay(
        p.delay,
        withSequence(
          withTiming(-p.rise, { duration: p.riseMs, easing: Easing.out(Easing.cubic) }),
          withTiming(p.fall, { duration: p.fallMs, easing: Easing.in(Easing.quad) }),
        ),
      ),
    );
    rot.set(withDelay(p.delay, withTiming(p.spin, { duration: total, easing: Easing.out(Easing.quad) })));
  }, [p, x, y, rot, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${rot.get()}deg` }, { rotateX: `${rot.get() * 0.6}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: originX + p.startX - p.width / 2,
          top: originY - p.height / 2,
          width: p.width,
          height: p.height,
          borderRadius: p.round ? p.width / 2 : 1.5,
          backgroundColor: p.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute' },
});
