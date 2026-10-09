import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';

export interface StatTileProps {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  /** Kept visible after `sub` when that has to be truncated (e.g. "· now" after a long name). */
  subTrailing?: string;
}

/** Glass card with an icon, a big number + unit and a caption (Streaks overview). */
export function StatTile({ icon, color, label, value, unit, sub, subTrailing }: StatTileProps) {
  return (
    <Card padding={spacing.md} style={styles.card} accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.18), borderColor: withAlpha(color, 0.35) }]}>
          <Icon name={icon} size={15} color={color} />
        </View>
        <Text variant="overline" tone="tertiary" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Text variant="title" tabular numberOfLines={1} style={styles.value}>
          {value}
        </Text>
        {unit ? (
          <Text variant="captionStrong" tone="secondary" style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </View>
      {sub ? (
        <View style={styles.subRow}>
          <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.sub}>
            {sub}
          </Text>
          {subTrailing ? (
            <Text variant="caption" tone="tertiary" style={styles.subTrailing}>
              {subTrailing}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 10, letterSpacing: 1.5, flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: spacing.md },
  value: { fontSize: 30, letterSpacing: -0.5 },
  unit: { marginBottom: 2 },
  subRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  sub: { flexShrink: 1, minWidth: 0 },
  subTrailing: { flexShrink: 0 },
});
