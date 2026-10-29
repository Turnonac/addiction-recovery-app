/**
 * Date / time picking shared by Settings and onboarding.
 *
 * @react-native-community/datetimepicker 9.2.x (checked against its index.d.ts):
 * - Android: the README recommends the imperative `DateTimePickerAndroid.open()`
 *   (a system dialog), with `onValueChange(event, date)` / `onDismiss()`.
 * - iOS: the component renders inline, so we host it in a small themed sheet
 *   with Cancel / Done. `themeVariant` keeps it legible in dark mode.
 *
 * Usage in a screen:
 *   const [picker, setPicker] = useState<PickerRequest | null>(null);
 *   presentPicker({ mode: 'time', ... }, setPicker);
 *   <PickerSheet request={picker} onClose={() => setPicker(null)} />
 */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { getCalendars } from 'expo-localization';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatShort, isValidLocalDate, toLocalDate } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';

export interface PickerRequest {
  mode: 'time' | 'date';
  value: Date;
  /** Title of the iOS sheet (also its accessibility label), e.g. "Reminder time". */
  title: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onPick: (date: Date) => void;
}

function uses24HourClock(): boolean {
  try {
    return getCalendars()[0]?.uses24hourClock === true;
  } catch {
    return false;
  }
}

/** '9:00 PM', or '21:00' when the phone uses a 24-hour clock. */
export function formatTime(hour: number, minute: number): string {
  const mm = String(minute).padStart(2, '0');
  if (uses24HourClock()) return `${String(hour).padStart(2, '0')}:${mm}`;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${mm} ${suffix}`;
}

/** Today's date at hour:minute, local time (the picker's value). */
export function timeToDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Local noon of a 'YYYY-MM-DD' day (noon keeps DST shifts from moving the day). */
export function localDateToDate(date: LocalDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** 'Wed, Oct 28, 2026'. */
export function formatDateWithYear(date: LocalDate): string {
  if (!isValidLocalDate(date)) return date;
  return `${formatShort(date)}, ${Number(date.slice(0, 4))}`;
}

/** Picked Date → local calendar day. */
export function pickedLocalDate(date: Date): LocalDate {
  return toLocalDate(date);
}

/**
 * Opens the picker: the system dialog on Android, the sheet (via `showSheet`) on iOS.
 */
export function presentPicker(
  request: PickerRequest,
  showSheet: (request: PickerRequest) => void,
): void {
  if (Platform.OS === 'android') {
    DateTimePickerAndroid.open({
      mode: request.mode,
      value: request.value,
      minimumDate: request.minimumDate,
      maximumDate: request.maximumDate,
      onValueChange: (_event, date) => request.onPick(date),
      onDismiss: () => undefined,
      onError: () => undefined,
    });
    return;
  }
  showSheet(request);
}

export interface PickerSheetProps {
  request: PickerRequest | null;
  onClose: () => void;
}

/** iOS sheet hosting the inline picker. Renders nothing on Android. */
export function PickerSheet({ request, onClose }: PickerSheetProps) {
  if (Platform.OS === 'android') return null;
  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
    >
      {request !== null ? <PickerSheetBody request={request} onClose={onClose} /> : null}
    </Modal>
  );
}

function PickerSheetBody({ request, onClose }: { request: PickerRequest; onClose: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  // Mounted fresh for every request, so the draft starts at the request's value.
  const [draft, setDraft] = useState(request.value);

  const done = () => {
    request.onPick(draft);
    onClose();
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
      />
      <View
        accessibilityViewIsModal
        style={{
          backgroundColor: theme.surface,
          borderTopLeftRadius: theme.radius,
          borderTopRightRadius: theme.radius,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.line,
          }}
        >
          <SheetTextButton label="Cancel" onPress={onClose} />
          <Text
            accessibilityRole="header"
            style={{ flexShrink: 1, color: theme.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}
          >
            {request.title}
          </Text>
          <SheetTextButton label="Done" onPress={done} strong />
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 }}>
          <DateTimePicker
            value={draft}
            mode={request.mode}
            display={request.mode === 'time' ? 'spinner' : 'inline'}
            minimumDate={request.minimumDate}
            maximumDate={request.maximumDate}
            themeVariant={theme.scheme}
            textColor={theme.text}
            accentColor={theme.accent}
            onValueChange={(_event, date) => setDraft(date)}
            accessibilityLabel={request.title}
          />
        </View>
      </View>
    </View>
  );
}

function SheetTextButton({
  label,
  onPress,
  strong = false,
}: {
  label: string;
  onPress: () => void;
  strong?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH,
        minWidth: 72,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: strong ? '700' : '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}
