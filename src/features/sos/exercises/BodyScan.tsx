import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import { BODY_REGIONS } from '../content';
import { BodySilhouette } from '../components/BodySilhouette';
import { FadeIn } from '../components/FadeIn';
import { BODY_REGION_MS, secondsLeft, segmentAt } from '../logic/timeline';
import type { ExerciseViewProps } from '../runner/types';
import { usePhaseHaptic } from '../runner/usePhaseHaptic';

const DURATIONS = BODY_REGIONS.map(() => BODY_REGION_MS);

/** Body scan: nine regions, ~20 seconds each, from the feet up to the forehead. */
export function BodyScan({ exercise, t, paused }: ExerciseViewProps) {
  const seg = segmentAt(DURATIONS, t);
  const region = BODY_REGIONS[seg.index];
  usePhaseHaptic(seg.index);
  const c = exercise.color;

  return (
    <View style={styles.wrap}>
      <Text variant="overline" color={c}>
        Region {seg.index + 1} of {BODY_REGIONS.length}
      </Text>

      <View style={styles.stage}>
        <View style={[styles.halo, { backgroundColor: withAlpha(c, 0.07), borderColor: withAlpha(c, 0.16) }]} />
        <BodySilhouette height={228} color={c} region={region.id} paused={paused} />
      </View>

      <FadeIn id={seg.index} style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text variant="title" testID="sos-region-name">
            {region.name}
          </Text>
          <Text variant="captionStrong" mono color={c}>
            {secondsLeft(seg.remainingMs)}s
          </Text>
        </View>
        <Text variant="body" tone="secondary" center style={styles.instruction}>
          {paused ? 'Paused. Stay with the feeling — resume when ready.' : region.instruction}
        </Text>
      </FadeIn>

      <View style={styles.segments} accessibilityRole="progressbar" accessibilityLabel={`Region ${seg.index + 1} of ${BODY_REGIONS.length}`}>
        {BODY_REGIONS.map((r, i) => {
          const fill = i < seg.index ? 1 : i === seg.index ? seg.progress : 0;
          return (
            <View key={r.id} style={styles.segTrack}>
              <View style={[styles.segFill, { width: `${fill * 100}%`, backgroundColor: c }]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.lg },
  stage: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1 },
  textBlock: { alignItems: 'center', gap: spacing.sm, minHeight: 104 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  instruction: { maxWidth: 320 },
  segments: { flexDirection: 'row', gap: 4, alignSelf: 'stretch' },
  segTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.cardStrong, overflow: 'hidden' },
  segFill: { height: '100%', borderRadius: 2 },
});
