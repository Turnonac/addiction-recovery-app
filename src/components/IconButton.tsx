import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  /** Background; defaults to glass. Pass 'transparent' for a bare icon. */
  background?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
}

/** Round glass icon button (back, close, "…" menu, header actions). */
export function IconButton({
  icon,
  onPress,
  size = 40,
  iconSize = 20,
  color = colors.text,
  background = colors.cardStrong,
  accessibilityLabel,
  style,
  disabled,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: background },
        background !== 'transparent' && styles.border,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.35 },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  border: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
