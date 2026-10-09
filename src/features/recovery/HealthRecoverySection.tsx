import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, IconTile, ProgressBar, SectionHeader, Text } from '@/components';
import { getHealthTimeline, healthProgress, type HealthMilestone } from '@/domain/catalog/health';
import { colors, spacing, withAlpha } from '@/theme';
import type { Habit } from '@/types';
import { formatDate, formatDateShort, formatDurationShort, formatPercent } from '@/utils/format';
import { milestoneTimeLabel, needsYear } from './logic';
import { CounterPill } from './shared/CounterPill';

export interface HealthRecoverySectionProps {
  habit: Habit;
  now: number;
}

/**
 * "HEALTH RECOVERY 5 / 7" section on the habit detail screen: the next health
 * milestone with a countdown and progress, plus the last one reached. Tapping
 * opens the full timeline.
 */
export function HealthRecoverySection({ habit, now }: HealthRecoverySectionProps) {
  const timeline = getHealthTimeline(habit.kind);
  const cleanMs = Math.max(0, now - habit.startedAt);
  const progress = healthProgress(timeline, cleanMs);
  const { current, lastAchieved } = progress;
  const color = habit.color;

  const a11y = current
    ? `Health recovery, ${progress.achieved} of ${progress.total} milestones reached. Next: ${current.milestone.title} in ${formatDurationShort(current.msRemaining)}. See full timeline`
    : `Health recovery, all ${progress.total} milestones reached. See full timeline`;

  return (
    <View>
      <SectionHeader
        icon="heart-pulse"
        title="HEALTH RECOVERY"
        right={<CounterPill label={`${progress.achieved} / ${progress.total}`} color={color} accessibilityLabel={`${progress.achieved} of ${progress.total} milestones`} />}
      />
      <Card onPress={() => router.push(`/habit/${habit.id}/health`)} accessibilityLabel={a11y} testID="health-recovery-section">
        {current ? (
          <View>
            <View style={styles.headRow}>
              <View>
                <View style={[styles.tileGlow, { backgroundColor: withAlpha(color, 0.1), boxShadow: `0 0 18px ${withAlpha(color, 0.45)}` }]} />
                <IconTile icon={current.milestone.icon} color={color} size={52} shape="circle" />
              </View>
              <View style={styles.headText}>
                <Text variant="overline" tone="tertiary" numberOfLines={1}>
                  {`Next · ${milestoneTimeLabel(current.milestone.afterMs)}`}
                </Text>
                <Text variant="heading" numberOfLines={2} style={styles.title}>
                  {current.milestone.title}
                </Text>
                <Text variant="caption" tone="secondary" numberOfLines={1}>
                  {'in '}
                  <Text variant="subheading" color={color} tabular>
                    {formatDurationShort(current.msRemaining)}
                  </Text>
                </Text>
              </View>
            </View>
            <View style={styles.barRow}>
              <ProgressBar progress={current.fraction} color={color} height={6} style={styles.bar} />
              <Text variant="captionStrong" color={color} tabular style={styles.percent}>
                {formatPercent(current.fraction)}
              </Text>
            </View>
            <Text variant="body" tone="secondary" style={styles.description}>
              {current.milestone.description}
            </Text>
          </View>
        ) : (
          <View style={styles.headRow}>
            <IconTile icon="trophy-outline" color={color} size={52} shape="circle" />
            <View style={styles.headText}>
              <Text variant="heading">All milestones reached</Text>
              <Text variant="caption" tone="secondary" style={styles.allSub}>
                {`Your body has reached all ${progress.total} health milestones on this timeline. Keep going!`}
              </Text>
            </View>
          </View>
        )}

        {lastAchieved ? <LastAchievedRow milestone={lastAchieved.milestone} reachedAt={habit.startedAt + lastAchieved.milestone.afterMs} now={now} color={color} /> : null}

        <View style={styles.footer}>
          <Text variant="captionStrong" color={color}>
            See full timeline
          </Text>
          <Icon name="chevron-right" size={18} color={color} />
        </View>
      </Card>
    </View>
  );
}

interface LastAchievedRowProps {
  milestone: HealthMilestone;
  reachedAt: number;
  now: number;
  color: string;
}

function LastAchievedRow({ milestone, reachedAt, now, color }: LastAchievedRowProps) {
  const date = needsYear(reachedAt, now) ? formatDate(reachedAt) : formatDateShort(reachedAt);
  return (
    <View style={styles.lastRow}>
      <View style={[styles.check, { backgroundColor: color }]}>
        <Icon name="check" size={13} color={colors.text} />
      </View>
      <Text variant="captionStrong" numberOfLines={1} style={styles.lastTitle}>
        {milestone.title}
      </Text>
      <Text variant="caption" tone="tertiary" numberOfLines={1}>
        {`Reached ${date}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tileGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 40,
  },
  headText: { flex: 1, gap: 2 },
  title: { marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  bar: { flex: 1 },
  percent: { minWidth: 34, textAlign: 'right' },
  description: { marginTop: spacing.md, lineHeight: 21 },
  allSub: { marginTop: 2, lineHeight: 18 },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lastTitle: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
