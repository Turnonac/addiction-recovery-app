import { StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components';
import { averageStreakMs, combinedStreakHistory, dailyStatusGrid, recentWithRecord } from '@/domain/stats';
import { colors, spacing, withAlpha } from '@/theme';
import { plural } from '@/utils/format';
import { CalendarHeatmap, cleanDayColor } from '../charts/CalendarHeatmap';
import { currentBarColor, recordNeedsOutline, StreakBarChart, type StreakBar } from '../charts/StreakBarChart';
import { ChartLegend, type LegendItem } from '../components/ChartLegend';
import { StatTile } from '../components/StatTile';
import { durationParts, habitAbbreviations } from '../format';
import type { StatsData } from '../types';

const MAX_BARS = 20;
const WEEKS = 12;

/** Streaks: overview tiles, streak length per attempt, and a 12-week calendar. */
export function StreaksTab({ data }: { data: StatsData }) {
  const { habits, relapses, now, scope, weekStartsOn } = data;
  const single = scope === 'habit' ? habits[0] : undefined;
  const byHabit = new Map(habits.map((h) => [h.id, h]));

  // One chronological list with a single record: the tiles and the chart's gold bar agree.
  const all = combinedStreakHistory(habits, relapses, now);
  const current = all.filter((e) => e.current).sort((a, b) => b.ms - a.ms)[0];
  const record = all.find((e) => e.isRecord);
  const average = averageStreakMs(all);
  const attempts = all.length;
  const relapseCount = attempts - habits.length;

  const shown = recentWithRecord(all, MAX_BARS);
  const truncated = all.length > shown.length;
  const recordPinned = truncated && shown[0] !== all[all.length - shown.length];
  const abbr = habitAbbreviations(habits);
  // One habit: its current bar must not pass for the gold record (yellow/amber habits).
  const currentColor = single ? currentBarColor(single.color) : undefined;
  const bars: StreakBar[] = shown.map((e) => ({
    key: `${e.habitId}:${e.attempt}`,
    ms: e.ms,
    color: (e.current && currentColor) || (byHabit.get(e.habitId)?.color ?? colors.accent),
    kind: e.isRecord ? 'record' : e.current ? 'current' : 'past',
    current: e.current,
    label: single ? `#${e.attempt}` : (abbr.get(e.habitId) ?? ''),
  }));
  // The legend only names the kinds of bars actually drawn.
  const kinds = new Set(bars.map((b) => b.kind));
  const recordLegend: LegendItem[] = kinds.has('record')
    ? [{ color: colors.gold, label: 'Record', shape: recordNeedsOutline(bars) ? 'outlined' : 'square' }]
    : [];

  const grid = dailyStatusGrid(habits, relapses, now, WEEKS, weekStartsOn);
  const cleanDays = grid.flat().filter((d) => d.status === 'clean').length;
  const heatColor = single ? cleanDayColor(single.color) : colors.success;

  const cur = durationParts(current?.ms ?? 0);
  const rec = durationParts(record?.ms ?? 0);
  const avg = durationParts(average);
  const recordHabit = record ? byHabit.get(record.habitId) : undefined;
  const recordSub = !record ? 'None yet' : single ? (record.current ? 'Happening now' : `Attempt ${record.attempt}`) : (recordHabit?.name ?? '');

  return (
    <View>
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatTile
            icon="fire"
            color={colors.fire}
            label="Current"
            value={cur.value}
            unit={cur.unit}
            sub={single ? `Attempt ${current?.attempt ?? 1}` : current ? (byHabit.get(current.habitId)?.name ?? '') : undefined}
            subTrailing={!single && current && habits.length > 1 ? '· longest' : undefined}
          />
          <StatTile
            icon="trophy"
            color={colors.gold}
            label="Record"
            value={rec.value}
            unit={rec.unit}
            sub={recordSub}
            subTrailing={!single && record?.current ? '· now' : undefined}
          />
        </View>
        <View style={styles.gridRow}>
          <StatTile icon="chart-line" color={colors.accent} label="Average" value={avg.value} unit={avg.unit} sub="per attempt" />
          <StatTile
            icon="flag-outline"
            color={colors.info}
            label="Attempts"
            value={String(attempts)}
            sub={relapseCount ? plural(relapseCount, 'relapse') : 'No relapses yet'}
          />
        </View>
      </View>

      <SectionHeader
        title="Streak history"
        right={<Hint>{truncated ? `${shown.length} of ${plural(attempts, 'attempt')}` : plural(shown.length, 'attempt')}</Hint>}
      />
      <Card padding={spacing.lg}>
        <StreakBarChart bars={bars} />
        {single ? (
          <ChartLegend
            style={styles.legend}
            items={[
              ...recordLegend,
              ...(kinds.has('current') ? [{ color: currentColor ?? single.color, label: 'Current' }] : []),
              ...(kinds.has('past') ? [{ color: withAlpha(single.color, 0.38), label: 'Past attempts' }] : []),
            ]}
          />
        ) : (
          <>
            <ChartLegend
              style={styles.legend}
              items={[...recordLegend, ...habits.map((h) => ({ color: h.color, label: h.name, shape: 'dot' as const }))]}
            />
            {kinds.has('past') ? (
              <Text variant="caption" tone="tertiary" style={styles.note}>
                Solid bars are current streaks, faded bars past attempts.
              </Text>
            ) : null}
          </>
        )}
        {recordPinned ? (
          <Text variant="caption" tone="tertiary" style={styles.note}>
            {`Your record comes first, then the latest ${shown.length - 1} attempts.`}
          </Text>
        ) : null}
      </Card>

      <SectionHeader title="Calendar" right={<Hint>{`${plural(cleanDays, 'clean day')} · ${WEEKS} weeks`}</Hint>} />
      <Card padding={spacing.lg}>
        <CalendarHeatmap grid={grid} color={heatColor} habitCount={habits.length} weekStartsOn={weekStartsOn} />
        <ChartLegend
          style={styles.legend}
          items={[
            { color: heatColor, label: habits.length > 1 ? 'Clean (brighter = more habits)' : 'Clean' },
            { color: colors.danger, label: 'Relapse', shape: 'dot' },
            { color: colors.text, label: 'Today', shape: 'ring' },
          ]}
        />
      </Card>
    </View>
  );
}

function Hint({ children }: { children: string }) {
  return (
    <Text variant="caption" tone="tertiary">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md, marginTop: spacing.lg },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  legend: { marginTop: spacing.md },
  note: { marginTop: spacing.sm },
});
