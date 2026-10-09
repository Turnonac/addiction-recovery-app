import { LinearGradient } from 'expo-linear-gradient';
import { useState, type RefObject } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Icon, QLogo, Text } from '@/components';
import { colors, fonts, radius, spacing, withAlpha } from '@/theme';
import { formatDate, pluralDays } from '@/utils/format';
import { cardScale, fitFontSize } from './certificateLogic';
import { ringPath, rosettePath, wavePath } from './guilloche';

const GOLD = colors.gold;
const OUTER_PHASES = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8 / 3);
const INNER_PHASES = Array.from({ length: 6 }, (_, i) => (i * Math.PI * 2) / 6 / 2);
/** Inner width the layout is designed for; narrower cards (320pt phones) scale down. */
const DESIGN_WIDTH = 340;
const MIN_SCALE = 0.78;

export interface CertificateCardProps {
  /** Big title, e.g. "1 Month". */
  title: string;
  habitName: string;
  recipient: string;
  earnedAt: number;
  days: number;
  /** Ref of the capturable surface (for image sharing). */
  viewRef?: RefObject<View | null>;
}

/** Portrait certificate with a gold gradient border and guilloche linework. */
export function CertificateCard({ title, habitName, recipient, earnedAt, days, viewRef }: CertificateCardProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height });
  };
  const k = size ? cardScale(size.w, DESIGN_WIDTH, MIN_SCALE) : 1;
  const padX = spacing.xxxl * k;
  // The recipient line is capped at 90% of the content width (styles.recipient).
  const recipientWidth = size ? (size.w - padX * 2) * 0.9 : 0;
  const recipientSize = fitFontSize(recipient, recipientWidth, 26 * k, 26 * k * 0.6);
  const scaled = {
    content: { paddingHorizontal: padX, paddingTop: 44 * k, paddingBottom: 40 * k },
    kicker: { fontSize: Math.max(9, 10.5 * k), letterSpacing: 2.6 * k, marginTop: spacing.md * k },
    title: { fontSize: 56 * k, lineHeight: 64 * k },
    free: { fontSize: 18 * k },
    recipient: { fontSize: recipientSize, lineHeight: Math.round(recipientSize * 1.25) },
    bottom: { marginTop: spacing.xl * k },
  };

  return (
    <View ref={viewRef} collapsable={false} style={styles.outer} accessible accessibilityLabel={`Certificate of achievement: ${title} free from ${habitName}, awarded to ${recipient} on ${formatDate(earnedAt)}`}>
      <LinearGradient
        colors={[GOLD, withAlpha(GOLD, 0.25), withAlpha(GOLD, 0.85), withAlpha(GOLD, 0.2), GOLD]}
        locations={[0, 0.3, 0.55, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <View style={styles.inner} onLayout={onLayout}>
          <LinearGradient
            colors={[withAlpha(GOLD, 0.16), withAlpha(colors.bgElevated, 0), withAlpha(GOLD, 0.1)]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {size ? <Linework w={size.w} h={size.h} /> : null}

          <View style={[styles.content, scaled.content]}>
            <View style={styles.top}>
              <QLogo size={Math.round(34 * k)} />
              <Text style={[styles.kicker, scaled.kicker]} color={GOLD}>
                Certificate of achievement
              </Text>
              <Ornament />
            </View>

            <View style={styles.middle}>
              <Text style={[styles.title, scaled.title]} numberOfLines={1} adjustsFontSizeToFit>
                {title}
              </Text>
              <Text style={[styles.free, scaled.free]} tone="secondary" numberOfLines={2} center>
                free from <Text style={[styles.freeName, scaled.free]}>{habitName}</Text>
              </Text>
            </View>

            <View style={styles.awarded}>
              <Text style={styles.label} tone="tertiary">
                Awarded to
              </Text>
              {/* Sized to fit one line (react-native-web has no adjustsFontSizeToFit); a very long name wraps. */}
              <Text style={[styles.recipient, scaled.recipient]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} center>
                {recipient}
              </Text>
              <View style={styles.signature} />
            </View>

            <View style={[styles.bottom, scaled.bottom]}>
              <View style={styles.meta}>
                <Text style={styles.label} tone="tertiary">
                  Date earned
                </Text>
                <Text variant="captionStrong" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {formatDate(earnedAt)}
                </Text>
              </View>
              <Seal size={Math.round(58 * k)} />
              <View style={[styles.meta, styles.metaRight]}>
                <Text style={styles.label} tone="tertiary">
                  Milestone
                </Text>
                <Text variant="captionStrong" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.metaRightText}>
                  {pluralDays(days)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function Linework({ w, h }: { w: number; h: number }) {
  const cx = w / 2;
  const cy = h * 0.47;
  const rad = Math.min(w, h) * 0.46;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {OUTER_PHASES.map((ph) => (
        <Path key={`o${ph}`} d={ringPath(cx, cy, rad * 0.88, rad * 0.07, 24, ph)} stroke={withAlpha(GOLD, 0.13)} strokeWidth={0.6} fill="none" />
      ))}
      {INNER_PHASES.map((ph) => (
        <Path key={`i${ph}`} d={ringPath(cx, cy, rad * 0.6, rad * 0.09, 14, ph)} stroke={withAlpha(GOLD, 0.08)} strokeWidth={0.6} fill="none" />
      ))}
      <Path d={rosettePath(cx, cy, rad * 0.34, 8, 3, 0.75)} stroke={withAlpha(GOLD, 0.07)} strokeWidth={0.6} fill="none" />
      <Rect x={10} y={10} width={w - 20} height={h - 20} rx={radius.lg} stroke={withAlpha(GOLD, 0.45)} strokeWidth={1} fill="none" />
      <Rect x={15} y={15} width={w - 30} height={h - 30} rx={radius.md} stroke={withAlpha(GOLD, 0.18)} strokeWidth={0.75} fill="none" />
      {[0, 1.2, 2.4].map((phase) => (
        <Path key={`t${phase}`} d={wavePath(34, w - 34, 26, 3, 18, phase)} stroke={withAlpha(GOLD, 0.28)} strokeWidth={0.6} fill="none" />
      ))}
      {[0, 1.2, 2.4].map((phase) => (
        <Path key={`b${phase}`} d={wavePath(34, w - 34, h - 26, 3, 18, phase)} stroke={withAlpha(GOLD, 0.28)} strokeWidth={0.6} fill="none" />
      ))}
      {[
        [15, 15],
        [w - 15, 15],
        [15, h - 15],
        [w - 15, h - 15],
      ].map(([x, y]) => (
        <Path key={`${x}-${y}`} d={`M${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z`} fill={GOLD} opacity={0.75} />
      ))}
    </Svg>
  );
}

function Ornament() {
  return (
    <View style={styles.ornament}>
      <View style={[styles.ornLine, { backgroundColor: withAlpha(GOLD, 0.5) }]} />
      <View style={styles.diamond} />
      <View style={[styles.ornLine, { backgroundColor: withAlpha(GOLD, 0.5) }]} />
    </View>
  );
}

function Seal({ size: s }: { size: number }) {
  return (
    <View style={{ width: s, height: s }} accessibilityElementsHidden>
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        <Circle cx={s / 2} cy={s / 2} r={s / 2 - 1} stroke={withAlpha(GOLD, 0.7)} strokeWidth={1.5} strokeDasharray="1.5 3" fill="none" />
      </Svg>
      <LinearGradient
        colors={[withAlpha(colors.text, 0.9), GOLD, withAlpha(GOLD, 0.75)]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.sealDisk}
      >
        <View style={styles.sealRing} />
        <Icon name="check-decagram" size={Math.round(s * 0.42)} color={colors.bg} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', aspectRatio: 0.75, borderRadius: radius.xxl, boxShadow: `0 0 40px ${withAlpha(GOLD, 0.18)}` },
  border: { flex: 1, borderRadius: radius.xxl, padding: 1.5 },
  inner: { flex: 1, borderRadius: radius.xxl - 1.5, backgroundColor: colors.bgElevated, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: spacing.xxxl, paddingTop: 44, paddingBottom: 40, alignItems: 'center' },
  top: { alignItems: 'center' },
  kicker: { fontFamily: fonts.mono, fontSize: 10.5, fontWeight: '700', letterSpacing: 2.6, textTransform: 'uppercase', marginTop: spacing.md, textAlign: 'center' },
  ornament: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  ornLine: { width: 44, height: StyleSheet.hairlineWidth * 2 },
  diamond: { width: 6, height: 6, backgroundColor: GOLD, transform: [{ rotate: '45deg' }] },
  middle: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 56, lineHeight: 64, fontWeight: '900', letterSpacing: -1.5, color: colors.text, textAlign: 'center' },
  free: { fontSize: 18, fontWeight: '500', marginTop: 2 },
  freeName: { fontSize: 18, fontWeight: '700', color: colors.text },
  awarded: { alignItems: 'center', alignSelf: 'stretch', marginTop: spacing.sm },
  label: { fontFamily: fonts.mono, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  recipient: { fontSize: 26, fontWeight: '700', fontStyle: 'italic', color: colors.text, marginTop: 4, maxWidth: '90%' },
  signature: { width: 150, height: 1, backgroundColor: withAlpha(GOLD, 0.45), marginTop: 6 },
  bottom: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: spacing.xl, gap: spacing.sm },
  meta: { flex: 1, gap: 3 },
  metaRight: { alignItems: 'flex-end' },
  metaRightText: { textAlign: 'right' },
  sealDisk: { position: 'absolute', left: 6, top: 6, right: 6, bottom: 6, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sealRing: { position: 'absolute', left: 3, top: 3, right: 3, bottom: 3, borderRadius: 999, borderWidth: 1, borderColor: withAlpha(colors.bg, 0.35) },
});
