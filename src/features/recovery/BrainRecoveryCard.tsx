import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { brainRecoveryStats, getBrainProfile } from '@/domain/catalog/brain';
import { DAY } from '@/domain/time';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { Habit } from '@/types';
import { BrainIllustration } from './brain/BrainIllustration';
import { RecoveryRing } from './brain/RecoveryRing';
import { brainCardSubtitle, percentInt } from './logic';

export interface BrainRecoveryCardProps {
  habit: Habit;
  now: number;
}

/** Entry card on the habit detail screen that opens /habit/[id]/brain. */
export function BrainRecoveryCard({ habit, now }: BrainRecoveryCardProps) {
  const cleanDays = Math.max(0, now - habit.startedAt) / DAY;
  const stats = brainRecoveryStats(getBrainProfile(habit.kind), cleanDays);
  const subtitle = brainCardSubtitle(stats);

  return (
    <Card
      onPress={() => router.push(`/habit/${habit.id}/brain`)}
      padding={spacing.md}
      style={styles.card}
      accessibilityLabel={`Brain recovery, ${percentInt(stats.overall)}% overall. ${subtitle}`}
      testID="brain-recovery-card"
    >
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: withAlpha(habit.color, 0.12), borderColor: withAlpha(habit.color, 0.28) }]}>
          <BrainIllustration width={46} height={35} mini />
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            Brain recovery
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>
        <RecoveryRing value={stats.overall} color={habit.color} size={48} label={false} />
        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 56,
    height: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  subtitle: { marginTop: 2 },
});
