import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { RegionView } from '../logic';

export interface RegionLegendProps {
  regions: RegionView[];
  /** Region highlighted on the brain (after a row tap); its chip is tinted. */
  highlightedId?: string | null;
  /** Opens a region's details. Omitted for the invisible sizing copy (plain views, nothing focusable). */
  onSelect?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

/** Shown under the brain while no marker is selected: the hint plus a color key that doubles as larger tap targets. */
export function RegionLegend({ regions, highlightedId = null, onSelect, style }: RegionLegendProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.hint}>
        <Icon name="gesture-tap" size={14} color={colors.textTertiary} />
        <Text variant="caption" tone="tertiary">
          Tap a marker to learn more
        </Text>
      </View>
      <View style={styles.chips}>
        {regions.map((r) => {
          const tint = { backgroundColor: withAlpha(r.color, 0.16), borderColor: withAlpha(r.color, 0.5) };
          const content = (
            <>
              <View style={[styles.dot, { backgroundColor: r.color, boxShadow: `0 0 6px ${withAlpha(r.color, 0.9)}` }]} />
              <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.label}>
                {r.name}
              </Text>
            </>
          );
          if (!onSelect) {
            return (
              <View key={r.id} style={styles.chip}>
                {content}
              </View>
            );
          }
          return (
            <Pressable
              key={r.id}
              onPress={() => onSelect(r.id)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${r.name} details`}
              style={({ pressed }) => [styles.chip, (pressed || r.id === highlightedId) && tint]}
            >
              {content}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    maxWidth: '100%',
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flexShrink: 1, fontSize: 12 },
});
