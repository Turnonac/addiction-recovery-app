import { StyleSheet, View } from 'react-native';

import { colors, withAlpha } from '@/theme';

export interface StepDotsProps {
  count: number;
  /** 0-based current step. */
  current: number;
  color: string;
  /** Optional per-step colors (e.g. tone of each tape card). */
  colorsPerStep?: string[];
}

/** Progress dots: done = filled, current = wide pill, upcoming = faint. */
export function StepDots({ count, current, color, colorsPerStep }: StepDotsProps) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={`Step ${current + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => {
        const c = colorsPerStep?.[i] ?? color;
        const active = i === current;
        const done = i < current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              active && styles.active,
              { backgroundColor: active ? c : done ? withAlpha(c, 0.55) : colors.cardStrong },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  active: { width: 22 },
});
