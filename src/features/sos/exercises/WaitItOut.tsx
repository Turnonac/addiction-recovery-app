import { StyleSheet, View } from 'react-native';

import { Icon, ProgressRing, Text } from '@/components';
import { colors, spacing } from '@/theme';
import { WAIT_MESSAGES } from '../content';
import { FadeIn } from '../components/FadeIn';
import { WaveFill } from '../components/WaveFill';
import { WAIT_IT_OUT_MS, WAIT_MESSAGE_MS, formatCountdown, rotatingIndex } from '../logic/timeline';
import type { ExerciseViewProps } from '../runner/types';
import { usePhaseHaptic } from '../runner/usePhaseHaptic';

const RING = 272;
const STROKE = 12;
const INNER = RING - STROKE * 2 - 16;

/** Wait It Out: 10-minute countdown ring with a receding wave and rotating encouragement every 30s. */
export function WaitItOut({ exercise, t, paused }: ExerciseViewProps) {
  const remaining = Math.max(0, WAIT_IT_OUT_MS - t);
  const progress = Math.min(1, t / WAIT_IT_OUT_MS);
  const msgIndex = rotatingIndex(t, WAIT_MESSAGE_MS, WAIT_MESSAGES.length);
  usePhaseHaptic(msgIndex, 'light');
  const c = exercise.color;

  return (
    <View style={styles.wrap}>
      <ProgressRing progress={1 - progress} size={RING} strokeWidth={STROKE} color={c}>
        {/* The wave recedes as the minutes pass — like the craving. */}
        <WaveFill size={INNER} color={c} level={0.62 - 0.42 * progress} paused={paused} />
        <View style={styles.center}>
          <Text variant="display" mono tabular style={styles.time} testID="sos-remaining">
            {formatCountdown(remaining)}
          </Text>
          <Text variant="overline" tone="secondary">
            {paused ? 'Paused' : 'Remaining'}
          </Text>
        </View>
      </ProgressRing>

      <FadeIn id={msgIndex} style={styles.message}>
        <Icon name="format-quote-open" size={22} color={c} />
        <Text variant="heading" center style={styles.messageText} testID="sos-wait-message">
          {WAIT_MESSAGES[msgIndex]}
        </Text>
      </FadeIn>

      <Text variant="caption" tone="tertiary" center>
        Most cravings fade within 10 minutes. You don&apos;t have to do anything — just wait.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  center: { alignItems: 'center', gap: 2 },
  time: { fontSize: 52, letterSpacing: -1, color: colors.text },
  message: { alignItems: 'center', gap: spacing.sm, minHeight: 96, paddingHorizontal: spacing.md },
  messageText: { lineHeight: 28 },
});
