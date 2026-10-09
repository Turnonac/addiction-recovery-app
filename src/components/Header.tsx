import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface HeaderProps {
  title?: string;
  /** 'back' = chevron, 'close' = ×, 'none' = nothing. */
  left?: 'back' | 'close' | 'none';
  onLeftPress?: () => void;
  right?: ReactNode;
  /** Uppercase centered title (habit detail style: "COFFEE"). */
  uppercase?: boolean;
  /** Large left-aligned title instead of centered. */
  large?: boolean;
  subtitle?: string;
}

/** Custom in-screen header (the native stack header is hidden app-wide). */
export function Header({ title, left = 'back', onLeftPress, right, uppercase, large, subtitle }: HeaderProps) {
  // Both side slots share the width of the wider one so the title stays centered
  // while getting as much room as possible on narrow screens.
  const [rightWidth, setRightWidth] = useState(0);
  const sideWidth = Math.max(left !== 'none' ? 40 : 0, rightWidth);
  const goBack = () => {
    if (onLeftPress) return onLeftPress();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (large) {
    return (
      <View style={styles.largeWrap}>
        <View style={styles.row}>
          {left !== 'none' ? (
            <IconButton icon={left === 'close' ? 'close' : 'chevron-left'} onPress={goBack} accessibilityLabel={left === 'close' ? 'Close' : 'Back'} />
          ) : (
            <View />
          )}
          <View style={styles.right}>{right}</View>
        </View>
        {title ? (
          <Text variant="title" style={{ marginTop: spacing.md }}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.side, { width: sideWidth }]}>
        {left !== 'none' && (
          <IconButton icon={left === 'close' ? 'close' : 'chevron-left'} onPress={goBack} accessibilityLabel={left === 'close' ? 'Close' : 'Back'} />
        )}
      </View>
      <View style={styles.center}>
        {title ? (
          <Text
            variant="subheading"
            center
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={uppercase ? styles.upper : undefined}
            accessibilityRole="header"
          >
            {uppercase ? title.toUpperCase() : title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="secondary" center numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.right, { width: sideWidth }]}>
        <View style={styles.rightInner} onLayout={(e) => setRightWidth(Math.ceil(e.nativeEvent.layout.width))}>
          {right}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  side: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  rightInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  right: { justifyContent: 'flex-end', gap: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  upper: { letterSpacing: 1.5 },
  largeWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
