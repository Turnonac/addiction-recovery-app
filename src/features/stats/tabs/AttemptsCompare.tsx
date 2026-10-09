import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, SectionHeader, StatGroup, Text } from '@/components';
import { averageStreakMs, compareRows, recentWithRecord, streakHistory } from '@/domain/stats';
import { colors, spacing, withAlpha } from '@/theme';
import { formatDateShort } from '@/utils/format';
import { StreakBarRow } from '../components/StreakBarRow';
import { successColor } from '../components/successColor';
import { daysHours, hoursLabel, moneySuffix, roundPercent, shortDays } from '../format';
import type { StatsData } from '../types';

const MAX_ROWS = 12;

/** "This habit" compare: the ongoing attempt against every past attempt. */
export function AttemptsCompare({ data }: { data: StatsData }) {
  const snap = data.snapshots[0];
  const habit = snap.habit;
  const history = streakHistory(habit, data.relapses, data.now);
  const row = compareRows([snap], data.now)[0];
  const current = history[history.length - 1];
  const past = history.slice(0, -1);
  const prevBest = past.reduce((m, e) => Math.max(m, e.ms), 0);
  const avg = averageStreakMs(history);
  const maxMs = Math.max(1, ...history.map((e) => e.ms));
  // The latest attempts plus the all-time record (pinned last when it is older), so the
  // bars' 100% reference is always listed.
  const shown = recentWithRecord(history, MAX_ROWS);
  const newestFirst = [...shown].reverse();
  const recordPinned = history.length > shown.length && shown[0] !== history[history.length - shown.length];
  const hiddenCount = history.length - shown.length;

  let headline: string;
  let detail: string;
  let icon: 'trophy' | 'flag-checkered' | 'target' = 'target';
  if (!past.length) {
    headline = 'First attempt — going strong';
    detail = 'No relapses so far. Every day you add here sets a new personal best.';
    icon = 'flag-checkered';
  } else if (current.ms >= prevBest) {
    headline = 'Longest streak ever';
    detail = `${daysHours(current.ms - prevBest)} beyond your previous best of ${daysHours(prevBest)}.`;
    icon = 'trophy';
  } else {
    headline = `${daysHours(prevBest - current.ms)} to beat your record`;
    const ratio = avg > 0 ? current.ms / avg : 0;
    detail =
      ratio >= 1
        ? `You're already at ${ratio.toFixed(1)}× your average attempt (${daysHours(avg)}).`
        : `Your average attempt lasts ${daysHours(avg)}. Keep going past it.`;
  }

  return (
    <View>
      <Card tint={icon === 'trophy' ? colors.gold : habit.color} tintStrength={0.1} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: withAlpha(icon === 'trophy' ? colors.gold : habit.color, 0.2) }]}>
            <Icon name={icon} size={22} color={icon === 'trophy' ? colors.gold : habit.color} />
          </View>
          <View style={styles.flex}>
            <Text variant="subheading">{headline}</Text>
            <Text variant="caption" tone="secondary" style={styles.detail}>
              {detail}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.group}>
        <StatGroup
          items={[
            { icon: 'check-decagram', color: successColor(row.successRate), value: roundPercent(row.successRate), label: 'Success' },
            { icon: 'flag-outline', color: colors.info, value: String(row.attempts), label: row.attempts === 1 ? 'Attempt' : 'Attempts' },
            row.tracksMoney
              ? { icon: 'cash', color: colors.success, value: moneySuffix(row.moneySaved, row.currency), label: 'Saved' }
              : row.minutesSaved > 0
                ? { icon: 'clock-outline', color: colors.info, value: hoursLabel(row.minutesSaved), label: 'Time saved' }
                : { icon: 'clock-outline', color: colors.info, value: shortDays(snap.totalCleanMs), label: 'Clean total' },
          ]}
        />
      </View>

      <SectionHeader
        title="Attempts"
        right={
          <Text variant="caption" tone="tertiary">
            {recordPinned ? `Latest ${shown.length - 1} + record` : history.length > MAX_ROWS ? `Latest ${MAX_ROWS}` : 'Newest first'}
          </Text>
        }
      />
      <Card padding={spacing.lg}>
        {newestFirst.map((e, i) => {
          const color = e.isRecord ? colors.gold : e.current ? habit.color : withAlpha(colors.text, 0.35);
          return (
            <Fragment key={e.attempt}>
              {recordPinned && i === newestFirst.length - 1 ? (
                <View style={styles.gap} accessible accessibilityLabel={`${hiddenCount} earlier attempts not shown`}>
                  <View style={styles.gapLine} />
                  <Text variant="caption" tone="tertiary">
                    {`${hiddenCount} earlier ${hiddenCount === 1 ? 'attempt' : 'attempts'}`}
                  </Text>
                  <View style={styles.gapLine} />
                </View>
              ) : (
                i > 0 && <View style={styles.divider} />
              )}
              <View
                accessible
                accessibilityLabel={`Attempt ${e.attempt}: ${daysHours(e.ms)}${e.current ? ', ongoing' : ''}${e.isRecord ? ', record' : ''}`}
              >
                <View style={styles.rowTop}>
                  <Text variant="captionStrong" style={styles.flex} numberOfLines={1}>
                    {`Attempt ${e.attempt}`}
                    <Text variant="caption" tone="tertiary">
                      {`  ${formatDateShort(e.startAt)} – ${e.current ? 'now' : formatDateShort(e.endAt)}`}
                    </Text>
                  </Text>
                  {e.isRecord ? (
                    <View style={styles.badge}>
                      <Icon name="trophy" size={13} color={colors.gold} />
                      <Text variant="captionStrong" color={colors.gold} style={styles.badgeText}>
                        Record
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="captionStrong" color={e.current || e.isRecord ? color : colors.textSecondary} tabular>
                    {daysHours(e.ms)}
                  </Text>
                </View>
                <StreakBarRow value={e.ms / maxMs} color={color} height={6} />
              </View>
            </Fragment>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { marginTop: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  detail: { marginTop: 2 },
  group: { marginTop: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 4 },
  badgeText: { fontSize: 11 },
  gap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  gapLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
