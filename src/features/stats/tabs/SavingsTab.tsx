import { router } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, Icon, IconTile, SectionHeader, Text } from '@/components';
import { savingsByCurrency } from '@/domain/habitStats';
import { cumulativeSavingsSeries, dailySavingsRate, sortCurrencyTotals } from '@/domain/stats';
import { DAY, HOUR, MINUTE } from '@/domain/time';
import { colors, habitColors, spacing } from '@/theme';
import { currencySymbol, formatMinutes } from '@/utils/format';
import { CumulativeChart, MONEY_COLOR, TIME_COLOR } from '../charts/CumulativeChart';
import { AmountBarRow } from '../components/AmountBarRow';
import { ChartLegend } from '../components/ChartLegend';
import { CurrencyCard } from '../components/CurrencyCard';
import { ProjectionTable, type ProjectionRow } from '../components/ProjectionTable';
import { StatsEmpty } from '../components/StatsEmpty';
import { ambiguousCurrencies, currencyMark, currencyTag, formatCompactParts, hoursLabel, hoursValue, moneySuffix } from '../format';
import type { StatsData } from '../types';

/** Per-currency accent colors, by rank (largest total first). No blue: that is the time color. */
const CURRENCY_COLORS = [
  habitColors.orange,
  habitColors.cyan,
  habitColors.green,
  habitColors.violet,
  habitColors.pink,
  habitColors.yellow,
  habitColors.rose,
  habitColors.lime,
];
const currencyColor = (i: number) => CURRENCY_COLORS[i % CURRENCY_COLORS.length];

