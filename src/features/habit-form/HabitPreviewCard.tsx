import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Chip, Icon, ProgressBar, Text } from '@/components';
import { goalLabel, streakDisplay, type HabitChipKind } from '@/features/home/homeLogic';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { NO_HISTORY, previewChips, previewStats, type HabitFormValues, type StreakHistory } from './formModel';

const CHIP_COLORS: Record<HabitChipKind, string | undefined> = {
  money: colors.success,
  time: colors.info,
  attempt: undefined,
  record: colors.gold,
};

export interface HabitPreviewCardProps {
  values: HabitFormValues;
  now: number;
  /** Ended streaks (edit), so savings, attempt and "Record" match the Home card. */
  history?: StreakHistory;
}

/** Live preview of the home-screen habit card for the values being edited. */
export function HabitPreviewCard({ values, now, history = NO_HISTORY }: HabitPreviewCardProps) {
  const s = previewStats(values, now, history);
  const c = values.color;
  const named = values.name.trim().length > 0;
  const name = named ? values.name.trim() : 'Your habit';
  const counter = streakDisplay(s.streakMs);
  const goal = goalLabel(s.goalDays);
  const chips = previewChips(s, values.currency);

  return (
    <View
      style={[styles.card, { backgroundColor: withAlpha(c, 0.035), borderColor: withAlpha(c, 0.25) }]}
      accessible
      accessibilityLabel={`Preview: ${name}, ${counter.value} ${counter.unit}, goal ${goal}`}
      testID="habit-preview"
    >
      <CornerGlow color={c} />
      <View style={styles.topRow}>
        <View style={styles.nameRow}>
          <View style={[styles.colorBar, { backgroundColor: c, shadowColor: c }]} />
          <Icon name={values.icon} size={18} color={c} />
          <Text variant="subheading" style={styles.name} numberOfLines={1} tone={named ? 'primary' : 'tertiary'}>
            {name}
          </Text>
        </View>
        <View style={styles.counter}>
          <Text variant="display" style={styles.count} tabular numberOfLines={1}>
            {counter.value}
          </Text>
          <Text variant="caption" tone="tertiary" style={styles.unit}>
            {counter.unit}
          </Text>
        </View>
      </View>
      <View style={styles.goalRow}>
        <Icon name="bullseye-arrow" size={13} color={c} />
        <Text variant="captionStrong" color={c} style={styles.goalText} numberOfLines={1}>
          {goal}
        </Text>
      </View>
      <ProgressBar progress={s.progress} color={c} height={7} showPercent style={styles.progress} />
      <View style={styles.chips}>
        {chips.map((chip) => (
          <Chip key={chip.kind} icon={chip.icon} label={chip.label} color={CHIP_COLORS[chip.kind]} />
        ))}
      </View>
    </View>
  );
}

/** Soft habit-colored light from the top-left corner, like the home cards. */
function CornerGlow({ color }: { color: string }) {
  const id = `pglow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={id} cx="0%" cy="0%" r="95%" fx="0%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
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
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 2,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  colorBar: {
    width: 3,
    height: 24,
    borderRadius: 2,
    marginRight: spacing.xs,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  name: { flexShrink: 1, fontSize: 18, fontWeight: '800' },
  counter: { flexDirection: 'row', alignItems: 'baseline', gap: 5, maxWidth: '55%' },
  count: { fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  unit: { fontSize: 13 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  goalText: { fontSize: 12, fontWeight: '700' },
  progress: { marginTop: spacing.sm + 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: spacing.sm + 2 },
});
