import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Text shown inside the field on the left, e.g. a currency symbol. */
  prefix?: string;
  /** Text shown inside the field on the right, e.g. "min/day". */
  suffix?: string;
}

/** Labeled dark input. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, prefix, suffix, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="captionStrong" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, multiline && styles.multiline, focused && styles.focused, error ? styles.errorBorder : null]}>
        {prefix ? (
          <Text variant="bodyStrong" tone="secondary">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, Platform.OS === 'web' && styles.webNoOutline, style]}
          {...rest}
        />
        {suffix ? (
          <Text variant="caption" tone="tertiary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.hint}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { paddingHorizontal: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.md },
  focused: { borderColor: colors.accent },
  errorBorder: { borderColor: colors.danger },
  // The field border shows focus; hide the browser's default focus ring.
  webNoOutline: { outlineWidth: 0 },
  // minWidth 0: on web an <input> otherwise keeps its intrinsic width and pushes a suffix out.
  input: { flex: 1, minWidth: 0, color: colors.text, fontSize: 16, paddingVertical: spacing.md },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top', paddingVertical: 0 },
  hint: { paddingHorizontal: 2 },
});
