import { useEffect, useEffectEvent } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import { Orb } from '../components/Orb';
import { PATTERN_478, breathScale, breathTargetScale, breathingPhaseAt, secondsLeft } from '../logic/timeline';
import type { ExerciseViewProps } from '../runner/types';
import { usePhaseHaptic } from '../runner/usePhaseHaptic';
import { PhaseStrip } from './PhaseStrip';

const SIZE = 272;
const MIN = 0.6;

/** 4-7-8: orb grows over 4s, holds 7s, shrinks over 8s — four cycles. */
export function Breathing478({ exercise, t, paused }: ExerciseViewProps) {
  const s = breathingPhaseAt(PATTERN_478, t);
  const kind = s.phase.kind;
  usePhaseHaptic(`${s.cycle}:${s.phaseIndex}`);

  const scale = useSharedValue(breathScale(kind, s.phaseProgress, MIN));
  const animate = useEffectEvent(() => {
    if (paused || s.done) {
      cancelAnimation(scale);
      return;
    }
    const fromStart = s.phaseElapsedMs < 250;
    scale.set(
      withSequence(
        withTiming(breathScale(kind, s.phaseProgress, MIN), { duration: 0 }),
        withTiming(breathTargetScale(kind, MIN), {
          duration: s.phaseRemainingMs,
          easing: fromStart ? Easing.inOut(Easing.sin) : Easing.out(Easing.sin),
        }),
      ),
    );
  });
  useEffect(() => {
    animate();
  }, [s.cycle, s.phaseIndex, paused]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <View style={styles.wrap}>
      <Text variant="overline" color={exercise.color} testID="sos-cycle">
        Cycle {s.cycle} of {PATTERN_478.cycles}
      </Text>

      <View style={styles.stage}>
        <View style={[styles.ring, { width: SIZE, height: SIZE, borderColor: withAlpha(exercise.color, 0.22) }]} />
        <View style={[styles.ring, styles.dashed, { width: SIZE * MIN, height: SIZE * MIN, borderColor: withAlpha(exercise.color, 0.3) }]} />
        <Animated.View style={[styles.orb, orbStyle]}>
          <Orb size={SIZE} color={exercise.color} />
        </Animated.View>
        <Text variant="hero" tabular style={styles.digit} testID="sos-phase-count">
          {secondsLeft(s.phaseRemainingMs)}
        </Text>
      </View>

      <View style={styles.labels}>
        <Text variant="title" center testID="sos-phase-label">
          {paused ? 'Paused' : s.phase.label}
        </Text>
        <Text variant="body" tone="secondary" center>
          {paused ? 'Take your time. Resume when ready.' : s.phase.hint}
        </Text>
      </View>

      <PhaseStrip phases={PATTERN_478.phases} current={s.phaseIndex} color={exercise.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  stage: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: SIZE, borderWidth: 1 },
  dashed: { borderStyle: 'dashed' },
  orb: { position: 'absolute' },
  digit: { color: colors.text, fontSize: 72, lineHeight: 80 },
  labels: { alignItems: 'center', gap: spacing.xs, minHeight: 64 },
});
