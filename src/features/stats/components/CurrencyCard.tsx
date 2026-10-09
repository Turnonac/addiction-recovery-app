import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import { radius, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import { cardValueFontSize } from '../format';

export interface CurrencyCardProps {
  color: string;
  /** Small label next to the icon (currency symbol). */
  tag: string;
  value: string;
  /** Small suffix after the value (currency symbol / unit). */
  suffix?: string;
  caption: string;
  icon?: IconName;
  width?: number;
}

/** Tinted card in the Savings carousel: "▣ ₴ / 4.6K₴ / saved". */
export function CurrencyCard({ color, tag, value, suffix, caption, icon = 'cash', width = 136 }: CurrencyCardProps) {
  return (
    <View
      style={[styles.card, { width, backgroundColor: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.32) }]}
      accessible
      accessibilityLabel={`${value}${suffix ? ` ${suffix}` : ''} ${caption}`}
    >
      <View style={styles.head}>
        <View style={[styles.tile, { backgroundColor: withAlpha(color, 0.2), borderColor: withAlpha(color, 0.5) }]}>
          <Icon name={icon} size={13} color={color} />
        </View>
        <Text variant="captionStrong" color={color} numberOfLines={1}>
          {tag}
        </Text>
      </View>
      <View style={styles.valueRow}>
        {/* Sized from the text length (adjustsFontSizeToFit only works on iOS). */}
        <Text style={[styles.value, { fontSize: cardValueFontSize(value, suffix) }]} tabular numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {suffix ? (
          <Text variant="captionStrong" tone="tertiary" numberOfLines={1} style={styles.suffix}>
            {suffix}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" tone="tertiary" numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tile: { width: 22, height: 16, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
  value: { fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  suffix: { flexShrink: 0 },
});
