import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { IconName } from '@/types';
import { labelColorOn } from './labelColor';

export interface FillButtonProps {
  label: string;
  onPress?: () => void;
  /** Solid fill (e.g. an exercise color) or a two-stop diagonal gradient. */
  fill: string | readonly [string, string];
  size?: 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const HEIGHT = { md: 48, lg: 58 } as const;

/**
 * Pill button filled with a bright color whose label switches to black when white
 * would be unreadable (cyan, green, amber, the SOS orange→pink gradient…).
 * Same metrics as the shared `Button`, which always uses a white label on fills.
 * Disabled, it drops the color for a neutral glass pill with a muted label.
 */
export function FillButton({
  label,
  onPress,
  fill,
  size = 'md',
  icon,
  iconRight,
  disabled,
  fullWidth = true,
  style,
  accessibilityLabel,
  testID,
}: FillButtonProps) {
  const off = !!disabled;
  const gradient = off || typeof fill === 'string' ? null : fill;
  const bg = off ? colors.cardStrong : gradient ? undefined : (fill as string);
  const fg = off ? colors.textTertiary : labelColorOn(fill);
  const fontSize = size === 'lg' ? 17 : 15;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size], backgroundColor: bg },
        fullWidth ? styles.full : styles.auto,
        off && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.gradient]} />
      ) : null}
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={fontSize + 3} color={fg} /> : null}
        <Text style={{ fontSize, fontWeight: '700' }} color={fg} numberOfLines={1}>
          {label}
        </Text>
        {iconRight ? <Icon name={iconRight} size={fontSize + 3} color={fg} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
  },
  gradient: { borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
  full: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  disabled: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