/** Savings: money per currency, BY CURRENCY bars, cumulative chart, time saved, projections. */
export function SavingsTab({ data }: { data: StatsData }) {
  const { habits, relapses, snapshots, now, scope } = data;
  const single = scope === 'habit' ? habits[0] : undefined;
  const totals = sortCurrencyTotals(savingsByCurrency(snapshots));
  const minutes = snapshots.reduce((acc, s) => acc + s.minutesSaved, 0);
  const tracksTime = habits.some((h) => h.dailyMinutes > 0);
  const rate = dailySavingsRate(habits);
  const rates = sortCurrencyTotals(rate.money);
  // Currencies sharing a symbol (JPY/CNY "¥", SEK/NOK/DKK "kr") are told apart by ISO code.
  const ambiguous = ambiguousCurrencies([...totals, ...rates].map((t) => t.currency));
  const tag = (code: string) => currencyTag(code, ambiguous.has(code));
  const money = (amount: number, code: string) => moneySuffix(amount, code, ambiguous.has(code));

  if (!totals.length && !tracksTime) {
    return (
      <StatsEmpty
        icon="piggy-bank-outline"
        color={colors.success}
        title="No savings tracked"
        message={
          single
            ? `Add what ${single.name.toLowerCase()} used to cost you per day, and the time it took, to see what quitting saves.`
            : 'Add a daily cost or time to your habits to see the money and hours quitting gives back.'
        }
        actionLabel={single ? 'Edit habit' : undefined}
        onAction={single ? () => router.push(`/habit/${single.id}/edit`) : undefined}
      />
    );
  }

  const series = cumulativeSavingsSeries(habits, relapses, now, 48);
  const chartCurrency = totals[0]?.currency ?? null;
  const chartReady = series.length > 1 && series[series.length - 1].t - series[0].t >= HOUR;
  const maxAmount = Math.max(...totals.map((t) => t.amount), 0) || 1;
  const projection: ProjectionRow[] = rates.map((r) => ({
    key: r.currency,
    color: currencyColor(
      Math.max(
        0,
        totals.findIndex((t) => t.currency === r.currency),
      ),
    ),
    label: money(r.amount, r.currency),
    month: money(r.amount * 30, r.currency),
    year: money(r.amount * 365, r.currency),
  }));
  if (rate.minutes > 0) {
    projection.push({
      key: 'time',
      color: TIME_COLOR,
      label: formatMinutes(rate.minutes),
      month: hoursLabel(rate.minutes * 30),
      year: hoursLabel(rate.minutes * 365),
    });
  }

  return (
    <View>
      {totals.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.cards}>
          {totals.map((t, i) => (
            <CurrencyCard
              key={t.currency}
              color={currencyColor(i)}
              tag={tag(t.currency)}
              value={formatCompactParts(t.amount)}
              suffix={currencyMark(t.currency, ambiguous.has(t.currency))}
              caption="saved"
            />
          ))}
          {tracksTime ? (
            <CurrencyCard color={TIME_COLOR} icon="clock-outline" tag="Time" value={hoursValue(minutes)} suffix="h" caption="saved" />
          ) : null}
        </ScrollView>
      ) : (
        <Card style={styles.note} padding={spacing.md}>
          <View style={styles.noteRow}>
            <IconTile icon="cash-remove" color={colors.textSecondary} size={32} shape="circle" />
            <Text variant="caption" tone="secondary" style={styles.flex}>
              {single ? `No daily cost set for ${single.name}` : 'None of your habits has a daily cost'} — showing time saved only.
            </Text>
            {single ? (
              <Chip
                label="Add cost"
                icon="pencil"
                color={colors.accent}
                onPress={() => router.push(`/habit/${single.id}/edit`)}
                accessibilityLabel={`Add a daily cost to ${single.name}`}
              />
            ) : null}
          </View>
        </Card>
      )}

      {totals.length ? (
        <>
          <SectionHeader title="By currency" />
          <Card padding={spacing.lg}>
            {totals.map((t, i) => (
              <Fragment key={t.currency}>
                {i > 0 && <View style={styles.gap} />}
                <AmountBarRow color={currencyColor(i)} label={tag(t.currency)} amount={money(t.amount, t.currency)} value={t.amount / maxAmount} />
              </Fragment>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Cumulative savings" />
      <Card padding={spacing.md}>
        {chartReady ? (
          <CumulativeChart series={series} currency={chartCurrency} showTime={tracksTime} />
        ) : (
          <View style={styles.chartEmpty}>
            <Icon name="chart-timeline-variant" size={22} color={colors.textTertiary} />
            <Text variant="caption" tone="tertiary" center>
              Your savings curve starts drawing after your first clean hour.
            </Text>
          </View>
        )}
      </Card>
      {chartReady ? (
        <ChartLegend
          style={styles.legend}
          items={[
            ...(chartCurrency ? [{ color: MONEY_COLOR, label: totals.length > 1 ? `Money (${tag(chartCurrency)})` : 'Money' }] : []),
            ...(tracksTime ? [{ color: TIME_COLOR, label: 'Time (h)' }] : []),
          ]}
        />
      ) : null}
      {chartReady && totals.length > 1 && chartCurrency ? (
        <Text variant="caption" tone="tertiary" style={styles.caption}>
          {`Chart shows ${currencySymbol(chartCurrency)} (${chartCurrency}), your largest total. Other currencies are listed above.`}
        </Text>
      ) : null}

      {tracksTime ? (
        <>
          <SectionHeader title="Time saved" />
          <Card padding={spacing.lg}>
            <View style={styles.timeRow}>
              <IconTile icon="clock-outline" color={TIME_COLOR} size={44} shape="circle" />
              <View style={styles.flex}>
                <View style={styles.baseline}>
                  <Text variant="title" tabular>
                    {hoursValue(minutes)}
                  </Text>
                  <Text variant="bodyStrong" tone="secondary">
                    {hoursValue(minutes) === '1' ? 'hour' : 'hours'}
                  </Text>
                </View>
                <Text variant="caption" tone="secondary">
                  {minutes >= DAY / MINUTE
                    ? `≈ ${formatMinutes(minutes)} not spent on ${single ? single.name.toLowerCase() : 'your habits'}`
                    : `${formatMinutes(rate.minutes)} back every clean day`}
                </Text>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      <SectionHeader
        title="Projected"
        right={
          <Text variant="caption" tone="tertiary">
            at your daily rate
          </Text>
        }
      />
      <Card padding={spacing.lg}>
        <ProjectionTable key={projection.map((r) => `${r.key}:${r.year}`).join('|')} rows={projection} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bleed: { marginHorizontal: -spacing.lg, marginTop: spacing.lg, flexGrow: 0 },
  cards: { paddingHorizontal: spacing.lg, gap: spacing.md },
  note: { marginTop: spacing.lg },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gap: { height: spacing.lg },
  legend: { marginTop: spacing.md, paddingHorizontal: 2 },
  chartEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  caption: { marginTop: spacing.sm, paddingHorizontal: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
});
