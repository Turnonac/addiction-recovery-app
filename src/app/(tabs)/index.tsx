import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Text, useWindowDimensions, View } from 'react-native';

import { callWindow, totalCalls } from '@/domain/call';
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

/** Call tile: "{n} day(s) you’ve shared your color and asked for prayer", or the invite at 0. */
function callTileText(calls: number): { caption: string; label: string } {
  if (calls === 0) {
    return { caption: 'Make your first call', label: '0 calls. Make your first call' };
  }
  return {
    caption: `${calls === 1 ? 'day' : 'days'} you’ve shared your color and asked for prayer`,
    label: `You’ve shared your color and asked for prayer ${daysText(calls)}`,
  };
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
  const { fontScale } = useWindowDimensions();

  const dayList = Object.values(days);
  const partner = settings.partner;
  const partnerName = partner?.name.trim() || 'your partner';

  const streak = currentStreak(dayList, settings.installDate, today);
  const best = bestStreak(dayList, settings.installDate, today);
  const week = weekStrip(dayList, today, settings.installDate);
  const call = callWindow(dayList, settings, today);
  const calls = totalCalls(dayList, today);
  const callTile = callTileText(calls);
  // The daily log records yesterday, a finished day. On install day there is no yesterday to log.
  const yesterday = addDays(today, -1);
  const installDay = settings.installDate === null || yesterday < settings.installDate;
  const yesterdayColor = days[yesterday]?.color ?? null;
  const logYesterday = () =>
    router.push({ pathname: '/check-in', params: { date: yesterday, from: 'today' } });
  // The most recent missed day before yesterday (yesterday has its own card above).
  const earlierUnlogged =
    recentUnloggedDates(dayList, settings.installDate, today)
      .filter((date) => date < yesterday)
      .at(-1) ?? null;
  const backupDue = backupNudgeDue(settings.lastExportAt, settings.installDate, today);

  const cardTitle = { color: theme.text, fontSize: 17, fontWeight: '700' } as const;
  const cardBody = { color: theme.muted, fontSize: 14, lineHeight: 20 } as const;
  // Hero tiles sit side by side and stack when the row has no room for both. The row wraps on
  // flexBasis, not on text size, so the basis grows with the system text size: large text stacks.
  const tile = {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 128 * Math.max(1, fontScale),
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: theme.cardRadius,
  } as const;

  return (
    <Screen>
      <ScreenHeader eyebrow={formatLong(today)} title={greetingFor(hour)} />

      {/* Calls first (accented), then the clean-day counter; last 7 days below */}
      <Card gap={18} style={{ paddingVertical: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View
            accessible
            accessibilityLabel={callTile.label}
            style={[
              tile,
              { backgroundColor: theme.accentSoft, borderWidth: 1.5, borderColor: theme.accent },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                color: theme.accentText,
                fontSize: 56,
                lineHeight: 60,
                fontWeight: '800',
                letterSpacing: -1.12,
                fontVariant: ['tabular-nums'],
              }}
            >
              {String(calls)}
            </Text>
            <Text
              style={{ color: theme.accentText, fontSize: 14, lineHeight: 19, fontWeight: '600' }}
            >
              {callTile.caption}
            </Text>
          </View>

          <View style={[tile, { borderWidth: 1, borderColor: theme.line }]}>
            <View
              accessible
              accessibilityLabel={
                streak === null
                  ? 'Day 0. Your counter starts today.'
                  : `${daysText(streak)} since last Red`
              }
              style={{ gap: 4 }}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: theme.text,
                  fontSize: 40,
                  lineHeight: 44,
                  fontWeight: '700',
                  letterSpacing: -0.8,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {streak === null ? 'Day 0' : String(streak)}
              </Text>
              <Text
                style={{ color: theme.muted, fontSize: 14, lineHeight: 19, fontWeight: '500' }}
              >
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
                  alignSelf: 'flex-start',
                  marginTop: 6,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  // A tag, not a full pill: in the narrow tile the text can wrap to two lines.
                  borderRadius: 8,
                  backgroundColor: theme.surface2,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                  Best · {daysText(best)}
                </Text>
              </View>
            ) : null}
          </View>
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
          <Button title={`Call ${partnerName}`} icon={Phone} onPress={() => router.push('/call')} />
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

      {/* Yesterday's color: the daily log */}
      <Card>
        <View style={{ gap: 2 }}>
          <Text accessibilityRole="header" style={cardTitle}>
            Yesterday’s color
          </Text>
          <Text style={cardBody}>
            {installDay
              ? 'Tomorrow, log today’s color here.'
              : yesterdayColor === null
                ? 'Not logged yet · pick your lowest color'
                : 'Your lowest color yesterday'}
          </Text>
        </View>
        {installDay ? null : yesterdayColor === null ? (
          <Button title="Log yesterday’s color" variant="secondary" onPress={logYesterday} />
        ) : (
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}
          >
            <View
              accessible
              accessibilityLabel={`Yesterday: ${COLOR_NAMES[yesterdayColor]}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                paddingVertical: 6,
                paddingLeft: 8,
                paddingRight: 14,
                borderRadius: 999,
                backgroundColor: theme.levels[yesterdayColor].soft,
              }}
            >
              <ColorGlyph level={yesterdayColor} size={28} />
              <Text
                style={{ color: theme.levels[yesterdayColor].ink, fontSize: 16, fontWeight: '700' }}
              >
                {COLOR_NAMES[yesterdayColor]}
              </Text>
            </View>
            <View style={{ flexGrow: 1 }} />
            <Button
              title="Update"
              variant="outline"
              accessibilityLabel="Update yesterday’s color"
              onPress={logYesterday}
            />
          </View>
        )}
        {!installDay && yesterdayColor === RED ? (
          <Text style={cardBody}>Your counter restarted. God’s grace doesn’t reset.</Text>
        ) : null}
      </Card>

      {/* An earlier missed day (within the last week) */}
      {earlierUnlogged !== null ? (
        <Card>
          <View style={{ gap: 2 }}>
            <Text accessibilityRole="header" style={cardTitle}>
              {relativeDay(earlierUnlogged, today)} isn’t logged
            </Text>
            <Text style={cardBody}>
              {formatLong(earlierUnlogged)} has no color yet. You can still make it up.
            </Text>
          </View>
          <Button
            title="Log it"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/check-in', params: { date: earlierUnlogged } })
            }
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
