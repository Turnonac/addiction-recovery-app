import { Fragment, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import { fitFontSize } from '../logic';

export interface DetailStat {
  icon: IconName;
  color: string;
  value: string;
  label: string;
}

const VALUE_SIZE = 24;
const MIN_VALUE_SIZE = 15;
const CELL_PAD = 2;

/**
 * "Attempt · Record · Total clean days" card. Same look as the shared StatGroup,
 * with the reference's smaller labels. Values shrink to fit their column and
 * labels may wrap to two lines on narrow phones.
 */
export function DetailStats({ items }: { items: DetailStat[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  // Before the first layout, estimate from the window (screen gutters + card padding).
  const width = rowWidth ?? windowWidth - spacing.lg * 4;
  const cellWidth = width / Math.max(1, items.length) - CELL_PAD * 2;

  return (
    <Card padding={spacing.lg} testID="detail-stats">
      <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        {items.map((it, i) => {
          const fontSize = fitFontSize(it.value, cellWidth, VALUE_SIZE, MIN_VALUE_SIZE);
          return (
            <Fragment key={it.label}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.cell} accessible accessibilityLabel={`${it.label}: ${it.value}`}>
                <View style={[styles.icon, { backgroundColor: withAlpha(it.color, 0.18) }]}>
                  <Icon name={it.icon} size={17} color={it.color} />
                </View>
                <View style={styles.valueBox}>
                  <Text style={[styles.value, { fontSize }]} tabular numberOfLines={1}>
                    {it.value}
                  </Text>
                </View>
                <Text style={styles.label} tone="tertiary" numberOfLines={2} center>
                  {it.label}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1, alignItems: 'center', paddingHorizontal: CELL_PAD },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginVertical: spacing.md },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  // Fixed line box so a shrunken value stays aligned with its neighbours.
  valueBox: { height: 30, justifyContent: 'center' },
  value: { fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  label: { fontSize: 11.5, lineHeight: 14, fontWeight: '600', letterSpacing: 0.3, marginTop: 4 },
});
