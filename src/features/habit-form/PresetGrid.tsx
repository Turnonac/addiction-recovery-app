import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Icon, IconTile, Text } from '@/components';
import { HABIT_PRESETS, type HabitPreset } from '@/domain/catalog/habits';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { HabitKind } from '@/types';

export interface PresetGridProps {
  selected: HabitKind[];
  onPress: (preset: HabitPreset) => void;
  /** 'multi' shows an empty ring on unselected tiles (onboarding); 'single' shows a chevron (new habit). */
  selection?: 'multi' | 'single';
  presets?: HabitPreset[];
}

/** Two-column grid of habit presets (onboarding + new habit step 1). */
export function PresetGrid({ selected, onPress, selection = 'single', presets = HABIT_PRESETS }: PresetGridProps) {
  const rows: HabitPreset[][] = [];
  for (let i = 0; i < presets.length; i += 2) rows.push(presets.slice(i, i + 2));
  return (
    <View style={styles.grid} accessibilityRole={selection === 'multi' ? 'list' : undefined}>
      {rows.map((row) => (
        <View key={row[0].kind} style={styles.row}>
          {row.map((p) => (
            <View key={p.kind} style={styles.cell}>
              <PresetTile preset={p} selected={selected.includes(p.kind)} selection={selection} onPress={() => onPress(p)} />
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

interface PresetTileProps {
  preset: HabitPreset;
  selected: boolean;
  selection: 'multi' | 'single';
  onPress: () => void;
}

export function PresetTile({ preset, selected, selection, onPress }: PresetTileProps) {
  const c = preset.color;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={selection === 'multi' ? 'checkbox' : 'button'}
      accessibilityState={selection === 'multi' ? { checked: selected } : { selected }}
      accessibilityLabel={`${preset.name}. ${preset.tagline}`}
      testID={`preset-${preset.kind}`}
      style={({ pressed }) => [
        styles.tile,
        selected && { backgroundColor: withAlpha(c, 0.12), borderColor: withAlpha(c, 0.75), borderWidth: 1.5 },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <IconTile icon={preset.icon} color={c} size={42} />
        {selection === 'multi' ? (
          selected ? (
            <Animated.View entering={ZoomIn.duration(180)} style={[styles.badge, { backgroundColor: c, borderColor: c }]}>
              <Icon name="check" size={14} color={colors.text} />
            </Animated.View>
          ) : (
            <View style={styles.badge} />
          )
        ) : (
          <Icon name="chevron-right" size={18} color={colors.textTertiary} />
        )}
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
        {preset.name}
      </Text>
      <Text variant="caption" tone="tertiary" numberOfLines={2} style={styles.tagline}>
        {preset.tagline}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  // Columns are bare wrappers (no padding/border) so flex splits the row exactly in
  // half; otherwise the last, unpaired tile grows wider than the empty spacer by
  // its own padding + border.
  cell: { flex: 1, flexBasis: 0, minWidth: 0 },
  tile: {
    flex: 1,
    minHeight: 132,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginBottom: 2 },
  tagline: { lineHeight: 17 },
});
