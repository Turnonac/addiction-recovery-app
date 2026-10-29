import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { formatLong, isValidLocalDate } from '@/domain/dates';
import {
  COLOR_LEVELS,
  COLOR_NAMES,
  RED,
  type ColorLevel,
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

  const stored = useAppStore((s) => s.days[date]?.color ?? null);
  const behaviors = useAppStore((s) => s.behaviors);
  const partner = useAppStore((s) => s.settings.partner);
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
      case 'saved':
        if (outcome.becameRed) {
          if (partner !== null) goToCall();
          else close();
          return;
        }
        if (outcome.clearedCheckIn) {
          setSaving(false);
          Alert.alert(
            `You'd already talked with ${partnerName} ${dayWord}. Call again to share this?`,
            undefined,
            [
              { text: 'Later', style: 'cancel', onPress: close },
              { text: 'Call now', onPress: goToCall },
            ],
          );
          return;
        }
        close();
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

  const willCall = selected === RED && stored !== RED && partner !== null;
  const saveLabel =
    selected === null ? 'Pick a color to save' : willCall ? `Save, then call ${partnerName}` : 'Save check-in';

  const footer = (
    <>
      {selected === RED ? <GraceNote /> : null}
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

const GRACE_NOTE_MAX_SCALE = 2;

function GraceNote() {
  const theme = useAppTheme();
  const red = theme.levels[RED];
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
        Your counter restarts at 0. Your history and best streak stay.
      </Text>
      <Text maxFontSizeMultiplier={GRACE_NOTE_MAX_SCALE} style={{ color: red.ink, fontSize: 13, lineHeight: 18 }}>
        God&apos;s grace doesn&apos;t reset.
      </Text>
    </View>
  );
}
