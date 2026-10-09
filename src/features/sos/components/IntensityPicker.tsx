import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { INTENSITY_LEVELS, intensityLevel, intensityLevelLabel, type IntensityLevel } from '../logic/session';
import { labelColorOn } from './labelColor';

const LEVEL_COLOR: Record<IntensityLevel, string> = {
  mild: colors.success,
  moderate: colors.warning,
  strong: colors.fire,
  intense: colors.danger,
};

export function intensityColor(n: number): string {
  return LEVEL_COLOR[intensityLevel(n)];
}

export interface IntensityPickerProps {
  title: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Small caption on the right when nothing is picked (a compact "n/10" badge otherwise). */
  emptyHint?: string;
  /** Previous rating, drawn as a ring marker (completion screen). */
  reference?: number | null;
  testID?: string;
}

/** "How strong is the urge?" — ten segmented dots, 1 (mild) → 10 (overwhelming). Tap again to clear. */
export function IntensityPicker({ title, value, onChange, emptyHint = 'Optional', reference, testID }: IntensityPickerProps) {
  const haptic = useHaptics();

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.head}>
        <Text variant="bodyStrong" style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {value != null ? (
          <View
            style={[styles.badge, { backgroundColor: withAlpha(intensityColor(value), 0.16), borderColor: withAlpha(intensityColor(value), 0.45) }]}
            accessible
            accessibilityLabel={`${value} of 10, ${intensityLevelLabel(value).toLowerCase()}`}
            testID={testID ? `${testID}-value` : undefined}
          >
            <Text variant="captionStrong" color={intensityColor(value)} tabular numberOfLines={1}>
              {value}
              <Text variant="caption" color={withAlpha(intensityColor(value), 0.7)} tabular>
                /10
              </Text>
            </Text>
          </View>
        ) : (
          <Text variant="caption" tone="tertiary" style={styles.hint} numberOfLines={1}>
            {emptyHint}
          </Text>
        )}
      </View>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={title}>
        {INTENSITY_LEVELS.map((n) => {
          const filled = value != null && n <= value;
          const isValue = value === n;
          const c = intensityColor(n);
          const isRef = reference != null && reference === n;
          return (
            <Pressable
              key={n}
              onPress={() => {
                haptic('selection');
                onChange(isValue ? null : n);
              }}
              accessibilityRole="radio"
              aria-checked={isValue}
              accessibilityLabel={`Intensity ${n} of 10`}
              hitSlop={{ top: 6, bottom: 6 }}
              style={({ pressed }) => [
                styles.cell,
                filled && (isValue ? { backgroundColor: c, borderColor: c } : { backgroundColor: withAlpha(c, 0.32), borderColor: withAlpha(c, 0.5) }),
                isRef && !filled && { borderColor: withAlpha(intensityColor(n), 0.8), borderStyle: 'dashed' },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.num} color={isValue ? labelColorOn(c) : filled ? colors.text : colors.textTertiary} tabular>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scale}>
        <Text variant="micro" tone="tertiary">
          MILD
        </Text>
        <Text variant="micro" tone="tertiary">
          OVERWHELMING
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, minHeight: 24 },
  title: { flexShrink: 1 },
  hint: { flexShrink: 0 },
  badge: {
    flexShrink: 0,
    minWidth: 48,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: 5 },
  cell: {
    flex: 1,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  num: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  scale: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
});
