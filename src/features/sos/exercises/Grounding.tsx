import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Card, Icon, IconTile, Text } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { spacing, withAlpha } from '@/theme';
import { GROUNDING_STEPS } from '../content';
import { bubbleSize } from '../logic/layout';
import { FadeIn } from '../components/FadeIn';
import { FillButton } from '../components/FillButton';
import { labelColorOn } from '../components/labelColor';
import { StepDots } from '../components/StepDots';
import type { ExerciseViewProps } from '../runner/types';

const CARD_PADDING = spacing.xl;
const BUBBLE_GAP = spacing.md;
/** Every step's bubbles share one row, sized for the longest step (5). */
const MAX_COUNT = Math.max(...GROUNDING_STEPS.map((s) => s.count));

/** 5-4-3-2-1 grounding: one card per sense with N check bubbles to tap, then "Next". */
export function Grounding({ exercise, paused, onFinish }: ExerciseViewProps) {
  const haptic = useHaptics();
  // Until the row is measured, estimate it from the window (screen gutters + card padding + border).
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const size = bubbleSize({
    width: rowWidth ?? windowWidth - 2 * spacing.lg - 2 * CARD_PADDING - 2,
    count: MAX_COUNT,
    gap: BUBBLE_GAP,
    max: 52,
    min: 34,
  });
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<boolean[][]>(() => GROUNDING_STEPS.map((s) => Array<boolean>(s.count).fill(false)));
  const current = GROUNDING_STEPS[step];
  const marks = checked[step];
  const doneCount = marks.filter(Boolean).length;
  const complete = doneCount === current.count;
  const last = step === GROUNDING_STEPS.length - 1;
  const c = exercise.color;

  const toggle = (i: number) => {
    const willComplete = !marks[i] && doneCount + 1 === current.count;
    haptic(willComplete ? 'success' : 'light');
    setChecked((prev) => prev.map((row, r) => (r === step ? row.map((v, k) => (k === i ? !v : v)) : row)));
  };

  const next = () => {
    if (last) {
      onFinish();
      return;
    }
    haptic('medium');
    setStep(step + 1);
  };

  return (
    <View style={styles.wrap}>
      <StepDots count={GROUNDING_STEPS.length} current={step} color={c} />

      <FadeIn id={step}>
        <Card tint={c} tintStrength={0.07} style={styles.card} testID={`sos-grounding-step-${step}`}>
          <View style={styles.top}>
            <Text style={[styles.count, { color: c }]} tabular>
              {current.count}
            </Text>
            <View style={styles.flex}>
              <Text variant="heading">{current.verb}</Text>
              <Text variant="caption" tone="secondary">
                {doneCount} of {current.count} noticed
              </Text>
            </View>
            <IconTile icon={current.icon} color={c} size={44} />
          </View>
          <Text variant="body" tone="secondary">
            {current.hint}
          </Text>
          <View style={styles.bubbles} onLayout={(e) => setRowWidth(Math.round(e.nativeEvent.layout.width))}>
            {marks.map((on, i) => (
              <Pressable
                key={i}
                onPress={() => toggle(i)}
                disabled={paused}
                accessibilityRole="checkbox"
                aria-checked={on}
                accessibilityLabel={`${current.sense} ${i + 1}`}
                testID={`sos-bubble-${i}`}
                style={({ pressed }) => [
                  styles.bubble,
                  { width: size, height: size, borderRadius: size / 2 },
                  on ? { backgroundColor: c, borderColor: c } : { borderColor: withAlpha(c, 0.45), backgroundColor: withAlpha(c, 0.08) },
                  pressed && styles.pressed,
                ]}
              >
                {on ? (
                  <Icon name="check-bold" size={Math.round(size * 0.42)} color={labelColorOn(c)} />
                ) : (
                  <Text variant="bodyStrong" color={withAlpha(c, 0.9)}>
                    {i + 1}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </Card>
      </FadeIn>

      <Text variant="caption" tone="tertiary" center>
        {complete ? 'Nice. Take one slow breath before moving on.' : `Tap a circle for each thing you ${current.sense}.`}
      </Text>

      <FillButton
        label={last ? 'Finish' : 'Next'}
        iconRight={last ? 'check' : 'arrow-right'}
        fill={c}
        disabled={!complete || paused}
        onPress={next}
        testID="sos-grounding-next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  card: { gap: spacing.lg, padding: CARD_PADDING },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  count: { fontSize: 56, fontWeight: '800', lineHeight: 60, letterSpacing: -2 },
  bubbles: { flexDirection: 'row', flexWrap: 'wrap', gap: BUBBLE_GAP, justifyContent: 'center' },
  bubble: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },
});
