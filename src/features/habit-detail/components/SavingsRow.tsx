import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Card, Icon, IconTile, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { Habit, IconName } from '@/types';
import { formatMinutes, formatMoney } from '@/utils/format';
import { fitFontSize, perDayMinutes, perDayMoney } from '../logic';

export interface SavingsRowProps {
  habit: Habit;
  moneySaved: number;
  minutesSaved: number;
}

/** "Money saved" and "Time regained" cards side by side; only the tracked ones are shown. */
const CARD_PADDING = spacing.md + 2;
const VALUE_SIZE = 22;
const MIN_VALUE_SIZE = 14;

export function SavingsRow({ habit, moneySaved, minutesSaved }: SavingsRowProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const money = habit.dailyCost > 0;
  const time = habit.dailyMinutes > 0;
  const count = (money ? 1 : 0) + (time ? 1 : 0);
  // Width available to a card's value (before the first layout: estimated from the window).
  const row = rowWidth ?? windowWidth - spacing.lg * 2;
  const valueWidth = (row - spacing.md * (count - 1)) / Math.max(1, count) - CARD_PADDING * 2;

  if (!money && !time) {
    return (
      <Pressable
        onPress={() => router.push(`/habit/${habit.id}/edit`)}
        accessibilityRole="button"
        accessibilityLabel="Track money and time saved"
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <Icon name="cash-plus" size={18} color={colors.textSecondary} />
        <Text variant="captionStrong" tone="secondary" style={styles.flex} numberOfLines={1}>
          Track money & time
        </Text>
        <Icon name="chevron-right" size={18} color={colors.textTertiary} />
      </Pressable>
    );
  }

  return (
    <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      {money ? (
        <SavingsCard
          icon="cash"
          color={colors.success}
          label="Money saved"
          value={formatMoney(moneySaved, habit.currency)}
          sub={perDayMoney(habit.dailyCost, habit.currency)}
          valueWidth={valueWidth}
          testID="detail-money-saved"
        />
      ) : null}
      {time ? (
        <SavingsCard
          icon="clock-outline"
          color={colors.info}
          label="Time regained"
          value={minutesSaved < 1 ? '0m' : formatMinutes(minutesSaved)}
          sub={perDayMinutes(habit.dailyMinutes)}
          valueWidth={valueWidth}
          testID="detail-time-saved"
        />
      ) : null}
    </View>
  );
}

interface SavingsCardProps {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  sub: string;
  /** Room for the value, so long amounts shrink instead of truncating. */
  valueWidth: number;
  testID?: string;
}

function SavingsCard({ icon, color, label, value, sub, valueWidth, testID }: SavingsCardProps) {
  const fontSize = fitFontSize(value, valueWidth, VALUE_SIZE, MIN_VALUE_SIZE);
  return (
    <Card style={styles.card} padding={CARD_PADDING} testID={testID} accessibilityLabel={`${label}: ${value}, ${sub}`}>
      <View style={styles.head}>
        <IconTile icon={icon} color={color} size={28} shape="circle" />
        <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.flex}>
          {label}
        </Text>
      </View>
      <View style={styles.valueBox}>
        <Text variant="heading" style={[styles.value, { fontSize }]} tabular numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text variant="caption" tone="tertiary" numberOfLines={1}>
        {sub}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  card: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Fixed line box so a shrunken value keeps both cards aligned.
  valueBox: { height: 28, justifyContent: 'center', marginTop: spacing.md },
  value: { fontWeight: '800' },
  flex: { flex: 1 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  pressed: { backgroundColor: colors.cardPressed },
});
