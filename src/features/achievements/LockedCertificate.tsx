import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import { Icon, ProgressBar, Text } from '@/components';
import { colors, radius, spacing, type as typeScale, withAlpha } from '@/theme';
import { formatDate, pluralDays } from '@/utils/format';
import { cardScale } from './certificateLogic';

/** Card width the layout is designed for; narrower cards (320pt phones) scale down. */
const DESIGN_WIDTH = 350;
const MIN_SCALE = 0.78;
/** Same portrait shape as the earned certificate; taller content makes the card grow. */
const ASPECT = 0.75;

export interface LockedCertificateProps {
  /** "1 Month" */
  title: string;
  habitName: string;
  color: string;
  daysToGo: number;
  progress: number;
  unlocksAt: number;
}

/** Placeholder certificate shown until the streak reaches the milestone. */
export function LockedCertificate({ title, habitName, color, daysToGo, progress, unlocksAt }: LockedCertificateProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (measured == null || Math.abs(measured - w) > 0.5) setMeasured(w);
  };
  // Until the first layout, estimate from the window (Screen has 16pt side padding).
  const width = measured ?? windowWidth - spacing.lg * 2;
  const k = cardScale(width, DESIGN_WIDTH, MIN_SCALE);
  const lock = Math.round(84 * k);
  const scaled = {
    card: { minHeight: width / ASPECT, paddingHorizontal: Math.max(spacing.xl, spacing.xxl * k), paddingVertical: spacing.xxxl * k },
    lockCircle: { width: lock, height: lock, borderRadius: lock / 2 },
    kicker: { marginTop: spacing.xl * k },
    title: { fontSize: typeScale.display.fontSize * k, lineHeight: typeScale.display.fontSize * k * 1.2 },
    heading: { fontSize: typeScale.heading.fontSize * Math.max(0.9, k), lineHeight: typeScale.heading.fontSize * Math.max(0.9, k) * 1.25 },
    progressBlock: { marginTop: spacing.xxl * k },
  };

  return (
    <View onLayout={onLayout} style={[styles.card, scaled.card]} accessible accessibilityLabel={`${title} certificate for ${habitName} is locked. Keep going, ${pluralDays(daysToGo)} to go.`}>
      <View style={styles.dashed} pointerEvents="none" />
      <View style={[styles.lockCircle, scaled.lockCircle, { borderColor: withAlpha(color, 0.4), backgroundColor: withAlpha(color, 0.1) }]}>
        <Icon name="lock" size={Math.round(34 * k)} color={color} />
      </View>
      <Text variant="overline" tone="tertiary" center style={[styles.kicker, scaled.kicker]}>
        Certificate of achievement
      </Text>
      <Text variant="display" center style={[styles.title, scaled.title]} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      <Text variant="body" tone="secondary" center numberOfLines={2} style={styles.free}>
        free from {habitName}
      </Text>

      <View style={[styles.progressBlock, scaled.progressBlock]}>
        <Text variant="heading" center style={scaled.heading}>
          Keep going — {pluralDays(daysToGo)} to go
        </Text>
        <ProgressBar progress={progress} color={color} height={8} showPercent style={styles.bar} />
        <Text variant="caption" tone="tertiary" center>
          Unlocks on {formatDate(unlocksAt)} if you stay on track.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: radius.xxl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dashed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  lockCircle: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { alignSelf: 'stretch' },
  title: { alignSelf: 'stretch', marginTop: spacing.sm, opacity: 0.55 },
  // Stretch (not shrink-to-fit) so a long unbroken name wraps inside the card.
  free: { alignSelf: 'stretch', marginTop: 2 },
  progressBlock: { alignSelf: 'stretch', gap: spacing.md },
  bar: { marginHorizontal: spacing.sm },
});
