import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { Icon, Text } from '@/components';
import { TIER_COLORS, achievementById, type AchievementDef } from '@/domain/achievements';
import { isCelebrationRoute } from '@/features/celebrations/milestoneLogic';
import { useCanInterrupt } from '@/features/celebrations/presence';
import { useStore } from '@/store';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Medal } from './Medal';
import { useAchievementToast, type AchievementToastData } from './toastStore';

const VISIBLE_MS = 3500;
const HIDDEN_Y = -180;
const FADE = { duration: 200, reduceMotion: ReduceMotion.Never };

/**
 * Slide-down "Achievement unlocked" banner. Renders nothing when idle.
 *
 * A pending toast is held (not dropped) while the app is in the background or
 * behind the app-lock screen, and while a milestone celebration is open; it
 * slides in once that is over, with its full display time.
 */
export function AchievementToast() {
  const toast = useAchievementToast((s) => s.toast);
  const pathname = usePathname();
  const canInterrupt = useCanInterrupt();
  const lockEnabled = useStore((s) => s.settings.appLockEnabled);
  if (!toast || !canInterrupt || isCelebrationRoute(pathname)) return null;
  const def = achievementById(toast.achievementId);
  if (!def) return null;
  return (
    <ToastLayer ownWindow={!lockEnabled}>
      <Banner key={toast.key} data={toast} def={def} pathname={pathname} />
    </ToastLayer>
  );
}

/**
 * iOS presents modal / fullScreenModal routes (SOS exercises, relapse…) as native
 * view controllers above the root view, so a plain absolute View would be hidden
 * behind them. FullWindowOverlay puts the banner in its own window on top.
 *
 * Not with app lock on: the lock screen is a FullWindowOverlay too and the newest
 * window wins, so the banner could cover it. It then stays in the app's own
 * view tree, where the lock and app-switcher covers always hide it.
 * VoiceOver keeps reaching the rest of the app while the banner is up.
 */
function ToastLayer({ ownWindow, children }: { ownWindow: boolean; children: ReactNode }) {
  if (Platform.OS === 'ios' && ownWindow) return <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>{children}</FullWindowOverlay>;
  return children;
}

function Banner({ data, def, pathname }: { data: AchievementToastData; def: AchievementDef; pathname: string }) {
  const insets = useSafeAreaInsets();
  const hide = useAchievementToast((s) => s.hide);
  const reduceMotion = useReducedMotion();
  // Reduced motion: no slide, just a short cross-fade in place.
  const y = useSharedValue(reduceMotion ? 0 : HIDDEN_Y);
  const opacity = useSharedValue(reduceMotion ? 0 : 1);
  const tierColor = TIER_COLORS[def.tier];

  useEffect(() => {
    // VoiceOver; TalkBack and web screen readers pick it up from the live region.
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.announceForAccessibility(`Achievement unlocked: ${def.title}${data.extra ? `, and ${data.extra} more` : ''}`);
  }, [def.title, data.extra]);

  useEffect(() => {
    if (reduceMotion) opacity.set(withTiming(1, FADE));
    else y.set(withSpring(0, { damping: 17, stiffness: 170, mass: 0.9 }));
    const out = setTimeout(() => {
      if (reduceMotion) opacity.set(withTiming(0, FADE));
      else y.set(withTiming(HIDDEN_Y, { duration: 280, easing: Easing.in(Easing.cubic) }));
    }, VISIBLE_MS);
    const done = setTimeout(() => hide(data.key), VISIBLE_MS + 320);
    return () => {
      clearTimeout(out);
      clearTimeout(done);
    };
  }, [y, opacity, reduceMotion, hide, data.key]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: y.get() }] }));

  const open = () => {
    hide(data.key);
    // Already looking at the list — don't stack a second copy of it.
    if (pathname !== '/achievements') router.push('/achievements');
  };

  return (
    <Animated.View pointerEvents="box-none" accessibilityLiveRegion="polite" style={[styles.outer, { top: insets.top + spacing.sm }, animated]}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Achievement unlocked · ${def.title}${data.extra ? `, and ${data.extra} more` : ''}. Open achievements`}
        style={({ pressed }) => [styles.banner, { borderColor: withAlpha(tierColor, 0.45), boxShadow: `0 10px 30px ${withAlpha(colors.textInverse, 0.5)}` }, pressed && styles.pressed]}
      >
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, styles.webBg]} />
        ) : (
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(tierColor, 0.08) }]} />
        <Medal icon={def.icon} color={def.color} tier={def.tier} unlocked size={46} glow={false} />
        <View style={styles.texts}>
          <Text variant="micro" color={tierColor} style={styles.kicker}>
            Achievement unlocked
          </Text>
          <View style={styles.titleRow}>
            <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
              {def.title}
            </Text>
            {data.extra > 0 ? (
              <View style={styles.more}>
                <Text variant="micro" tone="secondary">
                  +{data.extra} more
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {def.description}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 1000, elevation: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  webBg: { backgroundColor: colors.bgElevated },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  texts: { flex: 1, gap: 1 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1 },
  more: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.cardStrong,
  },
});
