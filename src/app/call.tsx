import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, Pressable, Text, View } from 'react-native';

import { callWindow } from '@/domain/call';
import { addDays, formatLong, formatShort } from '@/domain/dates';
import { monthSummary } from '@/domain/history';
import { COLOR_NAMES, type ColorLevel, type LocalDate } from '@/domain/types';
import { callPhone } from '@/services/dialer';
import { useAppStore } from '@/state/store';
import {
  BackButton,
  Button,
  Card,
  ColorGlyph,
  MODAL_EDGES,
  Screen,
  ScreenHeader,
} from '@/ui/components';
import { Check, Phone, Plus } from '@/ui/icons';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';

/** Window rows shown before "Show all" when the gap since the last call is long. */
const COLLAPSED_ROWS = 7;
const COLLAPSE_OVER = 10;

/** Partner call modal: what to share, the script, dial, and mark today as checked in. */
export default function CallScreen() {
  const router = useRouter();
  const partner = useAppStore((s) => s.settings.partner);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  // Close this modal first: navigating from it would push a second copy of the tabs above it.
  const editPartner = () => {
    close();
    router.navigate('/settings/partner', { withAnchor: true });
  };

  if (partner === null) {
    return (
      <Screen edges={MODAL_EDGES}>
        <BackButton label="Today" onPress={close} accessibilityLabel="Back to Today" />
        <ScreenHeader
          size="md"
          title="Add your partner first"
          subtitle="Each day you call one person you trust, share your lowest color, and they pray for you."
        />
        <Button title="Add your partner" onPress={editPartner} />
      </Screen>
    );
  }

  return (
    <CallWithPartner
      name={partner.name.trim() || 'your partner'}
      phone={partner.phone}
      close={close}
      editPartner={editPartner}
    />
  );
}

