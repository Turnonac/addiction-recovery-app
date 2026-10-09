import { useState } from 'react';
import { StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { MINUTE } from '@/domain/time';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, fonts, radius, spacing } from '@/theme';
import { pad2 } from '@/utils/format';
import { clampTs, parseHour, parseMinute, setTime, stepHour, stepMinute } from './calendar';

export interface TimeEditorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/** Widest the sheet gets (see Sheet). */
const SHEET_MAX_WIDTH = 560;
/** Width the full-size row needs (two 152pt units + the colon); below it, use the compact sizes. */
const FULL_ROW_WIDTH = 330;

/** Hour and minute boxes with −/+ steppers (±1h, ±5m). The numbers can also be typed. */
export function TimeEditor({ value, onChange, min, max }: TimeEditorProps) {
  const haptic = useHaptics();
  const { width } = useWindowDimensions();
  // Small phones (320pt): smaller boxes and buttons so the row fits inside the sheet.
  const compact = Math.min(width, SHEET_MAX_WIDTH) - 2 * spacing.lg < FULL_ROW_WIDTH;
  const d = new Date(value);
  const hour = d.getHours();
  const minute = d.getMinutes();

  /** Clamp, commit if it changed, and return what was actually applied. */
  const apply = (next: number): number => {
    const clamped = clampTs(next, min, max);
    if (clamped !== value) {
      haptic('selection');
      onChange(clamped);
    }
    return clamped;
  };
  /** A step is offered only when it moves at least a minute in its own direction once clamped. */
  const can = (next: number, direction: 1 | -1) => (clampTs(next, min, max) - value) * direction >= MINUTE;

  return (
    <View style={styles.wrap}>
      <Text variant="overline" tone="tertiary" style={styles.label}>
        Time
      </Text>
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Unit
          label="hrs"
          value={hour}
          parse={parseHour}
          onDec={() => apply(stepHour(value, -1))}
          onInc={() => apply(stepHour(value, 1))}
          canDec={can(stepHour(value, -1), -1)}
          canInc={can(stepHour(value, 1), 1)}
          onTyped={(h) => new Date(apply(setTime(value, h, minute))).getHours()}
          a11y="Hour"
          compact={compact}
        />
        <Text variant="heading" tone="tertiary" style={styles.colon}>
          :
        </Text>
        <Unit
          label="min"
          value={minute}
          parse={parseMinute}
          onDec={() => apply(stepMinute(value, -1))}
          onInc={() => apply(stepMinute(value, 1))}
          canDec={can(stepMinute(value, -1), -1)}
          canInc={can(stepMinute(value, 1), 1)}
          onTyped={(m) => new Date(apply(setTime(value, hour, m))).getMinutes()}
          a11y="Minute"
          compact={compact}
        />
      </View>
    </View>
  );
}

interface UnitProps {
  label: string;
  value: number;
  parse: (text: string) => number | null;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
  /** Apply a typed number; returns the unit's value after clamping to the bounds. */
  onTyped: (n: number) => number;
  a11y: string;
  compact: boolean;
}

function Unit({ label, value, parse, onDec, onInc, canDec, canInc, onTyped, a11y, compact }: UnitProps) {
  const button = compact ? 32 : 36;
  // While focused the box shows what the user types; otherwise it mirrors `value`.
  // Valid input is applied on every keystroke, so "Done" never misses a typed value
  // (on native, tapping a button doesn't blur the input).
  const [text, setText] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const type = (raw: string) => {
    const t = raw.replace(/\D/g, '').slice(0, 2);
    const n = parse(t);
    const applied = n != null ? onTyped(n) : null;
    // A complete entry that got clamped (e.g. "23" when the latest allowed time is
    // 20:35) shows the value actually used. A single digit may still be a prefix.
    setText(applied != null && applied !== n && t.length === 2 ? pad2(applied) : t);
  };
  const commit = () => {
    setText(null);
    setFocused(false);
  };
  return (
    <View style={[styles.unit, compact && styles.unitCompact]}>
      <IconButton icon="minus" size={button} iconSize={18} onPress={onDec} disabled={!canDec} accessibilityLabel={`${a11y} earlier`} />
      <View style={[styles.box, compact && styles.boxCompact, focused && styles.boxFocused]}>
        <TextInput
          value={text ?? pad2(value)}
          onChangeText={type}
          onFocus={() => {
            setText(pad2(value));
            setFocused(true);
          }}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={2}
          style={[styles.input, compact && styles.inputCompact]}
          selectionColor={colors.accent}
          accessibilityLabel={a11y}
        />
        <Text variant="micro" tone="tertiary" mono>
          {label}
        </Text>
      </View>
      <IconButton icon="plus" size={button} iconSize={18} onPress={onInc} disabled={!canInc} accessibilityLabel={`${a11y} later`} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, gap: spacing.sm },
  label: { paddingHorizontal: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  colon: { marginHorizontal: 2, marginTop: -14 },
  rowCompact: { gap: 2 },
  unit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unitCompact: { gap: spacing.xs },
  box: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
  },
  boxCompact: { width: 56, height: 58 },
  boxFocused: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: colors.accentSoft },
  input: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
    height: 34,
    // The box border shows focus; no browser focus rectangle on web.
    outlineWidth: 0,
  },
  inputCompact: { fontSize: 23, height: 30 },
});
