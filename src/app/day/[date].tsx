import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { diffDays, formatLong, isValidLocalDate } from '@/domain/dates';
import { COLOR_MEANINGS, COLOR_NAMES, type LocalDate } from '@/domain/types';
import { clearDayText } from '@/features/colorLog/colorLog';
import { useAppStore } from '@/state/store';
import {
  Button,
  Card,
  ColorGlyph,
  MODAL_EDGES,
  Screen,
  ScreenHeader,
  ToggleRow,
} from '@/ui/components';
import { X } from '@/ui/icons';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';


/** 'Today', 'Yesterday', '5 days ago' (plus the year when it differs from today's). */
function relativeLabel(date: LocalDate, today: LocalDate): string {
  const ago = diffDays(date, today);
  if (ago === 0) return 'Today';
  if (ago === 1) return 'Yesterday';
  const year = date.slice(0, 4);
  return year === today.slice(0, 4) ? `${ago} days ago` : `${ago} days ago · ${year}`;
}

export default function DayScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const today = useAppStore((s) => s.today);
  const days = useAppStore((s) => s.days);
  const partner = useAppStore((s) => s.settings.partner);
  const installDate = useAppStore((s) => s.settings.installDate);
  const setCheckedIn = useAppStore((s) => s.setCheckedIn);
  const clearDay = useAppStore((s) => s.clearDay);
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/history');
  };

  const closeButton = (
    <Pressable
      onPress={close}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={4}
      style={({ pressed }) => ({
        alignSelf: 'flex-end',
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        marginRight: -10,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <X size={22} color={theme.text} />
    </Pressable>
  );

  if (date === undefined || !isValidLocalDate(date) || date > today) {
    const future = date !== undefined && isValidLocalDate(date) && date > today;
    return (
      <Screen edges={MODAL_EDGES}>
        {closeButton}
        <ScreenHeader
          size="md"
          title={future ? 'This day hasn’t happened yet' : 'Day not found'}
          subtitle={
            future
              ? 'Future days are locked. You can log a day once it starts.'
              : 'This link doesn’t point to a day in your history.'
          }
        />
        <Button title="Close" variant="secondary" onPress={close} />
      </Screen>
    );
  }

  const day = days[date];
  const color = day?.color ?? null;
  const checkedIn = day?.checkedIn ?? false;
  const partnerName = partner?.name.trim() || 'your partner';
  const longDate = formatLong(date);

  const onToggle = async (value: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      await setCheckedIn(date, value);
    } catch (error) {
      console.warn('Light2Life: could not save the check-in', error);
      Alert.alert('Couldn’t save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await clearDay(date);
    } catch (error) {
      console.warn('Light2Life: could not clear the day', error);
      Alert.alert('Couldn’t clear the day', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear this day?',
      clearDayText(Object.values(days), installDate, date, today, partnerName),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear day', style: 'destructive', onPress: () => void onClear() },
      ],
    );
  };

  return (
    <Screen edges={MODAL_EDGES}>
      {closeButton}
      <ScreenHeader size="md" eyebrow={relativeLabel(date, today)} title={longDate} />

      <Card>
        <View
          accessible
          accessibilityLabel={
            color === null ? 'Lowest color: not logged' : `Lowest color: ${COLOR_NAMES[color]}`
          }
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          <ColorGlyph level={color} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              {color === null ? 'Not logged' : COLOR_NAMES[color]}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
              {color === null ? 'No color for this day yet' : COLOR_MEANINGS[color]}
            </Text>
          </View>
        </View>
        <Button
          title={color === null ? 'Log it' : 'Change'}
          variant={color === null ? 'primary' : 'outline'}
          accessibilityLabel={
            color === null ? `Log a color for ${longDate}` : `Change the color for ${longDate}`
          }
          onPress={() => router.push({ pathname: '/check-in', params: { date } })}
        />
      </Card>

      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: theme.radius,
          overflow: 'hidden',
        }}
      >
        <ToggleRow
          label={`Checked in with ${partnerName}`}
          description={
            checkedIn ? 'You talked this day.' : 'Turn on if you talked this day.'
          }
          value={checkedIn}
          onValueChange={(value) => {
            void onToggle(value);
          }}
        />
      </View>

      {day !== undefined ? (
        <Button
          title="Clear this day"
          variant="danger"
          accessibilityLabel={`Clear ${longDate}`}
          accessibilityHint="Removes its color and check-in"
          disabled={saving}
          onPress={confirmClear}
        />
      ) : null}
    </Screen>
  );
}
