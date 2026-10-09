import { ScrollView, StyleSheet, View } from 'react-native';

import { MOODS } from '@/domain/catalog/moods';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing } from '@/theme';
import type { Habit, MoodId } from '@/types';
import { PillChip } from './PillChip';

export interface MoodFilterRowProps {
  value: MoodId | null;
  onChange: (mood: MoodId | null) => void;
}

/** "All" + one icon-only chip per mood (weather icons), like the original. */
export function MoodFilterRow({ value, onChange }: MoodFilterRowProps) {
  const haptic = useHaptics();
  const pick = (mood: MoodId | null) => {
    haptic('selection');
    onChange(mood);
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.bleed} keyboardShouldPersistTaps="handled">
      <PillChip label="All" icon="filter-variant" size="sm" selected={value == null} onPress={() => pick(null)} accessibilityLabel="All moods" testID="journal-filter-all" />
      <View style={styles.separator} />
      {MOODS.map((m) => (
        <PillChip
          key={m.id}
          icon={m.icon}
          size="sm"
          selected={value === m.id}
          selectedIconColor={m.color}
          onPress={() => pick(value === m.id ? null : m.id)}
          accessibilityLabel={`${m.label} mood`}
          testID={`journal-filter-${m.id}`}
        />
      ))}
    </ScrollView>
  );
}

export interface HabitFilterRowProps {
  habits: Habit[];
  value: string | null;
  onChange: (habitId: string | null) => void;
}

/** Optional second row: filter by linked habit. */
export function HabitFilterRow({ habits, value, onChange }: HabitFilterRowProps) {
  const haptic = useHaptics();
  if (!habits.length) return null;
  const pick = (id: string | null) => {
    haptic('selection');
    onChange(id);
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.bleed} keyboardShouldPersistTaps="handled">
      <PillChip label="All habits" size="sm" selected={value == null} onPress={() => pick(null)} testID="journal-habit-all" />
      {habits.map((h) => (
        <PillChip
          key={h.id}
          label={h.name}
          icon={h.icon}
          iconColor={h.color}
          size="sm"
          selected={value === h.id}
          selectedColor={h.color}
          onPress={() => pick(value === h.id ? null : h.id)}
          accessibilityLabel={`Only entries about ${h.name}`}
          testID={`journal-habit-${h.id}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edges so chips scroll under the gutter.
  bleed: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  separator: { width: 1, height: 18, backgroundColor: colors.borderStrong, marginHorizontal: 2 },
});
