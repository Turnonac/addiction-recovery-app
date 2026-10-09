import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { Habit } from '@/types';
import { useScrollReveal } from './useScrollReveal';

export interface HabitPickerProps {
  habits: Habit[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

/** Horizontal row of habit chips (icon + name in the habit color) for "This habit". */
export function HabitPicker({ habits, selectedId, onSelect }: HabitPickerProps) {
  const { ref, scrollProps, itemLayout } = useScrollReveal(selectedId);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      role="tablist"
      aria-label="Habit"
      {...scrollProps}
    >
      {habits.map((h) => (
        <View key={h.id} onLayout={itemLayout(h.id)}>
          <HabitChip habit={h} selected={h.id === selectedId} onPress={() => onSelect(h.id)} />
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * Same look as the shared Chip (size md, habit tint), but a tab exposing its selected
 * state with aria-selected, which react-native-web renders (it drops accessibilityState).
 */
function HabitChip({ habit, selected, onPress }: { habit: Habit; selected: boolean; onPress: () => void }) {
  const label = habit.archived ? `${habit.name} (archived)` : habit.name;
  return (
    <Pressable
      onPress={onPress}
      role="tab"
      aria-selected={selected}
      aria-label={`Show statistics for ${habit.name}`}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: withAlpha(habit.color, selected ? 0.28 : 0.12),
          borderColor: withAlpha(habit.color, selected ? 0.7 : 0.25),
        },
        !selected && styles.dim,
        pressed && (selected ? styles.pressed : styles.pressedDim),
      ]}
    >
      <Icon name={habit.icon} size={15} color={habit.color} />
      <Text style={styles.label} color={selected ? habit.color : colors.textSecondary} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    maxWidth: 200,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  dim: { opacity: 0.6 },
  pressed: { opacity: 0.75 },
  pressedDim: { opacity: 0.45 },
});
