import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { clampTs, combineDayAndTime, formatFieldValue, quickOptions, relativeDays, relativeToNow, type QuickOption } from '@/features/habit-form/dateTime/calendar';
import { DateTimeSheet } from '@/features/habit-form/dateTime/DateTimeSheet';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** Wall-clock read for event handlers (kept out of render on purpose). */
function readClock(): number {
  return Date.now();
}

export interface DateTimeFieldProps {
  label?: string;
  /** Epoch ms */
  value: number;
  onChange: (value: number) => void;
  /** Earliest selectable time (epoch ms). */
  minimumDate?: number;
  /** Latest selectable time (epoch ms). Defaults to now for past-only pickers. */
  maximumDate?: number;
  /** 'datetime' (default) or 'date' (time fixed at current value's time). */
  mode?: 'datetime' | 'date';
  hint?: string;
  testID?: string;
}

/**
 * Cross-platform date/time input: a pressable field ("Today, 14:43"), quick chips
 * (Now, Yesterday, 1 week ago, 1 month ago — only those within bounds) and a
 * bottom sheet with a month calendar and hour/minute steppers. Works on web.
 */
export function DateTimeField({ label, value, onChange, minimumDate, maximumDate, mode = 'datetime', hint, testID }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  // Remember which chip produced the current value (and the clock it used) so it
  // stays highlighted and the relative line agrees with it.
  const [picked, setPicked] = useState<{ key: QuickOption['key']; value: number; at: number } | null>(null);
  const ticking = useNow(30_000);
  // The ticking clock can lag up to 30s behind the one a chip just used; never show
  // "6d 23h ago" right after "1 week ago".
  const now = Math.max(ticking, picked?.at ?? 0);
  const haptic = useHaptics();
  const min = minimumDate;
  const max = maximumDate;

  const choose = (key: QuickOption['key']) => {
    const clock = readClock();
    const option = quickOptions(clock, min, max).find((o) => o.key === key);
    if (!option) return;
    const next = clampTs(mode === 'date' ? combineDayAndTime(option.value, value) : option.value, min, max);
    haptic('selection');
    setPicked({ key, value: next, at: clock });
    onChange(next);
  };

  const options = quickOptions(now, min, max);
  const display = formatFieldValue(value, now, mode);
  const relative = mode === 'date' ? relativeDays(value, now) : relativeToNow(value, now);
  const title = label ?? (mode === 'date' ? 'Pick a date' : 'Pick date & time');

  return (
    <View style={styles.wrap} testID={testID}>
      {label ? (
        <Text variant="captionStrong" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${display}`}
        accessibilityHint="Opens a calendar"
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <View style={styles.iconTile}>
          <Icon name={mode === 'date' ? 'calendar-month-outline' : 'calendar-clock'} size={20} color={colors.accent} />
        </View>
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {display}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {relative}
          </Text>
        </View>
        <Icon name="chevron-down" size={20} color={colors.textTertiary} />
      </Pressable>

      {options.length ? (
        <View style={styles.chips}>
          {options.map((o) => {
            const active = picked?.key === o.key && picked.value === value;
            return (
              <Pressable
                key={o.key}
                onPress={() => choose(o.key)}
                accessibilityRole="button"
                accessibilityLabel={`Set to ${o.label.toLowerCase()}`}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
              >
                <Text variant="captionStrong" color={active ? colors.text : colors.textSecondary} numberOfLines={1}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {hint ? (
        <Text variant="caption" tone="tertiary" style={styles.label}>
          {hint}
        </Text>
      ) : null}

      {open ? (
        <DateTimeSheet
          title={title}
          value={value}
          mode={mode}
          min={min}
          max={max}
          onCancel={() => setOpen(false)}
          onDone={(v) => {
            setOpen(false);
            setPicked(null);
            if (v !== value) {
              haptic('light');
              onChange(v);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { paddingHorizontal: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  pressed: { backgroundColor: colors.cardPressed },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.accent, 0.16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.accent, 0.35),
  },
  texts: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
});
