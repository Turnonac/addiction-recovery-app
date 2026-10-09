import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';
import { Text } from './Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 'contained' = pill track with active pill (This habit / All habits).
   *  'tabs' = horizontally scrolling separate pills (Streaks / Compare / Savings…). */
  appearance?: 'contained' | 'tabs';
  activeColor?: string;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, appearance = 'contained', activeColor = colors.accent }: SegmentedControlProps<T>) {
  if (appearance === 'tabs') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {segments.map((s) => {
          const active = s.value === value;
          return (
            <Pressable
              key={s.value}
              onPress={() => onChange(s.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active ? { backgroundColor: activeColor, borderColor: activeColor } : null]}
            >
              {s.icon && <Icon name={s.icon} size={15} color={active ? colors.text : colors.textSecondary} />}
              <Text variant="captionStrong" color={active ? colors.text : colors.textSecondary}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: activeColor }]}
          >
            {s.icon && <Icon name={s.icon} size={15} color={active ? colors.text : colors.textSecondary} />}
            <Text variant="captionStrong" color={active ? colors.text : colors.textSecondary}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 4,
    alignSelf: 'flex-start',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.pill,
  },
  tabsRow: { gap: spacing.sm, paddingVertical: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
