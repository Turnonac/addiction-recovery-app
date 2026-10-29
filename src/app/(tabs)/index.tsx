import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { callWindow } from '@/domain/call';
import { addDays, diffDays, formatLong, formatShort } from '@/domain/dates';
import { backupNudgeDue, recentUnloggedDates, weekStrip } from '@/domain/history';
import { bestStreak, currentStreak } from '@/domain/streak';
import { COLOR_NAMES, RED, type CallWindow, type LocalDate } from '@/domain/types';
import { useAppStore } from '@/state/store';
import { Button, Card, ColorGlyph, Screen, ScreenHeader, WeekStrip } from '@/ui/components';
import { Check, Phone } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Current local hour, kept fresh (checked every minute and when the app returns). */
function useHourOfDay(): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    const interval = setInterval(update, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  return hour;
}

function daysText(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/** 'yesterday', a weekday name within the last week, else 'Wed, Oct 14'. */
function relativeDay(date: LocalDate, today: LocalDate): string {
  const ago = diffDays(date, today);
  if (ago === 1) return 'yesterday';
  if (ago > 1 && ago < 7) return formatLong(date).split(',')[0];
  return formatShort(date);
}

function callSubtitle(call: CallWindow, today: LocalDate): string {
  if (call.checkedInToday) return 'You talked today';
  const lowest = call.lowest === null ? 'nothing logged' : COLOR_NAMES[call.lowest];
  if (call.lastCallDate === null) {
    return call.lowest === null ? 'No calls yet' : `No calls yet · lowest so far: ${lowest}`;
  }
  return `Last call ${relativeDay(call.lastCallDate, today)} · lowest since then: ${lowest}`;
}

export default function TodayScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const hour = useHourOfDay();
  const today = useAppStore((s) => s.today);
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);

  const dayList = Object.values(days);
  const partner = settings.partner;
  const partnerName = partner?.name.trim() || 'your partner';

  const streak = currentStreak(dayList, settings.counterStartDate, today);
  const best = bestStreak(dayList, settings.counterStartDate, today);
  const week = weekStrip(dayList, today);
  const todayColor = days[today]?.color ?? null;
  const call = callWindow(dayList, settings, today);
  const yesterday = addDays(today, -1);
  const yesterdayUnlogged = recentUnloggedDates(dayList, settings.installDate, today).includes(
    yesterday,
  );
  const backupDue = backupNudgeDue(settings.lastExportAt, settings.installDate, today);

  const cardTitle = { color: theme.text, fontSize: 17, fontWeight: '700' } as const;
  const cardBody = { color: theme.muted, fontSize: 14, lineHeight: 20 } as const;

  return (
    <Screen>
      <ScreenHeader eyebrow={formatLong(today)} title={greetingFor(hour)} />

      {/* Clean-day counter + last 7 days */}
      <Card gap={18} style={{ paddingVertical: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View
            accessible
            accessibilityLabel={
              streak === null
                ? 'Day 0. Your counter starts today.'
                : `${daysText(streak)} since last Red`
            }
            style={{ gap: 4, flexShrink: 1 }}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                color: theme.text,
                fontSize: 68,
                lineHeight: 72,
                fontWeight: '700',
                letterSpacing: -1.36,
                fontVariant: ['tabular-nums'],
              }}
            >
              {streak === null ? 'Day 0' : String(streak)}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 15, fontWeight: '500' }}>
              {streak === null
                ? 'Your counter starts today'
                : `${streak === 1 ? 'day' : 'days'} since last Red`}
            </Text>
          </View>
          {best !== null && best > 0 ? (
            <View
              accessible
              accessibilityLabel={`Best streak: ${daysText(best)}`}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: theme.accentSoft,
              }}
            >
              <Text style={{ color: theme.accentText, fontSize: 13, fontWeight: '700' }}>
                Best · {daysText(best)}
              </Text>
            </View>
          ) : null}
        </View>

        <WeekStrip
          days={week}
          showCallMarks={partner !== null}
          partnerName={partner !== null ? partnerName : undefined}
        />
        {partner !== null ? (
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 16 }}>
            Check under a day = checked in with {partnerName}
          </Text>
        ) : null}
      </Card>

      {/* Today's check-in */}
      <Card>
        <View style={{ gap: 2 }}>
          <Text accessibilityRole="header" style={cardTitle}>
            Today’s check-in
          </Text>
          <Text style={cardBody}>
            {todayColor === null
              ? 'Not logged yet · pick your lowest color'
              : 'Your lowest color so far today'}
          </Text>
        </View>
        {todayColor === null ? (
          <Button title="Check in" onPress={() => router.push('/check-in')} />
        ) : (
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}
          >
            <View
              accessible
              accessibilityLabel={`Today: ${COLOR_NAMES[todayColor]}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                paddingVertical: 6,
                paddingLeft: 8,
                paddingRight: 14,
                borderRadius: 999,
                backgroundColor: theme.levels[todayColor].soft,
              }}
            >
              <ColorGlyph level={todayColor} size={28} />
              <Text
                style={{ color: theme.levels[todayColor].ink, fontSize: 16, fontWeight: '700' }}
              >
                {COLOR_NAMES[todayColor]}
              </Text>
            </View>
            <View style={{ flexGrow: 1 }} />
            <Button
              title="Update"
              variant="outline"
              accessibilityLabel="Update today’s check-in"
              onPress={() => router.push('/check-in')}
            />
          </View>
        )}
        {todayColor === RED ? (
          <Text style={cardBody}>Your counter restarts at 0. God’s grace doesn’t reset.</Text>
        ) : null}
      </Card>

      {/* Partner call, or the nudge to add one */}
      {partner !== null ? (
        <Card>
          <View style={{ gap: 2 }}>
            <Text accessibilityRole="header" style={cardTitle}>
              Daily call with {partnerName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {call.checkedInToday ? (
                <Check size={16} color={theme.accentText} strokeWidth={3} />
              ) : null}
              <Text style={[cardBody, { flexShrink: 1 }]}>{callSubtitle(call, today)}</Text>
            </View>
          </View>
          <Button
            title={`Call ${partnerName}`}
            variant="secondary"
            icon={Phone}
            onPress={() => router.push('/call')}
          />
        </Card>
      ) : (
        <Card variant="accent">
          <View style={{ gap: 4 }}>
            <Text accessibilityRole="header" style={cardTitle}>
              Add your partner
            </Text>
            <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
              A daily call with someone who prays for you is the key piece of recovery.
            </Text>
          </View>
          <Button
            title="Add partner"
            onPress={() => router.navigate('/settings/partner', { withAnchor: true })}
          />
        </Card>
      )}

      {/* Missed yesterday */}
      {yesterdayUnlogged ? (
        <Card>
          <View style={{ gap: 2 }}>
            <Text accessibilityRole="header" style={cardTitle}>
              Yesterday isn’t logged
            </Text>
            <Text style={cardBody}>
              {formatLong(yesterday)} has no color yet. You can still make it up.
            </Text>
          </View>
          <Button
            title="Log yesterday"
            variant="secondary"
            onPress={() => router.push({ pathname: '/check-in', params: { date: yesterday } })}
          />
        </Card>
      ) : null}

      {/* 30-day backup reminder */}
      {backupDue ? (
        <Card>
          <View style={{ gap: 2 }}>
            <Text accessibilityRole="header" style={cardTitle}>
              Back up your history
            </Text>
            <Text style={cardBody}>
              Everything lives only on this phone. Save a backup file so you don’t lose it.
            </Text>
          </View>
          <Button
            title="Back up in Settings"
            variant="secondary"
            onPress={() => router.navigate('/settings')}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
