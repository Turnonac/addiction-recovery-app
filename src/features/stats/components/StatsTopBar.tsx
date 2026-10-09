import { Pressable, StyleSheet, View } from 'react-native';

import { SegmentedControl, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { StatsScope } from '../scope';

export interface StatsTopBarProps {
  scope: StatsScope;
  onScopeChange: (scope: StatsScope) => void;
  onDone: () => void;
}

const SEGMENTS: { value: StatsScope; label: string }[] = [
  { value: 'habit', label: 'This habit' },
  { value: 'all', label: 'All habits' },
];

/** "This habit | All habits" switch with a glass "Done" pill on the right. */
export function StatsTopBar({ scope, onScopeChange, onDone }: StatsTopBarProps) {
  return (
    <View style={styles.row}>
      <SegmentedControl appearance="contained" segments={SEGMENTS} value={scope} onChange={onScopeChange} activeColor={colors.accent} />
      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel="Done"
        hitSlop={8}
        style={({ pressed }) => [styles.done, pressed && styles.pressed]}
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, gap: spacing.md },
  done: {
    height: 42,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.cardStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontSize: 17, fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
