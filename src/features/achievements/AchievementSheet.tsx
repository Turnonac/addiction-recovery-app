import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, ProgressBar, Text } from '@/components';
import { CATEGORY_LABELS, TIER_COLORS, TIER_LABELS, progressText } from '@/domain/achievements';
import { colors, fonts, radius, spacing, withAlpha } from '@/theme';
import { formatDate, formatPercent } from '@/utils/format';
import { Medal } from './Medal';
import type { AchievementView } from './useAchievements';

export interface AchievementSheetProps {
  item: AchievementView | null;
  visible: boolean;
  onClose: () => void;
}

const SLIDE_OUT_MS = 220;

/** Bottom sheet with an achievement's details and progress. Slides in, and back out before closing. */
export function AchievementSheet({ item, visible, onClose }: AchievementSheetProps) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const open = visible && !!item;
  const y = useSharedValue(reduceMotion ? 0 : height);
  const closing = useRef(false);

  useEffect(() => {
    if (!open) return;
    closing.current = false;
    if (reduceMotion) {
      y.set(0);
      return;
    }
    y.set(height);
    y.set(withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [open, reduceMotion, height, y]);

  const dismiss = () => {
    if (closing.current) return;
    if (reduceMotion) {
      onClose();
      return;
    }
    closing.current = true;
    y.set(withTiming(height, { duration: SLIDE_OUT_MS, easing: Easing.in(Easing.cubic) }));
    setTimeout(onClose, SLIDE_OUT_MS);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close details" />
        {item ? <SheetBody item={item} y={y} onClose={dismiss} /> : null}
      </View>
    </Modal>
  );
}

function SheetBody({ item, y, onClose }: { item: AchievementView; y: SharedValue<number>; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  const { def, isUnlocked: unlocked, unlockedAt } = item;
  const tierColor = TIER_COLORS[def.tier];
  const progress = unlocked ? 1 : item.progress;
  const current = unlocked ? { ...item, current: item.target } : item;

  return (
    <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, slide]} accessibilityViewIsModal>
      <LinearGradient
        colors={[withAlpha(unlocked ? tierColor : colors.text, unlocked ? 0.16 : 0.04), withAlpha(unlocked ? tierColor : colors.text, 0)]}
        style={styles.glow}
        pointerEvents="none"
      />
      <View style={styles.grabber} />
      <View style={styles.medal}>
        <Medal icon={def.icon} color={def.color} tier={def.tier} unlocked={unlocked} progress={item.progress} size={112} />
      </View>
      <View style={styles.pills}>
        <View style={[styles.pill, { borderColor: withAlpha(tierColor, 0.5), backgroundColor: withAlpha(tierColor, 0.12) }]}>
          <Text style={styles.pillText} color={tierColor}>
            {TIER_LABELS[def.tier]}
          </Text>
        </View>
        <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={styles.pillText} tone="secondary">
            {CATEGORY_LABELS[def.category]}
          </Text>
        </View>
      </View>
      <Text variant="title" center accessibilityRole="header">
        {def.title}
      </Text>
      <Text variant="body" tone="secondary" center style={styles.description}>
        {def.description}
      </Text>

      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text variant="captionStrong" tone="secondary">
            Progress
          </Text>
          <Text variant="captionStrong" tabular>
            {progressText(current)}
          </Text>
        </View>
        <ProgressBar progress={progress} color={unlocked ? tierColor : colors.accent} height={8} />
        <View style={styles.status}>
          <Icon name={unlocked ? 'check-decagram' : 'lock-outline'} size={16} color={unlocked ? colors.success : colors.textTertiary} />
          <Text variant="caption" tone={unlocked ? 'primary' : 'tertiary'}>
            {unlocked ? (unlockedAt ? `Unlocked ${formatDate(unlockedAt)}` : 'Unlocked') : `Locked · ${formatPercent(item.progress)} complete`}
          </Text>
        </View>
      </View>

      <Button label="Close" variant="secondary" onPress={onClose} style={styles.close} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  medal: { marginBottom: spacing.lg },
  pills: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  pill: { paddingHorizontal: spacing.sm, height: 22, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  pillText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  description: { marginTop: spacing.xs, maxWidth: 320 },
  progressCard: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  close: { marginTop: spacing.lg },
});
