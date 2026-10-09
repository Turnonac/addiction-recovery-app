import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, EmptyState, Header, Icon, Screen, SectionHeader, Text } from '@/components';
import { startOfWeek } from '@/domain/time';
import { earliestWeekStart, formatWeekRange, shiftWeek, weekRelativeLabel, weekdayLetters, weeklySummary } from '@/domain/weekly';
import { HabitWeekRow } from '@/features/achievements/weekly/HabitWeekRow';
import { Highlights } from '@/features/achievements/weekly/Highlights';
import { WeekSwitcher } from '@/features/achievements/weekly/WeekSwitcher';
import { WeeklyHero } from '@/features/achievements/weekly/WeeklyHero';
import { WeeklyStats } from '@/features/achievements/weekly/WeeklyStats';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';

export default function WeeklySummaryScreen() {
  const now = useNow(60_000);
  const habits = useStore((s) => s.habits);
  const relapses = useStore((s) => s.relapses);
  const journal = useStore((s) => s.journal);
  const sosSessions = useStore((s) => s.sosSessions);
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn);
  const haptic = useHaptics();
  /** 0 = this week, 1 = last week, … */
  const [weeksBack, setWeeksBack] = useState(0);

  const header = <Header title="Weekly summary" left="back" />;
  const hasHabits = habits.some((h) => !h.archived);

  if (!hasHabits) {
    return (
      <Screen header={header} glowColor={colors.accent} glowIntensity={0.3}>
        <EmptyState icon="calendar-week" title="No habits yet" message="Add a habit you want to quit and your week in review will show up here." />
        <Button label="Add a habit" icon="plus" fullWidth={false} style={styles.centerButton} onPress={() => router.push('/habit/new')} />
      </Screen>
    );
  }

  const currentWeek = startOfWeek(now, weekStartsOn);
  const firstWeek = earliestWeekStart({ habits, relapses }, weekStartsOn, now);
  const weekStart = shiftWeek(currentWeek, -weeksBack);
  const summary = weeklySummary({ habits, relapses, journal, sosSessions }, weekStart, now);
  const letters = weekdayLetters(weekStartsOn);
  const todayIndex = summary.isCurrentWeek ? summary.dayStarts.filter((d) => d <= now).length - 1 : -1;

  const go = (delta: number) => {
    haptic('selection');
    setWeeksBack((w) => Math.max(0, w + delta));
  };

  return (
    <Screen header={header} glowColor={colors.accent} glowIntensity={0.3}>
      <WeekSwitcher
        range={formatWeekRange(weekStart)}
        label={weekRelativeLabel(weekStart, now, weekStartsOn)}
        canPrev={weekStart > firstWeek}
        canNext={weeksBack > 0}
        onPrev={() => go(1)}
        onNext={() => go(-1)}
      />

      {summary.habits.length ? (
        <>
          <WeeklyHero summary={summary} />

          <SectionHeader title="Habits" icon="calendar-check" />
          <Card padding={0}>
            {summary.habits.map((row, i) => (
              <HabitWeekRow key={row.habit.id} row={row} letters={letters} todayIndex={todayIndex} first={i === 0} />
            ))}
          </Card>

          <SectionHeader title={summary.isCurrentWeek ? 'This week' : 'That week'} icon="chart-box-outline" />
          <WeeklyStats summary={summary} />

          <SectionHeader title="Highlights" icon="star-four-points-outline" />
          <Highlights items={summary.highlights} />
        </>
      ) : (
        <Card>
          <Text variant="body" tone="secondary" center>
            {"You weren't tracking any habits this week yet."}
          </Text>
        </Card>
      )}

      <View style={styles.closing}>
        <Icon name="heart-outline" size={18} color={colors.textTertiary} />
        <Text variant="body" tone="secondary" center style={styles.closingText}>
          {summary.closingLine}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerButton: { alignSelf: 'center' },
  closing: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
  closingText: { fontStyle: 'italic', maxWidth: 320 },
});
