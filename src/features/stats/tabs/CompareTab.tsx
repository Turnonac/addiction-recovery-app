import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, IconTile, SectionHeader, Text } from '@/components';
import { compareRows, type CompareRow } from '@/domain/stats';
import { colors, spacing } from '@/theme';
import { StreakBarRow } from '../components/StreakBarRow';
import { successColor } from '../components/successColor';
import { useColumnWidth } from '../components/useColumnWidth';
import { useLayoutWidth } from '../components/useLayoutWidth';
import { hoursLabel, moneySuffix, roundPercent, shortDays } from '../format';
import type { StatsData } from '../types';
import { AttemptsCompare } from './AttemptsCompare';

/** Below this table width (small phones) the number columns tighten so names stay readable. */
const NARROW_TABLE = 300;

/** What a habit has saved: money, else hours, else a dash. */
function savedLabel(r: CompareRow): string {
  if (r.tracksMoney) return moneySuffix(r.moneySaved, r.currency);
  if (r.minutesSaved > 0) return hoursLabel(r.minutesSaved);
  return '—';
}

/** Compare: habits side by side (All habits) or the current attempt vs past ones (This habit). */
export function CompareTab({ data }: { data: StatsData }) {
  if (data.scope === 'habit' && data.snapshots[0]) return <AttemptsCompare data={data} />;
  return <HabitsCompare data={data} />;
}

function HabitsCompare({ data }: { data: StatsData }) {
  const rows = compareRows(data.snapshots, data.now);
  const maxMs = Math.max(1, ...rows.map((r) => Math.max(r.recordMs, r.streakMs)));
  const byStreak = [...rows].sort((a, b) => b.streakMs - a.streakMs);
  const [tableW, onTableLayout] = useLayoutWidth();
  const narrow = tableW > 0 && tableW < NARROW_TABLE;
  // Saved grows to its widest amount (never cut); the habit name takes the squeeze.
  const [savedW, onSavedLayout] = useColumnWidth(narrow ? 48 : 66);
  const colSuccess = { width: narrow ? 50 : 64 };
  const colTries = { width: narrow ? 34 : 40 };
  const colSaved = { minWidth: savedW };

  return (
    <View>
      <SectionHeader title="Current streaks" right={<Legend />} />
      <Card padding={spacing.lg}>
        {byStreak.map((r, i) => (
          <Fragment key={r.habitId}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.streakRow} accessible accessibilityLabel={`${r.name}: ${r.streakDays} days, record ${r.recordDays} days`}>
              <IconTile icon={r.icon} color={r.color} size={34} />
              <View style={styles.flex}>
                <View style={styles.rowTop}>
                  <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                    {r.name}
                  </Text>
                  <Text variant="captionStrong" color={r.color} tabular>
                    {shortDays(r.streakMs)}
                  </Text>
                  <Text variant="caption" tone="tertiary" tabular>
                    {` / ${shortDays(r.recordMs)}`}
                  </Text>
                </View>
                <StreakBarRow value={r.streakMs / maxMs} color={r.color} marker={r.recordMs / maxMs} />
              </View>
            </View>
          </Fragment>
        ))}
      </Card>

      <SectionHeader title="At a glance" />
      <Card padding={spacing.lg}>
        <View onLayout={onTableLayout}>
          <View style={styles.tableRow}>
            <Text variant="overline" tone="tertiary" style={[styles.th, styles.flex]}>
              Habit
            </Text>
            <Text variant="overline" tone="tertiary" numberOfLines={1} style={[styles.th, colSuccess, styles.right]}>
              Success
            </Text>
            <Text variant="overline" tone="tertiary" numberOfLines={1} style={[styles.th, colTries, styles.right]}>
              Tries
            </Text>
            <Text
              variant="overline"
              tone="tertiary"
              numberOfLines={1}
              style={[styles.th, styles.fixed, colSaved, styles.right]}
              onLayout={onSavedLayout}
            >
              Saved
            </Text>
          </View>
          {rows.map((r) => (
            <View
              key={r.habitId}
              style={[styles.tableRow, styles.tableBody]}
              accessible
              accessibilityLabel={`${r.name}: success ${roundPercent(r.successRate)}, ${r.attempts} attempts, saved ${savedLabel(r)}`}
            >
              <View style={[styles.flex, styles.nameCell]}>
                <View style={[styles.dot, { backgroundColor: r.color }]} />
                <Text variant="captionStrong" numberOfLines={2} style={styles.flex}>
                  {r.name}
                </Text>
              </View>
              <View style={colSuccess}>
                <Text variant="captionStrong" color={successColor(r.successRate)} tabular style={styles.right}>
                  {roundPercent(r.successRate)}
                </Text>
                <View style={styles.miniTrack}>
                  <View style={[styles.miniFill, { width: `${r.successRate * 100}%`, backgroundColor: successColor(r.successRate) }]} />
                </View>
              </View>
              <Text variant="captionStrong" tabular style={[colTries, styles.right]}>
                {r.attempts}
              </Text>
              <Text
                variant="captionStrong"
                tabular
                numberOfLines={1}
                tone={r.tracksMoney ? 'primary' : r.minutesSaved > 0 ? 'secondary' : 'tertiary'}
                style={[styles.fixed, colSaved, styles.right]}
                onLayout={onSavedLayout}
              >
                {savedLabel(r)}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="caption" tone="tertiary" style={styles.footnote}>
          Success is the share of days without a relapse since you first quit. Tries counts every fresh start. Saved shows hours for habits without a
          daily cost.
        </Text>
      </Card>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendTick} />
      <Text variant="caption" tone="tertiary">
        record
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.sm },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableBody: { paddingVertical: spacing.sm + 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  th: { fontSize: 9, letterSpacing: 1.2, paddingBottom: spacing.sm },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  fixed: { flexShrink: 0 },
  right: { textAlign: 'right' },
  miniTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 4, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },
  footnote: { marginTop: spacing.md },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendTick: { width: 2, height: 12, borderRadius: 1, backgroundColor: colors.text },
});
