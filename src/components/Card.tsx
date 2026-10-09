import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, withAlpha } from '@/theme';

export interface CardProps {
  children?: ReactNode;
  /** Optional accent hex: tints background and border (habit cards, banners). */
  tint?: string;
  /** 0..1 strength of the tint (default 0.08). */
  tintStrength?: number;
  padding?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/** Translucent rounded "glass" card used everywhere. Pressable when `onPress` is set. */
export function Card({ children, tint, tintStrength = 0.08, padding = spacing.lg, onPress, onLongPress, style, accessibilityLabel, testID }: CardProps) {
  const bg = tint ? withAlpha(tint, tintStrength) : colors.card;
  const border = tint ? withAlpha(tint, Math.min(0.5, tintStrength * 3)) : colors.border;
  const base: StyleProp<ViewStyle> = [styles.card, { backgroundColor: bg, borderColor: border, padding }, style];

  if (!onPress && !onLongPress) {
    return (
      <View style={base} testID={testID} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
