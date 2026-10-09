import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { spacing } from '@/theme';
import { Sheet } from '../Sheet';
import { clampTs, combineDayAndTime, formatFieldValue, isMonthSelectable, relativeDays, relativeToNow, shiftMonth } from './calendar';
import { MonthGrid } from './MonthGrid';
import { TimeEditor } from './TimeEditor';

export interface DateTimeSheetProps {
  title: string;
  value: number;
  mode: 'datetime' | 'date';
  min?: number;
  max?: number;
  onCancel: () => void;
  onDone: (value: number) => void;
}

/** Calendar + time picker in a bottom sheet. Edits a draft; "Done" commits it. */
export function DateTimeSheet({ title, value, mode, min, max, onCancel, onDone }: DateTimeSheetProps) {
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn);
  const haptic = useHaptics();
  const [now] = useState(() => Date.now());
  const [draft, setDraft] = useState(() => clampTs(value, min, max));
  const [view, setView] = useState(() => {
    const d = new Date(clampTs(value, min, max));
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const prev = shiftMonth(view.year, view.month, -1);
  const next = shiftMonth(view.year, view.month, 1);
  const today = new Date(now);
  const viewingToday = view.year === today.getFullYear() && view.month === today.getMonth();
  const todaySelectable = isMonthSelectable(today.getFullYear(), today.getMonth(), min, max);

  const selectDay = (dayTs: number) => {
    haptic('selection');
    setDraft(clampTs(combineDayAndTime(dayTs, draft), min, max));
  };

  // Stepping the time can cross midnight into another month: keep it in view.
  const changeTime = (ts: number) => {
    setDraft(ts);
    const d = new Date(ts);
    if (d.getFullYear() !== view.year || d.getMonth() !== view.month) setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Sheet
      title={title}
      subtitle={`${formatFieldValue(draft, now, mode)} · ${mode === 'date' ? relativeDays(draft, now) : relativeToNow(draft, now)}`}
      onClose={onCancel}
      testID="datetime-sheet"
      footer={<Button label="Done" size="lg" onPress={() => onDone(clampTs(draft, min, max))} />}
    >
      <MonthGrid
        year={view.year}
        month={view.month}
        weekStartsOn={weekStartsOn}
        selected={draft}
        today={now}
        min={min}
        max={max}
        canPrev={isMonthSelectable(prev.year, prev.month, min, max)}
        canNext={isMonthSelectable(next.year, next.month, min, max)}
        onPrev={() => setView(prev)}
        onNext={() => setView(next)}
        onSelectDay={selectDay}
      />
      {!viewingToday && todaySelectable ? (
        <View style={styles.todayRow}>
          <Chip
            label="Jump to today"
            icon="calendar-today"
            size="md"
            onPress={() => setView({ year: today.getFullYear(), month: today.getMonth() })}
            style={styles.todayChip}
          />
        </View>
      ) : null}
      {mode === 'datetime' ? <TimeEditor value={draft} onChange={changeTime} min={min} max={max} /> : null}
      {max != null && draft >= max - 60_000 && mode === 'datetime' ? (
        <Text variant="caption" tone="tertiary" center style={styles.note}>
          Latest possible time — it can’t be in the future.
        </Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  todayRow: { alignItems: 'center', marginTop: spacing.xs },
  // Chip pins itself to the start (alignSelf: flex-start); center it in the row.
  todayChip: { alignSelf: 'center' },
  note: { marginTop: spacing.sm },
});
