import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, withAlpha } from '@/theme';

export interface CelebrationCardProps {
  color: string;
  children: ReactNode;
}

/**
 * Centered card that springs in over the dimmed backdrop (just fades in with
 * reduced motion). It never grows past the safe area: on short screens with a
 * long habit name the content scrolls inside the card.
 */
export function CelebrationCard({ color, children }: CelebrationCardProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxHeight = Math.max(240, height - insets.top - insets.bottom - spacing.xl * 2);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.86);
  const opacity = useSharedValue(0);
  const y = useSharedValue(reduceMotion ? 0 : 28);

  useEffect(() => {
    opacity.set(withTiming(1, { duration: 220, reduceMotion: ReduceMotion.Never }));
    if (reduceMotion) return;
    scale.set(withSpring(1, { damping: 14, stiffness: 160, mass: 0.9 }));
    y.set(withSpring(0, { damping: 16, stiffness: 150 }));
  }, [opacity, scale, y, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: y.get() }, { scale: scale.get() }] }));

  return (
    <Animated.View
      style={[
        styles.card,
        { width: Math.min(width - spacing.xl * 2, 400), maxHeight, borderColor: withAlpha(color, 0.35), boxShadow: `0 24px 60px ${withAlpha(colors.textInverse, 0.6)}` },
        style,
      ]}
      accessibilityViewIsModal
    >
      <LinearGradient colors={[withAlpha(color, 0.3), withAlpha(color, 0.06), withAlpha(color, 0)]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: spacing.xl, alignItems: 'center' },
});
