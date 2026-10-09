import { useEffect, useEffectEvent } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';

import { Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import { PATTERN_BOX, boxPoint, breathingPhaseAt, secondsLeft } from '../logic/timeline';
import type { ExerciseViewProps } from '../runner/types';
import { usePhaseHaptic } from '../runner/usePhaseHaptic';
import { PhaseStrip } from './PhaseStrip';

const SIDE = 216;
const PAD = 34;
const DOT = 20;
const STAGE = SIDE + PAD * 2;

/** Edge endpoints (unit square, y down) for each phase: in = left (up), hold = top, out = right (down), hold = bottom. */
const EDGES = [
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [1, 0, 1, 1],
  [1, 1, 0, 1],
] as const;

const EDGE_LABELS = [
  { label: 'In', style: { left: 0, top: STAGE / 2 - 10, width: PAD } },
  { label: 'Hold', style: { top: 2, left: 0, right: 0 } },
  { label: 'Out', style: { right: 0, top: STAGE / 2 - 10, width: PAD } },
  { label: 'Hold', style: { bottom: 2, left: 0, right: 0 } },
] as const;

/** Box breathing: a dot travels the square, one 4-second edge per phase, four cycles. */
export function BoxBreathing({ exercise, t, paused }: ExerciseViewProps) {
  const s = breathingPhaseAt(PATTERN_BOX, t);
  usePhaseHaptic(`${s.cycle}:${s.phaseIndex}`);

  const progress = useSharedValue(s.phaseIndex + s.phaseProgress);
  const animate = useEffectEvent(() => {
    if (paused || s.done) {
      cancelAnimation(progress);
      return;
    }
    progress.set(
      withSequence(
        withTiming(s.phaseIndex + s.phaseProgress, { duration: 0 }),
        withTiming(s.phaseIndex + 1, { duration: s.phaseRemainingMs, easing: Easing.linear }),
      ),
    );
  });
  useEffect(() => {
    animate();
  }, [s.cycle, s.phaseIndex, paused]);

  const dotStyle = useAnimatedStyle(() => {
    const p = boxPoint(progress.get());
    return { transform: [{ translateX: PAD + p.x * SIDE - DOT / 2 }, { translateY: PAD + p.y * SIDE - DOT / 2 }] };
  });

  const [x1, y1, x2, y2] = EDGES[s.phaseIndex];
  const c = exercise.color;

  return (
    <View style={styles.wrap}>
      <Text variant="overline" color={c} testID="sos-cycle">
        Cycle {s.cycle} of {PATTERN_BOX.cycles}
      </Text>

      <View style={styles.stage}>
        <Svg width={STAGE} height={STAGE} style={StyleSheet.absoluteFill}>
          <Rect x={PAD} y={PAD} width={SIDE} height={SIDE} rx={6} fill={withAlpha(c, 0.06)} stroke={withAlpha(c, 0.28)} strokeWidth={3} />
          <Line
            x1={PAD + x1 * SIDE}
            y1={PAD + y1 * SIDE}
            x2={PAD + x2 * SIDE}
            y2={PAD + y2 * SIDE}
            stroke={c}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </Svg>
        {EDGE_LABELS.map((e, i) => (
          <Text
            key={i}
            variant="micro"
            center
            color={i === s.phaseIndex ? c : colors.textTertiary}
            style={[styles.edgeLabel, e.style]}
          >
            {e.label.toUpperCase()}
          </Text>
        ))}
        <Animated.View style={[styles.dot, { backgroundColor: c, shadowColor: c }, dotStyle]} />
        <View style={styles.center}>
          <Text variant="hero" tabular style={styles.digit} testID="sos-phase-count">
            {secondsLeft(s.phaseRemainingMs)}
          </Text>
        </View>
      </View>

      <View style={styles.labels}>
        <Text variant="title" center testID="sos-phase-label">
          {paused ? 'Paused' : s.phase.label}
        </Text>
        <Text variant="body" tone="secondary" center>
          {paused ? 'Take your time. Resume when ready.' : s.phase.hint}
        </Text>
      </View>

      <PhaseStrip phases={PATTERN_BOX.phases} current={s.phaseIndex} color={c} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  stage: { width: STAGE, height: STAGE },
  edgeLabel: { position: 'absolute', letterSpacing: 1 },
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
    borderColor: colors.text,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  digit: { fontSize: 72, lineHeight: 80 },
  labels: { alignItems: 'center', gap: spacing.xs, minHeight: 64 },
});
