import { Pressable, StyleSheet } from 'react-native';

import { Icon, Text } from '@/components';
import { radius, spacing, withAlpha } from '@/theme';
import type { Habit } from '@/types';

/** Tappable habit pill on the entry view ("🚬 Smoking ›") that opens the habit. */
export function HabitLinkPill({ habit, onPress }: { habit: Habit; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Open ${habit.name}`}
      testID="journal-view-habit"
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: withAlpha(habit.color, pressed ? 0.26 : 0.14), borderColor: withAlpha(habit.color, 0.45) },
      ]}
    >
      <Icon name={habit.icon} size={16} color={habit.color} />
      <Text variant="captionStrong" color={habit.color} numberOfLines={1} style={styles.label}>
        {habit.name}
      </Text>
      <Icon name="chevron-right" size={16} color={withAlpha(habit.color, 0.8)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { maxWidth: 200 },
});
