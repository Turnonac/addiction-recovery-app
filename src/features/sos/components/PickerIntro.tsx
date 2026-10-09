import { StyleSheet, View } from 'react-native';

import { Card, Icon, IconTile, Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import type { Habit } from '@/types';
import { freeForLabel } from '../logic/session';

export interface PickerIntroProps {
  habit: Habit | null;
  now: number;
}

/** Calming message, plus "You've been free from X for N days" and the user's reason when there is habit context. */
export function PickerIntro({ habit, now }: PickerIntroProps) {
  const reason = habit?.reason.trim() ?? '';
  const freeFor = habit ? freeForLabel(now - habit.startedAt) : '';
  return (
    <Card tint={habit?.color ?? colors.danger} tintStrength={0.07} style={styles.card} testID="sos-intro">
      {habit ? (
        <View
          style={styles.habitRow}
          accessible
          accessibilityLabel={`You've been free from ${habit.name} for ${freeFor}`}
          testID="sos-intro-streak"
        >
          <IconTile icon={habit.icon} color={habit.color} size={40} shape="circle" />
          <View style={styles.flex}>
            <Text variant="caption" tone="secondary">
              You&apos;ve been free from
            </Text>
            {/* Only the habit name may be cut short; the streak is always shown in full. */}
            <View style={styles.streakLine}>
              <Text variant="bodyStrong" color={habit.color} numberOfLines={1} style={styles.name}>
                {habit.name}
              </Text>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.freeFor}>
                for {freeFor}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
      {habit && reason ? (
        <View style={[styles.quote, { borderLeftColor: withAlpha(habit.color, 0.7) }]}>
          <Text variant="caption" tone="tertiary" style={styles.quoteLabel}>
            YOUR REASON
          </Text>
          <Text variant="body" style={styles.quoteText} numberOfLines={4}>
            “{reason}”
          </Text>
        </View>
      ) : null}
      {habit ? <View style={styles.divider} /> : null}
      <View style={styles.calmRow}>
        <Icon name="waves" size={18} color={colors.textSecondary} />
        <Text variant="body" tone="secondary" style={styles.flex}>
          Cravings peak and pass within minutes. Pick one and ride it out.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  flex: { flex: 1 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streakLine: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  name: { flexShrink: 1 },
  freeFor: { flexShrink: 0 },
  quote: { borderLeftWidth: 2, paddingLeft: spacing.md, gap: 2 },
  quoteLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  quoteText: { fontStyle: 'italic', color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  calmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});
