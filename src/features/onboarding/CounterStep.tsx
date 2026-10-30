import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { addDays, diffDays } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';
import type { StepNavProps } from '@/features/onboarding/IntroSteps';
import {
  formatDateWithYear,
  localDateToDate,
  pickedLocalDate,
  PickerSheet,
  presentPicker,
  type PickerRequest,
} from '@/features/onboarding/pickers';
import { StepScreen } from '@/features/onboarding/StepLayout';
import { useAppStore } from '@/state/store';
import { Button } from '@/ui/components';
import { useAppTheme } from '@/ui/theme';

type Choice = 'today' | 'past';

/** How far back "My last Red day was…" can go. */
const MAX_YEARS_BACK = 20;

/** Step 3: where the clean-day counter starts. Saves counterStartDate on Continue. */
export function CounterStep({ onNext, onBack }: StepNavProps) {
  const theme = useAppTheme();
  const today = useAppStore((s) => s.today);
  const savedStart = useAppStore((s) => s.settings.counterStartDate);
  const setCounterStartDate = useAppStore((s) => s.setCounterStartDate);

  const yesterday = addDays(today, -1);
  const [choice, setChoice] = useState<Choice>(
    savedStart !== null && savedStart < today ? 'past' : 'today',
  );
  const [pastDate, setPastDate] = useState<LocalDate | null>(
    savedStart !== null && savedStart < today ? savedStart : null,
  );
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [saving, setSaving] = useState(false);

  const start = choice === 'today' ? today : pastDate;
  const preview = start === null ? null : Math.max(0, diffDays(start, today));
  const previewLabel =
    preview === null ? null : `Your counter will show: ${preview} ${preview === 1 ? 'day' : 'days'}`;

  // The preview's accessibilityLiveRegion only reaches TalkBack; VoiceOver needs an
  // announcement when it changes (iOS only, so TalkBack does not read it twice). Not on
  // mount, where it would cut off the step title. High priority (iOS 17+) so the picker
  // closing and the focus move below can't cut it off.
  const shownLabel = useRef(previewLabel);
  useEffect(() => {
    if (previewLabel === shownLabel.current) return;
    shownLabel.current = previewLabel;
    if (previewLabel !== null && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibilityWithOptions(previewLabel, { priority: 'high' });
    }
  }, [previewLabel]);

  function openPicker() {
    presentPicker(
      {
        mode: 'date',
        title: 'Last Red day',
        value: localDateToDate(pastDate ?? yesterday),
        maximumDate: localDateToDate(yesterday),
        minimumDate: localDateToDate(addDays(today, -365 * MAX_YEARS_BACK)),
        onPick: (date) => {
          const picked = pickedLocalDate(date);
          setPastDate(picked > yesterday ? yesterday : picked);
          setChoice('past');
        },
      },
      setPicker,
    );
  }

  function choosePast() {
    setChoice('past');
    if (pastDate === null) openPicker();
  }

  async function next() {
    if (start === null || saving) return;
    setSaving(true);
    try {
      await setCounterStartDate(start);
      onNext();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save", 'Please try again.');
    }
  }

  return (
    <StepScreen
      step={3}
      onBack={onBack}
      title="When should your counter start?"
      subtitle="Your counter shows the days since your last Red."
      footer={
        <Button
          title={start === null ? 'Pick your last Red day' : 'Continue'}
          size="lg"
          onPress={() => void next()}
          disabled={start === null || saving}
        />
      }
    >
      <View accessibilityRole="radiogroup" accessibilityLabel="Counter start" style={{ gap: 10 }}>
        <RadioCard
          title="Start counting today"
          subtitle="Your counter starts at 0 today."
          selected={choice === 'today'}
          onPress={() => setChoice('today')}
        />
        <RadioCard
          title="My last Red day was…"
          subtitle={pastDate !== null ? formatDateWithYear(pastDate) : 'Pick the date'}
          selected={choice === 'past'}
          onPress={choosePast}
        />
      </View>

      {choice === 'past' ? (
        <Button
          title={pastDate === null ? 'Pick the date' : 'Change date'}
          variant="outline"
          onPress={openPicker}
          accessibilityLabel={
            pastDate === null ? 'Pick your last Red day' : `Change date, currently ${formatDateWithYear(pastDate)}`
          }
        />
      ) : null}

      {previewLabel !== null ? (
        <View
          accessible
          accessibilityLabel={previewLabel}
          accessibilityLiveRegion="polite"
          style={{
            alignItems: 'center',
            gap: 2,
            paddingVertical: 18,
            paddingHorizontal: 16,
            backgroundColor: theme.accentSoft,
            borderRadius: theme.radius,
          }}
        >
          <Text style={{ color: theme.accentText, fontSize: 14, fontWeight: '600' }}>
            Your counter will show:
          </Text>
          <Text style={{ color: theme.accentText, fontSize: 34, fontWeight: '800', letterSpacing: -0.7 }}>
            {preview} {preview === 1 ? 'day' : 'days'}
          </Text>
        </View>
      ) : null}

      <PickerSheet request={picker} onClose={() => setPicker(null)} />
    </StepScreen>
  );
}

function RadioCard({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title} ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: selected ? theme.accentSoft : theme.surface,
        borderWidth: 2,
        borderColor: selected ? theme.accent : theme.line,
        borderRadius: theme.cardRadius,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: selected ? theme.accentText : theme.muted, fontSize: 14 }}>{subtitle}</Text>
      </View>
      <Svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Circle
          cx={12}
          cy={12}
          r={10}
          fill={selected ? theme.accent : 'none'}
          stroke={selected ? theme.accent : theme.muted}
          strokeWidth={2}
        />
        {selected ? (
          <Path
            d="M7.5 12.5l3 3 6-6.5"
            fill="none"
            stroke={theme.onAccent}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </Pressable>
  );
}
