import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { spacing } from '@/theme';
import { StreakBarRow } from './StreakBarRow';

export interface AmountBarRowProps {
  color: string;
  label: string;
  amount: string;
  /** 0..1 */
  value: number;
}

/** "● ₴ ……… 4.6K₴" with a thick glowing bar underneath (BY CURRENCY). */
export function AmountBarRow({ color, label, amount, value }: AmountBarRowProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${amount}`}>
      <View style={styles.top}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {label}
        </Text>
        <Text variant="bodyStrong" color={color} tabular>
          {amount}
        </Text>
      </View>
      <StreakBarRow value={value} color={color} height={10} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
});
