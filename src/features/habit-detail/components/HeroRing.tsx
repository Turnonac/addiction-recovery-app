import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { formatPercent } from '@/utils/format';
import { goalText, heroFontSize, heroValue } from '../logic';
import { ArcRing } from './ArcRing';

export interface HeroRingProps {
  color: string;
  streakMs: number;
  /** 0..1 toward the goal */
  progress: number;
  goalDays: number;
  size?: number;
}

/** Gap between the ring and the thin outer halo circle. */
const HALO = 14;
const STROKE = 16;
const SIZE = 260;

/** Big streak ring: days (or hours/minutes on day one), percent pill, and the "Next goal" pill. */
export function HeroRing({ color, streakMs, progress, goalDays, size: sizeProp = SIZE }: HeroRingProps) {
  const { width: windowWidth } = useWindowDimensions();
  // Ring + halo must fit between the screen gutters on the narrowest phones.
  const size = Math.max(200, Math.min(sizeProp, windowWidth - spacing.lg * 2 - HALO * 2));
  const hero = heroValue(streakMs);
  const inner = size - STROKE * 2 - 14;
  const fontSize = heroFontSize(hero.value, inner);
  const outer = size + HALO * 2;
  const goal = goalText(goalDays);

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.halo, { width: outer, height: outer, borderRadius: outer / 2, borderColor: withAlpha(color, 0.3) }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${hero.value} ${hero.unit.toLowerCase()} clean, ${formatPercent(progress)} of the way to ${goal}`}
        accessibilityValue={{ min: 0, max: 100, now: Math.floor(progress * 100) }}
        testID="detail-hero"
      >
        <View
          pointerEvents="none"
          style={[
            styles.innerDisc,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              backgroundColor: withAlpha(color, 0.06),
              borderColor: withAlpha(color, 0.14),
              boxShadow: `0 0 70px ${withAlpha(color, 0.22)}`,
            },
          ]}
        />
        <ArcRing progress={progress} size={size} strokeWidth={STROKE} color={color} trackColor={withAlpha(colors.text, 0.07)}>
          <Text style={[styles.number, { fontSize, lineHeight: Math.round(fontSize * 1.08) }]} tabular numberOfLines={1} testID="detail-hero-value">
            {hero.value}
          </Text>
          <Text variant="overline" tone="tertiary" style={styles.unit}>
            {hero.unit}
          </Text>
          <View style={[styles.percent, { backgroundColor: withAlpha(color, 0.18) }]}>
            <Text style={styles.percentText} color={color} tabular>
              {formatPercent(progress)}
            </Text>
          </View>
        </ArcRing>
      </View>

      <View style={styles.goal} accessibilityLabel={`Next goal: ${goal}`}>
        <Icon name="arrow-right-circle" size={16} color={color} />
        <Text variant="captionStrong" color={withAlpha(colors.text, 0.78)}>
          {`Next goal: ${goal}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: spacing.xl },
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  innerDisc: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth },
  number: { fontWeight: '800', letterSpacing: -2.5, color: colors.text, includeFontPadding: false },
  unit: { marginTop: spacing.xs, letterSpacing: 4 },
  percent: {
    marginTop: spacing.sm,
    paddingHorizontal: 9,
    height: 22,
    borderRadius: radius.sm,
    justifyContent: 'center',
  },
  percentText: { fontSize: 12, fontWeight: '700' },
  goal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
    height: 34,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.cardStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
