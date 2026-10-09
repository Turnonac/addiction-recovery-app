import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { isSameDay } from '@/domain/time';
import { colors, spacing } from '@/theme';
import { formatDate } from '@/utils/format';
import { buildMonthGrid, isDayDisabled, monthTitle, weekdayLetters, weekdayNames } from './calendar';

export interface MonthGridProps {
  year: number;
  month: number;
  weekStartsOn: 0 | 1;
  selected: number;
  today: number;
  min?: number;
  max?: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (dayTs: number) => void;
}

const CELL = 40;

/** Month header (‹ March 2026 ›), weekday letters and a 6×7 day grid. */
export function MonthGrid({ year, month, weekStartsOn, selected, today, min, max, canPrev, canNext, onPrev, onNext, onSelectDay }: MonthGridProps) {
  const grid = buildMonthGrid(year, month, weekStartsOn);
  const names = weekdayNames(weekStartsOn);
  return (
    <View>
      <View style={styles.monthRow}>
        <IconButton icon="chevron-left" size={36} onPress={onPrev} disabled={!canPrev} accessibilityLabel="Previous month" />
        <Text variant="subheading" center accessibilityRole="header" accessibilityLiveRegion="polite">
          {monthTitle(year, month)}
        </Text>
        <IconButton icon="chevron-right" size={36} onPress={onNext} disabled={!canNext} accessibilityLabel="Next month" />
      </View>

      <View style={styles.row}>
        {weekdayLetters(weekStartsOn).map((l, i) => (
          <View key={i} style={[styles.cell, styles.weekday]} accessibilityLabel={names[i]}>
            <Text variant="micro" tone="tertiary" mono>
              {l}
            </Text>
          </View>
        ))}
      </View>

      {grid.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((c) => {
            if (!c.inMonth) return <View key={c.ts} style={styles.cell} />;
            const disabled = isDayDisabled(c.ts, min, max);
            const isSelected = isSameDay(c.ts, selected);
            const isToday = isSameDay(c.ts, today);
            return (
              <View key={c.ts} style={styles.cell}>
                <Pressable
                  onPress={() => onSelectDay(c.ts)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDate(c.ts)}${isToday ? ', today' : ''}`}
                  accessibilityState={{ selected: isSelected, disabled }}
                  hitSlop={2}
                  style={({ pressed }) => [
                    styles.day,
                    isToday && !isSelected && styles.today,
                    isSelected && styles.selected,
                    pressed && !isSelected && styles.pressed,
                  ]}
                >
                  <Text
                    variant={isSelected || isToday ? 'bodyStrong' : 'body'}
                    color={isSelected ? colors.text : disabled ? colors.textTertiary : isToday ? colors.accent : colors.text}
                    style={disabled ? styles.disabledText : undefined}
                    tabular
                  >
                    {c.day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: CELL + 2, alignItems: 'center', justifyContent: 'center' },
  weekday: { height: 24 },
  day: { width: CELL, height: CELL, borderRadius: CELL / 2, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.accent },
  selected: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  pressed: { backgroundColor: colors.cardPressed },
  disabledText: { opacity: 0.45 },
});
