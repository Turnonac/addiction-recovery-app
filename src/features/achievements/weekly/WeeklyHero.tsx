import { StyleSheet, View } from 'react-native';

import { Card, Icon, ProgressRing, Text } from '@/components';
import type { WeeklySummary } from '@/domain/weekly';
import { colors, spacing } from '@/theme';
import { formatPercent, plural } from '@/utils/format';

/** "Your week" hero: big clean-days stat with a completion ring. */
export function WeeklyHero({ summary }: { summary: WeeklySummary }) {
  const { cleanDays, trackedDays, relapses, habits, bestStreakDays, bestStreakHabit } = summary;
  const ratio = trackedDays ? cleanDays / trackedDays : 0;
  const ringColor = relapses ? colors.warning : colors.success;
  return (
    <Card tint={ringColor} tintStrength={0.06}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="overline" tone="tertiary">
            Your week
          </Text>
          <View style={styles.bigRow} accessible accessibilityLabel={`${cleanDays} of ${trackedDays} clean days`}>
            <Text variant="display" tabular style={styles.big}>
              {cleanDays}
            </Text>
            <Text variant="heading" tone="tertiary" tabular style={styles.of}>
              /{trackedDays}
            </Text>
          </View>
          <Text variant="bodyStrong">clean days</Text>
          <Text variant="caption" tone="secondary">
            across {plural(habits.length, 'habit')}
            {summary.isCurrentWeek ? ' so far' : ''}
          </Text>
        </View>
        <ProgressRing progress={ratio} size={92} strokeWidth={9} color={ringColor}>
          <Text variant="subheading" tabular>
            {formatPercent(ratio)}
          </Text>
        </ProgressRing>
      </View>
      <View style={styles.chips}>
        <View style={styles.chip}>
          <Icon name={relapses ? 'refresh' : 'shield-check-outline'} size={14} color={relapses ? colors.warning : colors.success} />
          <Text variant="captionStrong" tone="secondary">
            {relapses ? plural(relapses, 'relapse') : 'No relapses'}
          </Text>
        </View>
        {bestStreakHabit ? (
          <View style={styles.chip}>
            <Icon name="fire" size={14} color={colors.fire} />
            <Text variant="captionStrong" tone="secondary" numberOfLines={1} style={styles.shrink}>
              Best streak {plural(bestStreakDays, 'day')} · {bestStreakHabit.name}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1 },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.xs },
  big: { fontSize: 48, lineHeight: 54 },
  of: { marginBottom: 7, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  shrink: { flexShrink: 1 },
});
