import { StyleSheet, View } from 'react-native';

import { Card, IconTile, Text } from '@/components';
import { MOODS } from '@/domain/catalog/moods';
import type { WeeklySummary } from '@/domain/weekly';
import { colors, spacing } from '@/theme';
import type { IconName } from '@/types';
import { formatMinutes, formatMoney, plural } from '@/utils/format';

interface Tile {
  key: string;
  icon: IconName;
  color: string;
  value: string;
  label: string;
  sub?: string;
}

function money(amount: number, currency: string): string {
  return amount >= 1000 ? formatMoney(amount, currency, { compact: true }) : formatMoney(amount, currency);
}

/** Builds the 6 stat tiles (money, time, SOS, journal, mood, best streak). */
export function weeklyTiles(s: WeeklySummary): Tile[] {
  const currencies = Object.entries(s.moneyByCurrency).sort((a, b) => b[1] - a[1]);
  const [top, ...others] = currencies;
  const mood = s.journal.avgMood != null ? MOODS[Math.min(4, Math.max(0, Math.round(s.journal.avgMood) - 1))] : null;
  return [
    {
      key: 'money',
      icon: 'cash-multiple',
      color: colors.success,
      value: top ? money(top[1], top[0]) : '—',
      label: 'Money saved',
      sub: top ? (others.length ? `+ ${others.map(([c, v]) => money(v, c)).join(' · ')}` : 'kept in your pocket') : 'Not tracked',
    },
    {
      key: 'time',
      icon: 'clock-outline',
      color: colors.info,
      value: s.minutesSaved >= 1 ? formatMinutes(s.minutesSaved) : '—',
      label: 'Time regained',
      sub: s.minutesSaved >= 1 ? 'of your life back' : 'Not tracked',
    },
    {
      key: 'sos',
      icon: 'lifebuoy',
      color: colors.fire,
      value: String(s.sos.completed),
      label: 'Cravings resisted',
      sub: s.sos.count ? `${plural(s.sos.count, 'SOS session')}` : 'No SOS needed',
    },
    {
      key: 'journal',
      icon: 'notebook-outline',
      color: colors.purple,
      value: String(s.journal.count),
      label: s.journal.count === 1 ? 'Journal entry' : 'Journal entries',
      sub: s.journal.count ? 'written this week' : 'Nothing written',
    },
    {
      key: 'mood',
      icon: mood?.icon ?? 'emoticon-neutral-outline',
      color: mood?.color ?? colors.textTertiary,
      value: mood?.label ?? '—',
      label: 'Average mood',
      sub: s.journal.avgMood != null ? `${s.journal.avgMood.toFixed(1)} / 5` : 'No entries',
    },
    {
      key: 'streak',
      icon: 'fire',
      color: colors.gold,
      value: s.bestStreakDays > 0 ? plural(s.bestStreakDays, 'day') : s.habits.length ? '<1 day' : '—',
      label: 'Best streak',
      sub: s.bestStreakHabit?.name ?? (s.isCurrentWeek ? 'so far' : 'at week end'),
    },
  ];
}

export function WeeklyStats({ summary }: { summary: WeeklySummary }) {
  return (
    <View style={styles.grid}>
      {weeklyTiles(summary).map((t) => (
        <View key={t.key} style={styles.cell}>
          <Card padding={spacing.md} style={styles.card}>
            <View accessible accessibilityLabel={`${t.label}: ${t.value}${t.sub ? `, ${t.sub}` : ''}`} style={styles.inner}>
              <IconTile icon={t.icon} color={t.color} size={32} shape="circle" />
              <Text variant="heading" tabular numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
                {t.value}
              </Text>
              <Text variant="captionStrong" tone="secondary" numberOfLines={1}>
                {t.label}
              </Text>
              {t.sub ? (
                <Text variant="micro" tone="tertiary" numberOfLines={1}>
                  {t.sub}
                </Text>
              ) : null}
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { width: '50%', padding: spacing.xs },
  card: { flex: 1 },
  inner: { gap: 2 },
  value: { marginTop: spacing.sm },
});
