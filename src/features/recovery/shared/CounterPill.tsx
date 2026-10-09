import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { fonts, radius, withAlpha } from '@/theme';

export interface CounterPillProps {
  label: string;
  color: string;
  accessibilityLabel?: string;
}

/** Small tinted mono pill, e.g. the "5 / 7" counter next to "HEALTH RECOVERY". */
export function CounterPill({ label, color, accessibilityLabel }: CounterPillProps) {
  return (
    <View
      style={[styles.pill, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.38) }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={styles.text} color={color} tabular>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
