import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';

export interface PillChipProps {
  label?: string;
  icon?: IconName;
  /** Icon color (and label color when selected with a tint). Defaults to secondary text. */
  iconColor?: string;
  selected: boolean;
  onPress: () => void;
  /** Selected background/border tint. Defaults to the indigo active state. */
  selectedColor?: string;
  /** Icon color while selected (e.g. the mood color on an indigo pill). */
  selectedIconColor?: string;
  size?: 'sm' | 'md';
  /**
   * How assistive tech sees the chip: 'toggle' (default) = a button that is pressed or not
   * (filters); 'radio' = one option of a single-choice group (put the chips in a radiogroup).
   */
  a11yKind?: 'toggle' | 'radio';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Selectable pill used by the journal filters and the editor's habit link.
 * Unselected: dark glass with a muted (or colored) icon. Selected: tinted pill.
 */
export function PillChip({
  label,
  icon,
  iconColor,
  selected,
  onPress,
  selectedColor = colors.accent,
  selectedIconColor,
  size = 'md',
  a11yKind = 'toggle',
  accessibilityLabel,
  style,
  testID,
}: PillChipProps) {
  const radio = a11yKind === 'radio';
  const iconOnly = !label;
  const restingIcon = iconColor ?? colors.textSecondary;
  const fg = selected ? (selectedIconColor ?? (selectedColor === colors.accent ? colors.text : selectedColor)) : restingIcon;
  const textColor = selected ? (selectedColor === colors.accent ? colors.text : selectedColor) : colors.textSecondary;
  const height = size === 'sm' ? 30 : 34;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={radio ? { checked: selected } : { selected }}
      // react-native-web ignores accessibilityState; aria-* reaches the DOM.
      aria-checked={radio ? selected : undefined}
      {...(!radio && Platform.OS === 'web' ? webPressed(selected) : null)}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { height, paddingHorizontal: iconOnly ? 0 : spacing.md, minWidth: iconOnly ? height + 12 : undefined },
        selected
          ? { backgroundColor: withAlpha(selectedColor, 0.2), borderColor: withAlpha(selectedColor, 0.85) }
          : styles.resting,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 16} color={fg} /> : null}
        {label ? (
          <Text variant="captionStrong" color={textColor} numberOfLines={1} style={styles.label}>
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * `aria-pressed` for a toggle button. react-native-web forwards it to the DOM, but React
 * Native's prop types don't declare it (native toggles use accessibilityState instead).
 */
function webPressed(pressed: boolean): object {
  return { 'aria-pressed': pressed };
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resting: { backgroundColor: colors.card, borderColor: colors.border },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { maxWidth: 180 },
});
