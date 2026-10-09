import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, withAlpha } from '@/theme';
import { formatPercent } from '@/utils/format';
import { Text } from './Text';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  color?: string;
  height?: number;
  /** Shows a small "96%" pill at the right end (like the habit cards). */
  showPercent?: boolean;
  /** Soft glow under the filled part. */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ progress, color = colors.accent, height = 8, showPercent, glow = true, style }: ProgressBarProps) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            { width: `${p * 100}%`, backgroundColor: color, borderRadius: height / 2 },
            glow && { shadowColor: color, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
          ]}
        />
      </View>
      {showPercent && (
        <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.18), borderColor: withAlpha(color, 0.4) }]}>
          <Text style={styles.pillText} color={color} tabular>
            {formatPercent(p)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'visible' },
  fill: { height: '100%' },
  pill: {
    paddingHorizontal: 5,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  pillText: { fontSize: 9, fontWeight: '700' },
});
