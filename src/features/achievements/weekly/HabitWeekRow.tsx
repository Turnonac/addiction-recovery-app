import { StyleSheet, View } from 'react-native';

import { Icon, IconTile, Text } from '@/components';
import type { DayStatus, WeeklyHabitRow } from '@/domain/weekly';
import { colors, spacing, withAlpha } from '@/theme';

export interface HabitWeekRowProps {
  row: WeeklyHabitRow;
  letters: string[];
  /** Index of today within the week, or -1. */
  todayIndex: number;
  first: boolean;
}

const STATUS_LABEL: Record<DayStatus, string> = {
  clean: 'clean',
  relapse: 'relapse',
  not_started: 'not started',
  future: 'upcoming',
};

/** Habit name + 7 day dots (clean / relapse / not started / upcoming). */
export function HabitWeekRow({ row, letters, todayIndex, first }: HabitWeekRowProps) {
  const { habit, days, cleanDays, trackedDays } = row;
  return (
    <View style={[styles.wrap, !first && styles.separator]}>
      <View style={styles.head}>
        <IconTile icon={habit.icon} color={habit.color} size={32} />
        <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {habit.name}
        </Text>
        <Text variant="captionStrong" tone={trackedDays && cleanDays === trackedDays ? 'primary' : 'secondary'} tabular>
          {cleanDays}/{trackedDays} clean
        </Text>
      </View>
      <View style={styles.days}>
        {days.map((s, i) => (
          <View key={i} style={styles.day} accessible accessibilityLabel={`${letters[i]}: ${STATUS_LABEL[s]}`}>
            <Dot status={s} color={habit.color} today={i === todayIndex} />
            <Text variant="micro" tone={i === todayIndex ? 'primary' : 'tertiary'} style={styles.letter}>
              {letters[i]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Dot({ status, color, today }: { status: DayStatus; color: string; today: boolean }) {
  const ring = today ? { borderColor: colors.text, borderWidth: 1.5 } : null;
  if (status === 'clean') {
    return (
      <View style={[styles.dot, { backgroundColor: color, boxShadow: `0 0 10px ${withAlpha(color, 0.45)}` }, ring]}>
        <Icon name="check-bold" size={14} color={colors.text} />
      </View>
    );
  }
  if (status === 'relapse') {
    return (
      <View style={[styles.dot, { backgroundColor: colors.dangerSoft, borderColor: withAlpha(colors.danger, 0.7), borderWidth: 1 }, ring]}>
        <Icon name="close-thick" size={13} color={colors.danger} />
      </View>
    );
  }
  if (status === 'not_started') {
    return <View style={[styles.dot, styles.notStarted, ring]} />;
  }
  return <View style={[styles.dot, styles.future, ring]} />;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 5, width: 34 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notStarted: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  future: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  letter: { fontSize: 10 },
});
