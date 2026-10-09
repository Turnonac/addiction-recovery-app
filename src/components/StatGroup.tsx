import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';

export interface StatItem {
  icon: IconName;
  color: string;
  value: string;
  label: string;
  /** Optional small line under the label, e.g. "+358€ +124$". */
  sub?: string;
}

/**
 * Card with 2–4 stats separated by thin dividers, each with a tinted icon
 * circle on top (home summary, habit detail "Attempt / Record / Total").
 */
export function StatGroup({ items, uppercaseLabels = false }: { items: StatItem[]; uppercaseLabels?: boolean }) {
  return (
    <Card padding={spacing.lg}>
      <View style={styles.row}>
        {items.map((it, i) => (
          <Fragment key={it.label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.cell} accessible accessibilityLabel={`${it.label}: ${it.value}`}>
              <View style={[styles.iconCircle, { backgroundColor: withAlpha(it.color, 0.18), borderColor: withAlpha(it.color, 0.35) }]}>
                <Icon name={it.icon} size={18} color={it.color} />
              </View>
              <Text variant="title" style={styles.value} tabular numberOfLines={1} adjustsFontSizeToFit>
                {it.value}
              </Text>
              <Text
                variant={uppercaseLabels ? 'overline' : 'caption'}
                tone="secondary"
                center
                numberOfLines={1}
                style={uppercaseLabels ? styles.overline : undefined}
              >
                {it.label}
              </Text>
              {it.sub ? (
                <Text variant="micro" tone="tertiary" center numberOfLines={1}>
                  {it.sub}
                </Text>
              ) : null}
            </View>
          </Fragment>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginVertical: spacing.sm },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  value: { fontSize: 24 },
  overline: { fontSize: 10, letterSpacing: 1.5 },
});
