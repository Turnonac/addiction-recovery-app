import { router } from 'expo-router';
import { useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Chip, Icon, ProgressBar, Text } from '@/components';
import type { HabitSnapshot } from '@/domain/habitStats';
import { ShareHabitButton } from '@/features/share/ShareHabitButton';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { formatPercent } from '@/utils/format';
import { goalLabel, goalView, habitChips, streakDisplay, type HabitChipKind } from './homeLogic';

const CHIP_COLORS: Record<HabitChipKind, string | undefined> = {
  money: colors.success,
  time: colors.info,
  attempt: undefined,
  record: colors.gold,
};

const SHARE_SIZE = 32;

export interface HabitCardProps {
  snapshot: HabitSnapshot;
  onLongPress: (snapshot: HabitSnapshot) => void;
}

/**
 * One habit on Home: name with a color bar, the big day counter, the goal line
 * and progress bar, and stat chips. Tap opens the habit; long-press opens the
 * quick-actions sheet.
 */
export function HabitCard({ snapshot, onLongPress }: HabitCardProps) {
  const haptic = useHaptics();
  const { habit } = snapshot;
  const color = habit.color;
  const streak = streakDisplay(snapshot.streakMs);
  const chips = habitChips(snapshot);
  const { goalDays, progress } = goalView(snapshot);
  const goal = goalLabel(goalDays);
  const percent = formatPercent(progress);

  const open = () => router.push(`/habit/${habit.id}`);
  const showActions = () => {
    haptic('medium');
    onLongPress(snapshot);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={open}
        onLongPress={showActions}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}. ${streak.value} ${streak.unit} clean. ${percent} of the ${goal} goal.`}
        accessibilityHint="Opens the habit. Long press for more actions."
        accessibilityActions={[{ name: 'activate' }, { name: 'longpress', label: 'More actions' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'longpress' ? showActions() : open())}
        testID={`habit-card-${habit.id}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: withAlpha(color, 0.035), borderColor: withAlpha(color, 0.2) },
          pressed && styles.pressed,
        ]}
      >
        <HabitGlow color={color} />

        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <View style={[styles.colorBar, { backgroundColor: color, shadowColor: color }]} />
            <Text variant="subheading" style={styles.name} numberOfLines={1}>
              {habit.name}
            </Text>
          </View>
          <View style={styles.counter}>
            <Text variant="display" style={styles.count} tabular numberOfLines={1}>
              {streak.value}
            </Text>
            <Text variant="caption" tone="tertiary" style={styles.unit}>
              {streak.unit}
            </Text>
          </View>
        </View>
        <View style={styles.goalRow}>
          <Icon name="bullseye-arrow" size={13} color={color} />
          <Text variant="captionStrong" color={color} style={styles.goalText} numberOfLines={1}>
            {goal}
          </Text>
        </View>

        <ProgressBar progress={progress} color={color} height={7} showPercent style={styles.progress} />

        <View style={styles.chips}>
          {chips.map((c) => (
            <Chip key={c.kind} label={c.label} icon={c.icon} color={CHIP_COLORS[c.kind]} />
          ))}
        </View>
      </Pressable>
      <View style={styles.shareSlot}>
        <ShareHabitButton snapshot={snapshot} size={SHARE_SIZE} />
      </View>
    </View>
  );
}

/** Soft habit-colored light from the top-left corner of the card. */
function HabitGlow({ color }: { color: string }) {
  const id = `hglow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={id} cx="0%" cy="0%" r="95%" fx="0%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={0.2} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.05} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 2,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  colorBar: {
    width: 3,
    height: 24,
    borderRadius: 2,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  name: { flexShrink: 1, fontSize: 18, fontWeight: '800' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  goalText: { fontSize: 12, fontWeight: '700' },
  counter: { flexDirection: 'row', alignItems: 'baseline', gap: 5, maxWidth: '55%' },
  count: { fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  unit: { fontSize: 13 },
  progress: { marginTop: spacing.sm + 2 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    minHeight: SHARE_SIZE,
    marginTop: spacing.sm + 2,
    paddingRight: SHARE_SIZE + spacing.sm,
  },
  shareSlot: { position: 'absolute', right: spacing.lg, bottom: spacing.md + 2 },
});
