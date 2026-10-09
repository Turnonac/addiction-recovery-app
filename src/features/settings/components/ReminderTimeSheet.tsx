import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, IconButton, Text } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius, spacing } from '@/theme';
import type { ReminderTime } from '@/types';
import { pad2 } from '@/utils/format';
import { formatReminderTime, MINUTE_STEP, partOfDay, REMINDER_PRESETS, sameTime, stepHour, stepMinute } from '../logic/reminderTime';
import { SettingsSheet } from './SettingsSheet';

export interface ReminderTimeSheetProps {
  value: ReminderTime;
  onClose: () => void;
  onSave: (time: ReminderTime) => void;
}

/** Hour/minute steppers with quick presets. */
export function ReminderTimeSheet({ value, onClose, onSave }: ReminderTimeSheetProps) {
  const [draft, setDraft] = useState<ReminderTime>(value);
  const haptic = useHaptics();

  const set = (next: ReminderTime) => {
    haptic('selection');
    setDraft(next);
  };

  return (
    <SettingsSheet
      title="Reminder time"
      subtitle="When should Quit check in with you each day?"
      onClose={onClose}
      testID="time-sheet"
      footer={<Button label={`Remind me at ${formatReminderTime(draft)}`} onPress={() => onSave(draft)} testID="time-save" />}
    >
      <View style={styles.picker}>
        <Column
          label="hours"
          value={pad2(draft.hour)}
          onUp={() => set({ ...draft, hour: stepHour(draft.hour, 1) })}
          onDown={() => set({ ...draft, hour: stepHour(draft.hour, -1) })}
        />
        <Text variant="display" tone="tertiary" style={styles.colon}>
          :
        </Text>
        <Column
          label="min"
          value={pad2(draft.minute)}
          onUp={() => set({ ...draft, minute: stepMinute(draft.minute, 1) })}
          onDown={() => set({ ...draft, minute: stepMinute(draft.minute, -1) })}
        />
      </View>
      <Text variant="overline" tone="tertiary" center style={styles.partOfDay}>
        {partOfDay(draft.hour)} · steps of {MINUTE_STEP} min
      </Text>
      <View style={styles.presets}>
        {REMINDER_PRESETS.map((p) => (
          <Chip
            key={formatReminderTime(p)}
            label={formatReminderTime(p)}
            size="md"
            selected={sameTime(p, draft)}
            onPress={() => set(p)}
            accessibilityLabel={`Set to ${formatReminderTime(p)}`}
          />
        ))}
      </View>
    </SettingsSheet>
  );
}

function Column({ label, value, onUp, onDown }: { label: string; value: string; onUp: () => void; onDown: () => void }) {
  return (
    <View style={styles.column}>
      <IconButton icon="chevron-up" onPress={onUp} accessibilityLabel={`Increase ${label}`} testID={`time-${label}-up`} />
      <View style={styles.box} accessibilityLabel={`${value} ${label}`}>
        <Text variant="display" mono tabular center>
          {value}
        </Text>
        <Text variant="micro" tone="tertiary" center>
          {label}
        </Text>
      </View>
      <IconButton icon="chevron-down" onPress={onDown} accessibilityLabel={`Decrease ${label}`} testID={`time-${label}-down`} />
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.xs },
  column: { alignItems: 'center', gap: spacing.sm },
  box: {
    width: 104,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    gap: 2,
  },
  colon: { marginBottom: 6 },
  partOfDay: { marginTop: spacing.lg },
  presets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
});
