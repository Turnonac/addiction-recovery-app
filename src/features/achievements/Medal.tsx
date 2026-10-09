import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { Icon } from '@/components';
import { TIER_COLORS, type AchievementTier } from '@/domain/achievements';
import { colors, withAlpha } from '@/theme';
import type { IconName } from '@/types';

export interface MedalProps {
  icon: IconName;
  /** Achievement accent (inner disk tint + icon). */
  color: string;
  tier: AchievementTier;
  unlocked: boolean;
  /** 0..1 — drawn as a ring around locked medals. */
  progress?: number;
  size?: number;
  /** Small lock badge on locked medals (default true). */
  showLock?: boolean;
  /** Soft tier-colored halo on unlocked medals (default true). */
  glow?: boolean;
}

/**
 * Circular medal: metallic tier ring (bronze / silver / gold / platinum) around a
 * tinted disk with the achievement icon. Locked medals are grayscale with a
 * progress ring and a small lock.
 */
export function Medal({ icon, color, tier, unlocked, progress = 0, size = 72, showLock = true, glow = true }: MedalProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tierColor = TIER_COLORS[tier];
  const stroke = Math.max(3, Math.round(size * 0.075));
  const c = size / 2;
  const r = c - stroke / 2;
  const innerR = r - stroke / 2 - Math.max(2, size * 0.035);
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const lockSize = Math.max(18, Math.round(size * 0.34));

  return (
    <View
      style={[
        { width: size, height: size, borderRadius: c },
        unlocked && glow ? { boxShadow: `0 0 ${Math.round(size * 0.3)}px ${withAlpha(tierColor, 0.32)}` } : null,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={`ring${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.text} stopOpacity={0.95} />
            <Stop offset="0.35" stopColor={tierColor} stopOpacity={1} />
            <Stop offset="0.7" stopColor={tierColor} stopOpacity={0.7} />
            <Stop offset="1" stopColor={tierColor} stopOpacity={1} />
          </LinearGradient>
          <RadialGradient id={`disk${uid}`} cx="50%" cy="35%" r="70%">
            <Stop offset="0" stopColor={unlocked ? color : colors.text} stopOpacity={unlocked ? 0.42 : 0.07} />
            <Stop offset="1" stopColor={unlocked ? color : colors.text} stopOpacity={unlocked ? 0.08 : 0.02} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={innerR + stroke / 2} fill={colors.bgElevated} />
        <Circle cx={c} cy={c} r={innerR + stroke / 2} fill={`url(#disk${uid})`} />
        {unlocked ? (
          <>
            <Circle cx={c} cy={c} r={r} stroke={`url(#ring${uid})`} strokeWidth={stroke} fill="none" />
            <Circle cx={c} cy={c} r={innerR} stroke={withAlpha(tierColor, 0.45)} strokeWidth={1} fill="none" />
          </>
        ) : (
          <>
            <Circle cx={c} cy={c} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
            {p > 0 ? (
              <Circle
                cx={c}
                cy={c}
                r={r}
                stroke={colors.textSecondary}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circ} ${circ}`}
                strokeDashoffset={circ * (1 - p)}
                transform={`rotate(-90 ${c} ${c})`}
              />
            ) : null}
            <Circle cx={c} cy={c} r={innerR} stroke={colors.border} strokeWidth={1} fill="none" />
          </>
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Icon name={icon} size={Math.round(size * 0.4)} color={unlocked ? color : colors.textTertiary} />
      </View>
      {!unlocked && showLock ? (
        <View
          style={[
            styles.lock,
            { width: lockSize, height: lockSize, borderRadius: lockSize / 2, right: -lockSize * 0.08, bottom: -lockSize * 0.08 },
          ]}
        >
          <Icon name="lock" size={Math.round(lockSize * 0.55)} color={colors.textSecondary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  lock: {
    position: 'absolute',
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
