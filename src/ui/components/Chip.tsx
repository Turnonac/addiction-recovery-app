import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ColorLevel } from '@/domain/types';
import { Lock, Plus } from '@/ui/icons';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';

export interface ChipProps {
  label: string;
  /** Tints the chip with that color's soft/ink pair; otherwise accent soft. */
  level?: ColorLevel;
  /** Makes the chip a button (e.g. edit a behavior). Ignored when locked. */
  onPress?: () => void;
  /** Fixed, non-editable chip with a lock icon (Red's first line). */
  locked?: boolean;
  /** Default: the label (", locked" is appended for locked chips). E.g. "Edit: {label}". */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** Rounded 44pt-tall tag used for behaviors in "My colors". Text wraps instead of clipping. */
export function Chip({
  label,
  level,
  onPress,
  locked = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ChipProps) {
  const theme = useAppTheme();
  const bg = level !== undefined ? theme.levels[level].soft : theme.accentSoft;
  const ink = level !== undefined ? theme.levels[level].ink : theme.accentText;
  const base = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: MIN_TOUCH,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: bg,
  } as const;
  const text = (
    <Text style={{ flexShrink: 1, color: ink, fontSize: 13, lineHeight: 17 }}>{label}</Text>
  );

  if (locked || onPress === undefined) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel ?? (locked ? `${label}, locked` : label)}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={base}
      >
        {locked ? <Lock size={14} color={ink} /> : null}
        {text}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [base, { opacity: pressed ? 0.7 : 1 }]}
    >
      {text}
    </Pressable>
  );
}

export interface AddChipProps {
  onPress: () => void;
  /** Visible text. Default 'Add'. */
  label?: string;
  /** Say what is added, e.g. "Add a Green behavior". */
  accessibilityLabel: string;
  testID?: string;
}

/** Dashed "+ Add" chip that sits at the end of a chip list. */
export function AddChip({ onPress, label = 'Add', accessibilityLabel, testID }: AddChipProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minHeight: MIN_TOUCH,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.line2,
        backgroundColor: pressed ? theme.surface2 : 'transparent',
      })}
    >
      <Plus size={14} color={theme.accentText} strokeWidth={3} />
      <Text style={{ color: theme.accentText, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export interface ChipListProps {
  children?: ReactNode;
}

/** Wrapping row of chips with the mockup's 6pt gap. */
export function ChipList({ children }: ChipListProps) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>;
}