function CallWithPartner({
  name,
  phone,
  close,
  editPartner,
}: {
  name: string;
  phone: string;
  close: () => void;
  editPartner: () => void;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const today = useAppStore((s) => s.today);
  const days = useAppStore((s) => s.days);
  const installDate = useAppStore((s) => s.settings.installDate);
  const setCheckedIn = useAppStore((s) => s.setCheckedIn);

  const [showAll, setShowAll] = useState(false);
  const [dialing, setDialing] = useState(false);

  // Set when the dialer opens; when the app comes back from the call we ask whether they talked.
  const awaitingReturn = useRef(false);
  const leftApp = useRef(false);
  // The day the call started. A call that runs past midnight counts for that day,
  // so the new day keeps its own window (and its color is shared on its own call).
  const callDay = useRef<LocalDate | null>(null);

  const dayList = Object.values(days);
  const info = callWindow(dayList, { installDate }, today);
  const checkedInToday = days[today]?.checkedIn ?? false;
  const [year, month] = today.split('-').map(Number);
  const summary = monthSummary(dayList, year, month, today, installDate);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!awaitingReturn.current) return;
      // Only 'background' means they left for the call. iOS goes 'inactive' while its
      // "Call …?" confirmation is up; Android never reports 'inactive'.
      if (state === 'background') {
        leftApp.current = true;
        return;
      }
      // Active again without leaving: the confirmation was cancelled, so there is nothing to ask.
      if (state === 'active' && !leftApp.current) {
        awaitingReturn.current = false;
        callDay.current = null;
        return;
      }
      if (state === 'active' && leftApp.current) {
        awaitingReturn.current = false;
        leftApp.current = false;
        useAppStore.getState().refreshToday();
        const now = useAppStore.getState().today;
        const day = callDay.current ?? now;
        callDay.current = null;
        if (useAppStore.getState().days[day]?.checkedIn) return;
        const sameDay = day === now;
        Alert.alert(
          `Did you talk with ${name}?`,
          sameDay ? undefined : `The call started on ${formatLong(day)}, so it counts for that day.`,
          [
            { text: 'Not yet', style: 'cancel' },
            {
              text: 'Yes, we talked',
              onPress: () => {
                void useAppStore
                  .getState()
                  .setCheckedIn(day, true)
                  .then(() =>
                    AccessibilityInfo.announceForAccessibility(
                      sameDay
                        ? `Checked in with ${name} today`
                        : `Checked in with ${name} for ${formatLong(day)}`,
                    ),
                  )
                  .catch(() => Alert.alert("Couldn't save", 'Please try again.'));
              },
            },
          ],
        );
      }
    });
    return () => sub.remove();
  }, [name]);

  async function dial() {
    if (dialing) return;
    setDialing(true);
    try {
      // The day on screen when the call starts (the window the user is about to share).
      callDay.current = useAppStore.getState().today;
      // Set before opening: iOS may change app state for its confirmation before or after
      // the open resolves. Cleared again if the dialer didn't open.
      awaitingReturn.current = true;
      leftApp.current = false;
      const ok = await callPhone(phone);
      if (ok) return;
      awaitingReturn.current = false;
      callDay.current = null;
      if (phone.trim().length === 0) {
        Alert.alert(`No number for ${name}`, `Add ${name}'s phone number to call from here.`, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Add number', onPress: editPartner },
        ]);
      } else {
        Alert.alert(
          "Couldn't start the call",
          `This phone couldn't open the dialer. You can call ${name} at ${phone}.`,
        );
      }
    } finally {
      setDialing(false);
    }
  }

  function toggleToday() {
    setCheckedIn(today, !checkedInToday).catch(() =>
      Alert.alert("Couldn't save", 'Please try again.'),
    );
  }

  const footer = (
    <>
      <Button title={`Call ${name}`} icon={Phone} size="lg" onPress={() => void dial()} disabled={dialing} />
      <Button
        title={checkedInToday ? `Checked in with ${name} today` : `I talked with ${name} — mark today`}
        variant="outline"
        icon={checkedInToday ? Check : Plus}
        selected={checkedInToday}
        onPress={toggleToday}
        accessibilityHint={checkedInToday ? 'Unmarks today' : 'Marks today as checked in'}
      />
      {summary.eligibleDays > 0 ? (
        <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
          Checked in with {name} {summary.checkIns} of {summary.eligibleDays}{' '}
          {summary.eligibleDays === 1 ? 'day' : 'days'} this month
        </Text>
      ) : null}
    </>
  );

  const rows = info.days;
  const collapsed = !showAll && rows.length > COLLAPSE_OVER;
  const visibleRows = collapsed ? rows.slice(-COLLAPSED_ROWS) : rows;
  const firstCall = info.lastCallDate === null;
  const lowest = info.lowest;
  const hasUnlogged = info.unloggedDates.length > 0;

  return (
    <Screen edges={MODAL_EDGES} footer={footer} gap={16}>
      <BackButton label="Today" onPress={close} accessibilityLabel="Back to Today" />
      <ScreenHeader
        size="md"
        title={`Call with ${name}`}
        subtitle={`Share your lowest color since your last call. Then ${name} prays for you.`}
      />

      {info.checkedInToday ? (
        <Card gap={8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Check size={22} color={theme.accentText} strokeWidth={2.6} />
            <Text style={{ flex: 1, color: theme.text, fontSize: 16, fontWeight: '700' }}>
              You already talked with {name} today.
            </Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
            Tomorrow you&apos;ll share your lowest color since today&apos;s call.
          </Text>
        </Card>
      ) : (
        <Card gap={12}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
              {firstCall ? 'Since you started' : 'Since your last call'}
            </Text>
            {info.lastCallDate !== null ? (
              <Text
                style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}
                accessibilityLabel={`Last call ${formatShort(info.lastCallDate)}`}
              >
                {formatShort(info.lastCallDate)}
              </Text>
            ) : null}
          </View>

          {collapsed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAll(true)}
              style={({ pressed }) => ({
                minHeight: MIN_TOUCH,
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: theme.accentText, fontSize: 15, fontWeight: '700' }}>
                Show all {rows.length} days
              </Text>
            </Pressable>
          ) : null}

          {visibleRows.map((row) => (
            <WindowRow
              key={row.date}
              date={row.date}
              color={row.color}
              today={today}
              onLog={() =>
                router.push({ pathname: '/check-in', params: { date: row.date, from: 'call' } })
              }
            />
          ))}

          <LowestBox lowest={lowest} label={lowestLabel(firstCall, hasUnlogged)} />
        </Card>
      )}

      {!info.checkedInToday ? (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
            On the call
          </Text>
          <Step number={1} text={shareLine(firstCall, lowest)} />
          <Step number={2} text={`${name} prays for you.`} />
        </View>
      ) : null}
    </Screen>
  );
}

