import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { colors, fonts, radius, spacing } from '@/theme';
import { counterParts } from '../logic';

export interface LiveCounterProps {
  streakMs: number;
}

/** "31 : 00 : 19 : 28" — days / hrs / min / sec in mono boxes, ticking every second. */
export function LiveCounter({ streakMs }: LiveCounterProps) {
  const parts = counterParts(streakMs);
  const label = parts.map((p) => `${Number(p.value)} ${p.label}`).join(', ');
  return (
    <View style={styles.row} accessible accessibilityRole="timer" accessibilityLabel={`Clean for ${label}`} testID="detail-live-counter">
      {parts.map((p, i) => (
        <Fragment key={p.key}>
          {i > 0 ? (
            <Text style={styles.colon} tone="tertiary">
              :
            </Text>
          ) : null}
          <View style={styles.box}>
            <Text style={styles.value} tabular numberOfLines={1}>
              {p.value}
            </Text>
            <Text style={styles.label} tone="tertiary">
              {p.label}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  box: {
    minWidth: 54,
    height: 54,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md + 2,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: fonts.mono, fontSize: 21, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  label: { fontFamily: fonts.mono, fontSize: 9, fontWeight: '600', letterSpacing: 1, marginTop: 1 },
  colon: { fontFamily: fonts.mono, fontSize: 16, fontWeight: '800', marginHorizontal: 6, marginTop: -4 },
});
