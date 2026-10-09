import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';
import { Text } from './Text';

/** Height of the floating bar itself; screens pass this (+ extra) as Screen.bottomInset. */
export const FLOATING_BAR_HEIGHT = 64;

export interface FloatingBarProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Frosted pill pinned above the bottom safe area (Home: SOS · Stats · Journal,
 * habit detail: SOS · Relapse). Children are laid out in a row.
 */
export function FloatingBar({ children, style }: FloatingBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={[styles.bar, style]}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, styles.webBlur]} />
        ) : (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.row}>{children}</View>
      </View>
    </View>
  );
}

export interface FloatingBarItemProps {
  label: string;
  icon?: IconName;
  color?: string;
  onPress: () => void;
  testID?: string;
}

/** One tappable segment of a FloatingBar. */
export function FloatingBarItem({ label, icon, color = colors.text, onPress, testID }: FloatingBarItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
    >
      {icon && <Icon name={icon} size={20} color={color} />}
      <Text variant="bodyStrong" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  bar: {
    height: FLOATING_BAR_HEIGHT,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  webBlur: { backgroundColor: 'rgba(20,20,26,0.88)' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: spacing.md },
  item: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
