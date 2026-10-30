import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { formatMonthYear } from '@/domain/dates';
import { monthGrid, monthSummary } from '@/domain/history';
import { bestStreak, currentStreak } from '@/domain/streak';
import { COLOR_LEVELS, type LocalDate } from '@/domain/types';
import { useAppStore } from '@/state/store';
import {
  Card,
  ColorTotals,
  MonthCalendar,
  Screen,
  ScreenHeader,
  StatTile,
  type MonthCalendarCell,
} from '@/ui/components';
import { Check } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

/** Months counted from year 0: year * 12 + (month - 1). Easy to compare and step. */
function monthIndexOf(date: LocalDate): number {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}

function monthFromIndex(index: number): { year: number; month: number } {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function earliest(dates: readonly (LocalDate | null)[]): LocalDate | null {
  let min: LocalDate | null = null;
  for (const d of dates) {
    if (d !== null && (min === null || d < min)) min = d;
  }
  return min;
}

export default function HistoryScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const today = useAppStore((s) => s.today);
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);
  // null = follow the current month (also across midnight at month end).
  const [pickedMonth, setPickedMonth] = useState<number | null>(null);

  const dayList = Object.values(days);
  const partner = settings.partner;
  const partnerName = partner?.name.trim() || 'your partner';

  // History reaches back to install / counter start, or the oldest logged day if older (e.g. an import).
  const loggedDates = Object.keys(days).filter((d) => d <= today);
  const firstDate =
    earliest([settings.installDate, settings.counterStartDate, ...loggedDates]) ?? today;
  const currentIndex = monthIndexOf(today);
  const minIndex = Math.min(monthIndexOf(firstDate), currentIndex);
  const viewIndex = Math.min(Math.max(pickedMonth ?? currentIndex, minIndex), currentIndex);
  const { year, month } = monthFromIndex(viewIndex);

  const streak = currentStreak(dayList, settings.counterStartDate, today) ?? 0;
  const best = bestStreak(dayList, settings.counterStartDate, today) ?? 0;
  const summary = monthSummary(dayList, year, month, today, settings.installDate);
  const monthLogged = COLOR_LEVELS.some((level) => summary.counts[level] > 0);
  const anyLogged = dayList.some((d) => d.color !== null);

  const cells: MonthCalendarCell[] = monthGrid(year, month).map((date) => {
    if (date === null) {
      return { date: null, color: null, checkedIn: false, isToday: false, isFuture: false };
    }
    const day = days[date];
    return {
      date,
      color: day?.color ?? null,
      checkedIn: day?.checkedIn ?? false,
      isToday: date === today,
      isFuture: date > today,
      beforeInstall: settings.installDate !== null && date < settings.installDate,
    };
  });

  const monthTitle = formatMonthYear(year, month);
  const note = { color: theme.muted, fontSize: 13, lineHeight: 18 } as const;

  return (
    <Screen gap={16}>
      <ScreenHeader title="History" />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatTile value={String(streak)} label="Days since last Red" />
        <StatTile value={String(best)} label="Best streak, days" />
        <StatTile
          value={`${summary.checkIns}/${summary.eligibleDays}`}
          label={`Days checked in with ${partnerName}`}
        />
      </View>

      {!anyLogged ? (
        <Card>
          <View style={{ gap: 4 }}>
            <Text
              accessibilityRole="header"
              style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}
            >
              Nothing logged yet
            </Text>
            <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
              Each daily check-in adds a color to this calendar. Missed a day? Tap it below to
              make it up.
            </Text>
          </View>
        </Card>
      ) : null}

      <MonthCalendar
        title={monthTitle}
        cells={cells}
        onPressDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}
        showCallMarks={partner !== null}
        partnerName={partner !== null ? partnerName : undefined}
        onPrevMonth={() => setPickedMonth(viewIndex - 1)}
        onNextMonth={() => setPickedMonth(viewIndex + 1 >= currentIndex ? null : viewIndex + 1)}
        canGoPrev={viewIndex > minIndex}
        canGoNext={viewIndex < currentIndex}
      />

      <View style={{ gap: 12 }}>
        {monthLogged ? (
          <ColorTotals counts={summary.counts} />
        ) : anyLogged ? (
          <Text style={note}>No colors logged in {monthTitle}.</Text>
        ) : null}
        {partner !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Check size={14} color={theme.accentText} strokeWidth={3} />
            <Text style={[note, { flexShrink: 1 }]}>
              Check under a day = checked in with {partnerName}
            </Text>
          </View>
        ) : null}
        <Text style={note}>Missed a day? Tap it to make it up or change it.</Text>
      </View>
    </Screen>
  );
}
