import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { ProgressRing, Text } from '@/components';
import { spacing } from '@/theme';
import { MEDITATION_PROMPTS } from '../content';
import { FadeIn } from '../components/FadeIn';
import { Orb } from '../components/Orb';
import { StepDots } from '../components/StepDots';
import { MEDITATION_MS, MEDITATION_PROMPT_MS, secondsLeft } from '../logic/timeline';
import type { ExerciseViewProps } from '../runner/types';
import { usePhaseHaptic } from '../runner/usePhaseHaptic';

const RING = 272;
const ORB = 188;

/** One-minute meditation: countdown ring, a softly pulsing orb, four prompts (one every 15s). */
export function Meditation({ exercise, t, paused }: ExerciseViewProps) {
  const remaining = Math.max(0, MEDITATION_MS - t);
  const promptIndex = Math.min(MEDITATION_PROMPTS.length - 1, Math.floor(Math.max(0, t) / MEDITATION_PROMPT_MS));
  usePhaseHaptic(promptIndex, 'light');
  const c = exercise.color;

  const pulse = useSharedValue(0.86);
  useEffect(() => {
    if (paused) {
      cancelAnimation(pulse);
      return;
    }
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.86, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [paused, pulse]);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }], opacity: 0.55 + (pulse.get() - 0.86) * 3 }));

  return (
    <View style={styles.wrap}>
      <ProgressRing progress={remaining / MEDITATION_MS} size={RING} strokeWidth={10} color={c}>
        <Animated.View style={[styles.orb, orbStyle]}>
          <Orb size={ORB} color={c} />
        </Animated.View>
        <View style={styles.center}>
          <Text variant="hero" tabular style={styles.digit} testID="sos-remaining">
            {secondsLeft(remaining)}
          </Text>
          <Text variant="overline" tone="secondary">
            {paused ? 'Paused' : 'Seconds'}
          </Text>
        </View>
      </ProgressRing>

      <FadeIn id={promptIndex} style={styles.prompt}>
        <Text variant="heading" center style={styles.promptText} testID="sos-meditation-prompt">
          {MEDITATION_PROMPTS[promptIndex]}
        </Text>
      </FadeIn>

      <StepDots count={MEDITATION_PROMPTS.length} current={promptIndex} color={c} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  orb: { position: 'absolute' },
  center: { alignItems: 'center' },
  digit: { fontSize: 64, lineHeight: 72 },
  prompt: { minHeight: 64, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  promptText: { lineHeight: 28 },
});
