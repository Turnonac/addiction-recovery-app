import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { colors, spacing } from '@/theme';
import { useColumnWidth } from './useColumnWidth';

export interface ProjectionRow {
  key: string;
  color: string;
  /** Amount per clean day, e.g. "100 MX$" or "45m". */
  label: string;
  month: string;
  year: string;
}

/** Minimum width of a value column, so short amounts still line up as a table. */
const MIN_COL = 74;
const DOT = 8;

/**
 * "PROJECTED" table: per-day, 30-day and 1-year amounts. Amounts never wrap or get cut:
 * each value column is as wide as its widest amount, and the rate label shrinks instead.
 * Remount it (key) when its rows change so the columns can shrink again.
 */
export function ProjectionTable({ rows }: { rows: ProjectionRow[] }) {
  const [monthW, onMonthLayout] = useColumnWidth(MIN_COL);
  const [yearW, onYearLayout] = useColumnWidth(MIN_COL);
  const month = [styles.col, { minWidth: monthW }];
  const year = [styles.col, styles.yearCol, { minWidth: yearW }];

  return (
    <View>
      <View style={styles.head}>
        <Text variant="overline" tone="tertiary" numberOfLines={1} style={[styles.flex, styles.daily]}>
          Daily
        </Text>
        <Text variant="overline" tone="tertiary" numberOfLines={1} style={month} onLayout={onMonthLayout}>
          30 days
        </Text>
        <Text variant="overline" tone="tertiary" numberOfLines={1} style={year} onLayout={onYearLayout}>
          1 year
        </Text>
      </View>
      {rows.map((r) => (
        <View key={r.key} style={styles.row} accessible accessibilityLabel={`${r.label} a day: ${r.month} in 30 days, ${r.year} in a year`}>
          <View style={[styles.dot, { backgroundColor: r.color }]} />
          <Text variant="captionStrong" tone="secondary" numberOfLines={1} style={styles.flex}>
            {r.label}
          </Text>
          <Text variant="bodyStrong" tabular numberOfLines={1} style={month} onLayout={onMonthLayout}>
            {r.month}
          </Text>
          <Text variant="bodyStrong" tabular numberOfLines={1} color={r.color} style={year} onLayout={onYearLayout}>
            {r.year}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  col: { flexShrink: 0, textAlign: 'right' },
  // A little more air between the two amount columns than inside a row.
  yearCol: { marginLeft: spacing.xs },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  // Lines the "Daily" header up with the row labels, past the dot.
  daily: { paddingLeft: DOT + spacing.sm },
});
