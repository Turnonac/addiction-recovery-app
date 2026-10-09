import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import { STATS_TABS, type StatsTab } from '../scope';
import { useScrollReveal } from './useScrollReveal';

export interface StatsTabsProps {
  value: StatsTab;
  onChange: (tab: StatsTab) => void;
}

/**
 * Edge-to-edge scrolling tab pills (same look as SegmentedControl "tabs"), which also
 * scrolls the active tab into view — e.g. when the screen opens on ?tab=mood.
 */
export function StatsTabs({ value, onChange }: StatsTabsProps) {
  const { ref, scrollProps, itemLayout } = useScrollReveal(value);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      role="tablist"
      aria-label="Statistics sections"
      {...scrollProps}
    >
      {STATS_TABS.map((t) => {
        const active = t.value === value;
        return (
          <View key={t.value} onLayout={itemLayout(t.value)}>
            <Pressable
              onPress={() => onChange(t.value)}
              // aria-* rather than accessibilityState: react-native-web drops the latter.
              role="tab"
              aria-selected={active}
              aria-label={t.label}
              style={({ pressed }) => [styles.tab, active && styles.active, pressed && !active && styles.pressed]}
            >
              <Icon name={t.icon} size={15} color={active ? colors.text : colors.textSecondary} />
              <Text variant="captionStrong" style={styles.label} color={active ? colors.text : colors.textSecondary}>
                {t.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  label: { fontSize: 14 },
  pressed: { backgroundColor: colors.cardPressed },
});
