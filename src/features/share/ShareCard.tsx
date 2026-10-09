import { useId, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Icon, ProgressBar, QLogo, Text } from '@/components';
import type { HabitSnapshot } from '@/domain/habitStats';
import { milestoneLabel } from '@/domain/milestones';
import { goalView, streakDisplay } from '@/features/home/homeLogic';
import { colors, fonts, withAlpha } from '@/theme';
import { formatDate, formatMinutes, formatPercent } from '@/utils/format';
import { shareCardMoney } from './shareContent';
import { SHARE_CAPTURE_WIDTH, SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from './shareSize';

export { SHARE_CAPTURE_WIDTH } from './shareSize';

/** Width the card's measurements are designed at; other widths scale everything. */
const DESIGN_WIDTH = 360;

/**
 * Default card width: the capture width, so an off-screen card rendered with
 * the defaults exports as exactly 1080×1350 px on any screen density.
 */
export const SHARE_CARD_WIDTH = SHARE_CAPTURE_WIDTH;
export const SHARE_CARD_ASPECT = SHARE_IMAGE_HEIGHT / SHARE_IMAGE_WIDTH;

export interface ShareCardProps {
  snapshot: HabitSnapshot;
  /** Date printed on the card (defaults to now). */
  now?: number;
  /** Layout width; height follows the 4:5 aspect ratio. Defaults to SHARE_CARD_WIDTH (the capture width). */
  width?: number;
  /** Rounded corners for on-screen previews. Exported images use square corners. */
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shareable progress card: brand mark, the habit's icon, the big streak number,
 * goal progress and money saved, on a dark canvas lit by the habit color.
 */
export function ShareCard({ snapshot, now, width = SHARE_CARD_WIDTH, rounded = true, style }: ShareCardProps) {
  const [mountedAt] = useState(() => Date.now());
  const s = width / DESIGN_WIDTH;
  const { habit } = snapshot;
  const color = habit.color;
  const streak = streakDisplay(snapshot.streakMs);
  const goal = goalView(snapshot);
  const gradId = `share${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const saved =
    habit.dailyCost > 0
      ? { icon: 'cash' as const, text: `${shareCardMoney(snapshot.moneySaved, habit.currency)} saved` }
      : habit.dailyMinutes > 0
        ? { icon: 'clock-outline' as const, text: `${formatMinutes(snapshot.minutesSaved)} of life back` }
        : null;

  return (
    <View
      style={[styles.card, { width, height: width * SHARE_CARD_ASPECT, borderRadius: rounded ? 28 * s : 0, padding: 28 * s }, style]}
      accessibilityRole="image"
      accessibilityLabel={`${streak.value} ${streak.unit} free from ${habit.name}`}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`${gradId}a`} cx="50%" cy="0%" r="85%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.12} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${gradId}b`} cx="100%" cy="100%" r="60%" fx="100%" fy="100%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId}a)`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId}b)`} />
      </Svg>

      <View style={styles.topRow}>
        <View style={[styles.brand, { gap: 8 * s }]}>
          <QLogo size={28 * s} />
          <Text style={{ fontSize: 19 * s, fontWeight: '800' }}>Quit</Text>
        </View>
        <Text style={{ fontSize: 11 * s, fontFamily: fonts.mono, letterSpacing: s }} tone="tertiary">
          {formatDate(now ?? mountedAt).toUpperCase()}
        </Text>
      </View>

      <View style={styles.hero}>
        <View
          style={[
            styles.iconTile,
            {
              width: 64 * s,
              height: 64 * s,
              borderRadius: 20 * s,
              backgroundColor: withAlpha(color, 0.18),
              borderColor: withAlpha(color, 0.45),
              shadowColor: color,
              shadowRadius: 18 * s,
            },
          ]}
        >
          <Icon name={habit.icon} size={32 * s} color={color} />
        </View>
        <View style={[styles.numberRow, { marginTop: 14 * s }]}>
          <Text style={{ fontSize: 104 * s, lineHeight: 112 * s, fontWeight: '800', letterSpacing: -4 * s }} tabular numberOfLines={1} adjustsFontSizeToFit>
            {streak.value}
          </Text>
          <Text style={{ fontSize: 22 * s, fontWeight: '700', marginLeft: 6 * s }} tone="secondary">
            {streak.unit}
          </Text>
        </View>
        <Text style={{ fontSize: 20 * s, fontWeight: '700', marginTop: 2 * s }} numberOfLines={1} center>
          free from <Text style={{ fontSize: 20 * s, fontWeight: '800' }} color={color}>{habit.name}</Text>
        </Text>
      </View>

      <View style={{ gap: 10 * s }}>
        <View style={styles.goalRow}>
          <Text style={[styles.overline, { fontSize: 10 * s, letterSpacing: 1.5 * s }]} tone="tertiary">
            NEXT GOAL · {milestoneLabel(goal.goalDays).toUpperCase()}
          </Text>
          <Text style={{ fontSize: 12 * s, fontWeight: '800' }} color={color} tabular>
            {formatPercent(goal.progress)}
          </Text>
        </View>
        <ProgressBar progress={goal.progress} color={color} height={8 * s} />
        <View style={[styles.footer, { marginTop: 6 * s, gap: 8 * s }]}>
          {saved ? (
            <View style={[styles.savedRow, { gap: 6 * s }]}>
              <Icon name={saved.icon} size={16 * s} color={colors.success} />
              <Text style={{ fontSize: 14 * s, fontWeight: '700' }} color={colors.success} numberOfLines={1}>
                {saved.text}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Text style={{ fontSize: 11 * s, fontWeight: '600' }} tone="tertiary">
            Break free from bad habits
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  hero: { alignItems: 'center' },
  iconTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
  },
  numberRow: { flexDirection: 'row', alignItems: 'baseline' },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overline: { fontFamily: fonts.mono, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savedRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
});
