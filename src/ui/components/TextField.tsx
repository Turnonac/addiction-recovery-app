import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/ui/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Visible label above the input; also its accessibility label. */
  label: string;
  /** Error under the input (red); also announced as the hint, and when it appears. */
  error?: string;
  /** Muted help text under the input when there is no error. */
  hint?: string;
  /** Container style. */
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/** Labelled text input from the partner form (48pt min height, 1.5pt border, accent on focus). */
export function TextField({
  label,
  error,
  hint,
  style,
  inputStyle,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  ...inputProps
}: TextFieldProps) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const red = theme.levels[3];
  const borderColor = error ? red.solid : focused ? theme.accent : theme.line2;
  const help = error ?? hint;

  // The error's accessibilityLiveRegion only reaches TalkBack; VoiceOver needs an
  // announcement when one appears or changes (iOS only, so TalkBack does not read it twice).
  const shownError = useRef(error);
  useEffect(() => {
    if (error === shownError.current) return;
    shownError.current = error;
    if (error && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  return (
    <View style={[{ gap: 6 }, style]}>
      <Text
        style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={theme.muted}
        selectionColor={theme.accent}
        cursorColor={theme.accent}
        underlineColorAndroid="transparent"
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? help}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 16,
            color: theme.text,
            backgroundColor: theme.surface,
            borderWidth: 1.5,
            borderColor,
            borderRadius: 12,
          },
          inputStyle,
        ]}
      />
      {help ? (
        <Text
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={{ color: error ? red.ink : theme.muted, fontSize: 13, lineHeight: 18 }}
        >
          {help}
        </Text>
      ) : null}
    </View>
  );
}
