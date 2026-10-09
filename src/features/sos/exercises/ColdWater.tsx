import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, ProgressRing, Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import { COLD_STEPS, DIVE_REFLEX_NOTE } from '../content';
import { FadeIn } from '../components/FadeIn';
import { labelColorOn } from '../components/labelColor';
import { COLD_STEP_MS, formatCountdown, segmentAt, segmentStart } from '../logic/timeline';
import type { ExerciseViewProps } from '../runner/types';
import { usePhaseHaptic } from '../runner/usePhaseHaptic';

const DURATIONS = COLD_STEPS.map(() => COLD_STEP_MS);

/** Cold water reset: three 30-second steps with a mini timer each, plus why it works. */
export function ColdWater({ exercise, t, paused, onSeek }: ExerciseViewProps) {
  const seg = segmentAt(DURATIONS, t);
  const step = COLD_STEPS[seg.index];
  usePhaseHaptic(seg.index);
  const c = exercise.color;
  const last = seg.index === COLD_STEPS.length - 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <ProgressRing progress={1 - seg.progress} size={176} strokeWidth={9} color={c}>
          <Icon name={step.icon} size={44} color={c} />
          <Text variant="heading" mono tabular style={styles.timer} testID="sos-step-remaining">
            {formatCountdown(seg.remainingMs)}
          </Text>
        </ProgressRing>
      </View>

      <FadeIn id={seg.index} style={styles.textBlock}>
        <Text variant="overline" color={c} center>
          {paused ? 'Paused' : `Step ${seg.index + 1} of ${COLD_STEPS.length}`}
        </Text>
        <Text variant="heading" center testID="sos-step-title">
          {step.title}
        </Text>
        <Text variant="body" tone="secondary" center>
          {step.detail}
        </Text>
      </FadeIn>

      <View style={styles.steps}>
        {COLD_STEPS.map((s, i) => {
          const done = i < seg.index;
          const active = i === seg.index;
          return (
            <View key={s.title} style={[styles.stepRow, active && { backgroundColor: withAlpha(c, 0.1), borderColor: withAlpha(c, 0.35) }]}>
              <View
                style={[
                  styles.stepBadge,
                  done ? { backgroundColor: c, borderColor: c } : active ? { borderColor: c } : null,
                ]}
              >
                {done ? (
                  <Icon name="check-bold" size={14} color={labelColorOn(c)} />
                ) : (
                  <Text variant="captionStrong" color={active ? c : colors.textTertiary}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text variant="captionStrong" color={done || active ? colors.text : colors.textTertiary} style={styles.flex} numberOfLines={1}>
                {s.title}
              </Text>
              <Text variant="caption" mono color={active ? c : colors.textTertiary}>
                {active ? formatCountdown(seg.remainingMs) : done ? 'Done' : '0:30'}
              </Text>
            </View>
          );
        })}
      </View>

      <Button
        label={last ? 'Done with this step' : 'Next step'}
        variant="secondary"
        size="sm"
        iconRight="skip-next"
        fullWidth={false}
        disabled={paused}
        onPress={() => onSeek(segmentStart(DURATIONS, seg.index + 1))}
        style={styles.skip}
        testID="sos-next-step"
      />

      <Card style={styles.note}>
        <View style={styles.noteHead}>
          <Icon name="heart-pulse" size={16} color={c} />
          <Text variant="overline" tone="secondary">
            Why it works
          </Text>
        </View>
        <Text variant="caption" tone="secondary">
          {DIVE_REFLEX_NOTE}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  hero: { alignItems: 'center' },
  timer: { marginTop: 4 },
  textBlock: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  steps: { gap: spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  skip: { alignSelf: 'center' },
  note: { gap: spacing.sm, padding: spacing.md },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
