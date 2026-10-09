import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, withAlpha } from '@/theme';

/** Height of the fade above the footer content. */
export const FOOTER_FADE = 32;

/** Bottom-pinned area that fades the scrolling list out underneath it (picker "Start exercise"). */
export function StickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.9), colors.bg, colors.bg]}
        locations={[0, 0.4, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: FOOTER_FADE,
    paddingHorizontal: spacing.lg,
  },
});
