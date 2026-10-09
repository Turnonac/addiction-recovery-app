import { StyleSheet } from 'react-native';

import { Text } from '@/components';
import { colors, fonts } from '@/theme';
import { percentInt } from '../logic';
import { GradientRing } from '../shared/GradientRing';

export interface RecoveryRingProps {
  /** 0..1 */
  value: number;
  /** Habit color (start of the arc gradient). */
  color: string;
  size?: number;
  /** Show the "RECOVERY" caption under the percentage. */
  label?: boolean;
}

/** Overall brain recovery ring: green → habit color arc with the percentage inside. */
export function RecoveryRing({ value, color, size = 70, label = true }: RecoveryRingProps) {
  const pct = percentInt(value);
  const small = size < 56;
  return (
    // The arc follows the floored label, so "0%" never shows a sliver of progress.
    <GradientRing progress={pct / 100} size={size} strokeWidth={small ? 4 : 5} color={colors.success} colorStart={color} trackColor={colors.border}>
      <Text style={[styles.value, { fontSize: small ? 12 : 16 }]} tabular accessibilityLabel={`${pct}% recovered`}>
        {`${pct}%`}
      </Text>
      {label && !small ? (
        <Text style={styles.label} tone="tertiary">
          RECOVERY
        </Text>
      ) : null}
    </GradientRing>
  );
}

const styles = StyleSheet.create({
  value: { fontWeight: '800' },
  label: { fontFamily: fonts.mono, fontSize: 8, fontWeight: '700', letterSpacing: 0.6, marginTop: 1 },
});
