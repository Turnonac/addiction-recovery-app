import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label?: string;
  icon?: IconName;
  /** Accent hex. Tints background, border, icon and text. Neutral if omitted. */
  color?: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Small pill. Static (stat chips like "$4.8k", "Record") or selectable (filters,
 * trigger pickers). Selected state uses a stronger tint.
 */
export function Chip({ label, icon, color, selected, onPress, size = 'sm', style, accessibilityLabel, testID }: ChipProps) {
  const c = color ?? colors.text;
  const active = selected || (!onPress && !!color);
  const bg = color ? withAlpha(color, selected ? 0.28 : 0.12) : selected ? colors.accentSoft : colors.card;
  const border = color ? withAlpha(color, selected ? 0.7 : 0.25) : selected ? colors.accent : colors.border;
  const fg = color ? c : selected ? colors.text : colors.textSecondary;
  const pad = size === 'sm' ? { paddingHorizontal: spacing.sm, height: 24 } : { paddingHorizontal: spacing.md, height: 34 };
  const fontSize = size === 'sm' ? 11 : 13;

  const inner = (
    <View style={styles.row}>
      {icon && <Icon name={icon} size={fontSize + 2} color={fg} />}
      {label != null && (
        <Text style={{ fontSize, fontWeight: '600' }} color={active || selected ? fg : colors.textSecondary} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );

  const base = [styles.base, pad, { backgroundColor: bg, borderColor: border }, style];
  if (!onPress) return <View style={base}>{inner}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      aria-pressed={selected == null ? undefined : !!selected}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [base, pressed && { opacity: 0.75 }]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
