import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import { MOODS } from '@/domain/catalog/moods';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { MoodId } from '@/types';

export interface MoodPickerProps {
  value: MoodId | null;
  onChange: (value: MoodId | null) => void;
}

/** Five weather icons (stormy → star). Single select; tap the selected one again to clear. */
export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const haptic = useHaptics();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {MOODS.map((m) => {
        const selected = value === m.id;
        return (
          <Pressable
            key={m.id}
            onPress={() => {
              haptic('selection');
              onChange(selected ? null : m.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={`Mood: ${m.label}`}
            testID={`mood-${m.id}`}
            style={({ pressed }) => [
              styles.tile,
              selected && { backgroundColor: withAlpha(m.color, 0.18), borderColor: withAlpha(m.color, 0.7) },
              pressed && styles.pressed,
            ]}
          >
            <Icon name={m.icon} size={26} color={selected ? m.color : colors.textSecondary} />
            <Text variant="micro" color={selected ? m.color : colors.textTertiary} numberOfLines={1}>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
});
