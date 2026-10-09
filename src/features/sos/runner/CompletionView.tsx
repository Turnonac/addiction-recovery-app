import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Text } from '@/components';
import type { ExerciseDef } from '@/domain/catalog/exercises';
import { colors, spacing } from '@/theme';
import { IntensityPicker, intensityColor } from '../components/IntensityPicker';
import { SuccessCheck } from '../components/SuccessCheck';
import { completionTitle, intensityDeltaMessage } from '../logic/session';
import { formatClock, formatSpoken } from '../logic/timeline';

export interface CompletionViewProps {
  exercise: ExerciseDef;
  reachedEnd: boolean;
  durationSec: number;
  before: number | null;
  after: number | null;
  onChangeAfter: (n: number | null) => void;
  onDone: () => void;
  onTryAnother: () => void;
}

/** "You outlasted it": check animation, time spent, urge re-rating, Done / Try another. */
export function CompletionView({ exercise, reachedEnd, durationSec, before, after, onChangeAfter, onDone, onTryAnother }: CompletionViewProps) {
  const delta = intensityDeltaMessage(before, after);
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="sos-complete">
      <View style={styles.hero}>
        <SuccessCheck color={exercise.color} />
        <Text variant="title" center testID="sos-complete-title">
          {completionTitle(reachedEnd)}
        </Text>
        <Text variant="body" tone="secondary" center style={styles.sub}>
          You stayed with {exercise.title} for {formatSpoken(durationSec)}.{' '}
          {reachedEnd ? 'The craving had to wait — and you stayed in charge.' : 'Stopping when you feel better is a win too.'}
        </Text>
        <View style={styles.chips}>
          <Chip icon="timer-outline" label={formatClock(durationSec * 1000)} color={exercise.color} />
          {before != null ? <Chip icon="pulse" label={`Urge before: ${before}`} color={intensityColor(before)} /> : null}
        </View>
      </View>

      <Card style={styles.card}>
        <IntensityPicker
          title="How strong is the urge now?"
          value={after}
          onChange={onChangeAfter}
          reference={before}
          testID="sos-intensity-after"
        />
        {delta ? (
          <Text variant="caption" color={after != null && before != null && after > before ? colors.warning : colors.textSecondary} testID="sos-delta">
            {delta}
          </Text>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button label="Done" size="lg" onPress={onDone} testID="sos-done" />
        <Button label="Try another exercise" variant="secondary" icon="swap-horizontal" onPress={onTryAnother} testID="sos-try-another" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.lg, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  sub: { maxWidth: 340 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  card: { gap: spacing.md },
  actions: { gap: spacing.md },
});
