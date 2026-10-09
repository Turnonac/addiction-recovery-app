import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Icon, Text } from '@/components';
import { HABIT_PRESETS, type HabitPreset } from '@/domain/catalog/habits';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { HabitKind } from '@/types';

export interface TypeStripProps {
  value: HabitKind;
  onChange: (preset: HabitPreset) => void;
}

/** Horizontally scrolling preset pills — lets the form switch type without leaving it. */
export function TypeStrip({ value, onChange }: TypeStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const centered = useRef(false);
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {HABIT_PRESETS.map((p) => {
        const active = p.kind === value;
        return (
          <Pressable
            key={p.kind}
            onPress={() => onChange(p)}
            onLayout={(e) => {
              // Bring the initially selected type into view once.
              if (!active || centered.current) return;
              centered.current = true;
              scrollRef.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - spacing.xxxl), animated: false });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Type: ${p.name}`}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.pill,
              active && { backgroundColor: withAlpha(p.color, 0.18), borderColor: withAlpha(p.color, 0.7) },
              pressed && styles.pressed,
            ]}
          >
            <Icon name={p.icon} size={16} color={p.color} />
            <Text variant="captionStrong" color={active ? colors.text : colors.textSecondary}>
              {p.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edges so pills scroll off-screen rather than clip at the gutter.
  scroll: { marginHorizontal: -spacing.lg },
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
});
