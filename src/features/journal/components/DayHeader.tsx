import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { colors, fonts, spacing } from '@/theme';

/** Mono date label with a hairline running to the right edge ("29 Mar 2026 ────"). */
export function DayHeader({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={`${label}, ${count} ${count === 1 ? 'entry' : 'entries'}`}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl, paddingBottom: spacing.sm, paddingHorizontal: 2 },
  label: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
