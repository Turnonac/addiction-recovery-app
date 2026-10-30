import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { inCallWindow, needsLaterShare } from '@/domain/call';
import { decideSetColor } from '@/domain/checkin';
import { formatLong, formatShort, isValidLocalDate } from '@/domain/dates';
import { bestStreak, currentStreak, streaksIfRed } from '@/domain/streak';
import {
  COLOR_LEVELS,
  COLOR_NAMES,
  RED,
  type ColorLevel,
  type DayLog,
  type LocalDate,
  type SetColorOutcome,
} from '@/domain/types';
import { useAppStore } from '@/state/store';
import {
  BackButton,
  Button,
  ColorGlyph,
  ColorOptionCard,
  ColorOptionGroup,
  MODAL_EDGES,
  Screen,
  ScreenHeader,
} from '@/ui/components';
import { useAppTheme } from '@/ui/theme';

/** Check-in modal: `/check-in?date=YYYY-MM-DD` (default today). Future dates are locked. */
export default function CheckInScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ date?: string | string[]; from?: string | string[] }>();
  const today = useAppStore((s) => s.today);
  // "Today" as of opening: an open check-in keeps its day when midnight passes.
  const [openedOn] = useState(() => useAppStore.getState().today);
  const raw = Array.isArray(params.date) ? params.date[0] : params.date;
  const date = raw && raw.length > 0 ? raw : openedOn;
  const valid = isValidLocalDate(date) && date <= today;
  // Opened from the call screen ("Log it"): return there instead of opening a second one.
  const fromCall = (Array.isArray(params.from) ? params.from[0] : params.from) === 'call';

  // Invalid or future dates cannot be logged: leave right away (once).
  const left = useRef(false);
  useEffect(() => {
    if (valid || left.current) return;
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [valid, router]);

  if (!valid) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  // Keyed by date: if this screen is reused for another day (e.g. a reminder tap
  // while it is open), the selection starts over instead of carrying across days.
  return <CheckInForm key={date} date={date} fromCall={fromCall} />;
}

