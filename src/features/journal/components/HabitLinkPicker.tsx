import { StyleSheet, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { spacing } from '@/theme';
import type { Habit } from '@/types';
import { PillChip } from './PillChip';

export interface HabitLinkPickerProps {
  habits: Habit[];
  value: string | null;
  onChange: (habitId: string | null) => void;
}

/** "Link to habit": None + one chip per habit (icon and color of the habit). */
export function HabitLinkPicker({ habits, value, onChange }: HabitLinkPickerProps) {
  const haptic = useHaptics();
  const pick = (id: string | null) => {
    if (id !== value) haptic('selection');
    onChange(id);
  };
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Link to habit">
      <PillChip label="None" icon="link-variant-off" selected={value == null} onPress={() => pick(null)} a11yKind="radio" accessibilityLabel="Not linked to a habit" testID="link-none" />
      {habits.map((h) => (
        <PillChip
          key={h.id}
          label={h.archived ? `${h.name} (archived)` : h.name}
          icon={h.icon}
          iconColor={h.color}
          selected={value === h.id}
          selectedColor={h.color}
          onPress={() => pick(h.id)}
          a11yKind="radio"
          accessibilityLabel={`Link to ${h.name}`}
          testID={`link-${h.id}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
