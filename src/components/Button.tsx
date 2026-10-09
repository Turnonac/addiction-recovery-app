import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'accent' | 'sos' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Overrides the background for `accent` variant (e.g. a habit color). */
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  children?: ReactNode;
}

const heights: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 58 };

/**
 * primary = white pill with black text (main CTA, like the "+" FAB)
 * accent = indigo (or `color`) filled
 * sos = orange→pink gradient (SOS / start exercise)
 * secondary = glass
 * ghost = text only
 * danger = red tinted
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  fullWidth = true,
  color,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const fg =
    variant === 'primary' ? colors.textInverse : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.textSecondary : colors.text;
  const bg =
    variant === 'primary'
      ? colors.text
      : variant === 'accent'
        ? (color ?? colors.accent)
        : variant === 'secondary'
          ? colors.cardStrong
          : variant === 'danger'
            ? colors.dangerSoft
            : 'transparent';
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={fontSize + 3} color={fg} />}
          <Text style={{ fontSize, fontWeight: '700' }} color={fg}>
            {label}
          </Text>
          {iconRight && <Icon name={iconRight} size={fontSize + 3} color={fg} />}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { height: heights[size], backgroundColor: variant === 'sos' ? undefined : bg, paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl },
        variant === 'secondary' && styles.secondaryBorder,
        fullWidth ? styles.full : styles.auto,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {variant === 'sos' ? (
        <LinearGradient colors={[colors.sosStart, colors.sosEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.gradient]} />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradient: { borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  full: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  secondaryBorder: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