function lowestLabel(firstCall: boolean, hasUnlogged: boolean): string {
  if (hasUnlogged) return 'Lowest logged color';
  return firstCall ? 'Lowest since you started' : 'Lowest since last call';
}

function shareLine(firstCall: boolean, lowest: ColorLevel | null): string {
  if (lowest === null) {
    return firstCall
      ? 'Share how you’ve been doing, then log today’s color.'
      : 'Share how you’ve been doing since your last call.';
  }
  const color = COLOR_NAMES[lowest];
  return firstCall
    ? `Share: “Since I started, my lowest was ${color}.”`
    : `Share: “Since our last call, my lowest was ${color}.”`;
}

function dayLabel(date: LocalDate, today: LocalDate): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return formatShort(date);
}

function WindowRow({
  date,
  color,
  today,
  onLog,
}: {
  date: LocalDate;
  color: ColorLevel | null;
  today: LocalDate;
  onLog: () => void;
}) {
  const theme = useAppTheme();
  const label = dayLabel(date, today);
  if (color !== null) {
    return (
      <View
        accessible
        accessibilityLabel={`${label}: ${COLOR_NAMES[color]}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}
      >
        <ColorGlyph level={color} size={30} />
        <Text style={{ flex: 1, color: theme.text, fontSize: 15 }}>{label}</Text>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{COLOR_NAMES[color]}</Text>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}>
      <ColorGlyph level={null} size={30} />
      <View style={{ flex: 1 }} accessible accessibilityLabel={`${label}: not logged`}>
        <Text style={{ color: theme.text, fontSize: 15 }}>{label}</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Not logged</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={date === today ? 'Log today’s color' : `Log the color for ${formatShort(date)}`}
        onPress={onLog}
        hitSlop={4}
        style={({ pressed }) => ({
          minHeight: MIN_TOUCH,
          paddingHorizontal: 10,
          marginRight: -10,
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: theme.accentText, fontSize: 15, fontWeight: '700' }}>Log it</Text>
      </Pressable>
    </View>
  );
}

function LowestBox({ lowest, label }: { lowest: ColorLevel | null; label: string }) {
  const theme = useAppTheme();
  if (lowest === null) {
    return (
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: theme.surface2,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
          No colors logged yet. Tap “Log it” to add one before you call.
        </Text>
      </View>
    );
  }
  const colors = theme.levels[lowest];
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${COLOR_NAMES[lowest]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: colors.soft,
      }}
    >
      <Text style={{ flexShrink: 1, color: colors.ink, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ColorGlyph level={lowest} size={22} />
        <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>{COLOR_NAMES[lowest]}</Text>
      </View>
    </View>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  const theme = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Step ${number}. ${text}`}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.accentSoft,
        }}
      >
        <Text maxFontSizeMultiplier={1.3} style={{ color: theme.accentText, fontSize: 13, fontWeight: '800' }}>
          {number}
        </Text>
      </View>
      <Text style={{ flex: 1, color: theme.text, fontSize: 15, lineHeight: 22 }}>{text}</Text>
    </View>
  );
}
