import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';

export interface BrainSummaryCardProps {
  name: string;
  color: string;
  streakDays: number;
  summary: string;
}

/** Habit-tinted card at the top of the brain screen: name, "Day 29 clean", summary. */
export function BrainSummaryCard({ name, color, streakDays, summary }: BrainSummaryCardProps) {
  return (
    <View style={[styles.card, { borderColor: withAlpha(color, 0.3) }]}>
      <LinearGradient
        colors={[withAlpha(color, 0.3), withAlpha(color, 0.12), withAlpha(color, 0.05)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text variant="heading" numberOfLines={2}>
        {name}
      </Text>
      <Text variant="caption" tone="tertiary" mono style={styles.day}>
        {`Day ${streakDays} clean`}
      </Text>
      <Text variant="body" tone="secondary" style={styles.summary}>
        {summary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  day: { marginTop: 4, letterSpacing: 1 },
  summary: { marginTop: spacing.md, fontSize: 14, lineHeight: 20 },
});
