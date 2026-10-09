import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components';
import { colors, spacing } from '@/theme';

export interface LegendItem {
  color: string;
  label: string;
  /** square (default) = filled swatch, outlined = filled swatch with a white border, dot = small circle, ring = outlined circle, tick = vertical bar */
  shape?: 'square' | 'outlined' | 'dot' | 'ring' | 'tick';
}

/** Row of small colored swatches with labels under/next to a chart. */
export function ChartLegend({ items, style }: { items: LegendItem[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      {items.map((it, i) => (
        <View key={`${i}:${it.label}`} style={styles.item}>
          <View style={swatch(it)} />
          <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.label}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function swatch({ color, shape = 'square' }: LegendItem) {
  switch (shape) {
    case 'dot':
      return { width: 8, height: 8, borderRadius: 4, backgroundColor: color, flexShrink: 0 };
    case 'ring':
      return { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: color, flexShrink: 0 };
    case 'outlined':
      return { width: 12, height: 12, borderRadius: 3, backgroundColor: color, borderWidth: 1.5, borderColor: colors.text, flexShrink: 0 };
    case 'tick':
      return { width: 3, height: 12, borderRadius: 1.5, backgroundColor: color, flexShrink: 0 };
    default:
      return { width: 12, height: 12, borderRadius: 3, backgroundColor: color, flexShrink: 0 };
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.lg, rowGap: spacing.xs },
  // Long labels (e.g. habit names) shrink to the row and end with an ellipsis.
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', flexShrink: 1, minWidth: 0 },
  label: { flexShrink: 1, minWidth: 0 },
});
