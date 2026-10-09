import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Card, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { barFractions, fitFontSize, streakLabel, type StreakItem } from '../logic';

export interface StreakChartProps {
  items: StreakItem[];
  color: string;
}

const CHART_HEIGHT = 132;
/** Above this many attempts the chart scrolls horizontally with fixed-width bars. */
const MAX_FIT = 10;
const FIXED_COLUMN = 34;
const GAP = spacing.xs;
const LABEL_SIZE = 10;
const MIN_LABEL_SIZE = 7;

/**
 * Bars of every streak in order (attempt 1 → now). The record is gold, the
 * ongoing streak uses the habit color and is labeled "now"; when the ongoing
 * streak is the record, its gold bar gets a habit-colored cap and outline.
 */
export function StreakChart({ items, color }: StreakChartProps) {
  const fractions = barFractions(items);
  const scroll = items.length > MAX_FIT;
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  // Before the first layout, estimate from the window (screen gutters + card padding).
  const width = rowWidth ?? windowWidth - spacing.lg * 4;
  const n = Math.max(1, items.length);
  const columnWidth = scroll ? FIXED_COLUMN : Math.max(1, (width - GAP * (n - 1)) / n);
  // A value label may use its column plus the gap, centered over the bar, so
  // neighbouring labels just touch; long ones ("365d" in 10 columns at 320pt) shrink.
  const labelWidth = columnWidth + GAP;
  const labels = items.map((it) => streakLabel(it.ms));
  // One size for every value label (the longest decides), so the row reads evenly.
  const fontSize = labels.reduce((size, l) => Math.min(size, fitFontSize(l, labelWidth - 2, LABEL_SIZE, MIN_LABEL_SIZE)), LABEL_SIZE);

  const columns = items.map((it, i) => {
    const barColor = it.isRecord ? colors.gold : it.current ? color : withAlpha(colors.text, 0.22);
    const labelColor = it.isRecord ? colors.gold : it.current ? color : colors.textTertiary;
    const currentRecord = it.isRecord && it.current;
    const label = labels[i];
    return (
      <View
        key={it.attempt}
        style={[styles.column, scroll ? { width: FIXED_COLUMN } : styles.flex]}
        accessible
        accessibilityLabel={`Attempt ${it.attempt}${it.current ? ', current' : ''}${it.isRecord ? ', record' : ''}: ${label}`}
      >
        <View style={styles.barArea}>
          {/* maxWidth too: react-native-web caps single-line text at 100% of its column. */}
          <Text style={[styles.value, { width: labelWidth, maxWidth: labelWidth, fontSize, lineHeight: LABEL_SIZE + 3 }]} color={labelColor} numberOfLines={1} center>
            {label}
          </Text>
          <View
            style={[
              styles.bar,
              {
                height: Math.max(4, Math.round(fractions[i] * (CHART_HEIGHT - 18))),
                backgroundColor: barColor,
                boxShadow: it.isRecord || it.current ? `0 0 12px ${withAlpha(barColor, 0.5)}` : undefined,
              },
              currentRecord && { borderWidth: 2, borderColor: color },
            ]}
          >
            {currentRecord ? <View style={[styles.cap, { backgroundColor: color }]} testID="history-current-cap" /> : null}
          </View>
        </View>
        <Text style={styles.axis} color={it.current ? color : colors.textTertiary} numberOfLines={1}>
          {it.current ? 'now' : `#${it.attempt}`}
        </Text>
      </View>
    );
  });

  return (
    <Card testID="history-chart">
      <View style={styles.head}>
        <Text variant="overline" tone="tertiary">
          STREAK PER ATTEMPT
        </Text>
        <View style={styles.legend}>
          <LegendDot color={colors.gold} label="Record" />
          <LegendDot color={color} label="Current" />
        </View>
      </View>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          // Start at the most recent attempts.
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {columns}
        </ScrollView>
      ) : (
        <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
          {columns}
        </View>
      )}
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="micro" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: GAP },
  flex: { flex: 1 },
  column: { alignItems: 'center' },
  barArea: { height: CHART_HEIGHT, justifyContent: 'flex-end', alignItems: 'center', alignSelf: 'stretch' },
  bar: { width: '62%', maxWidth: 30, minWidth: 10, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  // Habit-colored cap on a gold bar: the ongoing streak is also the record.
  cap: { height: 6, borderTopLeftRadius: radius.sm - 2, borderTopRightRadius: radius.sm - 2 },
  value: { fontWeight: '700', marginBottom: 4 },
  axis: { fontSize: 10, fontWeight: '600', marginTop: 6 },
});
