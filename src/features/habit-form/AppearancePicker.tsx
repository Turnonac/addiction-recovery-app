import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { HABIT_ICON_CHOICES } from '@/domain/catalog/habits';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, habitColors, radius, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';

const COLOR_ENTRIES = Object.entries(habitColors) as [string, string][];
const COLORS_PER_ROW = 8;
const ICONS_PER_ROW = 6;

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export interface AppearancePickerProps {
  color: string;
  icon: IconName;
  onColorChange: (color: string) => void;
  onIconChange: (icon: IconName) => void;
}

/** Color swatches (theme habit colors) + icon grid, in one card. */
export function AppearancePicker({ color, icon, onColorChange, onIconChange }: AppearancePickerProps) {
  const haptic = useHaptics();
  // A custom/legacy icon not in the list still shows (first) so it stays selectable.
  const icons = HABIT_ICON_CHOICES.includes(icon) ? HABIT_ICON_CHOICES : [icon, ...HABIT_ICON_CHOICES.slice(0, -1)];
  return (
    <Card padding={spacing.lg}>
      <Text variant="captionStrong" tone="secondary" style={styles.label}>
        Color
      </Text>
      <View style={styles.grid}>
        {chunk(COLOR_ENTRIES, COLORS_PER_ROW).map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map(([key, hex]) => {
              const active = hex.toLowerCase() === color.toLowerCase();
              return (
                <View key={key} style={styles.cell}>
                  <Pressable
                    onPress={() => {
                      haptic('selection');
                      onColorChange(hex);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Color ${key}`}
                    accessibilityState={{ selected: active }}
                    hitSlop={4}
                    style={({ pressed }) => [styles.swatchRing, active && { borderColor: hex }, pressed && styles.pressed]}
                  >
                    <View style={[styles.swatch, { backgroundColor: hex }]}>
                      {active ? <Icon name="check" size={16} color={colors.text} /> : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <Text variant="captionStrong" tone="secondary" style={styles.label}>
        Icon
      </Text>
      <View style={styles.grid}>
        {chunk(icons, ICONS_PER_ROW).map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((name) => {
              const active = name === icon;
              return (
                <View key={name} style={styles.cell}>
                  <Pressable
                    onPress={() => {
                      haptic('selection');
                      onIconChange(name);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Icon ${name.replace(/-/g, ' ')}`}
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.iconTile,
                      active && { backgroundColor: withAlpha(color, 0.2), borderColor: withAlpha(color, 0.8) },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon name={name} size={22} color={active ? color : colors.textSecondary} />
                  </Pressable>
                </View>
              );
            })}
            {Array.from({ length: ICONS_PER_ROW - row.length }, (_, i) => (
              <View key={`pad${i}`} style={styles.cell} />
            ))}
          </View>
        ))}
      </View>
    </Card>
  );
}

const SWATCH = 30;
const RING = SWATCH + 8;
const TILE = 46;

// Sizes follow the cell (eight swatches / six icons per row) and stop at their
// full size, so narrow phones (320pt) shrink them instead of overlapping.
const styles = StyleSheet.create({
  label: { marginBottom: spacing.md },
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center' },
  swatchRing: {
    width: '100%',
    maxWidth: RING,
    aspectRatio: 1,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: '88%', aspectRatio: 1, borderRadius: SWATCH / 2, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.lg },
  iconTile: {
    width: '88%',
    maxWidth: TILE,
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
});
