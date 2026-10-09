import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { BreathPhase } from '../logic/timeline';

const SHORT: Record<BreathPhase['kind'], string> = { in: 'In', hold: 'Hold', out: 'Out', rest: 'Hold' };

/** Row of pills "In 4 · Hold 7 · Out 8" with the current phase highlighted. */
export function PhaseStrip({ phases, current, color }: { phases: BreathPhase[]; current: number; color: string }) {
  return (
    <View style={styles.row}>
      {phases.map((p, i) => {
        const active = i === current;
        return (
          <View
            key={`${p.kind}${i}`}
            style={[styles.pill, active && { backgroundColor: withAlpha(color, 0.22), borderColor: withAlpha(color, 0.7) }]}
          >
            <Text variant="captionStrong" color={active ? colors.text : colors.textTertiary}>
              {SHORT[p.kind]}
            </Text>
            <Text variant="captionStrong" mono color={active ? color : colors.textTertiary}>
              {Math.round(p.ms / 1000)}s
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
});