function CheckInForm({ date, fromCall }: { date: LocalDate; fromCall: boolean }) {
  const router = useRouter();
  const theme = useAppTheme();
  const today = useAppStore((s) => s.today);
  const isToday = date === today;

  const days = useAppStore((s) => s.days);
  const stored = days[date]?.color ?? null;
  const behaviors = useAppStore((s) => s.behaviors);
  const settings = useAppStore((s) => s.settings);
  const partner = settings.partner;
  const setColor = useAppStore((s) => s.setColor);

  const [selected, setSelected] = useState<ColorLevel | null>(stored);
  const [saving, setSaving] = useState(false);

  const partnerName = partner?.name.trim() || 'your partner';

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const goToCall = () => {
    if (fromCall) close();
    else router.replace('/call');
  };

  const dayWord = isToday ? 'today' : 'that day';

  function handleOutcome(outcome: SetColorOutcome) {
    switch (outcome.kind) {
      case 'rejectedFuture':
        close();
        return;
      case 'needsConfirmBetter': {
        const current = COLOR_NAMES[outcome.current];
        const requested = COLOR_NAMES[outcome.requested];
        const subject = isToday ? 'Today' : 'That day';
        setSaving(false);
        Alert.alert(
          `${subject} is already ${current}`,
          `Your day's color is the lowest moment, so a better moment later doesn't change it. Did you pick ${current} by mistake?`,
          [
            { text: `Keep ${current}`, style: 'cancel', onPress: close },
            {
              text: `Yes, change to ${requested}`,
              onPress: () => void save(outcome.requested, true),
            },
          ],
        );
        return;
      }
      case 'saved': {
        const state = useAppStore.getState();
        const list = Object.values(state.days);
        // A new Red the next call covers goes straight to it.
        if (outcome.becameRed && inCallWindow(list, state.settings, state.today, date)) {
          if (partner !== null) goToCall();
          else close();
          return;
        }
        // A late color the store saved for the next call (one call per day).
        if (partner === null || !needsLaterShare(outcome, list, state.settings, state.today, date)) {
          close();
          return;
        }
        const which = isToday ? 'today' : formatShort(date);
        setSaving(false);
        if (state.days[state.today]?.checkedIn) {
          Alert.alert(
            "You'll share this on your next call",
            `You already talked with ${partnerName} today, so ${which} goes on your next call.`,
            [{ text: 'OK', onPress: close }],
          );
          return;
        }
        Alert.alert(`Call ${partnerName} to share this?`, `Your next call will include ${which}.`, [
          { text: 'Later', style: 'cancel', onPress: close },
          { text: 'Call now', onPress: goToCall },
        ]);
        return;
      }
    }
  }

  async function save(color: ColorLevel, confirmBetter = false) {
    if (saving && !confirmBetter) return;
    setSaving(true);
    try {
      const outcome = await setColor(date, color, { confirmBetter });
      handleOutcome(outcome);
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save", 'Please try again.');
    }
  }

  // Straight to the call only when that call will cover this day (see handleOutcome).
  const willCall =
    selected === RED &&
    stored !== RED &&
    partner !== null &&
    inCallWindow(daysAfter(days, date, RED, today), settings, today, date);
  const saveLabel =
    selected === null ? 'Pick a color to save' : willCall ? `Save, then call ${partnerName}` : 'Save check-in';

  const footer = (
    <>
      {selected === RED ? <GraceNote date={date} /> : null}
      <Button
        title={saveLabel}
        size="lg"
        onPress={() => {
          if (selected !== null) void save(selected);
        }}
        disabled={selected === null || saving}
      />
    </>
  );

  return (
    <Screen edges={MODAL_EDGES} footer={footer}>
      <BackButton
        label={isToday ? 'Today' : 'Back'}
        onPress={close}
        accessibilityLabel={isToday ? 'Back to Today' : 'Go back'}
      />
      <ScreenHeader
        size="md"
        eyebrow={formatLong(date)}
        title={`What was your lowest color ${dayWord}?`}
        subtitle="Pick the lowest moment, even if the rest went well."
      />
      {stored !== null ? (
        <View
          accessible
          accessibilityLabel={`Currently: ${COLOR_NAMES[stored]}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <ColorGlyph level={stored} size={20} />
          <Text style={{ color: theme.muted, fontSize: 14, fontWeight: '600' }}>
            Currently: {COLOR_NAMES[stored]}
          </Text>
        </View>
      ) : null}
      <ColorOptionGroup accessibilityLabel={`Lowest color ${dayWord}, best to lowest`}>
        {COLOR_LEVELS.map((level) => (
          <ColorOptionCard
            key={level}
            level={level}
            selected={selected === level}
            behaviors={behaviors.filter((b) => b.color === level).map((b) => b.text)}
            onPress={() => setSelected(level)}
            disabled={saving}
          />
        ))}
      </ColorOptionGroup>
    </Screen>
  );
}

/** The days as they would be after saving `color` for `date` without a confirmation. */
function daysAfter(
  days: Record<LocalDate, DayLog>,
  date: LocalDate,
  color: ColorLevel,
  today: LocalDate,
): DayLog[] {
  const outcome = decideSetColor(days[date], date, color, {}, today);
  return Object.values(outcome.kind === 'saved' ? { ...days, [date]: outcome.day } : days);
}

function daysText(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/**
 * Today: the counter restarts at 0. A past day: the counter and best streak it
 * would really leave (a later Red keeps the counter; a split run can lower best).
 */
function redNoteText(
  days: DayLog[],
  counterStartDate: LocalDate | null,
  date: LocalDate,
  today: LocalDate,
): string {
  if (date === today) return 'Your counter restarts at 0. Your history and best streak stay.';
  const after = streaksIfRed(days, counterStartDate, date, today);
  const counter =
    after.current === currentStreak(days, counterStartDate, today)
      ? `Your counter stays at ${daysText(after.current)}.`
      : `Your counter goes back to ${daysText(after.current)}.`;
  return after.best === bestStreak(days, counterStartDate, today)
    ? `${counter} Your history and best streak stay.`
    : `${counter} Your best streak becomes ${daysText(after.best)}. Your history stays.`;
}

const GRACE_NOTE_MAX_SCALE = 2;

function GraceNote({ date }: { date: LocalDate }) {
  const theme = useAppTheme();
  const red = theme.levels[RED];
  const today = useAppStore((s) => s.today);
  const days = useAppStore((s) => s.days);
  const counterStartDate = useAppStore((s) => s.settings.counterStartDate);
  const text = redNoteText(Object.values(days), counterStartDate, date, today);
  return (
    <View
      accessible
      style={{
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: theme.cardRadius,
        backgroundColor: red.soft,
      }}
    >
      {/* Capped so the note leaves room for the Save button at the largest text sizes. */}
      <Text
        maxFontSizeMultiplier={GRACE_NOTE_MAX_SCALE}
        style={{ color: red.ink, fontSize: 14, lineHeight: 20, fontWeight: '600' }}
      >
        {text}
      </Text>
      <Text maxFontSizeMultiplier={GRACE_NOTE_MAX_SCALE} style={{ color: red.ink, fontSize: 13, lineHeight: 18 }}>
        God&apos;s grace doesn&apos;t reset.
      </Text>
    </View>
  );
}
