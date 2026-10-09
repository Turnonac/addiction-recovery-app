import { StyleSheet, View } from 'react-native';

import { Card, Icon, SectionHeader, Text } from '@/components';
import { moodDistribution, moodInsight, moodTimeline, peakHour, relapseHourHistogram } from '@/domain/stats';
import { colors, spacing, withAlpha } from '@/theme';
import { plural } from '@/utils/format';
import { HourHistogram } from '../charts/HourHistogram';
import { MoodLineChart } from '../charts/MoodLineChart';
import { ChartLegend } from '../components/ChartLegend';
import { MoodBars } from '../components/MoodBars';
import { hourLabel } from '../format';
import type { StatsData } from '../types';

const DAYS = 30;

/** Mood: distribution, 30-day timeline, an insight and the time of day relapses happen. */
export function MoodTab({ data }: { data: StatsData }) {
  const { journal, relapses, now, scope } = data;
  const dist = moodDistribution(journal, relapses);
  const total = dist.reduce((a, d) => a + d.count, 0);
  const timeline = moodTimeline(journal, now, DAYS);
  const logged = timeline.filter((d) => d.average != null).length;
  const insight = moodInsight(journal, relapses);
  const hours = relapseHourHistogram(relapses);
  const peak = peakHour(hours);
  const hasRelapseMoods = dist.some((d) => d.relapses > 0);

  return (
    <View>
      {insight ? (
        <Card tint={colors.accent} tintStrength={0.1} style={styles.insight} padding={spacing.lg}>
          <View style={styles.insightRow}>
            <View style={[styles.insightIcon, { backgroundColor: withAlpha(colors.accent, 0.22) }]}>
              <Icon name={insight.icon} size={20} color={colors.accent} />
            </View>
            <Text variant="body" style={styles.flex}>
              {insight.text}
            </Text>
          </View>
        </Card>
      ) : null}

      <SectionHeader
        title="Mood distribution"
        right={
          <Text variant="caption" tone="tertiary">
            {plural(total, 'check-in')}
          </Text>
        }
      />
      <Card padding={spacing.lg}>
        {total ? (
          <>
            <MoodBars stats={dist} />
            {hasRelapseMoods ? (
              <ChartLegend
                style={styles.legend}
                items={[
                  { color: colors.text, label: 'Journal entries' },
                  { color: withAlpha(colors.text, 0.3), label: 'Mood at relapse' },
                ]}
              />
            ) : null}
          </>
        ) : (
          <Empty
            icon="notebook-outline"
            text={scope === 'habit' ? 'No journal entries linked to this habit yet.' : 'Write a journal entry to start tracking your mood.'}
          />
        )}
      </Card>

      <SectionHeader
        title={`Mood · last ${DAYS} days`}
        right={
          <Text variant="caption" tone="tertiary">
            {plural(logged, 'day')} logged
          </Text>
        }
      />
      <Card padding={spacing.md}>
        {logged ? <MoodLineChart days={timeline} /> : <Empty icon="chart-line" text={`No journal entries in the last ${DAYS} days.`} />}
      </Card>

      <SectionHeader
        title="When you relapse"
        right={peak >= 0 ? <Text variant="caption" tone="tertiary">{`Peak ${hourLabel(peak)}–${hourLabel(peak + 1)}`}</Text> : undefined}
      />
      <Card padding={spacing.lg}>
        {relapses.length ? (
          <>
            <HourHistogram counts={hours} peak={peak} />
            <Text variant="caption" tone="secondary" style={styles.legend}>
              {`Most relapses happen around ${hourLabel(peak)}. Plan an SOS exercise or a walk for that time.`}
            </Text>
          </>
        ) : (
          <Empty icon="clock-check-outline" text="No relapses logged — no risky hours to show." />
        )}
      </Card>
    </View>
  );
}

function Empty({ icon, text }: { icon: 'notebook-outline' | 'chart-line' | 'clock-check-outline'; text: string }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={22} color={colors.textTertiary} />
      <Text variant="caption" tone="tertiary" center>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  insight: { marginTop: spacing.lg },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  insightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  legend: { marginTop: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});
